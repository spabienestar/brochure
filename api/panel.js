// Panel de contenido de Olivé Spa (función de Vercel).
//
// Valida el usuario y la contraseña del panel, lee index.html desde GitHub y
// guarda precios, textos y fotos nuevos en un solo commit en `main`. Vercel
// publica ese commit automáticamente, igual que cualquier otro push.
//
// Lo editable está marcado en index.html:
//   data-tarifa="id"                 precio del servicio (solo el texto del precio)
//   data-texto="id:campo"            nombre, descripcion o detalle (solo texto y <br>)
//   data-foto="id"                   foto (img, y también link/meta que deban seguirla)
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   PANEL_USUARIO  usuario del panel
//   PANEL_CLAVE    contraseña del panel
//   GITHUB_TOKEN   token de GitHub con permiso "Contents: Read and write" sobre este repositorio
"use strict";

const crypto = require("crypto");

const REPO = "spabienestar/brochure";
const RAMA = "main";
const ARCHIVO = "index.html";
const SITIO = "https://olivespamedellin.com/";
const CARPETA_FOTOS = "assets/img/panel/";
const COOKIE = "olive_panel";
const DURACION_SESION = 8 * 60 * 60; // segundos
const PRECIO_MIN = 1000;
const PRECIO_MAX = 50000000;
const FOTO_MAX_BYTES = 3 * 1024 * 1024;
const FOTOS_POR_GUARDADO = 8;
const CAMPOS = {
  nombre: { max: 90, varias_lineas: false, obligatorio: true },
  detalle: { max: 90, varias_lineas: false, obligatorio: false },
  descripcion: { max: 700, varias_lineas: true, obligatorio: false }
};

// Elemento con data-tarifa="id" cuyo contenido es solo el precio, sin etiquetas dentro.
const PATRON_TARIFA = /(<([a-z][a-z0-9]*)\b[^>]*?\sdata-tarifa="([a-z0-9-]+)"[^>]*>)([^<]*)(<\/\2>)/gi;
// Elemento con data-texto="id:campo" cuyo contenido es texto con, a lo sumo, saltos <br>.
const PATRON_TEXTO = /(<([a-z][a-z0-9]*)\b[^>]*?\sdata-texto="([a-z0-9-]+):(nombre|descripcion|detalle)"[^>]*>)((?:[^<]|<br\s*\/?>)*)(<\/\2>)/gi;
// Etiqueta img/link/meta con data-foto="id".
const PATRON_FOTO = /<(img|link|meta)\b[^>]*?\sdata-foto="([a-z0-9-]+)"[^>]*>/gi;

function conEstado(estado, mensaje) {
  const error = new Error(mensaje);
  error.estado = estado;
  return error;
}

function configuracion() {
  const usuario = process.env.PANEL_USUARIO;
  const clave = process.env.PANEL_CLAVE;
  const token = process.env.GITHUB_TOKEN;
  return usuario && clave && token ? { usuario, clave, token } : null;
}

// Comparación en tiempo constante; el hash iguala las longitudes.
function iguales(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// La llave depende de la contraseña y del token: cambiar cualquiera cierra las sesiones abiertas.
function firmar(cfg, datos) {
  const llave = crypto.createHash("sha256").update("olive-panel|" + cfg.clave + "|" + cfg.token).digest();
  return crypto.createHmac("sha256", llave).update(datos).digest("base64url");
}

function crearSesion(cfg) {
  const exp = Math.floor(Date.now() / 1000) + DURACION_SESION;
  const datos = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return datos + "." + firmar(cfg, datos);
}

function sesionValida(cfg, valor) {
  const [datos, firma] = String(valor || "").split(".");
  if (!datos || !firma || !iguales(firma, firmar(cfg, datos))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(datos, "base64url").toString("utf8"));
    return typeof exp === "number" && exp > Date.now() / 1000;
  } catch (_) {
    return false;
  }
}

function leerCookie(req) {
  for (const parte of String(req.headers.cookie || "").split(";")) {
    const i = parte.indexOf("=");
    if (i > 0 && parte.slice(0, i).trim() === COOKIE) return decodeURIComponent(parte.slice(i + 1).trim());
  }
  return "";
}

function cookieSesion(valor, maxAge) {
  return COOKIE + "=" + encodeURIComponent(valor) + "; Path=/api/panel; HttpOnly; Secure; SameSite=Strict; Max-Age=" + maxAge;
}

