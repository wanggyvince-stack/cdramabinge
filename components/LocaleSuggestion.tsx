'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function LocaleSuggestion() {
  const [suggested, setSuggested] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't show if already dismissed
    if (localStorage.getItem('locale-suggestion-dismissed')) return;

    // Don't show if already on the suggested locale
    const currentLocale = pathname.split('/')[1];
    
    fetch('/api/geo-suggest')
      .then(r => r.json())
      .then(data => {
        if (data.suggestedLocale && data.suggestedLocale !== currentLocale) {
          setSuggested(data.suggestedLocale);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleAccept = () => {
    if (!suggested) return;
    localStorage.setItem('locale-suggestion-dismissed', 'true');
    const newPath = pathname.replace(/^\/[a-z]{2}/, `/${suggested}`);
    router.push(newPath);
  };

  const handleDismiss = () => {
    localStorage.setItem('locale-suggestion-dismissed', 'true');
    setSuggested(null);
  };

  if (!suggested) return null;

  const messages: Record<string, { text: string; yes: string; no: string }> = {
    id: { text: 'Tersedia dalam Bahasa Indonesia', yes: 'Ya', no: 'Tidak' },
    vi: { text: 'Có sẵn bằng Tiếng Việt', yes: 'Có', no: 'Không' },
    th: { text: 'มีให้บริการเป็นภาษาไทย', yes: 'ใช่', no: 'ไม่' },
  };

  const msg = messages[suggested] || { text: `Available in ${suggested}`, yes: 'Yes', no: 'No' };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[100] 
      bg-mo-yu border border-ivory-border/30 rounded-song shadow-2xl px-4 py-3 
      flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <p className="flex-1 text-sm text-yue-bai-soft">
        {msg.text}
      </p>
      <button
        onClick={handleAccept}
        className="px-3 py-1.5 text-xs font-medium rounded-full 
          bg-liuli-gold/20 text-liuli-gold border border-liuli-gold/30 
          hover:bg-liuli-gold/30 transition-colors whitespace-nowrap"
      >
        {msg.yes}
      </button>
      <button
        onClick={handleDismiss}
        className="px-2 py-1.5 text-xs text-qing-hui hover:text-yue-bai-soft transition-colors"
      >
        {msg.no}
      </button>
    </div>
  );
}
