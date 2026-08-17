/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    { pattern: /bg-mood-\w+\/\d+/ },
    { pattern: /text-mood-\w+/ },
    { pattern: /border-mood-\w+\/\d+/ },
    { pattern: /hover:bg-mood-\w+\/\d+/ },
    { pattern: /bg-mood-\w+/ },
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // === Song Dynasty Aesthetic Color Palette — Dark Theme ===
      colors: {
        // Brand colors
        'ruyao': '#4a9e8e',          // 汝窑天青 -> 青玉
        'xianghui': '#5a6478',       // 香灰胎 -> 沉灰
        'zhusha': '#8b2828',         // 朱砂红 -> 深朱砂
        'jinsi': '#d4a853',          // 金丝金 -> 琉璃金

        // Backgrounds
        'sujuan': '#121318',         // 素绢 -> 深墨主背景
        'dingyao': '#1a1d24',        // 定窑白 -> 墨玉卡片
        'youse': '#22262e',          // 釉色浅灰 -> hover/次级背景

        // Background aliases
        'deep-ink': '#121318',
        'mo-yu': '#1a1d24',
        'song-dark': '#22262e',
        'yu-bai-dark': '#2a3040',

        // Dark mode (legacy)
        'nongmo-bg': '#1A1A1A',      // 浓墨 - dark background
        'zhongmo-card': '#2C2825',   // 重墨 - dark card

        // Ink levels (text)
        'ink-1': '#f0f4f8',          // 焦墨 -> 月白主文字
        'ink-2': '#c8d0dc',          // 浓墨 -> 柔化月白
        'ink-3': '#8b95a8',          // 重墨 -> 青灰辅助
        'ink-4': '#5a6478',          // 淡墨 -> 沉灰
        'ink-5': '#3a4458',          // 清墨 -> 深灰placeholder

        // Text aliases
        'yue-bai': '#f0f4f8',
        'yue-bai-soft': '#c8d0dc',
        'qing-hui': '#8b95a8',
        'chen-hui': '#5a6478',

        // Dark mode text (legacy)
        'hebai': '#F2F0EA',          // 鹤白 - main text (dark mode)
        'danmo': '#8A8A8A',          // 淡墨灰 - secondary text (dark mode)

        // Borders
        'ivory-border': '#2a3040',   // 象牙暖灰 -> 深边框

        // Border aliases
        'song-border': '#2a3040',
        'song-border-light': '#3a4458',

        // Emphasis aliases
        'zhusha-dark': '#8b2828',
        'qing-yu': '#4a9e8e',
        'liu-li': '#d4a853',

        // === Mood solid colors (for pill tags with opacity) ===
        'mood-wanna_cry': ({ withAlpha }) => withAlpha ? withAlpha('#a0c8d8') : '#a0c8d8',
        'mood-light_fun': ({ withAlpha }) => withAlpha ? withAlpha('#b0d8b8') : '#b0d8b8',
        'mood-intense': ({ withAlpha }) => withAlpha ? withAlpha('#d8a0c8') : '#d8a0c8',
        'mood-romantic': ({ withAlpha }) => withAlpha ? withAlpha('#e8a0b0') : '#e8a0b0',
        'mood-mindbending': ({ withAlpha }) => withAlpha ? withAlpha('#c0a8d8') : '#c0a8d8',
        'mood-spooky': ({ withAlpha }) => withAlpha ? withAlpha('#a0b0c0') : '#a0b0c0',
        'mood-empowering': ({ withAlpha }) => withAlpha ? withAlpha('#e0c890') : '#e0c890',
        'mood-aesthetic': ({ withAlpha }) => withAlpha ? withAlpha('#d0a0b8') : '#d0a0b8',
      },

      // === Typography ===
      fontFamily: {
        'serif': ['Cormorant Garamond', '"Source Han Serif SC"', '"Source Han Serif"', '"Noto Serif Thai"', 'serif'],
        'sans': ['Inter', '"Source Han Sans SC"', '"Source Han Sans"', '"Noto Sans Thai"', 'sans-serif'],
        'display': ['Cormorant Garamond', 'serif'],
      },

      // === Spacing for Song Dynasty whitespace ===
      spacing: {
        '18': '4.5rem',    // 72px - section gap
        '20': '5rem',      // 80px - large section gap
      },

      // === Border radius - Song style is more square ===
      borderRadius: {
        'song': '8px',     // Song aesthetic prefers less rounded
      },

      // === Transitions - restrained like ink diffusion ===
      transitionDuration: {
        'song': '250ms',
      },

      // === Mood gradients (dark saturated) ===
      backgroundImage: {
        'mood-cry': 'linear-gradient(135deg, #a0c8d8, #80a8c0)',
        'mood-fun': 'linear-gradient(135deg, #b0d8b8, #90c0a0)',
        'mood-intense': 'linear-gradient(135deg, #d8a0c8, #c080a8)',
        'mood-romantic': 'linear-gradient(135deg, #e8a0b0, #d08898)',
        'mood-mindbend': 'linear-gradient(135deg, #c0a8d8, #a090c0)',
        'mood-spooky': 'linear-gradient(135deg, #a0b0c0, #8898a8)',
        'mood-empower': 'linear-gradient(135deg, #e0c890, #c8b078)',
        'mood-aesthetic': 'linear-gradient(135deg, #d0a0b8, #b888a0)',
      },
    },
  },
  plugins: [],
};
