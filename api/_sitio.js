// Contenido editable de la página de Olivé Spa: esquema (qué se puede editar y con qué límites),
// validación de lo que llega del panel y generación de index.html a partir de contenido.json.
// Lo usan api/panel.js (al guardar desde /tarifas) y herramientas/generar.js (para regenerar a mano).
"use strict";

const SITIO_URL = "https://olivespamedellin.com/";
const MAX_FOTOS_SERVICIO = 3;
const MAX_SERVICIOS = 40;
const MAX_VIDEOS = 12;

/* =====================================================================
   Esquema: describe cada parte de la página para el panel y la validación.
   Tipos: texto, parrafo, interruptor, foto, precio, telefono, email, url, lista,
   horarios, cifras, pasos, servicios, videos.
   ===================================================================== */
const SECCIONES_SERVICIOS = ["masajes", "faciales", "programas", "postquirurgico"];

const ESQUEMA = [
  { clave: "aviso", titulo: "Aviso o promoción", ayuda: "Una franja arriba de la página, siempre visible. Ideal para promociones.", campos: [
    { k: "visible", tipo: "interruptor", etiqueta: "Mostrar el aviso en la página" },
    { k: "texto", tipo: "texto", etiqueta: "Texto del aviso", max: 140, ejemplo: "Promo de octubre: 10% en masajes en pareja" }
  ] },
  { clave: "portada", titulo: "Portada (lo primero que se ve)", campos: [
    { k: "etiqueta", tipo: "texto", etiqueta: "Frase pequeña de arriba", max: 90 },
    { k: "titulo", tipo: "texto", etiqueta: "Título", max: 60, obligatorio: true },
    { k: "destacado", tipo: "texto", etiqueta: "Título en cursiva (segunda línea)", max: 60 },
    { k: "texto", tipo: "parrafo", etiqueta: "Texto", max: 400 },
    { k: "lema", tipo: "parrafo", etiqueta: "Frase en cursiva", max: 200 },
    { k: "boton", tipo: "texto", etiqueta: "Texto del botón de WhatsApp", max: 40, obligatorio: true },
    { k: "foto", tipo: "foto", etiqueta: "Foto principal" }
  ] },
  { clave: "cinta", titulo: "Cinta de palabras (debajo de la portada)", campos: [
    { k: "frases", tipo: "lista", etiqueta: "Frases que se mueven", max: 40, maxItems: 8, minItems: 1 }
  ] },
  { clave: "nosotros", titulo: "Nuestra esencia", campos: [
    { k: "etiqueta", tipo: "texto", etiqueta: "Frase pequeña de arriba", max: 60 },
    { k: "titulo", tipo: "texto", etiqueta: "Título", max: 60, obligatorio: true },
    { k: "destacado", tipo: "texto", etiqueta: "Parte en cursiva del título", max: 60 },
    { k: "texto", tipo: "parrafo", etiqueta: "Texto", max: 600 },
    { k: "cifras", tipo: "cifras", etiqueta: "Cifras" },
    { k: "cobertura", tipo: "texto", etiqueta: "Zonas (línea de abajo)", max: 160 },
    { k: "foto", tipo: "foto", etiqueta: "Foto" }
  ] },
  { clave: "masajes", titulo: "Masajes", servicios: true, campos: [
    { k: "visible", tipo: "interruptor", etiqueta: "Mostrar esta sección" },
    { k: "menu", tipo: "texto", etiqueta: "Nombre en el menú", max: 24, obligatorio: true },
    { k: "etiqueta", tipo: "texto", etiqueta: "Frase pequeña de arriba", max: 60 },
    { k: "titulo", tipo: "texto", etiqueta: "Título", max: 60, obligatorio: true },
    { k: "destacado", tipo: "texto", etiqueta: "Parte en cursiva del título", max: 60 },
    { k: "intro", tipo: "parrafo", etiqueta: "Texto de introducción", max: 400 },
    { k: "regalo", tipo: "texto", etiqueta: "Regalito (vacío = no se muestra)", max: 120 },
    { k: "boton", tipo: "texto", etiqueta: "Botón de reserva", max: 40, obligatorio: true },
    { k: "mensaje", tipo: "texto", etiqueta: "Mensaje de WhatsApp de ese botón", max: 160 },
    { k: "servicios", tipo: "servicios", etiqueta: "Masajes", campos: ["nombre", "etiqueta", "precio", "descripcion", "medios"] }
  ] },
  { clave: "faciales", titulo: "Faciales", servicios: true, campos: [
    { k: "visible", tipo: "interruptor", etiqueta: "Mostrar esta sección" },
    { k: "menu", tipo: "texto", etiqueta: "Nombre en el menú", max: 24, obligatorio: true },
    { k: "etiqueta", tipo: "texto", etiqueta: "Frase pequeña de arriba", max: 60 },
    { k: "titulo", tipo: "texto", etiqueta: "Título", max: 60, obligatorio: true },
    { k: "destacado", tipo: "texto", etiqueta: "Parte en cursiva del título", max: 60 },
    { k: "intro", tipo: "parrafo", etiqueta: "Texto de introducción", max: 400 },
    { k: "regalo", tipo: "texto", etiqueta: "Regalito (vacío = no se muestra)", max: 120 },
    { k: "foto", tipo: "foto", etiqueta: "Foto grande de la sección" },
    { k: "servicios", tipo: "servicios", etiqueta: "Tratamientos", campos: ["nombre", "precio", "descripcion", "detalle", "medios"] }
  ] },
  { clave: "programas", titulo: "Programas spa", servicios: true, campos: [
    { k: "visible", tipo: "interruptor", etiqueta: "Mostrar esta sección" },
    { k: "menu", tipo: "texto", etiqueta: "Nombre en el menú", max: 24, obligatorio: true },
    { k: "etiqueta", tipo: "texto", etiqueta: "Frase pequeña de arriba", max: 60 },
    { k: "titulo", tipo: "texto", etiqueta: "Título", max: 60, obligatorio: true },
    { k: "destacado", tipo: "texto", etiqueta: "Parte en cursiva del título", max: 60 },
    { k: "intro", tipo: "parrafo", etiqueta: "Texto de introducción", max: 400 },
    { k: "servicios", tipo: "servicios", etiqueta: "Programas", campos: ["nombre", "precio", "nota", "detalle", "descripcion", "medios"] }
  ] },
  { clave: "postquirurgico", titulo: "Post-quirúrgico", servicios: true, campos: [
    { k: "visible", tipo: "interruptor", etiqueta: "Mostrar esta sección" },
    { k: "menu", tipo: "texto", etiqueta: "Nombre en el menú", max: 24, obligatorio: true },
    { k: "etiqueta", tipo: "texto", etiqueta: "Frase pequeña de arriba", max: 60 },
    { k: "titulo", tipo: "texto", etiqueta: "Título", max: 60, obligatorio: true },
    { k: "destacado", tipo: "texto", etiqueta: "Parte en cursiva del título", max: 60 },
    { k: "intro", tipo: "parrafo", etiqueta: "Texto de introducción", max: 400 },
    { k: "servicios", tipo: "servicios", etiqueta: "Terapias", campos: ["nombre", "precio", "descripcion", "medios"] }
  ] },
  { clave: "videos", titulo: "Videos", ayuda: "Pega el enlace de un video de Instagram, TikTok, YouTube, Facebook o Vimeo. La sección aparece en la página cuando hay al menos un video.", campos: [
    { k: "visible", tipo: "interruptor", etiqueta: "Mostrar esta sección" },
    { k: "menu", tipo: "texto", etiqueta: "Nombre en el menú", max: 24, obligatorio: true },
    { k: "etiqueta", tipo: "texto", etiqueta: "Frase pequeña de arriba", max: 60 },
    { k: "titulo", tipo: "texto", etiqueta: "Título", max: 60, obligatorio: true },
    { k: "destacado", tipo: "texto", etiqueta: "Parte en cursiva del título", max: 60 },
    { k: "intro", tipo: "parrafo", etiqueta: "Texto de introducción", max: 400 },
    { k: "lista", tipo: "videos", etiqueta: "Videos" }
  ] },
  { clave: "pasos", titulo: "Cómo funciona (pasos)", campos: [
    { k: "visible", tipo: "interruptor", etiqueta: "Mostrar esta sección" },
    { k: "etiqueta", tipo: "texto", etiqueta: "Frase pequeña de arriba", max: 60 },
    { k: "titulo", tipo: "texto", etiqueta: "Título", max: 60, obligatorio: true },
    { k: "destacado", tipo: "texto", etiqueta: "Parte en cursiva del título", max: 60 },
    { k: "lista", tipo: "pasos", etiqueta: "Pasos" }
  ] },
  { clave: "reserva", titulo: "Cierre: «Reserva tu experiencia»", campos: [
    { k: "etiqueta", tipo: "texto", etiqueta: "Frase pequeña de arriba", max: 60 },
    { k: "titulo", tipo: "texto", etiqueta: "Título", max: 60, obligatorio: true },
    { k: "destacado", tipo: "texto", etiqueta: "Parte en cursiva del título", max: 60 },
    { k: "texto", tipo: "parrafo", etiqueta: "Texto", max: 300 },
    { k: "foto", tipo: "foto", etiqueta: "Foto de fondo" }
  ] },
  { clave: "contacto", titulo: "Contacto, horarios y redes", ayuda: "Se actualizan en todos los lugares de la página donde aparecen.", campos: [
    { k: "whatsapp", tipo: "telefono", etiqueta: "WhatsApp principal", obligatorio: true },
    { k: "whatsapp_2", tipo: "telefono", etiqueta: "Segundo WhatsApp (opcional)" },
    { k: "mensaje", tipo: "texto", etiqueta: "Mensaje que llega por WhatsApp", max: 160 },
    { k: "email", tipo: "email", etiqueta: "Correo" },
    { k: "horarios", tipo: "horarios", etiqueta: "Horarios" },
    { k: "instagram", tipo: "url", etiqueta: "Instagram (enlace)" },
    { k: "facebook", tipo: "url", etiqueta: "Facebook (enlace)" },
    { k: "tiktok", tipo: "url", etiqueta: "TikTok (enlace)" },
    { k: "cobertura", tipo: "lista", etiqueta: "Zonas de cobertura (pie de página)", max: 40, maxItems: 12 }
  ] },
  { clave: "marca", titulo: "Nombre y pie de página", campos: [
    { k: "nombre", tipo: "texto", etiqueta: "Nombre del spa", max: 40, obligatorio: true },
    { k: "lema", tipo: "texto", etiqueta: "Frase corta junto al nombre", max: 40 },
    { k: "mision", tipo: "parrafo", etiqueta: "Frase del pie de página", max: 200 }
  ] },
  { clave: "sitio", titulo: "Google y redes sociales", ayuda: "Cómo aparece la página en Google y cuando se comparte por WhatsApp o redes.", campos: [
    { k: "titulo", tipo: "texto", etiqueta: "Título en Google", max: 90, obligatorio: true },
    { k: "descripcion", tipo: "parrafo", etiqueta: "Descripción en Google", max: 300 },
    { k: "compartir_titulo", tipo: "texto", etiqueta: "Título al compartir", max: 90 },
    { k: "compartir_descripcion", tipo: "parrafo", etiqueta: "Descripción al compartir", max: 300 }
  ] }
];

