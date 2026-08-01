import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// ====== غلاف بانل عام لكل الأنظمة اللي اتدمجت جوّه مشهد اللعبة (المستشفى/
// الإصلاح/الرسائل وتقارير المعارك) - نفس ستايل AlliancePanel/CastleInfoModal
// بالظبط (شيت بيطلع من تحت على الموبايل / مودال في النص على الشاشة الكبيرة)
// عشان اللاعب يحس إنه لسه جوّه نفس اللعبة، مش واقف في صفحة مستقلة. ======
export default function PanelShell({ open, onClose, title, icon: Icon, children, maxWidth = 'max-w-3xl' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="panel-shell-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-stone-950/70 backdrop-blur-sm sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative flex max-h-[85vh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-stone-950/95 shadow-2xl sm:rounded-2xl`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-white">
                {Icon && <Icon size={16} className="text-amber-300" />}
                <h3 className="font-bold">{title}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="rounded-lg bg-white/5 p-1.5 text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
