import { MOOD_PILL_DARK_CLASS, MOOD_PILL_DARK_STYLE } from '@/lib/utils/helpers';

interface MoodTagProps {
  mood: string;
  label: string;
  size?: 'sm' | 'md';
}

/**
 * MoodTag — Frosted glass mood pill for dark/hero backgrounds
 * White semi-transparent with backdrop-blur-md, using inline style
 */
export default function MoodTag({ mood, label, size = 'sm' }: MoodTagProps) {
  return (
    <span
      className={`inline-flex items-center ${MOOD_PILL_DARK_CLASS}`}
      style={MOOD_PILL_DARK_STYLE}
    >
      {label}
    </span>
  );
}
