import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { siniestro_id, paso } = body;

  if (!siniestro_id || !paso) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  try {
    // N8N_WEBHOOK_URL debe ser la URL COMPLETA del webhook, sin concatenar nada más acá.
    const respuestaN8n = await fetch(process.env.N8N_WEBHOOK_URL as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siniestro_id, paso }),
    });

    if (!respuestaN8n.ok) {
      console.error(
        `n8n respondió con error: ${respuestaN8n.status} ${respuestaN8n.statusText}`
      );
      return NextResponse.json(
        { ok: false, n8nStatus: respuestaN8n.status },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error notificando a n8n:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}