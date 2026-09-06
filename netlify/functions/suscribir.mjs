import { getStore } from "@netlify/blobs";

function correoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Método no permitido" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  let correo = "";
  try {
    const tipo = req.headers.get("content-type") || "";
    if (tipo.includes("application/json")) {
      const cuerpo = await req.json();
      correo = cuerpo.email || "";
    } else {
      const datos = await req.formData();
      correo = datos.get("email") || "";
    }
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "No se pudo leer el formulario" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  correo = correo.trim().toLowerCase();

  if (!correoValido(correo)) {
    return new Response(JSON.stringify({ ok: false, error: "Correo inválido" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const store = getStore("suscriptores");
  const lista = (await store.get("lista", { type: "json" })) || [];

  if (!lista.includes(correo)) {
    lista.push(correo);
    await store.setJSON("lista", lista);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
