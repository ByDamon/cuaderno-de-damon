import { getStore } from "@netlify/blobs";

function extraerItems(xml) {
  const items = [];
  const bloques = xml.split("<item>").slice(1);

  bloques.forEach((bloque) => {
    const titulo = (bloque.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "";
    const enlace = (bloque.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "";
    const guid = (bloque.match(/<guid>([\s\S]*?)<\/guid>/) || [])[1] || enlace;
    const descripcion = (bloque.match(/<!\[CDATA\[([\s\S]*?)\]\]>/) || [])[1] || "";

    if (guid.trim()) {
      items.push({
        titulo: titulo.trim(),
        enlace: enlace.trim(),
        guid: guid.trim(),
        descripcion: descripcion.trim(),
      });
    }
  });

  return items;
}

function construirCorreoHtml({ item, sitioUrl, enlaceBaja }) {
  return `
<div style="background-color:#e9dcc3; padding:32px 16px; font-family: Georgia, 'Times New Roman', serif;">
  <div style="max-width:520px; margin:0 auto; background-color:#f3ead9; border-radius:6px; padding:36px 32px; box-shadow:0 6px 18px rgba(44,36,23,0.12);">
    <p style="margin:0 0 6px; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; color:#8c3a2b; font-weight:bold;">📖 Cuaderno de Damon</p>
    <p style="margin:0 0 22px; font-size:14px; color:#5a5040; font-style:italic;">Hay una entrada nueva en el cuaderno</p>

    <h1 style="margin:0 0 14px; font-size:22px; line-height:1.3; color:#2c2417;">
      <a href="${item.enlace}" style="color:#2c2417; text-decoration:none;">${item.titulo}</a>
    </h1>

    <p style="margin:0 0 26px; font-size:16px; line-height:1.65; color:#5a5040;">${item.descripcion}</p>

    <p style="margin:0 0 30px;">
      <a href="${item.enlace}" style="display:inline-block; background-color:#8c3a2b; color:#fbf3e6; padding:11px 24px; border-radius:999px; text-decoration:none; font-size:14px; font-weight:bold;">Leer la entrada completa →</a>
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

async function enviarUno({ apiKey, remitente, destinatario, asunto, html }) {
  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: remitente,
      to: [destinatario],
      subject: asunto,
      html,
    }),
  });

  if (!respuesta.ok) {
    const texto = await respuesta.text();
    console.error(`Error enviando a ${destinatario}:`, respuesta.status, texto);
  }
}

export default async () => {
  const apiKey = process.env.RESEND_API_KEY;
  const remitente = process.env.CORREO_REMITENTE;
  const sitioUrl = process.env.URL || "https://cuadernodedamon.com";

  if (!apiKey || !remitente) {
    return new Response("ok");
  }

  let xml;
  try {
    const respuestaFeed = await fetch(`${sitioUrl}/feed.xml`);
    if (!respuestaFeed.ok) throw new Error(`feed.xml respondió ${respuestaFeed.status}`);
    xml = await respuestaFeed.text();
  } catch (err) {
    console.error("No se pudo leer el feed:", err);
    return new Response("ok");
  }

  const items = extraerItems(xml);

  const storeEstado = getStore("estado-notificaciones");
  const yaNotificadas = (await storeEstado.get("guids", { type: "json" })) || [];
  const yaNotificadasSet = new Set(yaNotificadas);

  const nuevas = items.filter((item) => !yaNotificadasSet.has(item.guid));

  // Primera vez que corre esta función: no manda un correo por cada entrada
  // vieja, solo marca todo como "ya visto" y arranca a avisar desde aquí.
  if (!yaNotificadas.length && items.length) {
    await storeEstado.setJSON("guids", items.map((item) => item.guid));
    return new Response("ok");
  }

  if (!nuevas.length) {
    return new Response("ok");
  }

  const storeSuscriptores = getStore("suscriptores");
  const suscriptores = (await storeSuscriptores.get("lista", { type: "json" })) || [];

  if (suscriptores.length) {
    for (const item of nuevas.reverse()) {
      for (const correo of suscriptores) {
        const enlaceBaja = `${sitioUrl}/.netlify/functions/desuscribir?correo=${encodeURIComponent(correo)}`;
        const html = construirCorreoHtml({ item, sitioUrl, enlaceBaja });

        await enviarUno({
          apiKey,
          remitente,
          destinatario: correo,
          asunto: `📖 Nueva entrada: ${item.titulo}`,
          html,
        });
      }
    }
  }

  const actualizadas = Array.from(new Set([...yaNotificadas, ...nuevas.map((n) => n.guid)]));
  await storeEstado.setJSON("guids", actualizadas);

  return new Response("ok");
};

export const config = {
  schedule: "*/30 * * * *",
};
