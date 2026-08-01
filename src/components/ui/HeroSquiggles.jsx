// خطوط نيون متعرجة (تيل + أزرق) زي غلاف الأركيد - ديكور بصري خفيف فوق خلفية
// الهيرو، SVG واحد بس (خفيف على الأداء)، بدون أي جافاسكريبت أو أنيميشن شغّال.
export default function HeroSquiggles({ className = '' }) {
  return (
    <svg
      viewBox="0 0 1600 600"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    >
      <defs>
        <filter id="squiggle-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* خط تيل - يبدأ من أعلى الشمال، بيلف في حلقة قريبة من نص الهيرو */}
      <path
        d="M -40 130 C 250 20, 480 20, 620 130 C 760 240, 560 320, 460 300 C 360 280, 380 180, 500 190 C 620 200, 660 320, 560 420"
        fill="none"
        stroke="#2dd4bf"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.55"
        filter="url(#squiggle-glow)"
      />

      {/* خط أزرق - في الجانب التاني، بيلف لأسفل يمين الهيرو */}
      <path
        d="M 1640 340 C 1420 300, 1260 380, 1300 480 C 1340 580, 1180 560, 1120 470"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
        filter="url(#squiggle-glow)"
      />
    </svg>
  );
}
