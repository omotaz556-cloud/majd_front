import { useEffect, useRef, useState } from 'react';

// عداد أرقام خفيف: بيتحرك من 0 (أو من القيمة القديمة) للقيمة الجديدة خلال
// مدة قصيرة بس، مش أنيميشن مستمر. بيحترم prefers-reduced-motion وبيوقف نفسه
// أول ما يوصل، عشان الأداء يفضل عالي حتى لو فيه كذا StatCard في نفس الصفحة.
export default function CountUp({ value, duration = 700, decimals = 0, formatter }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setDisplay(target);
      prevRef.current = target;
      return;
    }

    const from = prevRef.current;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setDisplay(from + (target - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = target;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const rounded = decimals > 0 ? display.toFixed(decimals) : Math.round(display);
  return <>{formatter ? formatter(rounded) : rounded.toLocaleString('en-US')}</>;
}
