'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface CarouselItem {
  slug: string;
  title: string;
  backdropUrl?: string | null;
  comment: string;
}

interface HeroCarouselProps {
  items: CarouselItem[];
  locale: string;
}

/**
 * HeroCarousel — 首页轮播组件
 * Full-width, 5s auto-play, ink wash gradient transition
 * Fetches real backdrop images from TMDB when missing/placeholder
 */
export default function HeroCarousel({ items, locale }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [resolvedBackdrops, setResolvedBackdrops] = useState<Record<string, string | null>>({});

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

  const viewDetailsLabel = locale === 'vi' ? 'Xem chi tiết' : locale === 'th' ? 'ดูรายละเอียด' : 'View Details';

  // Fetch missing backdrops from TMDB API
  useEffect(() => {
    items.forEach((item) => {
      if (!item.backdropUrl && !resolvedBackdrops[item.slug]) {
        fetch(`/api/tmdb-poster?slug=${item.slug}`)
          .then(res => res.json())
          .then(data => {
            if (data.backdropUrl) {
              setResolvedBackdrops(prev => ({ ...prev, [item.slug]: data.backdropUrl }));
            }
          })
          .catch(() => {});
      }
    });
  }, [items, resolvedBackdrops]);

  if (items.length === 0) return null;

  // Get the effective backdrop URL for an item
  const getBackdrop = (item: CarouselItem) => {
    if (item.backdropUrl) return item.backdropUrl;
    return resolvedBackdrops[item.slug] || null;
  };

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
          {/* Background image with micro-breath animation */}
          {getBackdrop(item) ? (
            <img
              src={getBackdrop(item)!}
              alt={item.title}
              className="w-full h-full object-cover hero-backdrop"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ink-2 via-dingyao to-ink-3" />
          )}

          {/* Ink wash overlay — lighter gradients for more image visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-sujuan/80 via-sujuan/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent" />
        </div>
      ))}

      {/* Content overlay */}
      <div className="absolute inset-x-0 bottom-0 z-20 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-6">
          {items[current] && (
            <div className="max-w-2xl">
              {/* Title */}
              <Link href={`/${locale}/drama/${items[current].slug}`}>
                <h1 className="font-display text-4xl md:text-6xl font-bold text-white mb-3 tracking-widest leading-tight hover:text-ruyao transition-colors duration-song">
                  {items[current].title}
                </h1>
              </Link>

              {/* Editorial comment */}
              <p className="text-base md:text-lg text-white/80 leading-relaxed italic">
                &ldquo;{items[current].comment}&rdquo;
              </p>

              {/* CTA Button */}
              <Link href={`/${locale}/drama/${items[current].slug}`}
                 className="inline-flex items-center gap-2 mt-5
                            bg-white/10 backdrop-blur-sm 
                            border border-white/20
                            text-white px-6 py-2.5 
                            rounded-song 
                            font-medium tracking-wide 
                            transition-all duration-300
                            hover:bg-white/20 hover:border-white/30">
                {viewDetailsLabel}
              </Link>
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
