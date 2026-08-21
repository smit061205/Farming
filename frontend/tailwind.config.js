/**
 * Design system ported from the team's landing page (agrisense-farm.vercel.app):
 * warm parchment ground, very dark forest green, rust accent, sharp corners,
 * Space Grotesk display over Manrope body.
 *
 * The scale keeps its `leaf` / `earth` names so existing components inherit the
 * new identity without a class-by-class rewrite.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        leaf: {
          50:  '#FEFAE0',   // paper — page ground
          100: '#F4EFD3',   // sunk surface
          200: '#E7E3CA',   // hairline
          300: '#C9C7A5',   // placeholder
          400: '#8A9178',   // dim
          500: '#4F6B34',   // mid green
          600: '#2C5A18',   // primary
          700: '#173809',   // forest
          800: '#122D07',
          900: '#1D1C0D',   // ink
        },
        earth: {
          50:  '#F7F1DC',
          100: '#EFE7CC',
          300: '#D9CBA0',
          500: '#9F402D',   // rust — the "old way" / alert accent
          700: '#7A2F20',
        },
        sprout: '#C5EFAD',
      },
      fontFamily: {
        // Noto fallbacks carry Gujarati and Devanagari, which Manrope lacks.
        sans: ['Manrope', '"Noto Sans Gujarati"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Noto Sans Gujarati"', '"Noto Sans Devanagari"', 'Georgia', 'serif'],
      },
      // Their page is overwhelmingly square: 405 elements at 0px, pills for chips.
      borderRadius: {
        none: '0', sm: '0', DEFAULT: '0', md: '0', lg: '0',
        xl: '0', '2xl': '0', '3xl': '0', full: '9999px',
      },
      letterSpacing: {
        tightest: '-.05em',
        eyebrow: '.4em',
      },
      boxShadow: {
        card: '0 1px 0 rgba(23,56,9,.06)',
        lift: '4px 4px 0 rgba(23,56,9,.12)',
      },
    },
  },
  plugins: [],
};