// Campos de un servicio (cada sección usa los que necesita).
const CAMPOS_SERVICIO = {
  nombre: { tipo: "texto", etiqueta: "Nombre", max: 90, obligatorio: true },
  etiqueta: { tipo: "texto", etiqueta: "Etiqueta (ej.: favorito, nuevo)", max: 20 },
  precio: { tipo: "precio", etiqueta: "Precio" },
  nota: { tipo: "texto", etiqueta: "Nota del precio (ej.: por persona)", max: 30 },
  detalle: { tipo: "texto", etiqueta: "Duración / detalle", max: 90 },
  descripcion: { tipo: "parrafo", etiqueta: "Descripción", max: 700 },
  medios: { tipo: "medios", etiqueta: "Fotos y videos (máximo 3; el primero es el principal)" }
};

/* =====================================================================
   Utilidades
   ===================================================================== */
function esc(texto) {
  return String(texto == null ? "" : texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const parrafo = (texto) => esc(texto).replace(/\n/g, "<br>");
const formatoPrecio = (n) => "$" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const enlaceWhatsapp = (numero, mensaje) => "https://wa.me/" + numero + (mensaje ? "?text=" + encodeURIComponent(mensaje) : "");
function telefonoVisible(numero) {
  const local = String(numero).replace(/^57(?=\d{10}$)/, "");
  return local.length === 10 ? local.slice(0, 3) + " " + local.slice(3, 6) + " " + local.slice(6) : local;
}
function slug(texto) {
  return String(texto).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "servicio";
}

// Reconoce un enlace de video y devuelve plataforma, id y si es vertical.
function analizarVideo(url) {
  let u;
  try { u = new URL(String(url || "").trim()); } catch (_) { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  const yt = (id, vertical) => (/^[\w-]{6,20}$/.test(id || "") ? { plataforma: "youtube", id, vertical } : null);
  let m;
  if (host === "youtu.be") return yt(u.pathname.slice(1).split("/")[0], false);
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if ((m = /^\/shorts\/([\w-]+)/.exec(u.pathname))) return yt(m[1], true);
    if ((m = /^\/(?:embed|live)\/([\w-]+)/.exec(u.pathname))) return yt(m[1], false);
    return yt(u.searchParams.get("v"), false);
  }
  if ((host === "vimeo.com" || host === "player.vimeo.com") && (m = /\/(\d{5,})/.exec(u.pathname))) return { plataforma: "vimeo", id: m[1], vertical: false };
  if (host === "instagram.com" && (m = /^\/(p|reel|reels|tv)\/([\w-]+)/.exec(u.pathname))) {
    return { plataforma: "instagram", id: m[2], forma: m[1] === "reels" ? "reel" : m[1], vertical: true };
  }
  if (host === "tiktok.com" && (m = /\/video\/(\d{6,})/.exec(u.pathname))) return { plataforma: "tiktok", id: m[1], vertical: true };
  if (host === "facebook.com" || host === "web.facebook.com") {
    if ((m = /^\/reel\/(\d{6,})/.exec(u.pathname))) return { plataforma: "facebook", id: m[1], forma: "reel", vertical: true };
    if ((m = /\/videos\/(?:[\w.-]+\/)?(\d{6,})/.exec(u.pathname))) return { plataforma: "facebook", id: m[1], vertical: false };
    if (/^\/watch\/?$/.test(u.pathname) && /^\d{6,}$/.test(u.searchParams.get("v") || "")) return { plataforma: "facebook", id: u.searchParams.get("v"), vertical: false };
  }
  return null;
}
function urlVideo(v) {
  if (v.plataforma === "youtube") return "https://www.youtube.com/" + (v.vertical ? "shorts/" + v.id : "watch?v=" + v.id);
  if (v.plataforma === "vimeo") return "https://vimeo.com/" + v.id;
  if (v.plataforma === "instagram") return "https://www.instagram.com/" + (v.forma || "p") + "/" + v.id + "/";
  if (v.plataforma === "facebook") return "https://www.facebook.com/" + (v.forma === "reel" ? "reel/" + v.id : "watch/?v=" + v.id);
  return "https://www.tiktok.com/@/video/" + v.id;
}
function embedVideo(v) {
  if (v.plataforma === "youtube") return "https://www.youtube-nocookie.com/embed/" + v.id + "?autoplay=1&rel=0&playsinline=1";
  if (v.plataforma === "vimeo") return "https://player.vimeo.com/video/" + v.id + "?autoplay=1";
  if (v.plataforma === "instagram") return "https://www.instagram.com/" + (v.forma || "p") + "/" + v.id + "/embed";
  if (v.plataforma === "facebook") return "https://www.facebook.com/plugins/video.php?href=" + encodeURIComponent(urlVideo(v)) + "&show_text=false&autoplay=1";
  return "https://www.tiktok.com/embed/v2/" + v.id;
}
const posterVideo = (v) => (v.plataforma === "youtube" ? "https://i.ytimg.com/vi/" + v.id + "/hqdefault.jpg" : "");

/* =====================================================================
   Validación: limpia lo que llega del panel. Las fotos que ya existían solo
   pueden venir de `rutasPermitidas` (las del contenido guardado); las nuevas
   llegan como { tipo: "foto", nueva: "clave" } y se reemplazan al subirlas.
   ===================================================================== */
function error(mensaje) {
  const e = new Error(mensaje);
  e.estado = 400;
  return e;
}

function limpiarTexto(valor, max, variasLineas, nombre, obligatorio) {
  let t = String(valor == null ? "" : valor).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "");
  t = variasLineas
    ? t.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim()
    : t.replace(/\s+/g, " ").trim();
  if (obligatorio && !t) throw error("Falta llenar «" + nombre + "».");
  if (t.length > max) throw error("«" + nombre + "» es muy largo (máximo " + max + " caracteres).");
  return t;
}

function validar(entrada, opciones) {
  const { rutasPermitidas, fotosNuevas } = opciones; // Set de rutas existentes; Set de claves de fotos nuevas
  const esObjeto = (v) => v && typeof v === "object" && !Array.isArray(v);
  if (!esObjeto(entrada)) throw error("Datos inválidos.");
  const salida = { version: Number(entrada.version) || 0 };
  const idsVistos = new Set();

  function foto(valor, nombre, permitirVacia) {
    if (!valor && permitirVacia) return null;
    if (!esObjeto(valor)) throw error("Falta la foto «" + nombre + "».");
    if (valor.nueva) {
      if (!fotosNuevas.has(valor.nueva)) throw error("Falta subir una foto de «" + nombre + "».");
      return { nueva: String(valor.nueva), alt: limpiarTexto(valor.alt, 150, false, nombre) };
    }
    if (!rutasPermitidas.has(valor.grande)) throw error("Una foto de «" + nombre + "» ya no existe. Recarga la página.");
    const resultado = { grande: valor.grande, alt: limpiarTexto(valor.alt, 150, false, nombre) };
    if (valor.mini && rutasPermitidas.has(valor.mini)) resultado.mini = valor.mini;
    return resultado;
  }

  function video(valor, nombre) {
    if (!esObjeto(valor)) throw error("Hay un video no válido en «" + nombre + "».");
    const datos = analizarVideo(valor.url);
    if (!datos) throw error("No reconozco el enlace de video en «" + nombre + "». Usa un enlace de Instagram, TikTok, YouTube, Facebook o Vimeo.");
    const resultado = { url: urlVideo(datos), ...datos };
    if (valor.titulo !== undefined) resultado.titulo = limpiarTexto(valor.titulo, 90, false, "título del video");
    return resultado;
  }

  function campo(def, valor, nombre) {
    const titulo = nombre + " · " + def.etiqueta;
    switch (def.tipo) {
      case "texto": return limpiarTexto(valor, def.max, false, titulo, def.obligatorio);
      case "parrafo": return limpiarTexto(valor, def.max, true, titulo, def.obligatorio);
      case "interruptor": return valor === true;
      case "foto": return foto(valor, titulo, false);
      case "precio": {
        const n = Number(valor);
        if (!Number.isInteger(n) || n < 1000 || n > 50000000) throw error("El precio de «" + nombre + "» no es válido.");
        return n;
      }
      case "telefono": {
        const d = String(valor == null ? "" : valor).replace(/\D/g, "");
        if (!d && !def.obligatorio) return "";
        if (!/^57\d{10}$/.test(d)) throw error("«" + def.etiqueta + "» debe tener los 10 números del celular.");
        return d;
      }
      case "email": {
        const t = limpiarTexto(valor, 120, false, titulo);
        if (t && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) throw error("El correo no es válido.");
        return t;
      }
      case "url": {
        const t = limpiarTexto(valor, 300, false, titulo);
        if (!t) return "";
        let u;
        try { u = new URL(t); } catch (_) { throw error("«" + def.etiqueta + "» no es un enlace válido."); }
        if (u.protocol !== "https:") throw error("«" + def.etiqueta + "» debe empezar por https://");
        return u.href;
      }
      case "lista": {
        if (!Array.isArray(valor)) throw error("Datos inválidos en «" + titulo + "».");
        const lista = valor.map((v) => limpiarTexto(v, def.max, false, titulo)).filter(Boolean);
        if (lista.length > def.maxItems) throw error("«" + titulo + "» admite máximo " + def.maxItems + ".");
        if (def.minItems && lista.length < def.minItems) throw error("«" + titulo + "» necesita al menos " + def.minItems + ".");
        return lista;
      }
      case "horarios": {
        if (!Array.isArray(valor) || valor.length > 4) throw error("Revisa los horarios (máximo 4 líneas).");
        return valor.map((h) => ({
          dias: limpiarTexto(h && h.dias, 40, false, "Días", true),
          corto: limpiarTexto(h && h.corto, 24, false, "Días en corto"),
          horas: limpiarTexto(h && h.horas, 40, false, "Horas", true)
        }));
      }
      case "cifras": {
        if (!Array.isArray(valor) || valor.length !== 3) throw error("Las cifras deben ser 3.");
        return valor.map((c) => {
          const n = Number(c && c.numero);
          if (!c.auto && (!Number.isInteger(n) || n < 0 || n > 99999)) throw error("Revisa los números de las cifras.");
          return { numero: c.auto ? 0 : n, texto: limpiarTexto(c.texto, 40, false, "Texto de la cifra", true), mas: c.mas === true, auto: c.auto === true };
        });
      }
      case "pasos": {
        if (!Array.isArray(valor) || valor.length < 1 || valor.length > 4) throw error("Los pasos deben ser entre 1 y 4.");
        return valor.map((p) => ({ titulo: limpiarTexto(p && p.titulo, 40, false, "Título del paso", true), texto: limpiarTexto(p && p.texto, 200, true, "Texto del paso") }));
      }
      case "videos": {
        if (!Array.isArray(valor) || valor.length > MAX_VIDEOS) throw error("Máximo " + MAX_VIDEOS + " videos.");
        return valor.map((v) => video(v, titulo));
      }
      case "servicios": {
        if (!Array.isArray(valor) || valor.length > MAX_SERVICIOS) throw error("Máximo " + MAX_SERVICIOS + " servicios por sección.");
        return valor.map((s) => {
          if (!esObjeto(s)) throw error("Hay un servicio no válido.");
          const nombreServicio = limpiarTexto(s.nombre, 90, false, "Nombre del servicio", true);
          let id = /^[a-z0-9-]{1,60}$/.test(s.id || "") ? s.id : slug(nombreServicio);
          for (let n = 2; idsVistos.has(id); n++) id = slug(nombreServicio) + "-" + n;
          idsVistos.add(id);
          const resultado = { id };
          for (const k of def.campos) {
            const sub = CAMPOS_SERVICIO[k];
            if (k === "medios") {
              const medios = Array.isArray(s.medios) ? s.medios : [];
              if (medios.length > MAX_FOTOS_SERVICIO) throw error("«" + nombreServicio + "» puede tener máximo " + MAX_FOTOS_SERVICIO + " fotos o videos.");
              resultado.medios = medios.map((m) => (m && m.tipo === "video"
                ? { tipo: "video", ...video(m, nombreServicio) }
                : { tipo: "foto", ...foto(m, nombreServicio, false) }));
            } else {
              resultado[k] = campo(sub, s[k], nombreServicio);
            }
          }
          return resultado;
        });
      }
      default: throw new Error("Tipo de campo desconocido: " + def.tipo);
    }
  }

  for (const seccion of ESQUEMA) {
    const valor = entrada[seccion.clave];
    if (!esObjeto(valor)) throw error("Falta la sección «" + seccion.titulo + "».");
    salida[seccion.clave] = {};
    for (const def of seccion.campos) salida[seccion.clave][def.k] = campo(def, valor[def.k], seccion.titulo);
  }
  // Alt de las fotos de servicios: el nombre del servicio.
  for (const clave of SECCIONES_SERVICIOS) {
    for (const s of salida[clave].servicios) for (const m of s.medios) if (m.tipo === "foto" && !m.alt) m.alt = s.nombre;
  }
  return salida;
}

// Todas las rutas de fotos que aparecen en un contenido (para permitirlas al guardar).
function rutasDeFotos(contenido) {
  const rutas = new Set();
  const visitar = (v) => {
    if (Array.isArray(v)) v.forEach(visitar);
    else if (v && typeof v === "object") {
      if (typeof v.grande === "string") rutas.add(v.grande);
      if (typeof v.mini === "string") rutas.add(v.mini);
      Object.values(v).forEach(visitar);
    }
  };
  visitar(contenido);
  return rutas;
}

/* =====================================================================
   Generación de index.html
   ===================================================================== */
const ICONO_WHATSAPP = '<path fill="currentColor" d="M12 2a10 10 0 0 0-8.66 15L2 22l5.16-1.32A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.06.78.82-2.98-.2-.31A8.2 8.2 0 1 1 12 20.2Zm4.5-6.13c-.25-.12-1.47-.72-1.7-.8s-.39-.13-.56.12-.64.8-.78.97-.29.19-.54.06a6.7 6.7 0 0 1-3.35-2.93c-.25-.43.25-.4.72-1.33a.45.45 0 0 0-.02-.43c-.06-.12-.56-1.34-.76-1.84s-.4-.42-.56-.43h-.48a.93.93 0 0 0-.67.31 2.81 2.81 0 0 0-.87 2.09 4.89 4.89 0 0 0 1.02 2.58 11.16 11.16 0 0 0 4.27 3.77 14.3 14.3 0 0 0 1.42.53 3.42 3.42 0 0 0 1.57.1 2.57 2.57 0 0 0 1.68-1.19 2.08 2.08 0 0 0 .14-1.19c-.06-.1-.23-.17-.48-.29Z"/>';
const ICONOS_REDES = {
  instagram: '<path fill="currentColor" d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.26.07 1.64.07 4.85s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.26.06-1.64.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.4 2.2 8.8 2.2 12 2.2m0-2.2C8.74 0 8.33 0 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 0 0-2.13 1.38A5.9 5.9 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05 0 8.33 0 8.74 0 12s0 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13a5.9 5.9 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 24 8.74 24 12 24s3.67 0 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.07-1.28.07-1.69.07-4.95s0-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67 0 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84Zm0 10.15A4 4 0 1 1 16 12a4 4 0 0 1-4 4Zm7.85-10.4a1.44 1.44 0 1 1-1.44-1.44 1.44 1.44 0 0 1 1.44 1.44Z"/>',
  facebook: '<path fill="currentColor" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07Z"/>',
  tiktok: '<path fill="currentColor" d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>'
};
const ZIGZAG = '<path d="M2 20 L18 4 L34 20 L50 4 L66 20 L82 4 L98 20 L114 4" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';

// Redes sociales en el orden en que se muestran. La primera que tenga enlace es la principal:
// aparece en la barra de arriba y, en el cierre y el pie de página, con su @usuario.
const REDES = ["instagram", "facebook", "tiktok"];
const NOMBRE_RED = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };

