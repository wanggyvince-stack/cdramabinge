import { MOOD_GRADIENT_CLASS } from '@/lib/utils/helpers';

interface MoodTagProps {
  mood: string;
  label: string;
  size?: 'sm' | 'md';
}

/**
 * MoodTag — 情绪标签（纯文字 + 色块）
 * Displays a small solid-color pill with mood label
 */
export default function MoodTag({ mood, label, size = 'sm' }: MoodTagProps) {
  const bgClass = MOOD_GRADIENT_CLASS[mood] || 'bg-mood-romantic';

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-song text-white font-medium ${sizeClasses} ${bgClass}`}
    >
      {label}
    </span>
  );
}
