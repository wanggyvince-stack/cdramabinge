import { MOOD_PILL_DARK_STYLE } from '@/lib/utils/helpers';

interface MoodTagProps {
  mood: string;
  label: string;
  size?: 'sm' | 'md';
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'px-2.5 py-1 text-[11px]',
  md: 'px-3 py-1 text-xs',
};

/**
 * MoodTag — Frosted glass mood pill for dark/hero backgrounds
 * White semi-transparent with backdrop-blur-md, using inline style
 * Unified font-display for consistent typography across all sizes
 */
export default function MoodTag({ mood, label, size = 'sm' }: MoodTagProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full backdrop-blur-md border font-display font-medium tracking-wider whitespace-nowrap ${SIZE_CLASSES[size]}`}
      style={MOOD_PILL_DARK_STYLE}
    >
      {label}
    </span>
  );
}
