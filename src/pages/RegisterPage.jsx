import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const { register, error } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const ok = await register(name, email, password);
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
      <h1 className="mb-1 font-display text-2xl font-extrabold text-bone">حساب جديد</h1>
      <p className="mb-6 text-sm text-bone/60">
        كل حساب بياخد محفظة فوراً - جاهز تلعب وتتنافس
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          required
          minLength={2}
          placeholder="الاسم"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="focus-ring rounded-lg border border-ink-600 bg-ink-800 px-4 py-2.5 text-bone placeholder:text-bone/40"
        />
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
          minLength={8}
          placeholder="كلمة المرور (٨ أحرف على الأقل)"
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
          {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-bone/60">
        عندك حساب؟{' '}
        <Link to="/login" className="text-teal hover:underline">
          سجّل الدخول
        </Link>
      </p>
      </motion.div>
    </div>
  );
}
