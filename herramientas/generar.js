// Regenera index.html a partir de contenido.json (lo mismo que hace el panel al guardar).
// Úsalo si editas contenido.json a mano o si cambias el diseño en api/_sitio.js:
//   node herramientas/generar.js
"use strict";
const fs = require("fs");
const path = require("path");
const sitio = require("../api/_sitio");

const raiz = path.resolve(__dirname, "..");
const contenido = JSON.parse(fs.readFileSync(path.join(raiz, "contenido.json"), "utf8"));
const limpio = sitio.validar(contenido, { rutasPermitidas: sitio.rutasDeFotos(contenido), fotosNuevas: new Set() });

const faltan = [...sitio.rutasDeFotos(limpio)].filter((ruta) => !fs.existsSync(path.join(raiz, ruta)));
if (faltan.length) {
  console.error("Estas fotos no existen en el proyecto:\n  " + faltan.join("\n  "));
  process.exit(1);
}

fs.writeFileSync(path.join(raiz, "index.html"), sitio.renderizar(limpio));
console.log("index.html generado desde contenido.json (versión " + limpio.version + ").");
