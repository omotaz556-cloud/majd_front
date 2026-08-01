import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) navigate('/games');
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel border-glow-gold rounded-2xl p-6"
      >
      <h1 className="mb-1 font-display text-2xl font-extrabold text-bone">تسجيل الدخول</h1>
      <p className="mb-6 text-sm text-bone/60">ادخل لمنصة مجد وابدأ التحدي</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          required
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="focus-ring rounded-lg border border-ink-600 bg-ink-800 px-4 py-2.5 text-bone placeholder:text-bone/40"
        />
        <input
          type="password"
          required
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="focus-ring rounded-lg border border-ink-600 bg-ink-800 px-4 py-2.5 text-bone placeholder:text-bone/40"
        />

        {error && <p className="text-sm text-alert">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="focus-ring btn-gradient-gold rounded-lg py-2.5 disabled:opacity-60"
        >
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>

        <Link to="/forgot-password" className="text-center text-sm text-teal hover:underline">
          نسيت كلمة المرور؟
        </Link>
      </form>

      <p className="mt-6 text-center text-sm text-bone/60">
        مالكش حساب؟{' '}
        <Link to="/register" className="text-teal hover:underline">
          سجّل الآن
        </Link>
      </p>
      </motion.div>
    </div>
  );
}
