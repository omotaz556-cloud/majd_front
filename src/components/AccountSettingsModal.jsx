import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, KeyRound, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { changePassword } from '../api/users';
import { toastSuccess, toastError } from './ui/toast';

// ====== مودال "إعدادات الحساب" (Account Settings) - متاح من البار العلوي
// (Navbar) بره اللعبة، مش من جوّه شاشة اللعب نفسها. حاليًا بيحتوي بس على
// "تغيير كلمة المرور"، مبني عشان يستوعب إعدادات تانية مستقبلًا (تعديل
// الاسم، إلخ) بنفس الشكل من غير إعادة تصميم. متاح فقط لحسابات
// auth_provider='local' - حسابات المنصة (majd_platform) بتشوف رسالة
// توضيحية بدل الفورم (راجع user.controller.js changePassword للسبب). ======
export default function AccountSettingsModal({ open, onClose, authProvider = 'local' }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    if (!open) {
      // تصفير الفورم وقت القفل عشان أي فتحة جديدة تبدأ نضيفة ومفيش باسورد
      // قديم فاضل في الحقول
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrent(false);
      setShowNew(false);
      setFieldError('');
    }
  }, [open]);

  // ====== منع سكرول الصفحة اللي وراء المودال وقت ما يكون مفتوح - مهم خصوصًا
  // على صفحة الألعاب اللي فيها بانرات إعلانات فوق وتحت المحتوى، عشان
  // السكرول بتاع الصفحة الأصلية ميأثرش على موضع المودال وهو فاتح. ======
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFieldError('لازم تملأ كل الحقول');
      return;
    }
    if (newPassword.length < 8) {
      setFieldError('كلمة المرور الجديدة لازم تكون 8 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError('كلمة المرور الجديدة وتأكيدها مش متطابقين');
      return;
    }
    if (newPassword === currentPassword) {
      setFieldError('كلمة المرور الجديدة لازم تكون مختلفة عن الحالية');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      toastSuccess('تم تغيير كلمة المرور بنجاح');
      onClose?.();
    } catch (err) {
      toastError(err.response?.data?.error || 'تعذر تغيير كلمة المرور');
    } finally {
      setSubmitting(false);
    }
  }

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="account-settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto fixed inset-0 z-[999] flex items-end justify-center bg-stone-950/70 backdrop-blur-sm sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-stone-950/95 shadow-2xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="تغيير كلمه المرور"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-white">
                <KeyRound size={16} className="text-amber-300" />
                <h3 className="font-bold">تغيير كلمه المرور</h3>
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

            <div className="flex-1 overflow-y-auto p-4">
              {authProvider !== 'local' ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <ShieldCheck size={28} className="text-sky-300" />
                  <p className="text-sm text-white/70">
                    حسابك متصل بمنصة مجد مباشرة، فبيانات الدخول بتتغيّر من هناك مش من جوا اللعبة.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-2.5">
                  <PasswordField
                    label="كلمة المرور الحالية"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    show={showCurrent}
                    onToggleShow={() => setShowCurrent((v) => !v)}
                    autoComplete="current-password"
                  />
                  <PasswordField
                    label="كلمة المرور الجديدة"
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showNew}
                    onToggleShow={() => setShowNew((v) => !v)}
                    autoComplete="new-password"
                    hint="8 أحرف على الأقل"
                  />
                  <PasswordField
                    label="تأكيد كلمة المرور الجديدة"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showNew}
                    onToggleShow={() => setShowNew((v) => !v)}
                    autoComplete="new-password"
                  />

                  {fieldError && (
                    <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">
                      {fieldError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/90 py-2.5 text-sm font-bold text-stone-900 transition-opacity hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={15} />}
                    حفظ كلمة المرور الجديدة
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ====== بورتال مباشر لـ document.body - بيضمن إن المودال بيترندر بره أي
  // سياق تخطيطي (overflow/position/transform) بتاع الصفحة الحالية (زي
  // بانرات الإعلانات في صفحة الألعاب)، بدل ما يفضل جوّه شجرة الـ DOM بتاعة
  // Navbar ويتأثر بيها. من غير البورتال ده، أي عنصر أب عنده overflow:hidden
  // أو position/transform ممكن يكسر الـ position:fixed بتاع المودال. ======
  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}

function PasswordField({ label, value, onChange, show, onToggleShow, autoComplete, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-white/60">{label}</span>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 pe-9 text-sm text-white placeholder:text-white/35 focus:border-amber-400/50 focus:outline-none"
        />
        {onToggleShow && (
          <button
            type="button"
            onClick={onToggleShow}
            aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            className="absolute inset-y-0 end-2 flex items-center text-white/40 hover:text-white"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {hint && <span className="mt-0.5 block text-[11px] text-white/40">{hint}</span>}
    </label>
  );
}