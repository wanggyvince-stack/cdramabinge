interface MoodTagProps {
  mood: string;
  label: string;
  size?: 'sm' | 'md';
}

/**
 * MoodTag — Mood pill tag (semi-transparent on hero/dark backgrounds)
 * Uses white semi-transparent styling for contrast on dark backgrounds
 */
export default function MoodTag({ mood, label, size = 'sm' }: MoodTagProps) {
  const sizeClasses = size === 'sm'
    ? 'px-3 py-1 text-xs'
    : 'px-3 py-1 text-xs';

  return (
    <span
      className={`
        inline-flex items-center
        rounded-full
        bg-white/15
        text-white/90
        border border-white/25
        font-medium tracking-wide
        backdrop-blur-sm
        ${sizeClasses}
      `}
    >
      {label}
    </span>
  );
}
