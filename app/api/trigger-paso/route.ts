import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { siniestro_id, paso } = body;

  if (!siniestro_id || !paso) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  try {
    await fetch(`${process.env.N8N_WEBHOOK_URL}/miniapp-paso-completado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siniestro_id, paso }),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error notificando a n8n:", error);
    // No devolvemos error 500 al cliente por esto — el paso ya se guardó
    // bien en Supabase, esto es solo el aviso al bot.
    return NextResponse.json({ ok: false });
  }
}
