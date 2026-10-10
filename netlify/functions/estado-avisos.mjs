import { getStore } from "@netlify/blobs";

function extraerGuidsYTitulos(xml) {
  return xml
    .split("<item>")
    .slice(1)
    .map((bloque) => ({
      titulo: ((bloque.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "").trim(),
      guid: ((bloque.match(/<guid>([\s\S]*?)<\/guid>/) || [])[1] || "").trim(),
    }));
}

async function consultarResend(ruta, apiKey) {
  try {
    const respuesta = await fetch(`https://api.resend.com${ruta}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const cuerpo = await respuesta.json().catch(() => null);
    return { status: respuesta.status, cuerpo };
  } catch (err) {
    return { status: 0, cuerpo: { error: String(err) } };
  }
}

export default async () => {
  const apiKey = process.env.RESEND_API_KEY;
  const sitioUrl = process.env.URL || "https://cuadernodedamon.com";
  const informe = {
    generadoEn: new Date().toISOString(),
    configuracion: {
      RESEND_API_KEY: Boolean(apiKey),
      CORREO_REMITENTE: process.env.CORREO_REMITENTE ? "definido" : "FALTA",
    },
  };

  try {
    const store = getStore("estado-notificaciones");
    informe.ultimaCorrida = (await store.get("ultima-corrida", { type: "json" })) || "Aún no hay registro (la función no ha corrido desde este cambio)";

    const yaNotificadas = new Set((await store.get("guids", { type: "json" })) || []);
    const feed = await fetch(`${sitioUrl}/feed.xml`).then((r) => r.text());
    const items = extraerGuidsYTitulos(feed);
    informe.feed = {
      entradasEnFeed: items.length,
      pendientesDeAvisar: items.filter((i) => !yaNotificadas.has(i.guid)).map((i) => i.titulo),
    };

  } catch (err) {
    informe.errorLeyendoEstado = String(err);
  }

  if (apiKey) {
    const dominios = await consultarResend("/domains", apiKey);
    informe.resendDominios = {
      status: dominios.status,
      dominios: Array.isArray(dominios.cuerpo?.data)
        ? dominios.cuerpo.data.map((d) => ({ nombre: d.name, estado: d.status }))
        : dominios.cuerpo,
    };

    // Solo agregados por asunto: sin destinatarios ni conteo de suscriptores,
    // porque esta página es pública.
    const envios = await consultarResend("/emails?limit=50", apiKey);
    const porAsunto = new Map();
    if (Array.isArray(envios.cuerpo?.data)) {
      for (const e of envios.cuerpo.data) {
        const grupo = porAsunto.get(e.subject) || { asunto: e.subject, primerEnvio: e.created_at, estados: {} };
        grupo.estados[e.last_event] = (grupo.estados[e.last_event] || 0) + 1;
        if (e.created_at < grupo.primerEnvio) grupo.primerEnvio = e.created_at;
        porAsunto.set(e.subject, grupo);
      }
    }
    informe.resendUltimosEnvios = {
      status: envios.status,
      porAsunto: Array.from(porAsunto.values()),
      detalleError: Array.isArray(envios.cuerpo?.data) ? undefined : envios.cuerpo,
    };
  }

  return new Response(JSON.stringify(informe, null, 2), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
};
