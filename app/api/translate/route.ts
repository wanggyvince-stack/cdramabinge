import { NextRequest, NextResponse } from 'next/server';

const SECRET = 'cdrama-translate-2026';

// Strategy 1: MyMemory with email (higher rate limit: 10k chars/day vs 1k)
async function translateMyMemory(text: string, from: string, to: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}&de=product@cdramabinge.com`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`MyMemory: ${res.status}`);
  const data = await res.json();
  if (data.responseStatus === 429 || data.responseStatus === 403) throw new Error(`MyMemory rate limited`);
  const translated = data.responseData?.translatedText || '';
  if (!translated || translated === text) throw new Error('MyMemory empty result');
  return translated;
}

// Strategy 2: LibreTranslate public instances
async function translateLibre(text: string, from: string, to: string): Promise<string> {
  const instances = [
    'https://libretranslate.de',
    'https://translate.terraprint.co',
  ];
  for (const instance of instances) {
    try {
      const res = await fetch(`${instance}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: from, target: to }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.translatedText) return data.translatedText;
    } catch {}
  }
  throw new Error('LibreTranslate failed');
}

// Strategy 3: Google Translate via alternative URL
async function translateGoogle(text: string, from: string, to: string): Promise<string> {
  const url = `https://translate.google.com/m?tl=${to}&sl=${from}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  if (!res.ok) throw new Error(`Google: ${res.status}`);
  const html = await res.text();
  // Extract translation from HTML response
  const match = html.match(/class="result-container"[^>]*>([^<]+)</);
  if (match && match[1]) return match[1].trim();
  throw new Error('Google: no result');
}

async function translateText(text: string, from: string, to: string): Promise<string> {
  const strategies = [translateMyMemory, translateGoogle, translateLibre];
  
  for (const fn of strategies) {
    try {
      const result = await fn(text, from, to);
      if (result && result.length > 5) return result;
    } catch (e) {
      console.log(`Strategy failed: ${e}`);
      continue;
    }
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
