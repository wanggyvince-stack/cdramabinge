import { NextRequest, NextResponse } from 'next/server';

const SECRET = 'cdrama-translate-2026';

// MyMemory API - free, 5000 words/day
async function translateMyMemory(text: string, from: string, to: string): Promise<string> {
  const langPair = `${from}|${to}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory error: ${res.status}`);
  const data = await res.json();
  if (data.responseStatus === 429) throw new Error('MyMemory rate limited');
  return data.responseData?.translatedText || '';
}

// Lingva API - free Google Translate alternative
async function translateLingva(text: string, from: string, to: string): Promise<string> {
  const url = `https://lingva.ml/api/v1/${from}/${to}/${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lingva error: ${res.status}`);
  const data = await res.json();
  return data.translation || '';
}

async function translateText(text: string, from: string, to: string): Promise<string> {
  // Try MyMemory first
  try {
    const result = await translateMyMemory(text, from, to);
    if (result) return result;
  } catch (e) {
    console.log('MyMemory failed, trying Lingva...', e);
  }
  
  // Fallback to Lingva
  try {
    const result = await translateLingva(text, from, to);
    if (result) return result;
  } catch (e) {
    console.log('Lingva failed', e);
  }
  
  throw new Error('All translation services failed');
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
