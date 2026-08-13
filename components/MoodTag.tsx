import { MOOD_PILL_DARK_CLASS } from '@/lib/utils/helpers';

interface MoodTagProps {
  mood: string;
  label: string;
  size?: 'sm' | 'md';
}

/**
 * MoodTag — Frosted glass mood pill for dark/hero backgrounds
 * White semi-transparent with backdrop-blur-md
 */
export default function MoodTag({ mood, label, size = 'sm' }: MoodTagProps) {
  return (
    <span className={`inline-flex items-center ${MOOD_PILL_DARK_CLASS}`}>
      {label}
    </span>
  );
}
