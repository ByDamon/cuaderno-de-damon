# Cuaderno de Damon

Enciclopedia personal digital construida con [Eleventy](https://www.11ty.dev/).
Cada entrada es un archivo Markdown simple; el sitio se genera como HTML estático
y se publica en Netlify.

## Ver el sitio en tu computadora

```bash
npm install
npm start
```

Esto abre el sitio en `http://localhost:8080` y se actualiza solo al guardar cambios.

## Cómo agregar una nueva entrada

### Opción A: desde el panel web (recomendado, sin tocar código)

Una vez publicado el sitio y conectado el panel (ver más abajo), entra a
`https://tu-sitio.netlify.app/admin/`, inicia sesión con GitHub y llena el
formulario. Al hacer clic en "Publicar", el panel guarda el archivo directo en
el repositorio y Netlify reconstruye el sitio solo.

### Opción B: a mano, editando el archivo

1. Crea un archivo nuevo dentro de `src/entradas/`, por ejemplo `src/entradas/mi-entrada.md`.
2. Cópiale este encabezado (front matter) y complétalo:

   ```yaml
   ---
   layout: layouts/entrada.njk
   title: Título de la entrada
   categoria: universo # medicina | universo | ciencia | reflexiones | tecnologia
   date: 2026-09-05
   tags: [opcional, otro-tag]
   resumen: Una frase corta que aparece en la portada y en las tarjetas.
   explicacion: |
     La explicación simple de la idea.
   analogia: |
     Tu dibujo mental / analogía.
   puente: |
     Con qué otro tema se conecta.
   reflexion: |
     La pregunta o reflexión final.
   ---

   (Opcional) Aquí puedes agregar notas adicionales en Markdown, si algo no
   entra en las 4 secciones de arriba.
   ```

3. Guarda el archivo, sube el cambio a git (`git add`, `git commit`, `git push`)
   y Netlify reconstruirá el sitio solo, en 1-2 minutos.

## Panel de administración (Decap CMS)

El sitio incluye un editor visual en `/admin/` (carpeta [`src/admin/`](src/admin/))
para escribir entradas desde el navegador sin tocar código. Como el backend es
tu propio repositorio de GitHub, hay que conectarlo una sola vez:

1. **Sube el proyecto a GitHub** (ver "Publicar en Netlify" abajo) y abre
   [`src/admin/config.yml`](src/admin/config.yml): cambia la línea
   `repo: TU-USUARIO/TU-REPOSITORIO` por tu usuario y el nombre real del
   repositorio, luego sube ese cambio.
2. **Crea una GitHub OAuth App**: en GitHub, ve a
   *Settings → Developer settings → OAuth Apps → New OAuth App*. En
   "Authorization callback URL" pon exactamente:
   `https://api.netlify.com/auth/done`. Guarda el **Client ID** y el
   **Client Secret** que te da GitHub.
3. **Conéctalos en Netlify**: en el panel de tu sitio, ve a
   *Project configuration → Access & security → OAuth → Install provider →
   GitHub*, y pega ahí el Client ID y Client Secret del paso anterior.
4. Listo. Entra a `https://tu-sitio.netlify.app/admin/`, haz clic en
   "Login with GitHub" y autoriza el acceso. Ya puedes escribir y publicar
   entradas desde ahí, desde cualquier navegador (celular incluido).

## Cómo cambiar el diseño

Todo el estilo visual vive en un solo archivo: [`src/css/style.css`](src/css/style.css).
Las variables de color y tipografía están al principio del archivo (`:root { ... }`),
así que puedes cambiar el tono del papel, el color de acento o las fuentes desde ahí
sin tocar el resto del CSS.

Las plantillas HTML están en `src/_includes/layouts/` (estructura de página) y
`src/_includes/partials/` (cabecera y pie).

## Publicar en Netlify

1. Sube este proyecto a un repositorio de GitHub (o GitLab/Bitbucket).
2. En Netlify: "Add new site" → "Import an existing project" → conecta el repositorio.
3. Netlify detecta automáticamente la configuración gracias a `netlify.toml`
   (comando de build `npm run build`, carpeta publicada `_site`). No hace falta
   cambiar nada más.
4. Cada vez que subas cambios a la rama principal, Netlify vuelve a publicar el sitio.

## Estructura del proyecto

```
src/
  _data/site.js          → nombre del sitio, autor, descripción
  _data/categorias.js    → las 5 categorías y su color
  _includes/layouts/     → plantillas de página (base y entrada)
  _includes/partials/    → cabecera y pie de página
  admin/                 → panel de administración (Decap CMS)
  css/style.css          → todo el diseño visual
  entradas/*.md          → tus entradas, una por archivo
  index.njk              → portada
  entradas.njk           → índice con filtro por categoría
  sobre.njk              → página "Sobre este cuaderno"
```
