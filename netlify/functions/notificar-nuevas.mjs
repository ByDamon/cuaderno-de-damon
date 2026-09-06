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
  const sitioUrl = process.env.URL || "https://cuadernodedamon.netlify.app";

  console.log(`sitioUrl=${sitioUrl} apiKey=${apiKey ? "definida" : "FALTA"} remitente=${remitente || "FALTA"}`);

  if (!apiKey || !remitente) {
    console.log("Faltan RESEND_API_KEY o CORREO_REMITENTE; se omite esta ronda de avisos.");
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
  console.log(`Entradas encontradas en el feed: ${items.length}`);

  const storeEstado = getStore("estado-notificaciones");
  const yaNotificadas = (await storeEstado.get("guids", { type: "json" })) || [];
  const yaNotificadasSet = new Set(yaNotificadas);
  console.log(`Ya marcadas como notificadas: ${yaNotificadas.length}`);

  const nuevas = items.filter((item) => !yaNotificadasSet.has(item.guid));
  console.log(`Nuevas por avisar: ${nuevas.length}`, nuevas.map((n) => n.titulo));

  // Primera vez que corre esta función: no manda un correo por cada entrada
  // vieja, solo marca todo como "ya visto" y arranca a avisar desde aquí.
  if (!yaNotificadas.length && items.length) {
    console.log("Primera corrida: marcando entradas actuales como ya vistas, sin enviar correos.");
    await storeEstado.setJSON("guids", items.map((item) => item.guid));
    return new Response("ok");
  }

  if (!nuevas.length) {
    console.log("No hay entradas nuevas que avisar.");
    return new Response("ok");
  }

  const storeSuscriptores = getStore("suscriptores");
  const suscriptores = (await storeSuscriptores.get("lista", { type: "json" })) || [];
  console.log(`Suscriptores guardados: ${suscriptores.length}`, suscriptores);

  if (!suscriptores.length) {
    console.log("Hay entradas nuevas pero no hay suscriptores guardados; no se manda nada.");
  }

  if (suscriptores.length) {
    for (const item of nuevas.reverse()) {
      const html = `
        <p>📖 Hay una entrada nueva en el Cuaderno de Damon:</p>
        <h2><a href="${item.enlace}">${item.titulo}</a></h2>
        <p>${item.descripcion}</p>
        <p><a href="${item.enlace}">Leer la entrada completa →</a></p>
        <hr />
        <p style="font-size:12px;color:#888;">
          Recibes esto porque te suscribiste en cuadernodedamon.netlify.app.
        </p>
      `;

      for (const correo of suscriptores) {
        const enlaceBaja = `${sitioUrl}/.netlify/functions/desuscribir?correo=${encodeURIComponent(correo)}`;
        const htmlPersonalizado = `${html}<p style="font-size:12px;color:#888;"><a href="${enlaceBaja}">Darme de baja</a></p>`;

        await enviarUno({
          apiKey,
          remitente,
          destinatario: correo,
          asunto: `📖 Nueva entrada: ${item.titulo}`,
          html: htmlPersonalizado,
        });
        console.log(`Correo enviado (o intentado) a ${correo} sobre "${item.titulo}"`);
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
