import { createContext, useContext, useMemo, useRef, useState, useCallback } from 'react';

// مؤثرات صوتية خفيفة اختيارية. بنولّدها بـ Web Audio API مباشرة (نغمات بسيطة)
// عشان منحتاجش نحمّل ملفات صوت خارجية - وتقدر تتشغل/تتقفل من الإعدادات
// وبتتخزن التفضيل في localStorage. مفيش أي تأثير على منطق الأعمال.

const SoundContext = createContext(null);
const STORAGE_KEY = 'majd_sound_enabled';

function readInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

export function SoundProvider({ children }) {
  const [enabled, setEnabled] = useState(readInitial);
  const ctxRef = useRef(null);

  function getCtx() {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctxRef.current = new AudioCtx();
    }
    return ctxRef.current;
  }

  const beep = useCallback(
    ({ freq = 440, duration = 0.12, type = 'sine', gain = 0.05, sweepTo = null }) => {
      if (!enabled) return;
      const ctx = getCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (sweepTo) {
        osc.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime + duration);
      }
      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    },
    [enabled]
  );

  const sounds = useMemo(
    () => ({
      click: () => beep({ freq: 340, duration: 0.06, type: 'square', gain: 0.03 }),
      coin: () => beep({ freq: 880, duration: 0.16, type: 'triangle', gain: 0.05, sweepTo: 1320 }),
      win: () => beep({ freq: 520, duration: 0.35, type: 'sawtooth', gain: 0.04, sweepTo: 1046 }),
      reward: () => beep({ freq: 660, duration: 0.22, type: 'sine', gain: 0.05, sweepTo: 990 }),
      lose: () => beep({ freq: 220, duration: 0.3, type: 'sine', gain: 0.04, sweepTo: 110 }),
    }),
    [beep]
  );

  const toggle = useCallback(() => {
    setEnabled((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ enabled, toggle, sounds }), [enabled, toggle, sounds]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    // fallback آمن لو الـ Provider مش موجود لأي سبب
    return { enabled: false, toggle: () => {}, sounds: {} };
  }
  return ctx;
}
