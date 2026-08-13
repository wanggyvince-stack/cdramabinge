import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ==========================================
// Dramas Table
// ==========================================
export const dramas = sqliteTable('dramas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  tmdbId: integer('tmdb_id'),
  mdlId: integer('mdl_id'),

  originalTitle: text('original_title').notNull(),
  originalLanguage: text('original_language'),

  // Multi-language JSON fields
  titlesJson: text('titles_json'),       // {"en":"...", "vi":"...", "th":"..."}
  synopsesJson: text('synopses_json'),   // {"en":"...", "vi":"...", "th":"..."}

  // Arrays stored as JSON
  genres: text('genres'),               // JSON array: ["Romance", "Historical"]
  tags: text('tags'),                   // JSON array
  moodTags: text('mood_tags'),          // JSON array: ["wanna_cry", "intense", "romantic"]

  rating: real('rating'),
  year: integer('year'),
  episodes: integer('episodes'),
  status: text('status'),               // "Ongoing", "Completed", etc.

  posterUrl: text('poster_url'),
  backdropUrl: text('backdrop_url'),

  // AI precomputed data
  similarDramasJson: text('similar_dramas_json'), // 预计算 AI 推荐结果

  // Streaming availability by region
  streamingJson: text('streaming_json'), // {"US": [...], "VN": [...], "TH": [...]}

  // Embedding vector stored as JSON string
  embeddingJson: text('embedding_json'), // 768-dim vector as JSON array

  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================
// Actors Table
// ==========================================
export const actors = sqliteTable('actors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  namesJson: text('names_json'),        // {"en":"...", "zh":"...", "vi":"..."}
  photoUrl: text('photo_url'),
  bioJson: text('bio_json'),            // {"en":"...", "vi":"...", "th":"..."}
  dramasJson: text('dramas_json'),      // JSON array of drama IDs/slugs
  collaborationsJson: text('collaborations_json'), // JSON of co-actors
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================
// Virus Quizzes Table
// ==========================================
export const virusQuizzes = sqliteTable('virus_quizzes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  titleJson: text('title_json'),        // {"en":"...", "vi":"...", "th":"..."}
  descriptionJson: text('description_json'), // {"en":"...", "vi":"...", "th":"..."}
  questionsJson: text('questions_json'), // Array of question objects
  resultsJson: text('results_json'),    // Array of result objects
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================
// Editorial Sections Table
// ==========================================
export const editorialSections = sqliteTable('editorial_sections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sectionType: text('section_type').notNull(), // 'hero_carousel' | 'editors_picks' | 'trending'
  dramaId: integer('drama_id'),         // FK to dramas
  position: integer('position').notNull(),
  titleOverrideJson: text('title_override_json'), // {"en":"...", "vi":"...", "th":"..."}
  commentJson: text('comment_json'),    // {"en":"...", "vi":"...", "th":"..."}
  badgeText: text('badge_text'),        // "Trending" | "New" | "Editor's Pick"
  active: integer('active', { mode: 'boolean' }).default(true),
  startDate: text('start_date'),
  endDate: text('end_date'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Type exports for use in queries
export type Drama = typeof dramas.$inferSelect;
export type NewDrama = typeof dramas.$inferInsert;
export type Actor = typeof actors.$inferSelect;
export type NewActor = typeof actors.$inferInsert;
export type VirusQuiz = typeof virusQuizzes.$inferSelect;
export type EditorialSection = typeof editorialSections.$inferSelect;
