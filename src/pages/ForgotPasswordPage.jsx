import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const { forgotPassword, error } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);
    if (result.ok) {
      setSent(true);
      setMessage(result.message);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel border-glow-gold rounded-2xl p-6"
      >
        <h1 className="mb-1 font-display text-2xl font-extrabold text-bone">نسيت كلمة المرور؟</h1>
        <p className="mb-6 text-sm text-bone/60">
          ادخل بريدك الإلكتروني وهنبعتلك رابط لإعادة تعيين كلمة المرور
        </p>

        {sent ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-lg border border-teal/30 bg-teal/10 p-3 text-sm text-teal">
              {message}
            </p>
            <Link
              to="/login"
              className="focus-ring btn-gradient-gold rounded-lg py-2.5 text-center"
            >
              الرجوع لتسجيل الدخول
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              required
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus-ring rounded-lg border border-ink-600 bg-ink-800 px-4 py-2.5 text-bone placeholder:text-bone/40"
            />

            {error && <p className="text-sm text-alert">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="focus-ring btn-gradient-gold rounded-lg py-2.5 disabled:opacity-60"
            >
              {loading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-bone/60">
          افتكرت كلمة المرور؟{' '}
          <Link to="/login" className="text-teal hover:underline">
            سجّل دخول
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
