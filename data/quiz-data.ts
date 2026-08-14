// ────────────────────────────────────────
// Quiz Data — C-drama Soul Type Personality Test
// ────────────────────────────────────────

export type QuizTypeKey =
  | 'romantic'
  | 'schemer'
  | 'thrill'
  | 'aesthetic'
  | 'feelgood'
  | 'philosophy'
  | 'action'
  | 'nightowl';

export interface QuizOption {
  label: string;
  typeKey: QuizTypeKey;
}

export interface QuizQuestion {
  id: number;
  questionKey: string; // i18n key
  options: QuizOption[];
}

export interface QuizResult {
  typeKey: QuizTypeKey;
  titleKey: string;
  subtitleKey: string;
  descriptionKey: string;
  traits: string[];
  dramaRecommendations: string[];
  moodColor: string; // maps to tailwind bg-mood-* gradient
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    questionKey: 'q1',
    options: [
      { label: 'A slow-burn romance with incredible chemistry', typeKey: 'romantic' },
      { label: 'A complex plot full of political intrigue', typeKey: 'schemer' },
      { label: 'Stunning visuals and a dreamy atmosphere', typeKey: 'aesthetic' },
      { label: 'A warm, cozy story that makes me smile', typeKey: 'feelgood' },
    ],
  },
  {
    id: 2,
    questionKey: 'q2',
    options: [
      { label: 'Alone, wrapped in a blanket, fully emotionally invested', typeKey: 'romantic' },
      { label: 'With friends, shouting at the plot twists together', typeKey: 'thrill' },
      { label: 'Solo, late at night, in complete silence', typeKey: 'nightowl' },
      { label: 'Background noise while I cook dinner', typeKey: 'feelgood' },
    ],
  },
  {
    id: 3,
    questionKey: 'q3',
    options: [
      { label: 'The first real confession of love', typeKey: 'romantic' },
      { label: 'A shocking betrayal revealed', typeKey: 'thrill' },
      { label: 'A breathtaking scene with perfect cinematography', typeKey: 'aesthetic' },
      { label: 'A heartfelt family reunion', typeKey: 'feelgood' },
    ],
  },
  {
    id: 4,
    questionKey: 'q4',
    options: [
      { label: 'Story of Kunning Palace', typeKey: 'schemer' },
      { label: 'Reset', typeKey: 'thrill' },
      { label: 'Hidden Love', typeKey: 'romantic' },
      { label: 'The Untamed', typeKey: 'action' },
    ],
  },
  {
    id: 5,
    questionKey: 'q5',
    options: [
      { label: 'Bittersweet but beautiful — they finally found each other', typeKey: 'romantic' },
      { label: 'A jaw-dropping twist I never saw coming', typeKey: 'thrill' },
      { label: 'Open-ended — it makes me think for days', typeKey: 'philosophy' },
      { label: 'Happy and wholesome — everyone deserves peace', typeKey: 'feelgood' },
    ],
  },
  {
    id: 6,
    questionKey: 'q6',
    options: [
      { label: 'Re-watching my comfort drama for the 5th time', typeKey: 'nightowl' },
      { label: 'Binge-watching the latest suspense thriller in one go', typeKey: 'thrill' },
      { label: 'Traveling to a beautiful location I saw in a drama', typeKey: 'aesthetic' },
      { label: 'Watching martial arts epics back to back', typeKey: 'action' },
    ],
  },
  {
    id: 7,
    questionKey: 'q7',
    options: [
      { label: '"This one will make you cry — in the best way"', typeKey: 'romantic' },
      { label: '"The ending will blow your mind"', typeKey: 'thrill' },
      { label: '"It changed how I see the world"', typeKey: 'philosophy' },
      { label: '"Pure comfort — like a warm hug"', typeKey: 'feelgood' },
    ],
  },
];