// "@usuario" de un enlace de Instagram o TikTok; vacío si el enlace no lo dice (por ejemplo, en Facebook).
function usuarioRed(red, url) {
  let u;
  try { u = new URL(url); } catch (_) { return ""; }
  const parte = u.pathname.split("/").filter(Boolean)[0] || "";
  if (red === "instagram" && /^[\w.]{1,30}$/.test(parte) && !/^(p|reel|reels|tv|stories|explore)$/i.test(parte)) return "@" + parte;
  if (red === "tiktok" && /^@[\w.]{1,30}$/.test(parte)) return parte;
  return "";
}
const iconoRed = (red, tamano) => '<svg viewBox="0 0 24 24" width="' + tamano + '" height="' + tamano + '" aria-hidden="true">' + ICONOS_REDES[red] + "</svg>";

// Un enlace por red: la principal con su @usuario, las demás solo con el ícono.
function enlacesRedes(c, sangria) {
  return REDES.filter((red) => c.contacto[red]).map((red, i) => {
    const usuario = i === 0 ? usuarioRed(red, c.contacto[red]) : "";
    return sangria + "<a" + (usuario ? ' class="red-usuario"' : "") + ' href="' + esc(c.contacto[red]) + '" target="_blank" rel="noopener" aria-label="' +
      NOMBRE_RED[red] + " de " + esc(c.marca.nombre) + (usuario ? ": " + esc(usuario) : "") + '">' + iconoRed(red, 18) + (usuario ? "<span>" + esc(usuario) + "</span>" : "") + "</a>";
  });
}

