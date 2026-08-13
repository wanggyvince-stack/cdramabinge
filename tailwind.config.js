/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // === Song Dynasty Aesthetic Color Palette ===
      colors: {
        // Brand colors
        'ruyao': '#91B4BE',          // 汝窑天青 - brand primary
        'xianghui': '#B8B0A8',       // 香灰胎 - brand secondary
        'zhusha': '#C73E3A',         // 朱砂红 - accent/CTA
        'jinsi': '#C9A86C',          // 金丝金 - accent gold

        // Backgrounds
        'sujuan': '#F5F1E8',         // 素绢 - main background
        'dingyao': '#F0EEE8',        // 定窑白 - card background
        'youse': '#F0F1F2',          // 釉色浅灰 - secondary background

        // Dark mode
        'nongmo-bg': '#1A1A1A',      // 浓墨 - dark background
        'zhongmo-card': '#2C2825',   // 重墨 - dark card

        // Ink levels (text)
        'ink-1': '#0D0D0D',          // 焦墨 - main title (light mode)
        'ink-2': '#1F1F1F',          // 浓墨 - body text (light mode)
        'ink-3': '#4A4A4A',          // 重墨 - secondary heading
        'ink-4': '#7A7A7A',          // 淡墨 - auxiliary text
        'ink-5': '#B8B8B8',          // 清墨 - placeholder/watermark

        // Dark mode text
        'hebai': '#F2F0EA',          // 鹤白 - main text (dark mode)
        'danmo': '#8A8A8A',          // 淡墨灰 - secondary text (dark mode)

        // Borders
        'ivory-border': '#D8D4CC',   // 象牙暖灰 - card borders
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

      // === Mood gradients ===
      backgroundImage: {
        'mood-cry': 'linear-gradient(135deg, #6B7B8B, #8B7BA0)',
        'mood-fun': 'linear-gradient(135deg, #B8A090, #D4B8A0)',
        'mood-intense': 'linear-gradient(135deg, #A0522D, #C73E3A)',
        'mood-romantic': 'linear-gradient(135deg, #C4A882, #D8C8B0)',
        'mood-mindbend': 'linear-gradient(135deg, #2C3E6B, #4A5C80)',
        'mood-spooky': 'linear-gradient(135deg, #2C2825, #4A4A4A)',
        'mood-empower': 'linear-gradient(135deg, #8B7355, #C9A86C)',
        'mood-aesthetic': 'linear-gradient(135deg, #8CB4A0, #A0C8B0)',
      },
    },
  },
  plugins: [],
};
