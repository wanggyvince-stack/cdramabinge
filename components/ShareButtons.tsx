'use client';

interface ShareButtonsProps {
  url: string;
  title: string;
  shareLabel: string;
}

/**
 * ShareButtons — 社交分享按钮组
 */
export default function ShareButtons({ url, title, shareLabel }: ShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      name: 'Twitter',
      icon: '𝕏',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'hover:bg-ink-2 hover:text-white',
    },
    {
      name: 'Facebook',
      icon: 'f',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'hover:bg-blue-600 hover:text-white',
    },
    {
      name: 'Reddit',
      icon: 'R',
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      color: 'hover:bg-orange-500 hover:text-white',
    },
    {
      name: 'Copy Link',
      icon: '🔗',
      href: '#',
      color: 'hover:bg-ruyao hover:text-white',
      isCopy: true,
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-ink-4 mr-1">{shareLabel}:</span>
      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target={link.isCopy ? undefined : '_blank'}
          rel={link.isCopy ? undefined : 'noopener noreferrer'}
          onClick={link.isCopy ? (e) => { e.preventDefault(); handleCopy(); } : undefined}
          className={`w-9 h-9 rounded-song border border-ivory-border flex items-center justify-center text-sm text-ink-4 transition-all duration-song ${link.color} cursor-pointer`}
          title={link.name}
          aria-label={`Share on ${link.name}`}
        >
          {link.icon}
        </a>
      ))}
    </div>
  );
}
