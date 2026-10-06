import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cafe: {
          espresso: '#1A1816',
          surface: '#24211E',
          border: '#3A332D',
          mocha: '#8B6B4F',
          'mocha-hover': '#8B6B4F',
          sage: '#7A9A7E',
          'sage-hover': '#6A8A6E',
          cream: '#E6DFD3',
          muted: '#A39A8E',
          danger: '#B5655A',
          'latte-bg': '#F5F0E8',
          'latte-surface': '#FFFFFF',
          'latte-border': '#E6DFD3',
          'latte-text': '#2C2416',
          'latte-muted': '#8A7E6E',
          'event-homework': 'var(--event-homework)',
          'event-homework-hover': 'var(--event-homework-hover)',
          'event-homework-border': 'var(--event-homework-border)',
          'event-homework-text': 'var(--event-homework-text)',
          'event-project': 'var(--event-project)',
          'event-project-hover': 'var(--event-project-hover)',
          'event-project-border': 'var(--event-project-border)',
          'event-project-text': 'var(--event-project-text)',
          'event-test': 'var(--event-test)',
          'event-test-hover': 'var(--event-test-hover)',
          'event-test-border': 'var(--event-test-border)',
          'event-test-text': 'var(--event-test-text)',
          'event-completed': 'var(--event-completed)',
          'event-completed-hover': 'var(--event-completed-hover)',
          'event-completed-border': 'var(--event-completed-border)',
          'event-completed-text': 'var(--event-completed-text)',
          'event-overdue-marker': 'var(--event-overdue-marker)',
          'event-today-bg': 'var(--event-today-bg)',
        },
      },
      fontFamily: {
        heading: ['Lora', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
      },
      transitionDuration: {
        '150': '150ms',
      },
    },
  },
  plugins: [],
}
export default config
