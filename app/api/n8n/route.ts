import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json({ error: 'N8N Webhook URL not configured in .env.local' }, { status: 500 });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Attempt to parse JSON response from n8n, if empty fallback
    const data = await response.json().catch(() => ({ status: response.statusText }));

    if (!response.ok) {
      throw new Error(`n8n webhook failed with status: ${response.status}`);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Internal API Error';
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
