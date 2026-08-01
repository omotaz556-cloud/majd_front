import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins } from 'lucide-react';

// نظام "طيران الكوينز": أي كومبوننت يقدر ينده flyCoins(sourceElement) عشان
// يشغّل أنيميشن كوينز صغيرة بتطير من مصدر المكافأة (زرار، كارد...) لحد أيقونة
// المحفظة في الـ Navbar. الـ Navbar بس بيسجل نفسه كـ target عن طريق registerTarget.
// مفيش أي تغيير في منطق الأعمال هنا - عرض بصري بحت فوق نفس بيانات الـ API.

const CoinFlyContext = createContext(null);

let idSeq = 0;

export function CoinFlyProvider({ children }) {
  const targetRef = useRef(null);
  const [particles, setParticles] = useState([]);

  const registerTarget = useCallback((el) => {
    targetRef.current = el;
  }, []);

  const flyCoins = useCallback((sourceEl, { count = 6, onArrive } = {}) => {
    const targetEl = targetRef.current;
    if (!targetEl) return;

    const targetRect = targetEl.getBoundingClientRect();
    const toX = targetRect.left + targetRect.width / 2;
    const toY = targetRect.top + targetRect.height / 2;

    let fromX = toX;
    let fromY = toY;
    if (sourceEl) {
      const rect =
        typeof sourceEl.getBoundingClientRect === 'function'
          ? sourceEl.getBoundingClientRect()
          : sourceEl;
      fromX = rect.left + rect.width / 2;
      fromY = rect.top + rect.height / 2;
    }

    const batch = Array.from({ length: count }).map((_, i) => ({
      id: idSeq++,
      fromX,
      fromY,
      toX,
      toY,
      delay: i * 0.05,
    }));

    setParticles((prev) => [...prev, ...batch]);

    const maxDelay = (count - 1) * 0.05;
    const totalDuration = maxDelay + 0.65;
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !batch.some((b) => b.id === p.id)));
      onArrive?.();
    }, totalDuration * 1000);
  }, []);

  return (
    <CoinFlyContext.Provider value={{ registerTarget, flyCoins }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-[100]">
            <AnimatePresence>
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ x: p.fromX, y: p.fromY, opacity: 0, scale: 0.4 }}
                  animate={{
                    x: [p.fromX, (p.fromX + p.toX) / 2, p.toX],
                    y: [p.fromY, p.fromY - 60, p.toY],
                    opacity: [0, 1, 1, 0],
                    scale: [0.4, 1, 0.6],
                  }}
                  transition={{ duration: 0.65, delay: p.delay, ease: 'easeIn' }}
                  className="absolute -mr-2.5 -mt-2.5 text-gold drop-shadow-[0_0_6px_rgba(244,183,64,0.8)]"
                  style={{ left: 0, top: 0 }}
                >
                  <Coins size={18} fill="currentColor" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </CoinFlyContext.Provider>
  );
}

export function useCoinFly() {
  const ctx = useContext(CoinFlyContext);
  if (!ctx) return { registerTarget: () => {}, flyCoins: () => {} };
  return ctx;
}
