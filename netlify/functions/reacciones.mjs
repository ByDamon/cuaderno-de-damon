import { getStore } from "@netlify/blobs";

const CLAVES_VALIDAS = ["mente", "sorpresa", "amor"];

function vacio() {
  return { mente: 0, sorpresa: 0, amor: 0 };
}

export default async (req) => {
  const url = new URL(req.url);
  const store = getStore("reacciones");

  if (req.method === "GET") {
    const entrada = (url.searchParams.get("entrada") || "").trim();

    if (!entrada) {
      return new Response(JSON.stringify({ ok: false, error: "Falta el parámetro entrada" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const conteos = (await store.get(entrada, { type: "json" })) || vacio();

    return new Response(JSON.stringify({ ok: true, conteos }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  if (req.method === "POST") {
    let cuerpo;
    try {
      cuerpo = await req.json();
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: "Cuerpo inválido" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const entrada = (cuerpo.entrada || "").trim();
    const emoji = cuerpo.emoji;

    if (!entrada || !CLAVES_VALIDAS.includes(emoji)) {
      return new Response(JSON.stringify({ ok: false, error: "Datos inválidos" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const conteos = (await store.get(entrada, { type: "json" })) || vacio();
    conteos[emoji] = (conteos[emoji] || 0) + 1;
    await store.setJSON(entrada, conteos);

    return new Response(JSON.stringify({ ok: true, conteos }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: false, error: "Método no permitido" }), {
    status: 405,
    headers: { "content-type": "application/json" },
  });
};
