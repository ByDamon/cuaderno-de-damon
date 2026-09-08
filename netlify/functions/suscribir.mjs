import { getStore } from "@netlify/blobs";

function correoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

function construirCorreoBienvenida({ sitioUrl, enlaceBaja }) {
  return `
<div style="background-color:#e9dcc3; padding:32px 16px; font-family: Georgia, 'Times New Roman', serif;">
  <div style="max-width:520px; margin:0 auto; background-color:#f3ead9; border-radius:6px; padding:36px 32px; box-shadow:0 6px 18px rgba(44,36,23,0.12);">
    <p style="margin:0 0 6px; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; color:#8c3a2b; font-weight:bold;">📖 Cuaderno de Damon</p>

    <h1 style="margin:0 0 14px; font-size:24px; line-height:1.3; color:#2c2417;">Ya estás dentro del cuaderno.</h1>

    <p style="margin:0 0 26px; font-size:16px; line-height:1.65; color:#5a5040;">Cada vez que escriba algo nuevo, aquí llega — sin spam, sin relleno, solo cuando de verdad hay algo que valga la pena.</p>

    <p style="margin:0 0 30px;">
      <a href="${sitioUrl}/entradas/" style="display:inline-block; background-color:#8c3a2b; color:#fbf3e6; padding:11px 24px; border-radius:999px; text-decoration:none; font-size:14px; font-weight:bold;">Mientras tanto, explora lo que ya hay →</a>
    </p>

    <hr style="border:none; border-top:1px dashed rgba(44,36,23,0.2); margin:0 0 18px;">

    <p style="margin:0; font-size:12px; line-height:1.6; color:#8a8072;">
      Recibes esto porque te suscribiste en ${sitioUrl.replace(/^https?:\/\//, "")}.<br>
      <a href="${enlaceBaja}" style="color:#8a8072;">Darme de baja</a>
    </p>
  </div>
</div>
  `.trim();
}

async function enviarBienvenida(correo) {
  const apiKey = process.env.RESEND_API_KEY;
  const remitente = process.env.CORREO_REMITENTE;
  const sitioUrl = process.env.URL || "https://cuadernodedamon.com";

  if (!apiKey || !remitente) return;

  const enlaceBaja = `${sitioUrl}/.netlify/functions/desuscribir?correo=${encodeURIComponent(correo)}`;
  const html = construirCorreoBienvenida({ sitioUrl, enlaceBaja });

  try {
    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remitente,
        to: [correo],
        subject: "📖 Ya estás dentro del cuaderno",
        html,
      }),
    });

    if (!respuesta.ok) {
      console.error(`Error enviando bienvenida a ${correo}:`, respuesta.status, await respuesta.text());
    }
  } catch (err) {
    console.error(`No se pudo enviar bienvenida a ${correo}:`, err);
  }
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
    await enviarBienvenida(correo);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
