import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// ────────────────────────────────────────
// Dynamic OG Image Generator
// ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'drama';

  if (type === 'quiz') {
    return generateQuizCard(searchParams);
  }

  if (type === 'home') {
    return generateHomeCard();
  }

  return generateDramaCard(searchParams);
}

// ────────────────────────────────────────
// Drama Detail Card (1200×630)
// ────────────────────────────────────────

function generateDramaCard(searchParams: URLSearchParams) {
  const title = searchParams.get('title') || 'CDramaBinge';
  const description = searchParams.get('description') || '';
  const rating = searchParams.get('rating');
  const poster = searchParams.get('poster');
  const year = searchParams.get('year');

  // Truncate description to ~140 chars
  const desc = description.length > 140
    ? description.slice(0, 137) + '...'
    : description;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: '#121318',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Left content area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 40px 60px 60px',
          }}
        >
          {/* Brand */}
          <div
            style={{
              fontSize: 16,
              color: '#5a6478',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            CDramaBinge
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: title.length > 30 ? 42 : 52,
              color: '#f0f4f8',
              fontWeight: 600,
              lineHeight: 1.15,
              marginBottom: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '560px',
            }}
          >
            {title}
            {year ? ` (${year})` : ''}
          </div>

          {/* Rating */}
          {rating && (
            <div
              style={{
                fontSize: 22,
                color: '#a03030',
                marginBottom: 20,
                fontWeight: 600,
              }}
            >
              ★ {rating} / 10
            </div>
          )}

          {/* Description */}
          {desc && (
            <div
              style={{
                fontSize: 20,
                color: '#8b95a8',
                lineHeight: 1.5,
                maxWidth: '520px',
                overflow: 'hidden',
              }}
            >
              {desc}
            </div>
          )}
        </div>

        {/* Right poster area */}
        {poster && (
          <div
            style={{
              width: 340,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 40px 40px 0',
            }}
          >
            <img
              src={poster}
              alt={title}
              style={{
                width: 260,
                height: 390,
                objectFit: 'cover',
                borderRadius: 8,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

// ────────────────────────────────────────
// Quiz Result Card (1200×630)
// ────────────────────────────────────────

function generateQuizCard(searchParams: URLSearchParams) {
  const title = searchParams.get('title') || 'Your C-drama Soul Type';
  const subtitle = searchParams.get('subtitle') || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #121318 0%, #1a1020 50%, #8b2828 100%)',
          fontFamily: 'Georgia, serif',
          padding: '60px',
        }}
      >
        {/* Brand */}
        <div
          style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 30,
          }}
        >
          CDramaBinge — Quiz Result
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 30 ? 48 : 60,
            color: '#f0f4f8',
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.2,
            marginBottom: 20,
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div
            style={{
              fontSize: 24,
              color: 'rgba(240,244,248,0.7)',
              fontStyle: 'italic',
              textAlign: 'center',
              maxWidth: '700px',
            }}
          >
            {subtitle}
          </div>
        )}

        {/* CTA */}
        <div
          style={{
            marginTop: 40,
            fontSize: 18,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.1em',
          }}
        >
          Discover your C-drama soul type at cdramabinge.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

// ────────────────────────────────────────
// Home Page Card (1200×630)
// ────────────────────────────────────────

function generateHomeCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#121318',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Brand mark */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 8,
            backgroundColor: '#8b2828',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 30,
          }}
        >
          <span style={{ fontSize: 28, color: '#f0f4f8', fontWeight: 700 }}>C</span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            color: '#f0f4f8',
            fontWeight: 600,
            letterSpacing: '0.02em',
            marginBottom: 16,
          }}
        >
          CDramaBinge
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: '#8b95a8',
            fontStyle: 'italic',
          }}
        >
          Discover the Best C-Dramas
        </div>

        {/* Sub-tagline */}
        <div
          style={{
            fontSize: 16,
            color: '#5a6478',
            marginTop: 20,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          Curated Recommendations · Mood-based Browsing · In-depth Guides
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
