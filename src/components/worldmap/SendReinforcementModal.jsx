import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldPlus, Loader2, Plus, Minus, Users } from 'lucide-react';

// ====== بانل إرسال تعزيزات لحليف (Send Reinforcements - Phase 1) - بيبان لما
// اللاعب يضغط "إرسال تعزيزات" وهو داخل مملكة حليف (نفس التحالف). نفس فكرة
// SendResourcesModal بالظبط بس بيبعت جنود (كومات جيش من قلعتك انت) بدل موارد -
// بيكلم /alliances/reinforcements/send (allianceReinforcement.controller.js)
// الموجود بالفعل في الباك إند. التحقق النهائي (التحالف + توفر الجنود) بيحصل
// في الباك إند برضه (allianceReinforcement.service.js::sendReinforcement). ======
export default function SendReinforcementModal({ open, targetName, army, submitting, onClose, onSubmit }) {
  const [selected, setSelected] = useState({});

  useEffect(() => {
    if (open) setSelected({});
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const availableStacks = (army || []).filter((s) => s.count > 0);

  function adjust(key, max, delta) {
    setSelected((prev) => {
      const current = prev[key] || 0;
      const next = Math.min(max, Math.max(0, current + delta));
      return { ...prev, [key]: next };
    });
  }

  const troopsToSend = Object.entries(selected)
    .filter(([, qty]) => qty > 0)
    .map(([key, qty]) => ({ key, quantity: qty }));

  const totalTroops = troopsToSend.reduce((sum, t) => sum + t.quantity, 0);

  function handleSubmit(e) {
    e.preventDefault();
    if (troopsToSend.length === 0 || submitting) return;
    onSubmit?.(troopsToSend);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="send-reinforcement-backdrop"
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
            aria-label="إرسال تعزيزات"
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

            <div className="flex flex-col items-center gap-2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,.16)_0%,transparent_70%)] px-6 pb-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
                <ShieldPlus size={22} />
              </div>
              <p className="text-center text-sm font-bold text-white/90">إرسال تعزيزات لحليف</p>
              <p className="truncate text-center text-xs text-white/50">{targetName || 'حليفك'}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 pb-5">
              <div className="max-h-64 overflow-y-auto">
                {availableStacks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-white/10 py-4 text-center text-xs text-white/40">
                    لسه معندكش جنود جاهزين تبعتهم كتعزيز - درّب وحدات في الثكنة الأول
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableStacks.map((stack) => (
                      <div key={stack.key} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-2">
                        <span className="text-xs text-white/80">
                          {stack.name} <span className="text-white/40">(متاح {stack.count.toLocaleString('ar-EG')})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => adjust(stack.key, stack.count, -1)}
                            className="rounded-md bg-white/10 p-1 text-white/70 hover:bg-white/20 disabled:opacity-40"
                            aria-label="تقليل"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center font-mono text-xs text-white">{selected[stack.key] || 0}</span>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => adjust(stack.key, stack.count, 1)}
                            className="rounded-md bg-white/10 p-1 text-white/70 hover:bg-white/20 disabled:opacity-40"
                            aria-label="زيادة"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={submitting || stack.count <= 0}
                            onClick={() => adjust(stack.key, stack.count, stack.count)}
                            className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-white/60 hover:text-white disabled:opacity-40"
                          >
                            أقصى
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {totalTroops > 0 && (
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/50">
                  <Users size={12} /> إجمالي الجنود المرسَلة: {totalTroops.toLocaleString('ar-EG')}
                </p>
              )}

              <button
                type="submit"
                disabled={troopsToSend.length === 0 || submitting}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-stone-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  'إرسال التعزيزات'
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
