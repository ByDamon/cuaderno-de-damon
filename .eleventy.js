const { DateTime } = require("luxon");
const MarkdownIt = require("markdown-it");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const categorias = require("./src/_data/categorias.js");

const md = new MarkdownIt({ html: false, breaks: false });

function contarPalabras(texto) {
  if (!texto) return 0;
  const limpio = texto
    .replace(/[#*_>`~]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  return limpio.trim().split(/\s+/).filter(Boolean).length;
}

const MAPA_ACENTOS = { Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ü: "U" };

function letraInicial(titulo) {
  const letra = titulo.trim().charAt(0).toUpperCase();
  return MAPA_ACENTOS[letra] || letra;
}

function buscarCategoria(slug) {
  return (
    categorias.find((c) => c.slug === slug) || {
      slug: slug,
      nombre: slug,
      emoji: "⚪",
      color: "#8c3a2b",
      colorSuave: "#eee2cf",
    }
  );
}

const MADUREZ = {
  boceto: { emoji: "🌱", etiqueta: "Idea en boceto", color: "#8a9a5b" },
  desarrollo: { emoji: "🌿", etiqueta: "En desarrollo", color: "#5c8a52" },
  madura: { emoji: "🌳", etiqueta: "Idea madura", color: "#3d6b3d" },
};

function buscarMadurez(slug) {
  return MADUREZ[slug] || MADUREZ.madura;
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(pluginRss);

  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/js");

  eleventyConfig.addFilter("dateToIso", (fecha) => {
    return DateTime.fromJSDate(fecha, { zone: "utc" }).toISODate();
  });

  eleventyConfig.addFilter("fechaLarga", (fecha) => {
    return DateTime.fromJSDate(fecha, { zone: "utc" })
      .setLocale("es")
      .toFormat("d 'de' LLLL 'de' yyyy");
  });

  eleventyConfig.addFilter("fechaCorta", (fecha) => {
    return DateTime.fromJSDate(fecha, { zone: "utc" })
      .setLocale("es")
      .toFormat("dd/LL/yyyy");
  });

  eleventyConfig.addFilter("markdown", (texto) => {
    if (!texto) return "";
    return md.render(texto);
  });

  eleventyConfig.addFilter("categoriaInfo", buscarCategoria);

  eleventyConfig.addFilter("madurezInfo", buscarMadurez);

  eleventyConfig.addFilter(
    "tiempoLectura",
    (explicacion, analogia, puente, reflexion, contenido) => {
      const total =
        contarPalabras(explicacion) +
        contarPalabras(analogia) +
        contarPalabras(puente) +
        contarPalabras(reflexion) +
        contarPalabras(contenido);
      const minutos = Math.max(1, Math.round(total / 200));
      return `${minutos} min de lectura`;
    }
  );

  eleventyConfig.addFilter("urlsJSON", (entradas) => {
    return JSON.stringify(entradas.map((e) => e.url));
  });

  eleventyConfig.addFilter("json", (obj) => JSON.stringify(obj));

  eleventyConfig.addFilter("resolverEntradas", (slugs, todas) => {
    if (!slugs || !slugs.length || !todas) return [];
    return slugs
      .map((slug) => todas.find((e) => e.fileSlug === slug))
      .filter(Boolean);
  });

  eleventyConfig.addFilter("alfabetico", (entradas) => {
    if (!entradas || !entradas.length) return [];
    const ordenadas = [...entradas].sort((a, b) =>
      a.data.title.trim().localeCompare(b.data.title.trim(), "es", { sensitivity: "base" })
    );
    const grupos = [];
    let actual = null;
    ordenadas.forEach((entrada) => {
      const letra = letraInicial(entrada.data.title);
      if (!actual || actual.letra !== letra) {
        actual = { letra, entradas: [] };
        grupos.push(actual);
      }
      actual.entradas.push(entrada);
    });
    return grupos;
  });

  eleventyConfig.addFilter("letrasConEntradas", (entradas) => {
    if (!entradas) return [];
    const set = new Set();
    entradas.forEach((e) => set.add(letraInicial(e.data.title)));
    return Array.from(set);
  });

  eleventyConfig.addGlobalData("anioActual", () => new Date().getFullYear());

  eleventyConfig.addGlobalData("alfabeto", () => [
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "Ñ", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  ]);

  eleventyConfig.addCollection("entradas", (collectionApi) => {
    return collectionApi.getFilteredByGlob("src/entradas/*.md").sort((a, b) => {
      return b.date - a.date;
    });
  });

  eleventyConfig.addCollection("grafo", (collectionApi) => {
    const entradas = collectionApi.getFilteredByGlob("src/entradas/*.md");

    const nodes = entradas.map((e) => {
      const cat = buscarCategoria(e.data.categoria);
      return {
        id: e.fileSlug,
        titulo: e.data.title,
        url: e.url,
        color: cat.color,
      };
    });

    const idsValidos = new Set(nodes.map((n) => n.id));
    const vistos = new Set();
    const edges = [];

    entradas.forEach((e) => {
      const relacionadas = e.data.relacionadas || [];
      relacionadas.forEach((rel) => {
        if (!idsValidos.has(rel) || rel === e.fileSlug) return;
        const clave = [e.fileSlug, rel].sort().join("::");
        if (vistos.has(clave)) return;
        vistos.add(clave);
        edges.push({ source: e.fileSlug, target: rel });
      });
    });

    return { nodes, edges };
  });

  eleventyConfig.addCollection("talDiaComoHoy", (collectionApi) => {
    const entradas = collectionApi.getFilteredByGlob("src/entradas/*.md");
    return entradas.map((e) => {
      const cat = buscarCategoria(e.data.categoria);
      return {
        url: e.url,
        titulo: e.data.title,
        fecha: e.date.toISOString().slice(0, 10),
        emoji: cat.emoji,
        color: cat.color,
        colorSuave: cat.colorSuave,
      };
    });
  });

  eleventyConfig.addCollection("vistaPrevia", (collectionApi) => {
    const entradas = collectionApi.getFilteredByGlob("src/entradas/*.md");
    const mapa = {};

    entradas.forEach((e) => {
      const cat = buscarCategoria(e.data.categoria);
      const total =
        contarPalabras(e.data.explicacion) +
        contarPalabras(e.data.analogia) +
        contarPalabras(e.data.puente) +
        contarPalabras(e.data.reflexion);
      const minutos = Math.max(1, Math.round(total / 200));

      mapa[e.url] = {
        titulo: e.data.title,
        resumen: e.data.resumen || "",
        emoji: cat.emoji,
        nombre: cat.nombre,
        color: cat.color,
        minutos: minutos,
      };
    });

    return mapa;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
};
