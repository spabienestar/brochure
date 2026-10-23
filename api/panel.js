// Panel de administración de Olivé Spa (función de Vercel).
//
// Todo el contenido editable vive en contenido.json. Al guardar desde /tarifas, esta función
// valida el contenido, sube las fotos nuevas, genera index.html (api/_sitio.js) y publica
// contenido.json + index.html + fotos en un solo commit en `main`. Vercel publica ese commit solo.
//
// Acciones:
//   POST ?accion=entrar   { usuario, clave }                         → cookie de sesión
//   POST ?accion=salir                                                → borra la sesión
//   GET                                                               → { contenido, esquema, camposServicio }
//   POST ?accion=revisar  { version_base, contenido, nuevas: [...] }  → { cambios: [líneas] } (no publica)
//   POST ?accion=guardar  { version_base, contenido, archivos: {...} }→ { version, contenido, cambios }
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   PANEL_USUARIO  usuario del panel
//   PANEL_CLAVE    contraseña del panel
//   GITHUB_TOKEN   token de GitHub con permiso "Contents: Read and write" sobre este repositorio
"use strict";

const crypto = require("crypto");
const sitio = require("./_sitio");

const REPO = "spabienestar/brochure";
const RAMA = "main";
const CARPETA_FOTOS = "assets/img/panel/";
const COOKIE = "olive_panel";
const DURACION_SESION = 8 * 60 * 60; // segundos
const FOTO_MAX_BYTES = 3 * 1024 * 1024;
const MINI_MAX_BYTES = 600 * 1024;
const FOTOS_POR_GUARDADO = 8;

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
  // Al mover la rama, 422 significa que entró otro commit antes (no es "fast forward").
  if (respuesta.status === 409 || (respuesta.status === 422 && metodo === "PATCH")) throw conEstado(409, "rama-movida");
  if (respuesta.status === 401) throw conEstado(502, "El token de GitHub no es válido o ya venció.");
  if (respuesta.status === 403 || respuesta.status === 404) throw conEstado(502, "El token de GitHub no tiene permiso para editar el sitio.");
  throw conEstado(502, "GitHub respondió " + respuesta.status + ". Intenta de nuevo en un momento.");
}

async function leerContenido(cfg, referencia) {
  const datos = await github(cfg, "GET", "/contents/contenido.json?ref=" + referencia);
  return JSON.parse(Buffer.from(datos.content, "base64").toString("utf8"));
}

/* ---------- Cambios en palabras (para la confirmación del panel y el mensaje del commit) ---------- */
// Compara sin importar el orden de las claves (lo guardado y lo validado pueden venir en otro orden).
const canonico = (v) => (Array.isArray(v) ? v.map(canonico) : v && typeof v === "object"
  ? Object.keys(v).sort().reduce((o, k) => ((o[k] = canonico(v[k])), o), {}) : v);
const igual = (a, b) => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));
const formatoPrecio = (n) => "$" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function resumirCambios(antes, despues) {
  const lineas = [];
  for (const seccion of sitio.ESQUEMA) {
    const a = antes[seccion.clave] || {};
    const d = despues[seccion.clave] || {};
    const campos = [];
    for (const def of seccion.campos) {
      if (def.tipo === "servicios") {
        const viejos = new Map((a.servicios || []).map((s) => [s.id, s]));
        const nuevos = new Map(d.servicios.map((s) => [s.id, s]));
        for (const s of d.servicios) {
          const v = viejos.get(s.id);
          if (!v) { lineas.push(seccion.titulo + ": servicio nuevo «" + s.nombre + "»"); continue; }
          if (v.precio !== s.precio && s.precio !== undefined) lineas.push(seccion.titulo + ": precio de «" + s.nombre + "» " + formatoPrecio(v.precio) + " → " + formatoPrecio(s.precio));
          const otros = [];
          for (const k of Object.keys(sitio.CAMPOS_SERVICIO)) {
            if (k === "precio" || !(k in s)) continue;
            const anterior = k === "medios" ? (v.medios || []).map((m) => m.grande || m.url) : v[k];
            const actual = k === "medios" ? s.medios.map((m) => m.grande || m.nueva || m.url) : s[k];
            if (!igual(anterior, actual)) otros.push(k === "medios" ? "fotos/videos" : sitio.CAMPOS_SERVICIO[k].etiqueta.split(" (")[0].toLowerCase());
          }
          if (otros.length) lineas.push(seccion.titulo + ": «" + s.nombre + "» (" + otros.join(", ") + ")");
        }
        for (const v of a.servicios || []) if (!nuevos.has(v.id)) lineas.push(seccion.titulo + ": se elimina «" + v.nombre + "»");
        const ordenAntes = (a.servicios || []).map((s) => s.id).filter((id) => nuevos.has(id));
        const ordenDespues = d.servicios.map((s) => s.id).filter((id) => viejos.has(id));
        if (!igual(ordenAntes, ordenDespues)) lineas.push(seccion.titulo + ": nuevo orden de los servicios");
      } else if (def.tipo === "videos") {
        const urlsAntes = (a[def.k] || []).map((v) => v.url);
        const urlsDespues = d[def.k].map((v) => v.url);
        const n = d[def.k].length;
        if (!igual(urlsAntes, urlsDespues)) lineas.push(seccion.titulo + ": " + (n ? "quedan " + n + (n === 1 ? " video" : " videos") : "se quitan todos los videos"));
        else if (!igual(a[def.k], d[def.k])) campos.push("títulos de los videos");
      } else if (!igual(a[def.k], d[def.k])) {
        campos.push(def.tipo === "interruptor" ? (d[def.k] ? "se muestra" : "se oculta") : def.etiqueta.split(" (")[0].toLowerCase());
      }
    }
    if (campos.length) lineas.push(seccion.titulo + ": " + campos.join(", "));
  }
  return lineas;
}

