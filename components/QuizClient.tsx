'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  QUIZ_QUESTIONS,
  QUIZ_RESULTS,
  type QuizTypeKey,
} from '@/data/quiz-data';

// Mood color gradient mapping for result backgrounds
// Defined here (not in data/) so Tailwind can scan the classes
const QUIZ_MOOD_GRADIENTS: Record<string, string> = {
  'mood-romantic': 'from-[#C4A882]/20 via-sujuan to-[#D8C8B0]/15',
  'mood-mindbend': 'from-[#3A4E7B]/20 via-sujuan to-[#4A5C80]/15',
  'mood-intense': 'from-[#B04030]/15 via-sujuan to-[#C73E3A]/10',
  'mood-aesthetic': 'from-[#8CB4A0]/20 via-sujuan to-[#A0C8B0]/15',
  'mood-fun': 'from-[#C8B098]/20 via-sujuan to-[#D4B8A0]/15',
  'mood-empower': 'from-[#A08355]/20 via-sujuan to-[#C9A86C]/15',
  'mood-spooky': 'from-[#3C3835]/20 via-sujuan to-[#4A4A4A]/15',
};

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface DramaInfo {
  slug: string;
  title: string;
  posterUrl: string | null;
  year: number | null;
}

interface QuizClientProps {
  locale: string;
  dramasBySlug: Record<string, DramaInfo>;
}

// ────────────────────────────────────────
// Main Component
// ────────────────────────────────────────

