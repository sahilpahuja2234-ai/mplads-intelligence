/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F8F9FA',
        primaryDark: '#111827',
        secondaryText: '#64748B',
        borderLight: '#E5E7EB',
        cardBg: '#FFFFFF',
        aiAccent: '#EA580C',
        riskLow: '#10B981',
        riskMedium: '#F59E0B',
        riskHigh: '#EA580C',
        riskCritical: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
