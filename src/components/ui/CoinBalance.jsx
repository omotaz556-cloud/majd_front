import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins } from 'lucide-react';

// عنصر عرض الرصيد الجذاب: Scale/Bounce + Glow ذهبي + "+N Coins" عائم لما الرصيد يزيد.
// بياخد balance كرقم جاهز من الـ API - عرض بس، من غير أي حسابات مالية جوه.
export default function CoinBalance({ balance, size = 'md', className = '' }) {
  const [bounce, setBounce] = useState(false);
  const [floatDelta, setFloatDelta] = useState(null);
  const prevRef = useRef(balance);

  useEffect(() => {
    if (balance == null) return;
    if (prevRef.current != null && balance > prevRef.current) {
      const delta = balance - prevRef.current;
      setBounce(true);
      setFloatDelta(delta);
      const t1 = setTimeout(() => setBounce(false), 600);
      const t2 = setTimeout(() => setFloatDelta(null), 1100);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    prevRef.current = balance;
  }, [balance]);

  useEffect(() => {
    prevRef.current = balance;
  }, [balance]);

  const sizes = {
    sm: 'px-2.5 py-1 text-xs gap-1',
    md: 'px-3.5 py-1.5 text-sm gap-1.5',
    lg: 'px-5 py-2.5 text-2xl gap-2',
  };

  return (
    <span className="relative inline-flex">
      <span
        className={`inline-flex items-center rounded-full border border-gold/40 bg-gold/10 font-mono font-bold text-gold shadow-bevel transition-shadow ${sizes[size]} ${
          bounce ? 'animate-coin-bounce shadow-glow-gold' : ''
        } ${className}`}
      >
        <Coins size={size === 'lg' ? 22 : 14} className={bounce ? 'animate-coin-spin' : ''} />
        {balance != null ? balance.toFixed(2) : '—'}
      </span>

      <AnimatePresence>
        {floatDelta != null && (
          <motion.span
            key="delta"
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -22, scale: 1 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="pointer-events-none absolute -top-1 right-1/2 translate-x-1/2 whitespace-nowrap font-mono text-xs font-bold text-teal drop-shadow-[0_0_6px_rgba(63,214,197,0.7)]"
          >
            +{floatDelta.toFixed(0)} Coins
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