export default function QuizClient({ locale, dramasBySlug }: QuizClientProps) {
  const t = useTranslations('Quiz');
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultParam = searchParams.get('result');

  // Phases: 'intro' | 'quiz' | 'result'
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<QuizTypeKey[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [resultType, setResultType] = useState<QuizTypeKey | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);

  // If ?result= param exists, jump directly to result
  useEffect(() => {
    if (resultParam && QUIZ_RESULTS[resultParam as QuizTypeKey]) {
      setResultType(resultParam as QuizTypeKey);
      setPhase('result');
      setTimeout(() => setShowResult(true), 100);
    }
  }, [resultParam]);

  const handleStart = () => {
    setPhase('quiz');
    setCurrentQ(0);
    setAnswers([]);
    setSelectedOption(null);
  };

  const handleOptionSelect = useCallback((optionIndex: number, typeKey: QuizTypeKey) => {
    if (isTransitioning) return;
    setSelectedOption(optionIndex);
    setIsTransitioning(true);

    const newAnswers = [...answers, typeKey];
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentQ < QUIZ_QUESTIONS.length - 1) {
        setCurrentQ(currentQ + 1);
        setSelectedOption(null);
        setIsTransitioning(false);
      } else {
        const counts: Record<string, number> = {};
        newAnswers.forEach((a) => { counts[a] = (counts[a] || 0) + 1; });
        const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as QuizTypeKey;
        setResultType(winner);
        setPhase('result');
        const url = `/${locale}/quiz?result=${winner}`;
        window.history.replaceState(null, '', url);
        setTimeout(() => setShowResult(true), 100);
        setIsTransitioning(false);
      }
    }, 300);
  }, [answers, currentQ, isTransitioning, locale]);

  const handleRetake = () => {
    setShowResult(false);
    setTimeout(() => {
      setPhase('intro');
      setCurrentQ(0);
      setAnswers([]);
      setSelectedOption(null);
      setResultType(null);
      router.push(`/${locale}/quiz`);
    }, 300);
  };

  const handleCopyLink = async () => {
    if (!resultType) return;
    const shareUrl = `https://cdramabinge.com/${locale}/quiz?result=${resultType}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  // ────────────────────────────────────────
  // Render: Intro
  // ────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          {/* Decorative seal */}
          <div className="mx-auto w-20 h-20 rounded-song bg-zhusha/10 border border-zhusha/30 flex items-center justify-center mb-8 animate-pulse">
            <span className="font-display text-3xl text-zhusha">?</span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold text-ink-1 tracking-wider mb-4">
            {t('title')}
          </h1>
          <p className="text-base md:text-lg text-ink-4 mb-10 leading-relaxed">
            {t('subtitle')}
          </p>

          <button
            onClick={handleStart}
            className="px-10 py-4 bg-zhusha text-white font-display text-lg tracking-wide rounded-song hover:bg-zhusha/90 transition-all duration-song hover:scale-105 hover:-translate-y-0.5 shadow-lg shadow-zhusha/20"
          >
            {t('startButton')}
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────
  // Render: Quiz Questions
  // ────────────────────────────────────────
  if (phase === 'quiz') {
    const question = QUIZ_QUESTIONS[currentQ];
    const progress = ((currentQ) / QUIZ_QUESTIONS.length) * 100;

    return (
      <div className="min-h-[80vh] flex flex-col px-6 py-12 max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="mb-10">
          <p className="text-sm text-ink-4 mb-2 tracking-wide">
            {t('question').replace('{n}', String(currentQ + 1))}
          </p>
          <div className="h-1.5 bg-ivory-border rounded-full overflow-hidden">
            <div
              className="h-full bg-zhusha rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink-1 tracking-wide mb-8 leading-snug">
          {t(`q${question.id}`)}
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const letter = String.fromCharCode(65 + idx);
            return (
              <button
                key={`${currentQ}-${idx}`}
                onClick={() => handleOptionSelect(idx, option.typeKey)}
                disabled={isTransitioning}
                className={`w-full text-left px-6 py-4 rounded-song border transition-all duration-300 group cursor-pointer
                  ${isSelected
                    ? 'bg-zhusha/10 border-zhusha/50 scale-[0.98]'
                    : 'bg-dingyao border-ivory-border hover:border-zhusha/30 hover:bg-zhusha/5 hover:scale-[1.01]'
                  }
                  ${isTransitioning && !isSelected ? 'opacity-50' : ''}
                `}
              >
                <div className="flex items-center gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center font-display text-sm transition-colors duration-300
                    ${isSelected ? 'bg-zhusha text-white border-zhusha' : 'border-ink-5 text-ink-4 group-hover:border-zhusha/50 group-hover:text-zhusha'}
                  `}>
                    {letter}
                  </span>
                  <span className={`text-base leading-relaxed transition-colors duration-300 ${isSelected ? 'text-ink-1 font-medium' : 'text-ink-2'}`}>
                    {option.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────
  // Render: Result
  // ────────────────────────────────────────
  if (phase === 'result' && resultType) {
    const result = QUIZ_RESULTS[resultType];
    const gradientClass = QUIZ_MOOD_GRADIENTS[result.moodColor] || 'from-sujuan to-sujuan';
    const shareUrl = `https://cdramabinge.com/${locale}/quiz?result=${resultType}`;
    const shareText = `I'm ${result.titleKey}! What's your C-drama soul type? Take the quiz on CDramaBinge`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

    const recommendedDramas = result.dramaRecommendations
      .map((slug) => dramasBySlug[slug])
      .filter(Boolean);

    return (
      <div className={`min-h-screen bg-gradient-to-b ${gradientClass} transition-all duration-700`}>
        <div className={`max-w-2xl mx-auto px-6 py-16 transition-all duration-700 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Result badge */}
          <div className="text-center mb-8">
            <p className="text-sm tracking-[0.2em] text-ink-4 uppercase mb-4">
              {t('yourResult')}
            </p>
            <div className="w-12 h-px bg-zhusha/50 mx-auto" />
          </div>

          {/* Title */}
          <h1 className="font-display text-4xl md:text-5xl font-bold text-ink-1 tracking-wider text-center mb-3 leading-tight">
            {result.titleKey}
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-ink-3 text-center italic font-display mb-8">
            {result.subtitleKey}
          </p>

          {/* Description */}
          <p className="text-base text-ink-2 leading-relaxed text-center max-w-lg mx-auto mb-10">
            {result.descriptionKey}
          </p>

          {/* Traits */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {result.traits.map((trait) => (
              <span
                key={trait}
                className="px-5 py-2 rounded-full bg-mood-romantic/15 border border-mood-romantic/25 text-sm font-medium tracking-wide text-ink-2"
              >
                {trait}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-10">
            <div className="flex-1 h-px bg-ivory-border" />
            <span className="text-sm text-ink-4 tracking-wider font-display">{t('recommendations')}</span>
            <div className="flex-1 h-px bg-ivory-border" />
          </div>

          {/* Recommended Dramas */}
          <div className="grid grid-cols-3 gap-4 mb-14">
            {recommendedDramas.map((drama) => (
              <Link
                key={drama.slug}
                href={`/${locale}/drama/${drama.slug}`}
                className="group block"
              >
                <div className="aspect-[2/3] rounded-song overflow-hidden bg-dingyao border border-ivory-border mb-2">
                  {drama.posterUrl ? (
                    <img
                      src={drama.posterUrl}
                      alt={drama.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-dingyao">
                      <span className="text-3xl font-display text-ink-5">
                        {drama.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-ink-3 text-center line-clamp-2 group-hover:text-ink-1 transition-colors duration-song">
                  {drama.title}
                </p>
              </Link>
            ))}
          </div>

          {/* Share Section */}
          <div className="text-center mb-8">
            <p className="text-sm text-ink-4 mb-4 tracking-wide">
              {t('shareResult')}
            </p>
            <div className="flex justify-center gap-3 mb-8">
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-song border border-ivory-border flex items-center justify-center text-ink-4 hover:bg-ink-2 hover:text-white transition-all duration-song"
                title="Share on Twitter"
              >
                <span className="font-bold text-sm">X</span>
              </a>
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-song border border-ivory-border flex items-center justify-center text-ink-4 hover:bg-blue-600 hover:text-white transition-all duration-song"
                title="Share on Facebook"
              >
                <span className="font-bold text-sm">f</span>
              </a>
              <button
                onClick={handleCopyLink}
                className="w-10 h-10 rounded-song border border-ivory-border flex items-center justify-center text-ink-4 hover:bg-ruyao hover:text-white transition-all duration-song"
                title="Copy Link"
              >
                {copied ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Retake */}
          <div className="text-center">
            <button
              onClick={handleRetake}
              className="px-8 py-3 border border-ink-5 text-ink-3 font-display tracking-wide rounded-song hover:border-zhusha hover:text-zhusha transition-all duration-song"
            >
              {t('retake')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