export const QUIZ_RESULTS: Record<QuizTypeKey, QuizResult> = {
  romantic: {
    typeKey: 'romantic',
    titleKey: 'The Hopeless Romantic',
    subtitleKey: 'You watch dramas with your whole heart',
    descriptionKey: 'For you, a great love story is worth everything. You live for the lingering glances, the almost-confessions, and the moments when two souls finally find each other.',
    traits: ['Dreamer', 'Empathetic', 'Devoted'],
    dramaRecommendations: ['hidden-love', 'ashes-of-love', 'a-little-reunion'],
    moodColor: 'mood-romantic',
  },
  schemer: {
    typeKey: 'schemer',
    titleKey: 'The Palace Schemer',
    subtitleKey: 'Every scene is a chess game, and you\'re three moves ahead',
    descriptionKey: 'You live for political intrigue, clever dialogue, and characters who outsmart everyone in the room. A well-executed power play gives you more satisfaction than any romance.',
    traits: ['Strategic', 'Sharp', 'Ambitious'],
    dramaRecommendations: ['story-of-kunning-palace', 'nirvana-in-fire', 'story-of-minglan'],
    moodColor: 'mood-mindbend',
  },
  thrill: {
    typeKey: 'thrill',
    titleKey: 'The Thrill Seeker',
    subtitleKey: 'Heart-pounding suspense is your drama fuel',
    descriptionKey: 'You crave edge-of-your-seat tension, plot twists that leave you speechless, and stories that keep you guessing until the very last episode.',
    traits: ['Adventurous', 'Analytical', 'Bold'],
    dramaRecommendations: ['reset', 'the-knockout', 'joy-of-life'],
    moodColor: 'mood-intense',
  },
  aesthetic: {
    typeKey: 'aesthetic',
    titleKey: 'The Aesthetic Soul',
    subtitleKey: 'Beauty is not a bonus — it\'s the point',
    descriptionKey: 'You appreciate dramas as visual art. Stunning cinematography, exquisite costumes, and a poetic atmosphere matter as much as the story itself.',
    traits: ['Artistic', 'Contemplative', 'Refined'],
    dramaRecommendations: ['the-longest-promise', 'love-between-fairy-and-devil', 'ashes-of-love'],
    moodColor: 'mood-aesthetic',
  },
  feelgood: {
    typeKey: 'feelgood',
    titleKey: 'The Feel-Good Seeker',
    subtitleKey: 'Life\'s too short for dramas that drain you',
    descriptionKey: 'You watch dramas to recharge. Warm stories, genuine smiles, and heartfelt moments are your escape from the chaos of everyday life.',
    traits: ['Optimistic', 'Warm', 'Nostalgic'],
    dramaRecommendations: ['meet-yourself', 'a-little-reunion', 'hidden-love'],
    moodColor: 'mood-fun',
  },
  philosophy: {
    typeKey: 'philosophy',
    titleKey: 'The Philosophy Nerd',
    subtitleKey: 'You don\'t just watch stories — you dissect them',
    descriptionKey: 'You\'re drawn to dramas that challenge your perspective, explore the human condition, and leave you thinking long after the credits roll.',
    traits: ['Intellectual', 'Curious', 'Reflective'],
    dramaRecommendations: ['nirvana-in-fire', 'the-untamed', 'story-of-minglan'],
    moodColor: 'mood-empower',
  },
  action: {
    typeKey: 'action',
    titleKey: 'The Action Hero',
    subtitleKey: 'If there\'s no fight scene, is it even a drama?',
    descriptionKey: 'Martial arts choreography, epic battles, and fearless protagonists — that\'s your drama comfort zone. You appreciate a good fight sequence more than anyone.',
    traits: ['Energetic', 'Fearless', 'Loyal'],
    dramaRecommendations: ['the-untamed', 'word-of-honor', 'joy-of-life'],
    moodColor: 'mood-intense',
  },
  nightowl: {
    typeKey: 'nightowl',
    titleKey: 'The Night Owl Dreamer',
    subtitleKey: 'The best drama experience is at 2 AM, under the covers',
    descriptionKey: 'You binge-watch when the world is quiet. Late-night viewing is your ritual, and you gravitate toward atmospheric, immersive stories that match the stillness of the night.',
    traits: ['Introspective', 'Imaginative', 'Patient'],
    dramaRecommendations: ['love-like-the-galaxy', 'the-longest-promise', 'word-of-honor'],
    moodColor: 'mood-spooky',
  },
};

// All unique drama slugs referenced in recommendations
export const ALL_QUIZ_DRAMA_SLUGS = Array.from(
  new Set(Object.values(QUIZ_RESULTS).flatMap((r) => r.dramaRecommendations))
);
