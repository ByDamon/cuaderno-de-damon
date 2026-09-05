const { DateTime } = require("luxon");
const MarkdownIt = require("markdown-it");
const categorias = require("./src/_data/categorias.js");

const md = new MarkdownIt({ html: false, breaks: false });

function contarPalabras(texto) {
  if (!texto) return 0;
  const limpio = texto
    .replace(/[#*_>`~]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  return limpio.trim().split(/\s+/).filter(Boolean).length;
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

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/admin");

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

  eleventyConfig.addGlobalData("anioActual", () => new Date().getFullYear());

  eleventyConfig.addCollection("entradas", (collectionApi) => {
    return collectionApi.getFilteredByGlob("src/entradas/*.md").sort((a, b) => {
      return b.date - a.date;
    });
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
