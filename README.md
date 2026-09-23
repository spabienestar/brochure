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
panel/            ← panel privado para cambiar precios (se abre en /tarifas)
api/panel.js      ← función de Vercel que valida el acceso y guarda los precios
vercel.json       ← muestra panel/ en la dirección /tarifas
```

Las fotografías provienen de repositorios gratuitos bajo licencias Creative Commons / dominio público (vía Openverse); la atribución completa está en `creditos.html`.

## Panel de tarifas

`/tarifas` es un panel privado (no enlazado desde el sitio y marcado `noindex`) para que la dueña cambie los precios desde el celular. Al tocar **Guardar y publicar**, `api/panel.js` escribe los precios nuevos en `index.html` como un commit en `main`, y Vercel lo publica solo en 1–2 minutos.

- Cada precio editable lleva `data-tarifa="id"` y dentro solo el texto del precio (`$350.000`). Un servicio nuevo necesita su propio `data-tarifa` para aparecer en el panel.
- El panel también hace commits en `main`: haz `git pull` antes de editar en local.

Variables de entorno en Vercel (Settings → Environment Variables, entorno Production):

| Variable | Contenido |
|---|---|
| `PANEL_USUARIO` | usuario del panel |
| `PANEL_CLAVE` | contraseña del panel |
| `GITHUB_TOKEN` | token *fine-grained* de GitHub con acceso solo a este repositorio y permiso **Contents: Read and write** |

Para cambiar la contraseña o renovar el token vencido: edita la variable en Vercel y vuelve a desplegar (Deployments → Redeploy). Cambiar cualquiera de las dos cierra las sesiones abiertas del panel.
