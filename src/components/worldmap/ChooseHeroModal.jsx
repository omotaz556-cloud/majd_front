import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Swords, Shield, Loader2, Check } from 'lucide-react';
import { toastError } from '../ui/toast';

// ====== اختيار الهيرو - بيبان إجباريًا قبل ما اللاعب يشوف خريطة العالم لأول
// مرة (شوف WorldMapPage.jsx: بيتفتح لما castle.hero يكون null، ومفيش زرار
// إغلاق ولا الضغط برّه بيقفله - الاختيار نفسه نهائي زي ما الباك إند بيفرضه
// في castle.service.chooseHero، فمفيش داعي "تراجع" هنا خالص). بعد الاختيار،
// onChosen بترجع القلعة المحدّثة كاملة (نفس شكل getMyCastle) عشان الصفحة
// تكمل مباشرة من غير طلب تاني. ======
const ACCENTS = {
  attack: {
    icon: Swords,
    text: 'text-amber-300',
    border: 'border-amber-400/40 hover:border-amber-400',
    ring: 'ring-amber-400/60',
    badge: 'bg-amber-500/15 text-amber-300',
  },
  defense: {
    icon: Shield,
    text: 'text-sky-300',
    border: 'border-sky-400/40 hover:border-sky-400',
    ring: 'ring-sky-400/60',
    badge: 'bg-sky-500/15 text-sky-300',
  },
};

function heroAccent(hero) {
  return hero.bonuses?.defense_percent ? ACCENTS.defense : ACCENTS.attack;
}

function heroBonusLabel(hero) {
  const attack = hero.bonuses?.attack_percent;
  const defense = hero.bonuses?.defense_percent;
  if (attack) return `+${Math.round(attack * 100)}% قوة هجوم`;
  if (defense) return `+${Math.round(defense * 100)}% قوة دفاع`;
  return null;
}

export default function ChooseHeroModal({ open, heroes = [], onChoose }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!selectedKey || submitting) return;
    setSubmitting(true);
    try {
      await onChoose(selectedKey);
    } catch (err) {
      toastError(err.response?.data?.error || 'تعذر اختيار البطل - حاول تاني');
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="choose-hero-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/95 px-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-stone-950 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="اختيار البطل"
          >
            <div className="flex flex-col items-center gap-2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(251,191,36,.14)_0%,transparent_70%)] px-6 pb-4 pt-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
                <Crown size={22} />
              </div>
              <p className="font-display text-xl font-bold text-white">اختر بطلك</p>
              <p className="max-w-md text-sm text-white/50">
                البطل ده هيقود جيشك في كل معركة تخوضها من دلوقتي - هجومًا ودفاعًا. الاختيار نهائي ومتقدرش تغيّره بعد كده، فاختار بحكمة.
              </p>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-3">
              {heroes.map((hero) => {
                const accent = heroAccent(hero);
                const Icon = accent.icon;
                const isSelected = selectedKey === hero.key;
                const bonusLabel = heroBonusLabel(hero);

                return (
                  <button
                    key={hero.key}
                    type="button"
                    onClick={() => setSelectedKey(hero.key)}
                    disabled={submitting}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 bg-white/5 p-4 text-center transition-all disabled:opacity-50 ${
                      isSelected ? `${accent.border} ring-2 ${accent.ring}` : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-white/5 ${accent.text}`}>
                      <Icon size={26} />
                    </div>
                    <p className="font-display text-base font-bold text-white">{hero.name}</p>
                    <p className={`text-xs font-bold ${accent.text}`}>{hero.title}</p>
                    <p className="text-xs leading-relaxed text-white/50">{hero.description}</p>
                    {bonusLabel && (
                      <span className={`mt-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${accent.badge}`}>
                        {bonusLabel}
                      </span>
                    )}
                    {isSelected && (
                      <span className="mt-1 flex items-center gap-1 text-[11px] font-bold text-white">
                        <Check size={12} /> مختار
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center px-5 pb-6">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedKey || submitting}
                className="focus-ring flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />}
                {submitting ? 'جاري التأكيد...' : 'تأكيد الاختيار وابدأ اللعب'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