const titulo = (t, destacado, salto) => esc(t) + (destacado ? (salto ? "<br />" : " ") + "<em>" + esc(destacado) + "</em>" : "");

// Fotos y videos de un servicio. Miniatura (listas) o portada deslizable (tarjetas).
function galeria(servicio, tipo) {
  const items = servicio.medios.map((m) => {
    if (m.tipo === "video") {
      const poster = posterVideo(m);
      return '<span class="media media-video" data-video="' + esc(embedVideo(m)) + '" data-plataforma="' + m.plataforma + '"' +
        (m.vertical ? ' data-vertical="1"' : "") + ' role="img" aria-label="Video: ' + esc(servicio.nombre) + '"' +
        (poster ? ' style="background-image: url(\'' + esc(poster) + '\')"' : "") + "></span>";
    }
    const src = tipo === "mini" && m.mini ? m.mini : m.grande;
    return '<img class="media" src="' + esc(src) + '" data-grande="' + esc(m.grande) + '" alt="' + esc(m.alt || servicio.nombre) + '" loading="lazy" decoding="async" />';
  }).join("");
  const extra = tipo === "mini" ? ' role="button" tabindex="0"' : "";
  return '<div class="galeria galeria-' + tipo + '" data-galeria="' + esc(servicio.id) + '" data-cantidad="' + servicio.medios.length + '"' + extra + ">" + items + "</div>";
}

