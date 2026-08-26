import { NextRequest, NextResponse } from 'next/server';

const SECRET = 'cdrama-translate-2026';

async function translateText(text: string, from: string, to: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`Translation API error: ${res.status}`);
  const data = await res.json();
  return data[0]?.map((chunk: any[]) => chunk[0]).join('') || '';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.secret !== SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { text, from, to } = body;
    if (!text || !from || !to) {
      return NextResponse.json({ error: 'Missing text, from, or to' }, { status: 400 });
    }
    const translated = await translateText(text, from, to);
    return NextResponse.json({ original: text, translated, from, to });
  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
