# Olivé Spa — Landing page

Una misión clara: llevarte la experiencia completa de un spa directamente a la puerta de tu casa, con la misma calidad, calidez y profesionalismo que encontrarías en los mejores centros de la ciudad.

## Sitio web

Landing page estática (HTML + CSS + JS vanilla, sin build step) con los servicios del brochure: masajes de relajación, tratamientos faciales, programas spa y terapias post-quirúrgicas.

- **Sitio oficial:** https://olivespamedellin.com
- Desplegado en Vercel desde esta rama (`main`); cada push a `main` actualiza el sitio en vivo automáticamente.

## Estructura

```
index.html        ← landing principal
creditos.html     ← créditos fotográficos (licencias Creative Commons)
styles.css        ← estilos
main.js           ← interacciones (nav, reveals, contadores)
lib/              ← GSAP + ScrollTrigger + datos de marca
assets/img/       ← fotografías (repositorios gratuitos, ver créditos)
assets/img/servicios/ ← foto inicial de cada servicio (repositorios gratuitos, ver créditos)
assets/img/panel/ ← fotos subidas desde el panel
panel/            ← panel privado de administración (se abre en /tarifas)
api/panel.js      ← función de Vercel que valida el acceso y guarda los cambios
vercel.json       ← muestra panel/ en la dirección /tarifas
```

Las fotografías provienen de repositorios gratuitos bajo licencias Creative Commons / dominio público (vía Openverse); la atribución completa está en `creditos.html`.

## Panel de administración

`/tarifas` es un panel privado (no enlazado desde el sitio y marcado `noindex`) para que la dueña cambie desde el celular los precios, nombres, descripciones y fotos. Al tocar **Guardar y publicar**, `api/panel.js` guarda todo en un solo commit en `main` (el `index.html` actualizado y las fotos nuevas en `assets/img/panel/`), y Vercel lo publica solo en 1–2 minutos.

Lo editable está marcado en `index.html`; lo que no lleve estas marcas no aparece en el panel:

| Marca | Qué edita | Contenido permitido |
|---|---|---|
| `data-tarifa="id"` | precio | solo el texto del precio (`$350.000`) |
| `data-texto="id:nombre"` | nombre del servicio | solo texto |
| `data-texto="id:descripcion"` | descripción (si queda vacía, no se muestra) | texto y `<br>` |
| `data-texto="id:detalle"` | duración o detalle | solo texto |
| `data-foto="id"` | foto de una sección (`img`; también el `link` de precarga y el `og:image` de la portada) | — |
| `data-galeria="id"` | hasta 3 fotos del servicio; la primera es la principal | solo `<img>` con `src` (la que se ve) y `data-grande` (la que se abre en grande) |

- Un servicio nuevo necesita su `data-tarifa`, sus `data-texto` y su `data-galeria` con el mismo `id`; una foto de sección lleva además `data-foto-etiqueta` con el nombre que se ve en el panel.
- Galerías: `galeria-mini` (masajes y faciales) muestra una miniatura con contador y usa la versión `-mini.jpg`; `galeria-portada` (programas y post-quirúrgico) es una portada deslizable con puntos. En ambas, tocar la foto abre el visor en grande (`main.js`).
- El panel convierte las fotos a JPEG liviano (grande máx. 1400 px y miniatura máx. 480 px) antes de subirlas.
- Si se agrega una foto de un repositorio gratuito, su crédito va en `creditos.html` y `assets/credits.json`.
- El panel también hace commits en `main`: haz `git pull` antes de editar en local.

Variables de entorno en Vercel (Settings → Environment Variables, entorno Production):

| Variable | Contenido |
|---|---|
| `PANEL_USUARIO` | usuario del panel |
| `PANEL_CLAVE` | contraseña del panel |
| `GITHUB_TOKEN` | token *fine-grained* de GitHub con acceso solo a este repositorio y permiso **Contents: Read and write** |

Para cambiar la contraseña o renovar el token vencido: edita la variable en Vercel y vuelve a desplegar (Deployments → Redeploy). Cambiar cualquiera de las dos cierra las sesiones abiertas del panel.
