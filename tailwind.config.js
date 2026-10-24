/** @type {import('tailwindcss').Config} */

/*
 * ATHAR design tokens — museum wayfinding signage.
 * Colour is functional: stone paper, ink type, lapis for "you are here" and
 * primary actions, carnelian for the destination, ochre for warnings,
 * malachite only for arrival. No gold, no gradients, no glow.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        stone: {
          DEFAULT: '#E9E8E3',
          100: '#F2F1EC',
          200: '#DFDED8',
          300: '#D5D3CB'
        },
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#1C2128',
          soft: '#4A5058',
          muted: '#5E646B'
        },
        rule: '#D5D3CB',
        lapis: '#2A4BA0',
        carnelian: '#B4382B',
        ochre: '#8F5A10',
        malachite: '#2C7A58'
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        arabic: ['"IBM Plex Sans Arabic"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        display: ['"IBM Plex Sans Arabic"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        read: ['"Noto Naskh Arabic"', '"IBM Plex Sans Arabic"', 'serif']
      },
      /* 13 / 15 / 17 / 22 / 30 px — one scale, three weights. */
      fontSize: {
        micro: ['11px', { lineHeight: '1.45' }],
        xs: ['13px', { lineHeight: '1.5' }],
        sm: ['15px', { lineHeight: '1.6' }],
        base: ['17px', { lineHeight: '1.7' }],
        lg: ['22px', { lineHeight: '1.35' }],
        xl: ['30px', { lineHeight: '1.2' }],
        '2xl': ['34px', { lineHeight: '1.15' }],
        '3xl': ['38px', { lineHeight: '1.12' }],
        '4xl': ['42px', { lineHeight: '1.08' }]
      },
      borderRadius: {
        none: '0',
        sm: '6px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '12px',
        '2xl': '12px',
        '3xl': '16px',
        full: '9999px'
      },
      /* One shadow token, used only by layers that float above the map. */
      boxShadow: {
        sign: '0 1px 0 rgba(28, 33, 40, 0.10), 0 18px 36px -28px rgba(28, 33, 40, 0.55)',
        phone: '0 1px 0 rgba(28, 33, 40, 0.10), 0 18px 36px -28px rgba(28, 33, 40, 0.55)'
      }
    }
  },
  plugins: []
};
