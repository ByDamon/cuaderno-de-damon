import { getStore } from "@netlify/blobs";

function paginaHtml({ titulo, mensaje }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${titulo} — Cuaderno de Damon</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: Georgia, serif; background: #e9dcc3; color: #2c2417; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; }
  .caja { background: #f3ead9; border-radius: 6px; padding: 32px; max-width: 420px; text-align: center; box-shadow: 0 10px 30px -15px rgba(44,36,23,0.3); }
  a { color: #8c3a2b; }
</style>
</head>
<body>
  <div class="caja">
    <p>${mensaje}</p>
    <p><a href="/">← Volver al cuaderno</a></p>
  </div>
</body>
</html>`;
}

export default async (req) => {
  const url = new URL(req.url);
  const correo = (url.searchParams.get("correo") || "").trim().toLowerCase();

  if (!correo) {
    return new Response(paginaHtml({ titulo: "Error", mensaje: "Falta indicar el correo a dar de baja." }), {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const store = getStore("suscriptores");
  const lista = (await store.get("lista", { type: "json" })) || [];
  const actualizada = lista.filter((c) => c !== correo);
  await store.setJSON("lista", actualizada);

  return new Response(
    paginaHtml({
      titulo: "Listo",
      mensaje: `💌 ${correo} ya no recibirá avisos de entradas nuevas.`,
    }),
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
  );
};