/* ---------- Guardado ---------- */
// Los enlaces cortos de TikTok y Facebook (vm.tiktok.com, fb.watch, …) se convierten al enlace completo del video.
const ENLACE_CORTO = /^https?:\/\/((vm|vt)\.tiktok\.com\/|(www\.|m\.)?tiktok\.com\/t\/|fb\.watch\/|(www\.|m\.)?facebook\.com\/share\/[vr]\/)/i;
async function resolverEnlacesCortos(contenido) {
  const cortos = [];
  const visitar = (v) => {
    if (Array.isArray(v)) v.forEach(visitar);
    else if (v && typeof v === "object") {
      if (typeof v.url === "string" && ENLACE_CORTO.test(v.url.trim())) cortos.push(v);
      Object.values(v).forEach(visitar);
    }
  };
  visitar(contenido);
  for (const video of cortos.slice(0, 6)) {
    try {
      const r = await fetch(video.url.trim(), { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
      if (r.url) video.url = r.url;
    } catch (_) {
      // Si no se puede resolver, la validación avisará que el enlace no se reconoce.
    }
  }
}

function validarArchivos(archivos) {
  if (!archivos || typeof archivos !== "object" || Array.isArray(archivos)) throw conEstado(400, "Datos inválidos.");
  const claves = Object.keys(archivos);
  if (claves.length > FOTOS_POR_GUARDADO) throw conEstado(400, "Son muchas fotos a la vez. Guarda máximo " + FOTOS_POR_GUARDADO + ".");
  const limpios = Object.create(null);
  const jpeg = (base64, maximo) => {
    const bytes = Buffer.from(String(base64 || ""), "base64");
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw conEstado(400, "Una de las fotos no es una imagen válida.");
    if (bytes.length > maximo) throw conEstado(400, "Una de las fotos es demasiado pesada.");
    return bytes.toString("base64");
  };
  for (const clave of claves) {
    if (!/^[a-z0-9-]{1,40}$/.test(clave)) throw conEstado(400, "Datos inválidos.");
    const a = archivos[clave] || {};
    limpios[clave] = { datos: jpeg(a.datos, FOTO_MAX_BYTES), mini: a.mini ? jpeg(a.mini, MINI_MAX_BYTES) : null };
  }
  return limpios;
}

// Reemplaza cada { nueva: "clave" } por las rutas de la foto ya subida.
function ponerRutas(valor, rutas) {
  if (Array.isArray(valor)) return valor.map((v) => ponerRutas(v, rutas));
  if (valor && typeof valor === "object") {
    if (valor.nueva) {
      const r = rutas[valor.nueva];
      const { nueva, ...resto } = valor;
      return { ...resto, grande: r.grande, ...(r.mini ? { mini: r.mini } : {}) };
    }
    const salida = {};
    for (const [k, v] of Object.entries(valor)) salida[k] = ponerRutas(v, rutas);
    return salida;
  }
  return valor;
}

function clavesNuevas(valor, encontradas) {
  if (Array.isArray(valor)) valor.forEach((v) => clavesNuevas(v, encontradas));
  else if (valor && typeof valor === "object") {
    if (valor.nueva) encontradas.add(valor.nueva);
    Object.values(valor).forEach((v) => clavesNuevas(v, encontradas));
  }
  return encontradas;
}

async function prepararGuardado(cfg, cuerpo, nuevas) {
  if (!cuerpo || typeof cuerpo !== "object" || !cuerpo.contenido) {
    throw conEstado(400, "El panel se actualizó. Recarga la página para usar la versión nueva.");
  }
  const cabeza = (await github(cfg, "GET", "/git/ref/heads/" + RAMA)).object.sha;
  let actual = await leerContenido(cfg, cabeza);
  // Lo guardado pasa por la misma limpieza, para que el resumen muestre solo lo que de verdad cambió.
  try {
    actual = sitio.validar(actual, { rutasPermitidas: sitio.rutasDeFotos(actual), fotosNuevas: new Set() });
  } catch (_) {
    // Si alguien editó contenido.json a mano y quedó inválido, se compara tal cual.
  }
  if (Number(cuerpo.version_base) !== actual.version) {
    throw conEstado(409, "Alguien guardó cambios hace un momento. Recarga la página para ver la última versión.");
  }
  await resolverEnlacesCortos(cuerpo.contenido);
  const limpio = sitio.validar(cuerpo.contenido, { rutasPermitidas: sitio.rutasDeFotos(actual), fotosNuevas: nuevas });
  return { cabeza, actual, limpio };
}

async function publicar(cfg, cuerpo) {
  const archivos = validarArchivos(cuerpo.archivos || {});
  let { cabeza, actual, limpio } = await prepararGuardado(cfg, cuerpo, new Set(Object.keys(archivos)));

  // Subir solo las fotos que el contenido usa de verdad.
  const sello = new Date().toISOString().replace(/\D/g, "").slice(0, 14) + "-" + crypto.randomBytes(2).toString("hex");
  const arbolFotos = [];
  const rutas = Object.create(null);
  let n = 0;
  for (const clave of clavesNuevas(limpio, new Set())) {
    const base = CARPETA_FOTOS + "foto-" + sello + "-" + ++n;
    const subir = async (ruta, datos) => {
      const blob = await github(cfg, "POST", "/git/blobs", { content: datos, encoding: "base64" });
      arbolFotos.push({ path: ruta, mode: "100644", type: "blob", sha: blob.sha });
      return ruta;
    };
    rutas[clave] = {
      grande: await subir(base + ".jpg", archivos[clave].datos),
      mini: archivos[clave].mini ? await subir(base + "-mini.jpg", archivos[clave].mini) : null
    };
  }
  limpio = ponerRutas(limpio, rutas);

  const lineas = resumirCambios(actual, limpio);
  if (!lineas.length) return { cambios: 0, version: actual.version, contenido: actual, fotos: {} };
  limpio.version = actual.version + 1;
  const html = sitio.renderizar(limpio);

  for (let intento = 1; ; intento++) {
    const commitActual = await github(cfg, "GET", "/git/commits/" + cabeza);
    const arbol = await github(cfg, "POST", "/git/trees", {
      base_tree: commitActual.tree.sha,
      tree: [
        { path: "contenido.json", mode: "100644", type: "blob", content: JSON.stringify(limpio, null, 2) + "\n" },
        { path: "index.html", mode: "100644", type: "blob", content: html },
        ...arbolFotos
      ]
    });
    const commit = await github(cfg, "POST", "/git/commits", {
      message: "Contenido actualizado desde el panel (" + lineas.length + ")\n\n" + lineas.map((l) => "- " + l).join("\n"),
      tree: arbol.sha,
      parents: [cabeza]
    });
    try {
      await github(cfg, "PATCH", "/git/refs/heads/" + RAMA, { sha: commit.sha, force: false });
      // `fotos` dice dónde quedó cada foto nueva, para que el panel siga mostrándola mientras Vercel publica.
      return { cambios: lineas.length, version: limpio.version, contenido: limpio, fotos: rutas };
    } catch (error) {
      if (error.estado !== 409 || intento >= 3) throw error;
      // Entró otro commit (por ejemplo, un cambio de diseño): si el contenido no cambió, se reintenta encima.
      cabeza = (await github(cfg, "GET", "/git/ref/heads/" + RAMA)).object.sha;
      if ((await leerContenido(cfg, cabeza)).version !== actual.version) {
        throw conEstado(409, "Alguien guardó cambios hace un momento. Recarga la página para ver la última versión.");
      }
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
      return responder(200, { contenido: await leerContenido(cfg, RAMA), esquema: sitio.ESQUEMA, camposServicio: sitio.CAMPOS_SERVICIO });
    }

    if (req.method === "POST" && accion === "revisar") {
      const cuerpo = await leerCuerpo(req);
      const nuevas = new Set(Array.isArray(cuerpo.nuevas) ? cuerpo.nuevas.map(String) : []);
      const { actual, limpio } = await prepararGuardado(cfg, cuerpo, nuevas);
      return responder(200, { ok: true, cambios: resumirCambios(actual, limpio) });
    }

    if (req.method === "POST" && accion === "guardar") {
      return responder(200, { ok: true, ...(await publicar(cfg, await leerCuerpo(req))) });
    }

    return responder(405, { error: "Acción no válida." });
  } catch (error) {
    if (!error.estado) console.error("[panel]", error);
    const mensaje = error.estado ? (error.message === "rama-movida" ? "Alguien guardó cambios al mismo tiempo. Intenta de nuevo." : error.message) : "Ocurrió un error inesperado. Intenta de nuevo.";
    return responder(error.estado || 500, { error: mensaje });
  }
};
