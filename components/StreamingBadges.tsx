interface StreamingInfo {
  platform: string;
  url?: string;
  logo?: string;
}

interface StreamingBadgesProps {
  streaming: StreamingInfo[];
  watchLabel: string;
}

/**
 * StreamingBadges — "在哪看" 流媒体标签组件
 */
export default function StreamingBadges({ streaming, watchLabel }: StreamingBadgesProps) {
  if (streaming.length === 0) {
    return (
      <div className="text-sm text-ink-4 italic">
        Streaming info not available yet. Check your local platforms!
      </div>
    );
  }

  const platformColors: Record<string, string> = {
    Netflix: 'bg-red-600',
    'Viki': 'bg-green-600',
    'YouTube': 'bg-red-500',
    'iQIYI': 'bg-green-500',
    'WeTV': 'bg-blue-500',
    'Youku': 'bg-blue-600',
    'Mango TV': 'bg-orange-500',
  };

  return (
    <div className="flex flex-wrap gap-3">
      {streaming.map((item) => (
        <a
          key={item.platform}
          href={item.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-song text-white text-sm font-medium transition-all duration-song hover:brightness-110 ${
            platformColors[item.platform] || 'bg-ruyao'
          }`}
        >
          {item.logo && (
            <img src={item.logo} alt={item.platform} className="w-5 h-5 rounded"
                    width={32}
                    height={32} />
          )}
          <span>{item.platform}</span>
          <span className="text-xs opacity-70">→</span>
        </a>
      ))}
    </div>
  );
}
