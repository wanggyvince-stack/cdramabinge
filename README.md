# CDrama Database

> The ultimate guide to Chinese dramas — AI-powered recommendations, mood-based discovery, and in-depth reviews.
> 
> **Design**: Song Dynasty Aesthetic (宋韵东方极简) — "Restrained Refinement"

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript + Tailwind CSS
- **i18n**: next-intl (EN / VI / TH)
- **Database**: Turso (libSQL) + Drizzle ORM
- **AI**: Sentence Transformers (all-mpnet-base-v2)
- **Style**: Song Dynasty Aesthetic Design System

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+ (for data pipeline)

### 1. Install Node Dependencies

```bash
cd cdrama-database
npm install
```

### 2. Run Data Pipeline

```bash
# Install Python dependencies
pip install -r scripts/requirements.txt

# Step 1: Import drama data (uses Kaggle or sample data)
python3 scripts/import_kaggle.py

# Step 2: Enrich with TMDB data (requires TMDB API key)
export TMDB_API_KEY=your_key_here
python3 scripts/enrich_tmdb.py

# Step 3: Generate AI embeddings
python3 scripts/generate_embeddings.py

# Step 4: Compute similarity for recommendations
python3 scripts/compute_similarity.py
```

### 3. Configure Environment

Copy `.env.local` and update:

```bash
DATABASE_URL=file:./data/cdrama.db
TMDB_API_KEY=your_tmdb_api_key_here
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000/en](http://localhost:3000/en) in your browser.

### 5. Database Management

```bash
# Generate migration
npm run db:generate

# Push schema to database
npm run db:push

# Open Drizzle Studio
npm run db:studio
```

## Project Structure

```
cdrama-database/
├── app/
│   └── [locale]/
│       ├── layout.tsx          # Root layout + next-intl + Song aesthetics
│       └── page.tsx            # Home page (6 sections)
├── messages/
│   ├── en.json                 # English translations
│   ├── vi.json                 # Vietnamese translations
│   └── th.json                 # Thai translations
├── lib/
│   ├── db/
│   │   ├── schema.ts           # Drizzle ORM schema
│   │   └── index.ts            # Database connection
│   ├── ai/                     # Recommendation engine
│   ├── og/                     # OG image generation
│   ├── quiz/                   # Viral quiz logic
│   └── editorial/              # Editorial content management
├── scripts/
│   ├── import_kaggle.py        # Kaggle dataset import
│   ├── enrich_tmdb.py          # TMDB API enrichment
│   ├── scrape_mdl.py           # MyDramaList scraper
│   ├── generate_embeddings.py  # AI embedding generation
│   ├── compute_similarity.py   # Cosine similarity computation
│   └── requirements.txt        # Python dependencies
├── data/
│   ├── editorial.json          # Editorial content (carousel + picks)
│   ├── cdrama.db               # SQLite database
│   └── embeddings/             # Pre-computed embeddings
├── styles/
│   └── song-aesthetics.css     # Song Dynasty design tokens
├── middleware.ts               # next-intl language routing
├── i18n.ts                    # i18n configuration
├── tailwind.config.js          # Tailwind + Song color palette
├── drizzle.config.ts           # Drizzle ORM config
└── next.config.js              # Next.js + next-intl plugin
```

## Design System

### Color Palette (Song Dynasty)

| Name | HEX | Usage |
|------|-----|-------|
| 汝窑天青 | `#91B4BE` | Brand primary |
| 香灰胎 | `#B8B0A8` | Brand secondary |
| 朱砂红 | `#C73E3A` | CTA / Accent |
| 金丝金 | `#C9A86C` | Gold accent |
| 素绢 | `#F5F1E8` | Background |
| 定窑白 | `#F0EEE8` | Card background |

### Typography

- **Headings**: Cormorant Garamond (Serif)
- **Body**: Inter (Sans)
- **Chinese**: Source Han Serif / Source Han Sans
- **Thai**: Noto Serif Thai / Noto Sans Thai

### Ink Five Levels (墨色五级)

| Level | HEX | Usage |
|-------|-----|-------|
| 焦墨 | `#0D0D0D` | Main title |
| 浓墨 | `#1F1F1F` | Body text |
| 重墨 | `#4A4A4A` | Secondary heading |
| 淡墨 | `#7A7A7A` | Auxiliary text |
| 清墨 | `#B8B8B8` | Placeholder |

## Routes

| Route | Description |
|-------|-------------|
| `/[locale]/` | Home page (6 sections) |
| `/[locale]/drama/[slug]` | Drama detail page |
| `/[locale]/actor/[slug]` | Actor page |
| `/[locale]/best/[genre]` | Genre list pages |
| `/[locale]/dramas-like/[slug]` | Similar dramas |
| `/[locale]/quiz/[slug]` | Viral quiz |

## Data Pipeline

1. **import_kaggle.py** — Imports Asian Drama Dataset from Kaggle, filters C-dramas
2. **enrich_tmdb.py** — Fetches posters, multilingual synopses from TMDB API
3. **scrape_mdl.py** — Conservative MyDramaList scraper (1req/3s, Top 200)
4. **generate_embeddings.py** — Generates 768-dim embeddings via all-mpnet-base-v2
5. **compute_similarity.py** — Computes cosine similarity, Top 20 similar dramas per title

## License

MIT
