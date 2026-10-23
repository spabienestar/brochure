# Olivé Spa — Landing page

Una misión clara: llevarte la experiencia completa de un spa directamente a la puerta de tu casa, con la misma calidad, calidez y profesionalismo que encontrarías en los mejores centros de la ciudad.

## Sitio web

Landing page estática (HTML + CSS + JS vanilla, sin build step) con los servicios del brochure: masajes de relajación, tratamientos faciales, programas spa y terapias post-quirúrgicas.

- **Sitio oficial:** https://olivespamedellin.com
- Desplegado en Vercel desde esta rama (`main`); cada push a `main` actualiza el sitio en vivo automáticamente.

## Estructura

```
contenido.json    ← TODO el contenido de la página (textos, precios, servicios, fotos, videos, contacto, SEO)
index.html        ← landing principal, GENERADA a partir de contenido.json (no editar a mano)
creditos.html     ← créditos fotográficos (licencias Creative Commons)
styles.css        ← estilos
main.js           ← interacciones (nav, reveals, contadores, galerías y visor de fotos/videos)
lib/              ← GSAP + ScrollTrigger
assets/img/       ← fotografías (repositorios gratuitos, ver créditos)
assets/img/servicios/ ← foto inicial de cada servicio (repositorios gratuitos, ver créditos)
assets/img/panel/ ← fotos subidas desde el panel
panel/            ← panel privado de administración (se abre en /tarifas)
api/panel.js      ← función de Vercel: acceso al panel y publicación de los cambios
api/_sitio.js     ← qué se puede editar (esquema), validación y generación de index.html
herramientas/generar.js ← regenera index.html desde contenido.json
vercel.json       ← muestra panel/ en la dirección /tarifas
```

Las fotografías provienen de repositorios gratuitos bajo licencias Creative Commons / dominio público (vía Openverse); la atribución completa está en `creditos.html`.

## Cómo funciona el contenido

Todo lo que se ve en la página vive en `contenido.json`, y `index.html` se genera a partir de él con `api/_sitio.js`. Así la dueña puede cambiar cualquier parte desde el panel sin tocar código:

- **Cambios de contenido** (precios, textos, servicios, fotos, videos, contacto): desde el panel `/tarifas`, o editando `contenido.json` y corriendo `node herramientas/generar.js`.
- **Cambios de diseño** (estructura del HTML): en la función `renderizar` de `api/_sitio.js`. Después corre `node herramientas/generar.js` y sube `index.html` junto con el cambio.
- **Estilos e interacciones**: en `styles.css` y `main.js`. Si cambian, sube `VERSION_ARCHIVOS` en `api/_sitio.js` (para que los navegadores no usen la copia vieja) y regenera `index.html`.
- **Agregar un campo editable**: decláralo en `ESQUEMA` (o en `CAMPOS_SERVICIO`) de `api/_sitio.js`, agrégalo a `contenido.json` y úsalo en `renderizar`. El panel arma sus formularios a partir del esquema, no hay que tocarlo.

El panel también hace commits en `main`: haz `git pull` antes de editar en local.

## Panel de administración

`/tarifas` es un panel privado (no enlazado desde el sitio y marcado `noindex`) para que la dueña administre la página desde el celular:

- Precios, nombres, descripciones, etiquetas y duraciones de cada servicio.
- Agregar, eliminar y reordenar servicios en cada sección.
- Hasta 3 fotos o videos por servicio (el primero es el principal).
- Sección de videos (hasta 12) con enlaces de Instagram, TikTok, YouTube, Facebook o Vimeo. Los videos no se suben al sitio: se muestran desde la red social, así la página sigue liviana.
- Franja de aviso o promoción arriba de la página.
- Mostrar u ocultar secciones (masajes, faciales, programas, post-quirúrgico, videos, pasos).
- Textos de todas las secciones, cifras, pasos, cinta de palabras, fotos de las secciones.
- WhatsApp, correo, horarios, redes sociales y zonas de cobertura (se actualizan en todos los lugares de la página).
- Título y descripción para Google y para cuando se comparte el enlace.

Al tocar **Guardar y publicar**, el panel muestra un resumen; al confirmar, `api/panel.js` valida todo, sube las fotos nuevas (JPEG liviano: grande máx. 1400 px y miniatura máx. 480 px), genera `index.html` y publica `contenido.json` + `index.html` + fotos en **un solo commit** en `main`. Vercel lo publica solo en 1–2 minutos.

- Cada guardado sube el número `version` de `contenido.json`. Si alguien guardó antes desde otro celular, el panel pide recargar en vez de pisar esos cambios.
- Si el navegador se cierra antes de guardar, el panel ofrece recuperar los cambios la próxima vez (se guardan en ese mismo celular, sin las fotos nuevas).
- Para volver a una versión anterior de la página: revierte el commit del panel en GitHub (cada guardado es un commit con la lista de cambios).
- Si se agrega una foto de un repositorio gratuito, su crédito va en `creditos.html` y `assets/credits.json`.

Variables de entorno en Vercel (Settings → Environment Variables, entorno Production):

| Variable | Contenido |
|---|---|
| `PANEL_USUARIO` | usuario del panel |
| `PANEL_CLAVE` | contraseña del panel |
| `GITHUB_TOKEN` | token *fine-grained* de GitHub con acceso solo a este repositorio y permiso **Contents: Read and write** |

Para cambiar la contraseña o renovar el token vencido: edita la variable en Vercel y vuelve a desplegar (Deployments → Redeploy). Cambiar cualquiera de las dos cierra las sesiones abiertas del panel.
