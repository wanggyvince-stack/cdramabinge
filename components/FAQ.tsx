'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
  title: string;
}

/**
 * FAQ — FAQ 折叠面板
 */
export default function FAQ({ items, title }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="py-12 md:py-16">
      <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink-1 mb-8 tracking-wider">
        {title}
      </h2>

      <div className="max-w-3xl space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="song-card overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer"
              aria-expanded={openIndex === index}
            >
              <span className="font-medium text-ink-2 pr-4">{item.question}</span>
              <span
                className={`text-ink-4 text-lg flex-shrink-0 transition-transform duration-song ${
                  openIndex === index ? 'rotate-45' : ''
                }`}
              >
                +
              </span>
            </button>

            <div
              className={`faq-content ${openIndex === index ? 'open' : ''}`}
            >
              <div className="px-5 pb-4">
                <div className="crackle-divider mb-3" />
                <p className="text-sm text-ink-3 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
