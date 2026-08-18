import { NextRequest, NextResponse } from 'next/server';

const COUNTRY_LOCALE_MAP: Record<string, string> = {
  ID: 'id',
  TH: 'th',
  VN: 'vi',
};

export async function GET(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country') || '';
  const suggested = COUNTRY_LOCALE_MAP[country];
  
  if (suggested) {
    return NextResponse.json({ suggestedLocale: suggested });
  }
  
  return NextResponse.json({ suggestedLocale: null });
}
