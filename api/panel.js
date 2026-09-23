// Panel de tarifas de Olivé Spa (función de Vercel).
//
// Valida el usuario y la contraseña del panel, lee index.html desde GitHub y
// guarda los precios nuevos como un commit en `main`. Vercel publica ese commit
// automáticamente, igual que cualquier otro push.
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
const COOKIE = "olive_panel";
const DURACION_SESION = 8 * 60 * 60; // segundos
const PRECIO_MIN = 1000;
const PRECIO_MAX = 50000000;

// Elemento con data-tarifa="id" cuyo contenido es solo el precio, sin etiquetas dentro.
const PATRON_TARIFA = /(<([a-z][a-z0-9]*)\b[^>]*?\sdata-tarifa="([a-z0-9-]+)"[^>]*>)([^<]*)(<\/\2>)/gi;

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
  if (respuesta.status === 409) throw conEstado(409, "Alguien guardó cambios al mismo tiempo. Recarga la página e intenta de nuevo.");
  if (respuesta.status === 401) throw conEstado(502, "El token de GitHub no es válido o ya venció.");
  if (respuesta.status === 403 || respuesta.status === 404) throw conEstado(502, "El token de GitHub no tiene permiso para editar el sitio.");
  throw conEstado(502, "GitHub respondió " + respuesta.status + ". Intenta de nuevo en un momento.");
}

async function leerIndex(cfg) {
  const datos = await github(cfg, "GET", "/contents/" + ARCHIVO + "?ref=" + RAMA);
  return { html: Buffer.from(datos.content, "base64").toString("utf8"), sha: datos.sha };
}

function formatear(precio) {
  return "$" + String(precio).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function validarCambios(cambios) {
  if (!cambios || typeof cambios !== "object" || Array.isArray(cambios)) throw conEstado(400, "Datos inválidos.");
  const limpios = Object.create(null);
  for (const [id, valor] of Object.entries(cambios)) {
    const precio = Number(valor);
    if (!/^[a-z0-9-]+$/.test(id) || !Number.isInteger(precio) || precio < PRECIO_MIN || precio > PRECIO_MAX) {
      throw conEstado(400, "Hay un precio no válido. Revisa los valores e intenta de nuevo.");
    }
    limpios[id] = precio;
  }
  if (!Object.keys(limpios).length) throw conEstado(400, "No hay cambios para guardar.");
  return limpios;
}

async function guardar(cfg, cambios) {
  for (let intento = 1; ; intento++) {
    const { html, sha } = await leerIndex(cfg);
    const vistos = new Set();
    const aplicados = [];
    const nuevo = html.replace(PATRON_TARIFA, (todo, abre, _etiqueta, id, texto, cierra) => {
      if (!(id in cambios)) return todo;
      vistos.add(id);
      const precio = formatear(cambios[id]);
      if (texto.trim() !== precio) aplicados.push("- " + id + ": " + texto.trim() + " → " + precio);
      return abre + precio + cierra;
    });
    const faltan = Object.keys(cambios).filter((id) => !vistos.has(id));
    if (faltan.length) throw conEstado(400, "No se encontraron estos servicios en la página: " + faltan.join(", "));
    if (!aplicados.length) return { cambios: 0 };
    try {
      await github(cfg, "PUT", "/contents/" + ARCHIVO, {
        message: "Tarifas actualizadas desde el panel (" + aplicados.length + ")\n\n" + aplicados.join("\n"),
        content: Buffer.from(nuevo, "utf8").toString("base64"),
        sha,
        branch: RAMA
      });
      return { cambios: aplicados.length };
    } catch (error) {
      // Otro cambio entró justo antes: se reintenta una vez sobre la versión nueva.
      if (error.estado === 409 && intento < 2) continue;
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
  if (!cfg) return responder(503, { error: "El panel todavía no está configurado." });

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
      const { html } = await leerIndex(cfg);
      return responder(200, { html });
    }

    if (req.method === "POST" && accion === "guardar") {
      const { cambios } = await leerCuerpo(req);
      const resultado = await guardar(cfg, validarCambios(cambios));
      return responder(200, { ok: true, ...resultado });
    }

    return responder(405, { error: "Acción no válida." });
  } catch (error) {
    if (!error.estado) console.error("[panel]", error);
    return responder(error.estado || 500, { error: error.estado ? error.message : "Ocurrió un error inesperado. Intenta de nuevo." });
  }
};
