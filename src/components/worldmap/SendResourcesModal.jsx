import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Loader2 } from 'lucide-react';
import { RESOURCE_META, RESOURCE_ORDER } from '../../utils/resourceMeta';

// ====== بانل إرسال موارد لحليف (Send Resources) - بيبان لما اللاعب يضغط
// "إرسال موارد" وهو داخل مملكة حليف (نفس التحالف). بيدّي اللاعب فورم بسيط
// لكل مورد (دهب/خشب/حجر) بحد أقصى = المخزون الحالي في قلعته - التحقق
// النهائي (التحالف + الكمية) بيحصل في الباك إند برضه (sendResources في
// castle.service.js). ======
export default function SendResourcesModal({ open, targetName, myResources, submitting, onClose, onSubmit }) {
  const [amounts, setAmounts] = useState({ gold: '', wood: '', stone: '' });

  useEffect(() => {
    if (open) setAmounts({ gold: '', wood: '', stone: '' });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  function handleChange(key, value, max) {
    const numeric = value === '' ? '' : Math.max(0, Math.min(Math.floor(Number(value) || 0), Math.floor(max)));
    setAmounts((prev) => ({ ...prev, [key]: numeric === '' ? '' : String(numeric) }));
  }

  const total = RESOURCE_ORDER.reduce((sum, key) => sum + (Number(amounts[key]) || 0), 0);

  function handleSubmit(e) {
    e.preventDefault();
    if (total <= 0 || submitting) return;
    onSubmit?.({
      gold: Number(amounts.gold) || 0,
      wood: Number(amounts.wood) || 0,
      stone: Number(amounts.stone) || 0,
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="send-resources-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 px-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) onClose?.();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-stone-950/95 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="إرسال موارد"
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="absolute left-3 top-3 z-10 rounded-lg bg-black/40 p-1.5 text-white/60 hover:text-white disabled:opacity-40"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center gap-2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(52,211,153,.16)_0%,transparent_70%)] px-6 pb-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                <Gift size={22} />
              </div>
              <p className="text-center text-sm font-bold text-white/90">إرسال موارد لحليف</p>
              <p className="truncate text-center text-xs text-white/50">{targetName || 'حليفك'}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 pb-5">
              {RESOURCE_ORDER.map((key) => {
                const meta = RESOURCE_META[key];
                const Icon = meta.icon;
                const max = Math.floor(myResources?.[key]?.stored ?? 0);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="flex w-9 items-center justify-center" style={{ color: meta.color }}>
                      <Icon size={18} />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[11px] text-white/50">
                        <span>{meta.label}</span>
                        <span>متاح: {max.toLocaleString('ar-EG')}</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={max}
                        value={amounts[key]}
                        onChange={(e) => handleChange(key, e.target.value, max)}
                        placeholder="0"
                        disabled={submitting || max <= 0}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white outline-none focus:border-emerald-400/50 disabled:opacity-40"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={submitting || max <= 0}
                      onClick={() => handleChange(key, max, max)}
                      className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-white/60 hover:text-white disabled:opacity-40"
                    >
                      أقصى
                    </button>
                  </div>
                );
              })}

              <button
                type="submit"
                disabled={total <= 0 || submitting}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-stone-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  'إرسال الموارد'
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
