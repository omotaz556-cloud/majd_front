import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function ResetPasswordPage() {
  const { resetPassword, error } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [localError, setLocalError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError('');

    if (newPassword.length < 8) {
      setLocalError('كلمة المرور لازم تكون 8 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    const result = await resetPassword(token, newPassword);
    setLoading(false);

    if (result.ok) {
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
        <div className="glass-panel border-glow-gold rounded-2xl p-6 text-center">
          <p className="mb-4 text-sm text-alert">رابط الاستعادة غير صالح أو ناقص</p>
          <Link to="/forgot-password" className="text-teal hover:underline">
            اطلب رابط جديد
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel border-glow-gold rounded-2xl p-6"
      >
        <h1 className="mb-1 font-display text-2xl font-extrabold text-bone">
          إعادة تعيين كلمة المرور
        </h1>
        <p className="mb-6 text-sm text-bone/60">ادخل كلمة المرور الجديدة بتاعتك</p>

        {done ? (
          <p className="rounded-lg border border-teal/30 bg-teal/10 p-3 text-center text-sm text-teal">
            تم تغيير كلمة المرور بنجاح، هيتم تحويلك لصفحة الدخول...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              required
              placeholder="كلمة المرور الجديدة"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="focus-ring rounded-lg border border-ink-600 bg-ink-800 px-4 py-2.5 text-bone placeholder:text-bone/40"
            />
            <input
              type="password"
              required
              placeholder="تأكيد كلمة المرور"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="focus-ring rounded-lg border border-ink-600 bg-ink-800 px-4 py-2.5 text-bone placeholder:text-bone/40"
            />

            {(localError || error) && (
              <p className="text-sm text-alert">{localError || error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="focus-ring btn-gradient-gold rounded-lg py-2.5 disabled:opacity-60"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