function cabecera(s, sangria) {
  const lineas = [];
  if (s.etiqueta) lineas.push('<p class="kicker reveal">' + esc(s.etiqueta) + "</p>");
  lineas.push('<h2 class="section-title reveal">' + titulo(s.titulo, s.destacado) + "</h2>");
  if (s.intro) lineas.push('<p class="section-sub reveal">' + parrafo(s.intro) + "</p>");
  if (s.regalo) lineas.push('<p class="gift reveal">🎁 De regalito: <strong>' + esc(s.regalo) + "</strong></p>");
  return lineas.map((l) => sangria + l).join("\n");
}

function renderizar(c) {
  const ct = c.contacto;
  const reservar = enlaceWhatsapp(ct.whatsapp, ct.mensaje);
  const horarioCorto = (h) => (h.corto || h.dias) + " · " + h.horas;
  const visibles = SECCIONES_SERVICIOS.filter((k) => c[k].visible && c[k].servicios.length);
  const hayVideos = c.videos.visible && c.videos.lista.length > 0;
  const totalServicios = visibles.reduce((n, k) => n + c[k].servicios.length, 0);
  const portada = c.portada.foto;
  const aviso = c.aviso.visible && c.aviso.texto;
  const L = []; // líneas del documento

  L.push(
    "<!doctype html>",
    '<html lang="es" class="no-js">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <script>document.documentElement.classList.remove("no-js");</script>',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    "  <title>" + esc(c.sitio.titulo) + "</title>",
    '  <meta name="description" content="' + esc(c.sitio.descripcion) + '" />',
    '  <link rel="canonical" href="' + SITIO_URL + '" />',
    '  <meta property="og:type" content="website" />',
    '  <meta property="og:title" content="' + esc(c.sitio.compartir_titulo || c.sitio.titulo) + '" />',
    '  <meta property="og:description" content="' + esc(c.sitio.compartir_descripcion || c.sitio.descripcion) + '" />',
    '  <meta property="og:url" content="' + SITIO_URL + '" />',
    '  <meta property="og:image" content="' + SITIO_URL + esc(portada.grande) + '" />',
    '  <meta property="og:locale" content="es_CO" />',
    '  <link rel="icon" type="image/png" sizes="32x32" href="assets/brand/favicon-32.png" />',
    '  <link rel="icon" type="image/png" sizes="16x16" href="assets/brand/favicon-16.png" />',
    '  <link rel="apple-touch-icon" sizes="180x180" href="assets/brand/apple-touch-icon.png" />',
    "",
    '  <link rel="preconnect" href="https://fonts.googleapis.com" />',
    '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
    '  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Montserrat:wght@300;400;500;600&display=swap" />',
    "",
    '  <link rel="preload" as="image" href="' + esc(portada.grande) + '" fetchpriority="high" />',
    '  <link rel="stylesheet" href="styles.css?v=' + VERSION_ARCHIVOS + '" />',
    "</head>",
    "<body" + (aviso ? ' class="con-aviso"' : "") + ">",
    '  <a class="skip-link" href="#main">Saltar al contenido</a>',
    "",
    "  <!-- ============================ NAV ============================ -->",
    '  <header class="nav" data-nav>'
  );
  if (aviso) L.push('    <p class="aviso">' + esc(c.aviso.texto) + "</p>");
  L.push(
    '    <div class="nav-inner">',
    '      <a class="nav-brand" href="#inicio">',
    '        <span class="nav-brand-name">' + esc(c.marca.nombre) + "</span>",
    '        <span class="nav-brand-tag">' + esc(c.marca.lema) + "</span>",
    "      </a>",
    '      <nav class="nav-links" data-nav-links aria-label="Navegación principal">',
    '        <a href="#nosotros">Nosotros</a>'
  );
  for (const k of visibles) L.push('        <a href="#' + k + '">' + esc(c[k].menu) + "</a>");
  if (hayVideos) L.push('        <a href="#videos">' + esc(c.videos.menu) + "</a>");
  L.push('        <a href="#contacto">Contacto</a>', "      </nav>");
  const principal = REDES.find((red) => ct[red]);
  if (principal) {
    L.push('      <a class="nav-red" href="' + esc(ct[principal]) + '" target="_blank" rel="noopener" aria-label="' + NOMBRE_RED[principal] + " de " + esc(c.marca.nombre) + '">' + iconoRed(principal, 20) + "</a>");
  }
  L.push(
    '      <a class="btn btn-primary nav-cta" href="' + esc(reservar) + '" target="_blank" rel="noopener">Reservar</a>',
    '      <button class="nav-burger" data-burger aria-label="Abrir menú" aria-expanded="false">',
    "        <span></span><span></span><span></span>",
    "      </button>",
    "    </div>",
    "  </header>",
    "",
    '  <main id="main">',
    "    <!-- ============================ HERO ============================ -->",
    '    <section class="hero" id="inicio">',
    '      <div class="hero-blob" aria-hidden="true"></div>',
    '      <svg class="squiggle squiggle-hero" viewBox="0 0 120 24" aria-hidden="true">' + ZIGZAG + "</svg>",
    '      <div class="hero-inner">',
    '        <div class="hero-copy">'
  );
  if (c.portada.etiqueta) L.push('          <p class="kicker reveal">' + esc(c.portada.etiqueta) + "</p>");
  L.push('          <h1 class="hero-title reveal">' + titulo(c.portada.titulo, c.portada.destacado, true) + "</h1>");
  if (c.portada.texto) L.push('          <p class="hero-sub reveal">' + parrafo(c.portada.texto) + "</p>");
  if (c.portada.lema) L.push('          <p class="hero-tagline reveal">' + parrafo(c.portada.lema) + "</p>");
  L.push(
    '          <div class="hero-actions reveal">',
    '            <a class="btn btn-primary" href="' + esc(reservar) + '" target="_blank" rel="noopener">',
    '              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' + ICONO_WHATSAPP + "</svg>",
    "              " + esc(c.portada.boton),
    "            </a>",
    '            <a class="btn btn-ghost" href="#' + (visibles[0] || "contacto") + '">Explorar servicios</a>',
    "          </div>"
  );
  if (ct.horarios.length) {
    L.push('          <div class="hero-chips reveal">');
    for (const h of ct.horarios) L.push('            <span class="chip">' + esc(horarioCorto(h)) + "</span>");
    L.push("          </div>");
  }
  L.push(
    "        </div>",
    '        <div class="hero-media reveal">',
    '          <figure class="hero-figure">',
    '            <img src="' + esc(portada.grande) + '" alt="' + esc(portada.alt) + '" fetchpriority="high" loading="eager" />',
    "          </figure>",
    '          <div class="hero-dots" aria-hidden="true"><span></span><span></span><span></span></div>',
    "        </div>",
    "      </div>",
    "    </section>",
    "",
    "    <!-- ============================ MARQUEE ============================ -->",
    '    <div class="marquee" aria-hidden="true">',
    '      <div class="marquee-track">'
  );
  const cinta = c.cinta.frases.map((f) => "<span>" + esc(f) + "</span><i>✿</i>").join("");
  L.push("        " + cinta, "        " + cinta, "      </div>", "    </div>");

  // Nosotros
  const n = c.nosotros;
  L.push(
    "",
    "    <!-- ============================ NOSOTROS ============================ -->",
    '    <section class="about section" id="nosotros">',
    '      <div class="container about-grid">',
    '        <div class="about-media reveal">',
    '          <figure class="about-figure">',
    '            <img src="' + esc(n.foto.grande) + '" alt="' + esc(n.foto.alt) + '" loading="lazy" decoding="async" />',
    "          </figure>",
    '          <svg class="squiggle squiggle-about" viewBox="0 0 120 24" aria-hidden="true">' + ZIGZAG + "</svg>",
    "        </div>",
    '        <div class="about-copy">'
  );
  if (n.etiqueta) L.push('          <p class="kicker reveal">' + esc(n.etiqueta) + "</p>");
  L.push('          <h2 class="section-title reveal">' + titulo(n.titulo, n.destacado) + "</h2>");
  if (n.texto) L.push('          <p class="lead reveal">' + parrafo(n.texto) + "</p>");
  L.push('          <ul class="stats reveal">');
  for (const cifra of n.cifras) {
    const numero = cifra.auto ? totalServicios : cifra.numero;
    L.push("            <li" + (cifra.mas ? ' class="plus"' : "") + '><strong data-count-to="' + numero + '">0</strong><span>' + esc(cifra.texto) + "</span></li>");
  }
  L.push("          </ul>");
  if (n.cobertura) L.push('          <p class="about-coverage reveal">' + esc(n.cobertura) + "</p>");
  L.push("        </div>", "      </div>", "    </section>");

  // Masajes
  if (visibles.includes("masajes")) {
    const s = c.masajes;
    const mitad = Math.ceil(s.servicios.length / 2);
    const columnas = [s.servicios.slice(0, mitad), s.servicios.slice(mitad)].filter((col) => col.length);
    L.push(
      "",
      "    <!-- ============================ MASAJES ============================ -->",
      '    <section class="masajes section section-sage" id="masajes">',
      '      <div class="container">',
      '        <header class="section-head">',
      cabecera(s, "          "),
      "        </header>",
      '        <div class="menu-grid">'
    );
    for (const columna of columnas) {
      L.push('          <ul class="menu-list reveal">');
      for (const m of columna) {
        L.push("            <li>" + galeria(m, "mini") + '<div class="menu-item"><div class="menu-row"><span class="menu-name"><span>' + esc(m.nombre) + "</span>" +
          (m.etiqueta ? ' <em class="tag">' + esc(m.etiqueta) + "</em>" : "") + '</span><span class="menu-dots"></span><span class="menu-price">' + formatoPrecio(m.precio) +
          '</span></div><p class="menu-desc">' + parrafo(m.descripcion) + "</p></div></li>");
      }
      L.push("          </ul>");
    }
    L.push(
      "        </div>",
      '        <div class="section-cta reveal">',
      '          <a class="btn btn-primary" href="' + esc(enlaceWhatsapp(ct.whatsapp, s.mensaje || ct.mensaje)) + '" target="_blank" rel="noopener">' + esc(s.boton) + "</a>",
      "        </div>",
      "      </div>",
      "    </section>"
    );
  }

  // Faciales
  if (visibles.includes("faciales")) {
    const s = c.faciales;
    L.push(
      "",
      "    <!-- ============================ FACIALES ============================ -->",
      '    <section class="faciales section" id="faciales">',
      '      <div class="container split-grid">',
      '        <div class="split-copy">',
      cabecera(s, "          "),
      '          <ul class="feature-list reveal">'
    );
    for (const f of s.servicios) {
      L.push(
        "            <li>",
        "              " + galeria(f, "mini"),
        '              <div class="feature-body">',
        '                <div class="feature-head"><h3>' + esc(f.nombre) + '</h3><span class="feature-price">' + formatoPrecio(f.precio) + "</span></div>",
        "                <p><span>" + parrafo(f.descripcion) + "</span> <small>" + esc(f.detalle) + "</small></p>",
        "              </div>",
        "            </li>"
      );
    }
    L.push(
      "          </ul>",
      "        </div>",
      '        <div class="split-media reveal">',
      '          <figure class="split-figure">',
      '            <img src="' + esc(s.foto.grande) + '" alt="' + esc(s.foto.alt) + '" loading="lazy" decoding="async" />',
      "          </figure>",
      '          <div class="hero-dots" aria-hidden="true"><span></span><span></span><span></span></div>',
      "        </div>",
      "      </div>",
      "    </section>"
    );
  }

  // Programas: los dos primeros destacados; si los demás quedan impares, el último va a lo ancho.
  if (visibles.includes("programas")) {
    const s = c.programas;
    const tarjeta = (p, ancha) => [
      '          <article class="program-card program-card-photo' + (ancha ? " program-card-wide" : "") + ' reveal">',
      "            " + galeria(p, "portada"),
      '            <div class="program-body">',
      '              <div class="program-top"><h3>' + esc(p.nombre) + '</h3><span class="program-price">' +
        (p.nota ? "<span>" + formatoPrecio(p.precio) + "</span> <small>" + esc(p.nota) + "</small>" : formatoPrecio(p.precio)) + "</span></div>",
      '              <p class="program-meta">' + esc(p.detalle) + "</p>",
      "              <p>" + parrafo(p.descripcion) + "</p>",
      "            </div>",
      "          </article>"
    ];
    const destacados = s.servicios.slice(0, 2);
    const resto = s.servicios.slice(2);
    L.push(
      "",
      "    <!-- ============================ PROGRAMAS SPA ============================ -->",
      '    <section class="programas section section-sand" id="programas">',
      '      <div class="container">',
      '        <header class="section-head">',
      cabecera(s, "          "),
      "        </header>",
      "",
      '        <div class="program-featured">'
    );
    destacados.forEach((p) => L.push(...tarjeta(p, false)));
    L.push("        </div>");
    if (resto.length) {
      L.push("", '        <div class="program-grid">');
      resto.forEach((p, i) => L.push(...tarjeta(p, resto.length % 2 === 1 && i === resto.length - 1)));
      L.push("        </div>");
    }
    L.push("      </div>", "    </section>");
  }

  // Post-quirúrgico
  if (visibles.includes("postquirurgico")) {
    const s = c.postquirurgico;
    L.push(
      "",
      "    <!-- ============================ POST-QUIRÚRGICO ============================ -->",
      '    <section class="post section" id="postquirurgico">',
      '      <div class="container">',
      '        <header class="section-head">',
      cabecera(s, "          "),
      "        </header>",
      '        <div class="post-grid">'
    );
    s.servicios.forEach((p, i) => L.push(
      '          <article class="post-card post-card-photo reveal">',
      "            " + galeria(p, "portada"),
      '            <div class="post-body">',
      '              <span class="post-num">' + String(i + 1).padStart(2, "0") + "</span>",
      "              <h3>" + esc(p.nombre) + "</h3>",
      "              <p>" + parrafo(p.descripcion) + "</p>",
      '              <span class="post-price">' + formatoPrecio(p.precio) + "</span>",
      "            </div>",
      "          </article>"
    ));
    L.push("        </div>", "      </div>", "    </section>");
  }

  // Videos
  if (hayVideos) {
    const s = c.videos;
    L.push(
      "",
      "    <!-- ============================ VIDEOS ============================ -->",
      '    <section class="videos section" id="videos">',
      '      <div class="container">',
      '        <header class="section-head">',
      cabecera(s, "          "),
      "        </header>",
      '        <div class="videos-grid">'
    );
    for (const v of s.lista) {
      const poster = posterVideo(v);
      L.push('          <button class="video-card reveal" type="button" data-video="' + esc(embedVideo(v)) + '" data-plataforma="' + v.plataforma + '"' +
        (v.vertical ? ' data-vertical="1"' : "") + (poster ? ' style="background-image: url(\'' + esc(poster) + '\')"' : "") +
        ' aria-label="Ver video' + (v.titulo ? ": " + esc(v.titulo) : "") + '">' + (v.titulo ? '<span class="video-titulo">' + esc(v.titulo) + "</span>" : "") + "</button>");
    }
    L.push("        </div>", "      </div>", "    </section>");
  }

  // Pasos
  if (c.pasos.visible) {
    const s = c.pasos;
    L.push(
      "",
      "    <!-- ============================ CÓMO FUNCIONA ============================ -->",
      '    <section class="steps section section-sage">',
      '      <div class="container">',
      '        <header class="section-head">',
      cabecera(s, "          "),
      "        </header>",
      '        <ol class="steps-grid">'
    );
    s.lista.forEach((p, i) => L.push('          <li class="reveal"><span class="step-num">' + String(i + 1).padStart(2, "0") + "</span><h3>" + esc(p.titulo) + "</h3><p>" + parrafo(p.texto) + "</p></li>"));
    L.push("        </ol>", "      </div>", "    </section>");
  }

  // Cierre
  const r = c.reserva;
  L.push(
    "",
    "    <!-- ============================ CTA FINAL ============================ -->",
    '    <section class="cta" id="contacto">',
    '      <img class="cta-bg" src="' + esc(r.foto.grande) + '" alt="" aria-hidden="true" loading="lazy" decoding="async" />',
    '      <div class="cta-overlay" aria-hidden="true"></div>',
    '      <div class="cta-inner">'
  );
  if (r.etiqueta) L.push('        <p class="kicker reveal">' + esc(r.etiqueta) + "</p>");
  L.push('        <h2 class="reveal">' + titulo(r.titulo, r.destacado) + "</h2>");
  if (r.texto) L.push('        <p class="cta-sub reveal">' + parrafo(r.texto) + "</p>");
  L.push(
    '        <div class="cta-actions reveal">',
    '          <a class="btn btn-light" href="' + esc(reservar) + '" target="_blank" rel="noopener">WhatsApp · ' + telefonoVisible(ct.whatsapp) + "</a>"
  );
  if (ct.whatsapp_2) L.push('          <a class="btn btn-outline-light" href="' + esc(enlaceWhatsapp(ct.whatsapp_2, ct.mensaje)) + '" target="_blank" rel="noopener">WhatsApp · ' + telefonoVisible(ct.whatsapp_2) + "</a>");
  L.push("        </div>");
  if (ct.horarios.length) L.push('        <p class="cta-schedule reveal">' + ct.horarios.map((h) => esc(horarioCorto(h))).join(" &nbsp;·&nbsp; ") + "</p>");
  const redes = enlacesRedes(c, "          ");
  if (redes.length) L.push('        <div class="cta-redes reveal">', '          <p class="cta-redes-titulo">Síguenos</p>', ...redes, "        </div>");
  L.push("      </div>", "    </section>", "  </main>");

  // Pie de página
  L.push(
    "",
    "  <!-- ============================ FOOTER ============================ -->",
    '  <footer class="footer">',
    '    <div class="container footer-grid">',
    '      <div class="footer-brand">',
    '        <img class="footer-logo-mark" src="assets/brand/olive-spa-logo.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />',
    '        <p class="footer-logo">' + esc(c.marca.nombre) + "</p>",
    '        <p class="footer-tag">' + esc(c.marca.lema.charAt(0).toUpperCase() + c.marca.lema.slice(1)) + "</p>"
  );
  if (c.marca.mision) L.push('        <p class="footer-mission">' + parrafo(c.marca.mision) + "</p>");
  if (redes.length) L.push('        <div class="footer-social">', ...redes, "        </div>");
  L.push(
    "      </div>",
    '      <div class="footer-col">',
    "        <h4>Contacto</h4>",
    "        <ul>",
    '          <li><a href="https://wa.me/' + ct.whatsapp + '" target="_blank" rel="noopener">+57 ' + telefonoVisible(ct.whatsapp) + "</a></li>"
  );
  if (ct.whatsapp_2) L.push('          <li><a href="https://wa.me/' + ct.whatsapp_2 + '" target="_blank" rel="noopener">+57 ' + telefonoVisible(ct.whatsapp_2) + "</a></li>");
  if (ct.email) L.push('          <li><a href="mailto:' + esc(ct.email) + '">' + esc(ct.email) + "</a></li>");
  L.push("        </ul>", "      </div>");
  if (ct.horarios.length) {
    L.push('      <div class="footer-col">', "        <h4>Horarios</h4>", "        <ul>");
    for (const h of ct.horarios) L.push("          <li>" + esc(h.dias) + "<br />" + esc(h.horas) + "</li>");
    L.push("        </ul>", "      </div>");
  }
  if (ct.cobertura.length) {
    L.push('      <div class="footer-col">', "        <h4>Cobertura</h4>", "        <ul>");
    for (const zona of ct.cobertura) L.push("          <li>" + esc(zona) + "</li>");
    L.push("        </ul>", "      </div>");
  }
  L.push(
    "    </div>",
    '    <div class="container footer-bottom">',
    "      <p>© <span data-year>2026</span> " + esc(c.marca.nombre) + " · Todos los derechos reservados</p>",
    '      <p class="footer-credits">Fotografías de repositorios gratuitos bajo licencias Creative Commons. <a href="creditos.html">Créditos fotográficos →</a></p>',
    "    </div>",
    "  </footer>",
    "",
    "  <!-- WhatsApp flotante -->",
    '  <a class="wa-float" href="' + esc(reservar) + '" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">',
    '    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">' + ICONO_WHATSAPP + "</svg>",
    "  </a>",
    "",
    '  <script defer src="lib/gsap.min.js"></script>',
    '  <script defer src="lib/ScrollTrigger.min.js"></script>',
    '  <script defer src="main.js?v=' + VERSION_ARCHIVOS + '"></script>',
    "</body>",
    "</html>",
    ""
  );
  return L.join("\n");
}

// Versión de styles.css y main.js (cambiarla cuando cambien esos archivos, para que los navegadores los recarguen).
const VERSION_ARCHIVOS = "2026102801";

module.exports = { ESQUEMA, CAMPOS_SERVICIO, SECCIONES_SERVICIOS, MAX_FOTOS_SERVICIO, MAX_SERVICIOS, MAX_VIDEOS, validar, renderizar, rutasDeFotos, analizarVideo, slug };
