const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RAIZ = process.cwd();
const ANCHO = 1200;
const ALTO = 630;

const cacheEnMemoria = new Map();
let motor = null;

async function cargarMotor() {
  if (motor) return motor;

  const satori = (await import("satori")).default;
  const resvg = await import("@resvg/resvg-wasm");
  await resvg.initWasm(
    fs.readFileSync(path.join(RAIZ, "node_modules/@resvg/resvg-wasm/index_bg.wasm"))
  );

  const leerFuente = (paquete, archivo) =>
    fs.readFileSync(path.join(RAIZ, "node_modules/@fontsource", paquete, "files", archivo));

  const fuentes = [
    { name: "Caveat", data: leerFuente("caveat", "caveat-latin-700-normal.woff"), weight: 700, style: "normal" },
    { name: "Lora", data: leerFuente("lora", "lora-latin-400-normal.woff"), weight: 400, style: "normal" },
    { name: "Lora", data: leerFuente("lora", "lora-latin-600-normal.woff"), weight: 600, style: "normal" },
  ];

  motor = { satori, Resvg: resvg.Resvg, fuentes };
  return motor;
}

function quitarEmojis(texto) {
  return texto
    .replace(/[\u{1F000}-\u{1FFFF}\u{2190}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

const COLA_DE_APERTURA = /["'“”«»‘’—–\-()\s]+$/u;

const PALABRAS_COMUNES = new Set(
  ("a al algo ante bajo como con contra cuando de del desde donde dos e el ella ellas ello ellos en entre era es esa ese eso esta este esto ha han hay la las le les lo los me mi mis muy ni no nos o para pero por porque que qué quién quien se si sí sin sobre su sus también tan te ti tu tus un una uno unos unas y ya yo " +
    "cómo cuál cuándo cuánto dónde por").split(" ")
);

// Los títulos se guardan en MAYÚSCULAS, así que el casing de nombres propios
// (Google, Marte, ADN) se recupera del cuerpo de la entrada: una palabra con
// mayúscula que NO está al inicio de una frase se toma como nombre propio.
function palabrasPropias(textoCuerpo) {
  const propias = new Map();
  if (!textoCuerpo) return propias;

  const limpio = textoCuerpo.replace(/[*_#>`~\[\]]/g, " ");
  const patron = /[\p{L}\p{M}]+/gu;
  let coincidencia;

  while ((coincidencia = patron.exec(limpio)) !== null) {
    const palabra = coincidencia[0];
    const minuscula = palabra.toLowerCase();
    if (PALABRAS_COMUNES.has(minuscula)) continue;

    const previo = limpio.slice(0, coincidencia.index);
    const cola = (previo.match(COLA_DE_APERTURA) || [""])[0];
    const sinCola = previo.slice(0, previo.length - cola.length);
    const alInicioDeFrase = sinCola === "" || /[.!?¿¡:]$/.test(sinCola) || /\n/.test(cola);

    const todoMayuscula = palabra.length > 1 && palabra === palabra.toUpperCase();
    const empiezaMayuscula = palabra[0] !== minuscula[0];

    if (todoMayuscula || (empiezaMayuscula && !alInicioDeFrase)) {
      propias.set(minuscula, palabra);
    }
  }

  return propias;
}

function construirTitulo(titulo, textoCuerpo) {
  const base = quitarEmojis(titulo).toLowerCase();
  const propias = palabrasPropias(textoCuerpo);

  const conPropias = base.replace(/[\p{L}\p{M}]+/gu, (palabra) => propias.get(palabra) || palabra);

  return conPropias
    .replace(/(^|[:¿¡]\s*)(\p{L})/gu, (_, previo, letra) => previo + letra.toUpperCase());
}

function tamanoTitulo(texto) {
  const caracteres = texto.length;
  for (let tamano = 108; tamano >= 56; tamano -= 4) {
    const lineas = Math.ceil((caracteres * 0.44 * tamano) / 1000);
    if (lineas * tamano * 1.06 <= 285) return tamano;
  }
  return 56;
}

const SVG_TRAZO = (color) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 16"><path d="M4 9 C 50 2, 90 14, 130 7 S 240 2, 296 9" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/></svg>`
  );

const SVG_MARCAPAGINAS =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 34"><path d="M0 0 H16 V34 L8 26.5 L0 34 Z" fill="#8c3a2b"/></svg>`
  );

function el(type, style, children) {
  return { type, props: { style, children } };
}

function construirTarjeta({ titulo, categoriaNombre, color }) {
  const lineas = [];
  for (let i = 0; i < 15; i++) {
    lineas.push(
      el("div", {
        position: "absolute",
        left: 60,
        top: 39 + i * 40,
        width: 1080,
        height: 1,
        background: "rgba(44,36,23,0.13)",
      })
    );
  }

  return el(
    "div",
    {
      display: "flex",
      position: "relative",
      width: ANCHO,
      height: ALTO,
      background: "#e9dcc3",
    },
    [
      ...lineas,
      el("div", {
        position: "absolute",
        left: 24,
        top: 24,
        width: 1152,
        height: 582,
        border: "2px solid #cdbf9f",
      }),
      el("div", { position: "absolute", left: 24, top: 24, width: 18, height: 582, background: color }),
      el(
        "div",
        { position: "absolute", left: 110, top: 78, width: 1000, display: "flex", flexDirection: "column" },
        [
          el(
            "div",
            {
              display: "flex",
              alignSelf: "flex-start",
              padding: "6px 20px",
              border: `2px dashed ${color}`,
              borderRadius: 999,
              background: "rgba(255,255,255,0.35)",
              fontFamily: "Lora",
              fontWeight: 600,
              fontSize: 24,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color,
            },
            categoriaNombre
          ),
          el(
            "div",
            {
              marginTop: 40,
              fontFamily: "Caveat",
              fontWeight: 700,
              fontSize: tamanoTitulo(titulo),
              lineHeight: 1.04,
              color: "#2c2417",
            },
            titulo
          ),
          {
            type: "img",
            props: { src: SVG_TRAZO(color), width: 300, height: 16, style: { marginTop: 18 } },
          },
        ]
      ),
      el(
        "div",
        {
          position: "absolute",
          left: 110,
          bottom: 58,
          width: 1000,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        },
        [
          el(
            "div",
            {
              display: "flex",
              fontFamily: "Lora",
              fontWeight: 400,
              fontSize: 26,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#8c3a2b",
            },
            "cuadernodedamon.com"
          ),
          el("div", { display: "flex", alignItems: "center" }, [
            { type: "img", props: { src: SVG_MARCAPAGINAS, width: 16, height: 34, style: { marginRight: 14 } } },
            el(
              "div",
              { display: "flex", fontFamily: "Caveat", fontWeight: 700, fontSize: 38, color: "#2c2417" },
              "Cuaderno de Damon"
            ),
          ]),
        ]
      ),
    ]
  );
}

function slugOg(texto) {
  return (
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100)
      .replace(/-+$/, "") || "entrada"
  );
}

async function renderizarPng(datosTarjeta) {
  const clave = crypto.createHash("sha1").update(JSON.stringify(datosTarjeta)).digest("hex");
  if (cacheEnMemoria.has(clave)) return cacheEnMemoria.get(clave);

  const { satori, Resvg, fuentes } = await cargarMotor();
  const svg = await satori(construirTarjeta(datosTarjeta), { width: ANCHO, height: ALTO, fonts: fuentes });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: ANCHO } }).render().asPng();

  cacheEnMemoria.set(clave, png);
  return png;
}

