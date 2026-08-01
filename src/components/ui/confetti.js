import confetti from 'canvas-confetti';

const GOLD_COLORS = ['#f4b740', '#ffd166', '#d99b1f', '#3fd6c5'];
const NEON_COLORS = ['#4d7dff', '#a855f7', '#3fd6c5'];

export function fireCoinConfetti() {
  confetti({
    particleCount: 60,
    spread: 65,
    startVelocity: 35,
    scalar: 0.8,
    colors: GOLD_COLORS,
    origin: { y: 0.7 },
  });
}

export function fireWinConfetti() {
  confetti({
    particleCount: 120,
    spread: 90,
    startVelocity: 45,
    colors: [...GOLD_COLORS, ...NEON_COLORS],
    origin: { y: 0.6 },
  });
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 120,
      startVelocity: 30,
      colors: NEON_COLORS,
      origin: { y: 0.5 },
    });
  }, 200);
}

export function firePurchaseConfetti() {
  confetti({
    particleCount: 45,
    spread: 55,
    startVelocity: 28,
    scalar: 0.7,
    colors: GOLD_COLORS,
    origin: { y: 0.5 },
    ticks: 150,
  });
}
