/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "ink" و"bone" بقوا هوية "صالة أركيد" (كابينة بنفسجي-نيلي غامق + كريم
        // ورقة التذاكر) بدل رمادي كاربون فايبر. بيتلونوا تلقائي مع data-theme.
        ink: {
          DEFAULT: 'rgb(var(--ink-900) / <alpha-value>)',
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
        },
        // "gold" بقى أصفر التذاكر/الكوينز - لون لمبات المارکيز الأساسي
        gold: {
          DEFAULT: '#d4a017',
          300: '#f3d98a',
          400: '#e0b94a',
          500: '#d4a017',
          600: '#a97b0e',
          700: '#7c5a08',
        },
        // "teal" بقى سماوي/سيان النيون - شاشة أركيد كلاسيك
        teal: {
          DEFAULT: '#00875a',
          400: '#22a06f',
          500: '#00875a',
          600: '#046e49',
        },
        // نيون المارکيز التاني: فوشيا وبنفسجي كهربائي بدل الأزرق/البنفسجي الرمادي القديم
        neon: {
          blue: '#b5432e',
          purple: '#1c3d5a',
        },
        alert: {
          DEFAULT: '#d64545',
        },
        bone: 'rgb(var(--bone) / <alpha-value>)',
        // خامات كابينة الأركيد: بلاستيك مصبوب + كروم بنفسجي بدل كاربون فايبر/جانميتال
        carbon: {
          950: '#0a0618',
          900: '#120b28',
          800: '#1c1238',
        },
        gunmetal: {
          DEFAULT: '#2a1d52',
          light: '#3a2a6b',
        },
        steel: {
          DEFAULT: '#6b5a9e',
          light: '#8a78bd',
        },
      },
      fontFamily: {
        // مارکيز أركيد كلاسيكي: لاليزار (خط عربي بوستري بولد) + كايرو هندسي نضيف
        // + VT323 لعداد سكور/كوينز LCD بكسلي بدل مونو كوربوريت
        display: ['"Lalezar"', 'cursive'],
        body: ['"Cairo"', 'sans-serif'],
        mono: ['"VT323"', 'monospace'],
      },
      letterSpacing: {
        eyebrow: '.16em',
      },
      boxShadow: {
        'glow-gold': '0 0 10px rgba(212, 160, 23,.45), 0 0 26px rgba(212, 160, 23,.18)',
        'glow-teal': '0 0 10px rgba(0, 135, 90,.45), 0 0 26px rgba(0, 135, 90,.16)',
        'glow-blue': '0 0 10px rgba(181, 67, 46,.45), 0 0 26px rgba(181, 67, 46,.18)',
        'glow-purple': '0 0 10px rgba(28, 61, 90,.45), 0 0 26px rgba(28, 61, 90,.18)',
        glass: '0 8px 32px rgba(5,2,16,.45)',
        card: '0 2px 0 rgba(255,255,255,.04) inset, 0 12px 28px rgba(5,2,16,.5)',
        panel: '0 20px 60px rgba(5,2,16,.6)',
        bevel: '0 1px 0 rgba(255,255,255,.08) inset, 0 -2px 0 rgba(0,0,0,.55) inset',
        rig: '0 24px 70px rgba(5,2,16,.65), 0 1px 0 rgba(255,255,255,.06) inset',
        'glow-strong-gold': '0 0 18px rgba(212, 160, 23,.6), 0 0 46px rgba(212, 160, 23,.3)',
        'glow-strong-teal': '0 0 18px rgba(0, 135, 90,.55), 0 0 46px rgba(0, 135, 90,.26)',
        'glow-strong-blue': '0 0 18px rgba(181, 67, 46,.55), 0 0 46px rgba(181, 67, 46,.28)',
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(180deg,#f3d98a 0%,#d4a017 55%,#a97b0e 100%)',
        'gradient-neon': 'linear-gradient(180deg,#ff8fb8 0%,#b5432e 55%,#7a2b1d 100%)',
        'gradient-teal': 'linear-gradient(180deg,#8bf3ff 0%,#00875a 55%,#046e49 100%)',
      },
      keyframes: {
        'coin-bounce': {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.35)' },
          '55%': { transform: 'scale(0.92)' },
          '75%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        'pop-in': {
          '0%': { transform: 'scale(.4)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0)', opacity: '0' },
          '15%': { opacity: '1' },
          '100%': { transform: 'translateY(-40px)', opacity: '0' },
        },
        'coin-spin': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'glow-pulse': {
          '0%,100%': { opacity: '.55' },
          '50%': { opacity: '1' },
        },
        'ring-pop': {
          '0%': { transform: 'scale(.6)', opacity: '.9' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'rgb-cycle': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'sheen-sweep': {
          '0%': { transform: 'translateX(-130%) skewX(-12deg)' },
          '100%': { transform: 'translateX(230%) skewX(-12deg)' },
        },
        'led-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.35' },
        },
        // أنيميشن جديد: لمبات المارکيز بتضوي وحدة ورا التانية (شريط سينما قديم)
        'marquee-chase': {
          '0%, 100%': { opacity: '.25', transform: 'scale(0.85)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '.4' },
          '94%': { opacity: '1' },
          '96%': { opacity: '.6' },
          '97%': { opacity: '1' },
        },
      },
      animation: {
        'coin-bounce': 'coin-bounce .55s ease-out',
        'pop-in': 'pop-in .4s cubic-bezier(.34,1.56,.64,1)',
        'float-up': 'float-up 1.1s ease-out forwards',
        'coin-spin': 'coin-spin 1.1s linear infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        'ring-pop': 'ring-pop .6s ease-out forwards',
        'rgb-cycle': 'rgb-cycle 6s ease-in-out infinite',
        'sheen-sweep': 'sheen-sweep 1.1s ease-in-out',
        'led-blink': 'led-blink 1.8s ease-in-out infinite',
        'marquee-chase': 'marquee-chase 1.2s ease-in-out infinite',
        flicker: 'flicker 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