function mismoOrigen(req) {
  const origen = req.headers.origin;
  if (!origen) return true;
  try {
    return new URL(origen).host === req.headers.host;
  } catch (_) {
    return false;
  }
}

async function leerCuerpo(req) {
  try {
    // En Vercel el cuerpo JSON ya viene leído en req.body; en otros entornos se lee del stream.
    if (req.body !== undefined) {
      return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    }
    const trozos = [];
    for await (const trozo of req) trozos.push(trozo);
    const texto = Buffer.concat(trozos).toString("utf8");
    return texto ? JSON.parse(texto) : {};
  } catch (_) {
    throw conEstado(400, "Datos inválidos.");
  }
}

async function github(cfg, metodo, ruta, cuerpo) {
  const respuesta = await fetch("https://api.github.com/repos/" + REPO + ruta, {
    method: metodo,
    headers: {
      Authorization: "Bearer " + cfg.token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "olive-spa-panel",
      "Content-Type": "application/json"
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (respuesta.ok) return datos;
  // Al mover la rama, 422 significa que alguien más guardó antes (no es "fast forward").
  if (respuesta.status === 409 || (respuesta.status === 422 && metodo === "PATCH")) {
    throw conEstado(409, "Alguien guardó cambios al mismo tiempo. Recarga la página e intenta de nuevo.");
  }
  if (respuesta.status === 401) throw conEstado(502, "El token de GitHub no es válido o ya venció.");
  if (respuesta.status === 403 || respuesta.status === 404) throw conEstado(502, "El token de GitHub no tiene permiso para editar el sitio.");
  throw conEstado(502, "GitHub respondió " + respuesta.status + ". Intenta de nuevo en un momento.");
}

async function leerIndex(cfg, referencia) {
  const datos = await github(cfg, "GET", "/contents/" + ARCHIVO + "?ref=" + referencia);
  return Buffer.from(datos.content, "base64").toString("utf8");
}

function formatear(precio) {
  return "$" + String(precio).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function aHtml(texto) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\n/g, "<br>");
}

function deHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function resumir(texto) {
  const linea = texto.replace(/\s+/g, " ").trim();
  return linea ? "«" + (linea.length > 60 ? linea.slice(0, 57) + "…" : linea) + "»" : "(vacío)";
}

function limpiarTexto(valor, campo) {
  const reglas = CAMPOS[campo];
  let texto = String(valor == null ? "" : valor).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "");
  if (reglas.varias_lineas) {
    texto = texto.split("\n").map((linea) => linea.replace(/\s+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  } else {
    texto = texto.replace(/\s+/g, " ").trim();
  }
  if (reglas.obligatorio && !texto) throw conEstado(400, "El nombre de un servicio no puede quedar vacío.");
  if (texto.length > reglas.max) throw conEstado(400, "Un texto es demasiado largo (máximo " + reglas.max + " caracteres).");
  return texto;
}

function validarPedido(cuerpo) {
  const precios = Object.create(null);
  const textos = Object.create(null);
  const fotos = Object.create(null);
  const esObjeto = (valor) => valor && typeof valor === "object" && !Array.isArray(valor);

  // `cambios` es el nombre que usaba la primera versión del panel para los precios.
  const entradaPrecios = cuerpo.precios || cuerpo.cambios || {};
  const entradaTextos = cuerpo.textos || {};
  const entradaFotos = cuerpo.fotos || {};
  if (!esObjeto(entradaPrecios) || !esObjeto(entradaTextos) || !esObjeto(entradaFotos)) throw conEstado(400, "Datos inválidos.");

  for (const [id, valor] of Object.entries(entradaPrecios)) {
    const precio = Number(valor);
    if (!/^[a-z0-9-]+$/.test(id) || !Number.isInteger(precio) || precio < PRECIO_MIN || precio > PRECIO_MAX) {
      throw conEstado(400, "Hay un precio no válido. Revisa los valores e intenta de nuevo.");
    }
    precios[id] = precio;
  }
  for (const [clave, valor] of Object.entries(entradaTextos)) {
    const partes = /^([a-z0-9-]+):(nombre|descripcion|detalle)$/.exec(clave);
    if (!partes) throw conEstado(400, "Hay un texto no válido.");
    textos[clave] = limpiarTexto(valor, partes[2]);
  }
  const idsFotos = Object.keys(entradaFotos);
  if (idsFotos.length > FOTOS_POR_GUARDADO) throw conEstado(400, "Son muchas fotos a la vez. Guarda máximo " + FOTOS_POR_GUARDADO + ".");
  for (const id of idsFotos) {
    const foto = entradaFotos[id];
    if (!/^[a-z0-9-]+$/.test(id) || !esObjeto(foto) || typeof foto.datos !== "string") throw conEstado(400, "Hay una foto no válida.");
    const bytes = Buffer.from(foto.datos, "base64");
    // Solo JPEG: el panel convierte y comprime todas las fotos antes de enviarlas.
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw conEstado(400, "Una de las fotos no es una imagen válida.");
    if (bytes.length > FOTO_MAX_BYTES) throw conEstado(400, "Una de las fotos es demasiado pesada.");
    fotos[id] = { datos: bytes.toString("base64"), alt: limpiarTexto(foto.alt, "detalle") };
  }
  if (!Object.keys(precios).length && !Object.keys(textos).length && !idsFotos.length) throw conEstado(400, "No hay cambios para guardar.");
  return { precios, textos, fotos };
}

// Aplica el pedido sobre el HTML. Devuelve el HTML nuevo y una línea por cambio real.
function aplicar(html, pedido, rutasFotos) {
  const vistos = new Set();
  const lineas = [];

  let nuevo = html.replace(PATRON_TARIFA, (todo, abre, _etiqueta, id, texto, cierra) => {
    if (!(id in pedido.precios)) return todo;
    vistos.add("precio:" + id);
    const precio = formatear(pedido.precios[id]);
    if (texto.trim() === precio) return todo;
    lineas.push("- precio " + id + ": " + texto.trim() + " → " + precio);
    return abre + precio + cierra;
  });

  nuevo = nuevo.replace(PATRON_TEXTO, (todo, abre, _etiqueta, id, campo, contenido, cierra) => {
    const clave = id + ":" + campo;
    if (!(clave in pedido.textos)) return todo;
    vistos.add("texto:" + clave);
    const texto = pedido.textos[clave];
    const anterior = deHtml(contenido).trim();
    if (anterior === texto) return todo;
    lineas.push("- " + campo + " " + id + ": " + resumir(anterior) + " → " + resumir(texto));
    return abre + aHtml(texto) + cierra;
  });

  nuevo = nuevo.replace(PATRON_FOTO, (etiqueta, tipo, id) => {
    if (!(id in rutasFotos)) return etiqueta;
    const ruta = rutasFotos[id];
    tipo = tipo.toLowerCase();
    if (tipo === "link") return etiqueta.replace(/\shref="[^"]*"/i, ' href="' + ruta + '"');
    if (tipo === "meta") return etiqueta.replace(/\scontent="[^"]*"/i, ' content="' + SITIO + ruta + '"');
    vistos.add("foto:" + id);
    // El recorte (object-position) era para la foto anterior; el texto alternativo describe la nueva.
    let nueva = etiqueta.replace(/\ssrc="[^"]*"/i, ' src="' + ruta + '"').replace(/\sstyle="[^"]*"/i, "");
    const alt = pedido.fotos[id].alt;
    if (alt && /\salt="[^"]+"/i.test(nueva)) nueva = nueva.replace(/\salt="[^"]*"/i, ' alt="' + aHtml(alt) + '"');
    return nueva;
  });
  for (const id of Object.keys(rutasFotos)) lineas.push("- foto " + id + ": " + rutasFotos[id]);

  const faltan = [
    ...Object.keys(pedido.precios).filter((id) => !vistos.has("precio:" + id)),
    ...Object.keys(pedido.textos).filter((clave) => !vistos.has("texto:" + clave)),
    ...Object.keys(rutasFotos).filter((id) => !vistos.has("foto:" + id))
  ];
  if (faltan.length) throw conEstado(400, "No se encontraron estos elementos en la página: " + faltan.join(", "));
  return { html: nuevo, lineas };
}

// Guarda todo en un solo commit con la API de datos de Git (blobs → árbol → commit → rama).
async function publicar(cfg, pedido) {
  const sello = new Date().toISOString().replace(/\D/g, "").slice(0, 14) + "-" + crypto.randomBytes(2).toString("hex");
  const archivosFotos = [];
  const rutasFotos = Object.create(null);
  for (const [id, foto] of Object.entries(pedido.fotos)) {
    const ruta = CARPETA_FOTOS + id + "-" + sello + ".jpg";
    const blob = await github(cfg, "POST", "/git/blobs", { content: foto.datos, encoding: "base64" });
    archivosFotos.push({ path: ruta, mode: "100644", type: "blob", sha: blob.sha });
    rutasFotos[id] = ruta;
  }

  for (let intento = 1; ; intento++) {
    const rama = await github(cfg, "GET", "/git/ref/heads/" + RAMA);
    const cabeza = rama.object.sha;
    const commitActual = await github(cfg, "GET", "/git/commits/" + cabeza);
    const { html, lineas } = aplicar(await leerIndex(cfg, cabeza), pedido, rutasFotos);
    if (!lineas.length) return { cambios: 0, fotos: {} };

    const arbol = await github(cfg, "POST", "/git/trees", {
      base_tree: commitActual.tree.sha,
      tree: [{ path: ARCHIVO, mode: "100644", type: "blob", content: html }, ...archivosFotos]
    });
    const commit = await github(cfg, "POST", "/git/commits", {
      message: "Contenido actualizado desde el panel (" + lineas.length + ")\n\n" + lineas.join("\n"),
      tree: arbol.sha,
      parents: [cabeza]
    });
    try {
      await github(cfg, "PATCH", "/git/refs/heads/" + RAMA, { sha: commit.sha, force: false });
      return { cambios: lineas.length, fotos: rutasFotos };
    } catch (error) {
      // Otro cambio entró justo antes: se rehace sobre la versión nueva (las fotos ya subidas se reutilizan).
      if (error.estado === 409 && intento < 3) continue;
      throw error;
    }
  }
}

module.exports = async function panel(req, res) {
  const responder = (estado, datos, cookie) => {
    res.statusCode = estado;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (cookie !== undefined) res.setHeader("Set-Cookie", cookie);
    res.end(JSON.stringify(datos));
  };

  const cfg = configuracion();
  if (!cfg) {
    // Solo nombres (ya públicos en el README), nunca valores: sirve para diagnosticar la configuración.
    const faltan = ["PANEL_USUARIO", "PANEL_CLAVE", "GITHUB_TOKEN"].filter((nombre) => !process.env[nombre]);
    return responder(503, { error: "El panel todavía no está configurado.", faltan });
  }

  const accion = new URL(req.url, "http://localhost").searchParams.get("accion") || "";
  try {
    if (req.method === "POST") {
      // Solo peticiones JSON del mismo sitio (junto con SameSite=Strict, evita envíos desde otras páginas).
      if (!mismoOrigen(req)) return responder(403, { error: "Origen no permitido." });
      if (!/^application\/json\b/i.test(req.headers["content-type"] || "")) return responder(415, { error: "Formato no permitido." });
    }

    if (req.method === "POST" && accion === "entrar") {
      const { usuario, clave } = await leerCuerpo(req);
      const usuarioOk = iguales(String(usuario || "").trim().toLowerCase(), cfg.usuario.trim().toLowerCase());
      const claveOk = iguales(String(clave || ""), cfg.clave);
      if (!usuarioOk || !claveOk) {
        await new Promise((resolver) => setTimeout(resolver, 1000)); // frena los intentos por fuerza bruta
        return responder(401, { error: "Usuario o contraseña incorrectos." });
      }
      return responder(200, { ok: true }, cookieSesion(crearSesion(cfg), DURACION_SESION));
    }

    if (req.method === "POST" && accion === "salir") {
      return responder(200, { ok: true }, cookieSesion("", 0));
    }

    if (!sesionValida(cfg, leerCookie(req))) return responder(401, { error: "Tu sesión terminó. Vuelve a entrar." });

    if (req.method === "GET") {
      return responder(200, { html: await leerIndex(cfg, RAMA) });
    }

    if (req.method === "POST" && accion === "guardar") {
      const resultado = await publicar(cfg, validarPedido(await leerCuerpo(req)));
      return responder(200, { ok: true, ...resultado });
    }

    return responder(405, { error: "Acción no válida." });
  } catch (error) {
    if (!error.estado) console.error("[panel]", error);
    return responder(error.estado || 500, { error: error.estado ? error.message : "Ocurrió un error inesperado. Intenta de nuevo." });
  }
};
