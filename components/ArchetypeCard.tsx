interface ArchetypeCardProps {
  emoji: string;
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
  titleColor: string;
  descColor: string;
}

/**
 * ArchetypeCard — Quiz result preview card with mood-specific styling.
 * Used in the homepage Quiz CTA section.
 */
export default function ArchetypeCard({
  emoji,
  title,
  description,
  bgColor,
  borderColor,
  titleColor,
  descColor,
}: ArchetypeCardProps) {
  return (
    <div
      className="rounded-xl p-4 md:p-5 border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-default"
      style={{ backgroundColor: bgColor, borderColor }}
    >
      {emoji && <span className="text-2xl md:text-3xl mb-2 block">{emoji}</span>}
      <h3
        className="font-display text-sm md:text-base font-semibold tracking-wide mb-1"
        style={{ color: titleColor }}
      >
        {title}
      </h3>
      <p className="text-xs md:text-sm leading-relaxed" style={{ color: descColor }}>
        {description}
      </p>
    </div>
  );
}
