/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx}',
    './index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: { 850: '#1a2332', 950: '#0f1724' },
        // Claude / Anthropic-inspired palette
        claude: {
          cream:     '#F5F2EE', // light page bg
          surface:   '#FFFFFF', // light card
          surface2:  '#FAF7F2', // light inner card
          border:    '#E4DFD7', // light border
          text:      '#191919', // light primary text
          muted:     '#5C5A55', // light secondary text
          coral:     '#CC785C', // primary accent (both modes)
          coralSoft: '#F1E0D6', // accent bg tint (light)
          dark:      '#262624', // dark page bg
          dark2:     '#2F2D2A', // dark card
          dark3:     '#3A3835', // dark inner card / hover
          darkBorder:'#3F3D38', // dark border
          darkText:  '#F5F2EE', // dark primary text (cream)
          darkMuted: '#A8A29A', // dark secondary text
        },
      },
      backdropBlur: {
        xs: '2px'
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem'
      }
    },
  },
  plugins: [],
}
