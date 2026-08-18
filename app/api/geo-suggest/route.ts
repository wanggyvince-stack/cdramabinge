import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const COUNTRY_LOCALE_MAP: Record<string, string> = {
  ID: 'id',
  TH: 'th',
  VN: 'vi',
};

export async function GET(request: NextRequest) {
  // Vercel Edge: x-vercel-ip-country is always available in Edge runtime
  const country = request.headers.get('x-vercel-ip-country') || '';
  const suggested = COUNTRY_LOCALE_MAP[country] || null;
  
  return NextResponse.json({ 
    suggestedLocale: suggested,
    country: country || 'unknown',
  });
}
