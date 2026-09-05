(function () {
  var datosEl = document.getElementById("grafo-datos");
  var svg = document.getElementById("grafo-svg");
  if (!datosEl || !svg) return;

  var datos = JSON.parse(datosEl.textContent);
  var ANCHO = 700;
  var ALTO = 460;
  var ns = "http://www.w3.org/2000/svg";

  var nodos = datos.nodes.map(function (n) {
    return {
      id: n.id,
      titulo: n.titulo,
      url: n.url,
      color: n.color,
      x: ANCHO / 2 + (Math.random() - 0.5) * 220,
      y: ALTO / 2 + (Math.random() - 0.5) * 220,
      vx: 0,
      vy: 0,
      lineas: [],
    };
  });

  var porId = {};
  nodos.forEach(function (n) {
    porId[n.id] = n;
  });

  var enlaces = datos.edges
    .map(function (e) {
      return { source: porId[e.source], target: porId[e.target] };
    })
    .filter(function (e) {
      return e.source && e.target;
    });

  var gEnlaces = document.createElementNS(ns, "g");
  var gNodos = document.createElementNS(ns, "g");
  svg.appendChild(gEnlaces);
  svg.appendChild(gNodos);

  var lineasEl = enlaces.map(function (e) {
    var linea = document.createElementNS(ns, "line");
    linea.setAttribute("class", "grafo__enlace");
    gEnlaces.appendChild(linea);
    e.source.lineas.push(linea);
    e.target.lineas.push(linea);
    return linea;
  });

  var nodosInfo = nodos.map(function (n) {
    var grupo = document.createElementNS(ns, "a");
    grupo.setAttribute("href", n.url);
    grupo.setAttribute("class", "grafo__nodo-grupo");

    var circulo = document.createElementNS(ns, "circle");
    circulo.setAttribute("r", 9);
    circulo.setAttribute("fill", n.color);
    circulo.setAttribute("class", "grafo__nodo");

    var texto = document.createElementNS(ns, "text");
    texto.setAttribute("class", "grafo__etiqueta");
    texto.setAttribute("text-anchor", "middle");
    texto.textContent = n.titulo;

    grupo.appendChild(circulo);
    grupo.appendChild(texto);
    gNodos.appendChild(grupo);

    grupo.addEventListener("mouseenter", function () {
      grupo.classList.add("grafo__nodo-grupo--activo");
      n.lineas.forEach(function (l) {
        l.classList.add("grafo__enlace--activo");
      });
    });
    grupo.addEventListener("mouseleave", function () {
      grupo.classList.remove("grafo__nodo-grupo--activo");
      n.lineas.forEach(function (l) {
        l.classList.remove("grafo__enlace--activo");
      });
    });
    grupo.addEventListener("focus", function () {
      grupo.dispatchEvent(new Event("mouseenter"));
    });
    grupo.addEventListener("blur", function () {
      grupo.dispatchEvent(new Event("mouseleave"));
    });

    return { nodo: n, circulo: circulo, texto: texto };
  });

  function paso() {
    for (var i = 0; i < nodos.length; i++) {
      for (var j = i + 1; j < nodos.length; j++) {
        var a = nodos[i];
        var b = nodos[j];
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dist2 = dx * dx + dy * dy || 0.01;
        var fuerza = 2200 / dist2;
        var dist = Math.sqrt(dist2);
        var fx = (dx / dist) * fuerza;
        var fy = (dy / dist) * fuerza;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    enlaces.forEach(function (e) {
      var dx = e.target.x - e.source.x;
      var dy = e.target.y - e.source.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      var objetivo = 140;
      var fuerza = (dist - objetivo) * 0.02;
      var fx = (dx / dist) * fuerza;
      var fy = (dy / dist) * fuerza;
      e.source.vx += fx;
      e.source.vy += fy;
      e.target.vx -= fx;
      e.target.vy -= fy;
    });

    nodos.forEach(function (n) {
      n.vx += (ANCHO / 2 - n.x) * 0.001;
      n.vy += (ALTO / 2 - n.y) * 0.001;
    });

    var movimiento = 0;
    nodos.forEach(function (n) {
      n.vx *= 0.82;
      n.vy *= 0.82;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(26, Math.min(ANCHO - 26, n.x));
      n.y = Math.max(26, Math.min(ALTO - 26, n.y));
      movimiento += Math.abs(n.vx) + Math.abs(n.vy);
    });

    return movimiento;
  }

  function dibujar() {
    lineasEl.forEach(function (linea, i) {
      linea.setAttribute("x1", enlaces[i].source.x);
      linea.setAttribute("y1", enlaces[i].source.y);
      linea.setAttribute("x2", enlaces[i].target.x);
      linea.setAttribute("y2", enlaces[i].target.y);
    });
    nodosInfo.forEach(function (info) {
      info.circulo.setAttribute("cx", info.nodo.x);
      info.circulo.setAttribute("cy", info.nodo.y);
      info.texto.setAttribute("x", info.nodo.x);
      info.texto.setAttribute("y", info.nodo.y - 15);
    });
  }

  var iteraciones = 0;
  function animar() {
    var movimiento = paso();
    dibujar();
    iteraciones++;
    if (movimiento > 0.4 && iteraciones < 400) {
      requestAnimationFrame(animar);
    }
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (var k = 0; k < 250; k++) paso();
    dibujar();
  } else {
    animar();
  }
})();
