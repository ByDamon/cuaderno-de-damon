(function () {
  var datosEl = document.getElementById("vista-previa-datos");
  if (!datosEl) return;

  // En pantallas táctiles no hay "hover": dejamos que los enlaces
  // funcionen normal (un toque entra directo a la entrada).
  var puedeFlotar = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!puedeFlotar) return;

  var datos = JSON.parse(datosEl.textContent || "{}");

  var tarjeta = document.createElement("div");
  tarjeta.className = "vista-previa";
  tarjeta.setAttribute("role", "tooltip");
  document.body.appendChild(tarjeta);

  var temporizador = null;

  function ocultar() {
    clearTimeout(temporizador);
    tarjeta.classList.remove("vista-previa--visible");
  }

  function mostrar(enlace, info) {
    tarjeta.innerHTML =
      '<p class="vista-previa__categoria" style="--color-cat:' +
      info.color +
      '">' +
      info.emoji +
      " " +
      info.nombre +
      "</p>" +
      '<p class="vista-previa__titulo">' +
      info.titulo +
      "</p>" +
      (info.resumen
        ? '<p class="vista-previa__resumen">' + info.resumen + "</p>"
        : "") +
      '<p class="vista-previa__meta">' +
      info.minutos +
      " min de lectura</p>";

    var r = enlace.getBoundingClientRect();
    var anchoTarjeta = 270;
    var x = Math.max(12, Math.min(r.left, window.innerWidth - anchoTarjeta - 12));
    var haciaAbajo = r.bottom + 190 <= window.innerHeight;
    var y = haciaAbajo ? r.bottom + 8 : r.top - 8;

    tarjeta.style.left = x + "px";
    tarjeta.style.top = y + "px";
    tarjeta.style.transform = haciaAbajo ? "none" : "translateY(-100%)";
    tarjeta.classList.add("vista-previa--visible");
  }

  document.querySelectorAll("a[href]").forEach(function (enlace) {
    if (
      enlace.closest(".tarjeta") ||
      enlace.closest(".lista-entradas__item") ||
      enlace.closest("#grafo-svg")
    ) {
      return;
    }

    var info = datos[enlace.getAttribute("href")];
    if (!info) return;

    enlace.addEventListener("mouseenter", function () {
      clearTimeout(temporizador);
      temporizador = setTimeout(function () {
        mostrar(enlace, info);
      }, 180);
    });

    enlace.addEventListener("mouseleave", ocultar);
  });

  window.addEventListener("scroll", ocultar, { passive: true });
})();
