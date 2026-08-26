import type { Metadata } from 'next';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import '@/app/globals.css';
import LocaleSuggestion from '@/components/LocaleSuggestion';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL('https://cdramabinge.com'),
  title: {
    template: '%s | CDramaBinge',
    default: 'CDramaBinge — Your Guide to Chinese Dramas',
  },
  description:
    'Discover the best Chinese dramas — curated recommendations, mood-based browsing, and in-depth guides.',
  alternates: {
    canonical: 'https://cdramabinge.com',
    languages: {
      en: '/en',
      vi: '/vi',
      th: '/th',
      id: '/id',
      'x-default': '/en',
    },
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://cdramabinge.com',
    siteName: 'CDramaBinge',
    title: 'CDramaBinge — Your Guide to Chinese Dramas',
    description:
      'Discover the best Chinese dramas — curated recommendations, mood-based browsing, and in-depth guides.',
    images: [{ url: 'https://cdramabinge.com/og-image.png', width: 1200, height: 1200 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CDramaBinge — Your Guide to Chinese Dramas',
    description:
      'Discover the best Chinese dramas — curated recommendations, mood-based browsing, and in-depth guides.',
    images: ['https://cdramabinge.com/og-image.png'],
  },
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  const nav = await getTranslations('nav');

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Google Fonts - Cormorant Garamond + Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Noto+Serif+Thai:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-sujuan text-ink-2 antialiased font-sans">
        {/* Google Analytics GA4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=G-DRJPX6Z846`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-DRJPX6Z846');
          `}
        </Script>
        {/* Microsoft Clarity */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "y48fxh3upm");
          `}
        </Script>
        {/* Global JSON-LD: WebSite + SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'CDramaBinge',
              url: 'https://cdramabinge.com',
              description:
                'Discover the best Chinese dramas — curated recommendations, mood-based browsing, and in-depth guides.',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://cdramabinge.com/en?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
              inLanguage: ['en', 'vi', 'th'],
            }),
          }}
        />
        <NextIntlClientProvider messages={messages}>
          {/* Navigation */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-sujuan/80 backdrop-blur-md border-b border-ivory-border">
            <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <a href={`/${locale}`} className="font-display text-2xl font-bold text-ink-1 tracking-wider">
                CDramaBinge
              </a>
              <div className="flex items-center gap-6">
                {/* Nav links */}
                <div className="hidden md:flex items-center gap-4 text-sm">
                  <a href={`/${locale}/actors`} className="text-ink-4 hover:text-ink-1 transition-colors duration-song tracking-wide">
                    {nav('actors')}
                  </a>
                </div>
                {/* Language switcher */}
                <div className="flex items-center gap-2 text-sm text-ink-4">
                  {locales.map((l) => (
                    <a
                      key={l}
                      href={`/${l}`}
                      className={`uppercase tracking-wider transition-colors duration-song ${
                        l === locale ? 'text-ink-1 font-medium' : 'hover:text-ink-2'
                      }`}
                    >
                      {l}
                    </a>
                  ))}
                </div>
              </div>
            </nav>
          </header>

          {/* Main content */}
          <main className="min-h-screen pt-16">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-dingyao border-t border-ivory-border py-12">
            <div className="max-w-7xl mx-auto px-6 text-center">
              <p className="font-display text-xl text-ink-3 mb-2">CDramaBinge</p>
              <p className="text-sm text-ink-4">
                {locale === 'en' && 'Your guide to Chinese dramas'}
                {locale === 'vi' && 'Cẩm nang phim Hoa của bạn'}
                {locale === 'th' && 'คู่มือซีรีส์จีนของคุณ'}
                {locale === 'id' && 'Panduan drama China Anda'}
              </p>
              <div className="flex justify-center gap-6 text-sm text-ink-4 mt-4 mb-4">
                <a href={`/${locale}/actors`} className="hover:text-ink-1 transition-colors duration-song">
                  {nav('actors')}
                </a>
                <a href={`/${locale}`} className="hover:text-ink-1 transition-colors duration-song">
                  {nav('browse')}
                </a>
                <a href={`/${locale}/starter-pack`} className="hover:text-ink-1 transition-colors duration-song">
                  {nav('starterPack')}
                </a>
              </div>
              <p className="text-xs text-ink-5 mt-4">
                © 2026 CDramaBinge. Made with ♥ for C-drama fans.
              </p>
            </div>
          </footer>
        </NextIntlClientProvider>
        <LocaleSuggestion />
      </body>
    </html>
  );
}
