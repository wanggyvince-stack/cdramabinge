interface EditorialCommentProps {
  text: string;
  author?: string;
}

/**
 * EditorialComment — 编辑评语组件
 * Styled with italic serif font and decorative quote marks
 */
export default function EditorialComment({ text, author }: EditorialCommentProps) {
  return (
    <div className="relative pl-6 py-2">
      {/* Decorative quote mark */}
      <span className="absolute left-0 top-0 text-3xl text-ruyao/40 font-display leading-none">
        &ldquo;
      </span>
      <p className="font-display text-lg md:text-xl text-ink-3 italic leading-relaxed">
        {text}
      </p>
      {author && (
        <span className="text-xs text-ink-5 mt-2 block tracking-wider uppercase">
          — {author}
        </span>
      )}
    </div>
  );
}
