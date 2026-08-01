import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * ====== RewardPopupShell ======
 *
 * غلاف بوب أب "لحظة مكافأة" مشترك بين DailyRewardPopup وHourlyGiftPopup -
 * مختلف عمدًا عن PanelShell (اللي بيستخدمه بانلات إدارة مستمرة زي
 * المستشفى/المتجر): هنا مركزي دايمًا (مش شيت من تحت)، بخلفية خفيفة (اللاعب
 * لازم يفضل شايف خريطة العالم وراه، مش شاشة سوداء)، وبتصميم احتفالي (توهج
 * ذهبي، حركة دخول أوضح) عشان يحس إنه "فتح صندوق كنز" مش "فتح صفحة إعدادات".
 *
 * البوب أب ده مؤقت بطبيعته - بيظهر لما فيه مكافأة متاحة بس وبيختفي تمامًا
 * بعد الاستلام أو الإغلاق (مفيش أي "صفحة دائمة" أو تبويب ثابت في أي مكان -
 * ده بالظبط اللي كان لازم يتغيّر). إغلاقه من غير استلام ما بيمنعش الظهور
 * التاني - هو بس بيسيب badge صغير على أيقونة الهدايا في WorldHUD (شوف
 * useRewardPopups.js) لحد ما اللاعب يستلم فعليًا.
 */
export default function RewardPopupShell({ open, onClose, children, closeLabel = 'إغلاق' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="reward-popup-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-stone-950/55 p-4 backdrop-blur-[3px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-b from-ink-800 to-ink-900 shadow-[0_0_60px_-15px_rgba(234,177,48,0.45)]"
            role="dialog"
            aria-modal="true"
          >
            {/* توهج علوي زخرفي - إحساس "premium" بدل بانل عادي */}
            <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gold/20 blur-3xl" />

            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="focus-ring absolute right-3 top-3 z-10 rounded-lg bg-white/5 p-1.5 text-bone/60 hover:text-bone"
            >
              <X size={16} />
            </button>

            <div className="relative px-6 py-7">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