async function generarImagenesOg({ entradas, categorias, carpetaSalida, imagenPorDefecto }) {
  fs.mkdirSync(carpetaSalida, { recursive: true });

  let generadas = 0;
  let conRespaldo = 0;

  for (const entrada of entradas) {
    const destino = path.join(carpetaSalida, `${slugOg(entrada.fileSlug)}.png`);

    try {
      const categoria = categorias.find((c) => c.slug === entrada.data.categoria) || {
        nombre: "Cuaderno",
        color: "#8c3a2b",
      };
      const cuerpo = [entrada.data.explicacion, entrada.data.analogia, entrada.data.puente, entrada.data.reflexion]
        .filter(Boolean)
        .join(" ");

      const png = await renderizarPng({
        titulo: construirTitulo(entrada.data.title || "", cuerpo),
        categoriaNombre: categoria.nombre,
        color: categoria.color,
      });

      fs.writeFileSync(destino, png);
      generadas++;
    } catch (err) {
      console.error(`[og] No se pudo generar la imagen de "${entrada.fileSlug}", usando la genérica:`, err.message);
      fs.copyFileSync(imagenPorDefecto, destino);
      conRespaldo++;
    }
  }

  console.log(`[og] Imágenes por entrada: ${generadas} generadas, ${conRespaldo} con respaldo genérico`);
}

module.exports = { generarImagenesOg, slugOg, construirTitulo };
