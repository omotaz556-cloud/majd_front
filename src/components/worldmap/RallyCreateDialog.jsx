import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, X, Loader2 } from 'lucide-react';
import { createRally } from '../../api/rally';
import { toastSuccess, toastError } from '../ui/toast';

// ====== "ابدأ تجمّع" - بديل لهجوم فردي من نفس نافذة الهجوم (AttackDialog)،
// بيستخدم نفس الهدف ونفس خطة المعركة المختارة بالظبط، وبينادي
// api/rally.js::createRally (موجود بالفعل، من غير أي تعديل API). التجمّع
// بعد كده بيتابعه أعضاء التحالف من تبويب "التجمّعات" جوّه بانل التحالف. ======
export default function RallyCreateDialog({ open, targetId, targetLabel, battlePlanId, onClose, onCreated }) {
  const [countdownMinutes, setCountdownMinutes] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    setSubmitting(true);
    try {
      const rally = await createRally({
        targetCastleId: targetId,
        countdownSeconds: Math.max(1, Math.round(countdownMinutes * 60)),
        battlePlanId,
      });
      toastSuccess('اتبدأ التجمّع - تابعه من تبويب التجمّعات في التحالف');
      onCreated?.(rally);
      onClose?.();
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر بدء التجمّع');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-auto fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-stone-950 p-5"
            role="dialog"
            aria-modal="true"
            aria-label="ابدأ تجمّع"
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Flag className="text-amber-300" size={16} />
                ابدأ تجمّع على {targetLabel}
              </h3>
              <button type="button" onClick={onClose} className="rounded-lg p-1 text-white/50 hover:text-white" aria-label="إغلاق">
                <X size={15} />
              </button>
            </div>

            <p className="mt-2 text-xs text-white/50">
              كل أعضاء تحالفك هيقدروا ينضموا بجيوشهم قبل ما العد التنازلي يخلص، وبعدين التجمّع هيهاجم الهدف بجيش واحد مجمّع.
            </p>

            <label className="mt-4 block text-xs font-bold text-white/70">مدة التجميع (دقايق)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={countdownMinutes}
              onChange={(e) => setCountdownMinutes(Number(e.target.value) || 1)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-amber-400/50 focus:outline-none"
            />

            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-amber-400 to-amber-600 py-2.5 text-sm font-bold text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} />}
              {submitting ? 'جاري البدء...' : 'ابدأ التجمّع'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
