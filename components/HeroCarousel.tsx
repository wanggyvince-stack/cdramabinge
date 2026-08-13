'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface CarouselItem {
  slug: string;
  title: string;
  backdropUrl?: string | null;
  comment: string;
  badge: string;
}

interface HeroCarouselProps {
  items: CarouselItem[];
  locale: string;
  trendingLabel: string;
}

/**
 * HeroCarousel — 首页轮播组件
 * Full-width, 5s auto-play, ink wash gradient transition
 */
export default function HeroCarousel({ items, locale, trendingLabel }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isPaused, next]);

  if (items.length === 0) return null;

  return (
    <section
      className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Hero Carousel"
    >
      {/* Slides */}
      {items.map((item, index) => (
        <div
          key={item.slug}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Background image */}
          {item.backdropUrl ? (
            <img
              src={item.backdropUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ink-2 to-ink-3" />
          )}

          {/* Ink wash overlay — bottom gradient to sujuan */}
          <div className="absolute inset-0 bg-gradient-to-t from-sujuan via-sujuan/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
        </div>
      ))}

      {/* Content overlay */}
      <div className="absolute inset-x-0 bottom-0 z-20 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-6">
          {items[current] && (
            <div className="max-w-2xl">
              {/* Badge */}
              <span className="inline-block px-3 py-1 bg-zhusha/90 text-white text-xs font-medium rounded-song mb-3 tracking-wide">
                {items[current].badge || trendingLabel}
              </span>

              {/* Title */}
              <Link href={`/${locale}/drama/${items[current].slug}`}>
                <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-3 tracking-wider leading-tight hover:text-ruyao transition-colors duration-song">
                  {items[current].title}
                </h1>
              </Link>

              {/* Editorial comment */}
              <p className="text-base md:text-lg text-white/80 leading-relaxed italic">
                &ldquo;{items[current].comment}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-6 inset-x-0 z-20 flex justify-center gap-2">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`carousel-dot ${index === current ? 'active' : ''}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
