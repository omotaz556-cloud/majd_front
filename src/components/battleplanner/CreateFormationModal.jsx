import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';

// ====== نفس نمط CreatePlanModal بالظبط - اسم بس، الباقي بيتظبط بعد الإنشاء
// جوه FormationCard (formation_type/march_type ليهم قيمة افتراضية منطقية
// في الباك إند أصلاً - راجع formation.service.createFormation). ======
export default function CreateFormationModal({ onClose, onCreate, creating }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/80 px-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="glass-panel w-full max-w-sm rounded-2xl p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-bone">تشكيلة جيش جديدة</h2>
          <button
            onClick={onClose}
            className="focus-ring rounded-lg p-1.5 text-bone/50 hover:text-bone"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="mb-1 block text-xs text-bone/50">اسم التشكيلة</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="مثال: جيش الهجوم الأول"
            className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2.5 text-sm text-bone placeholder:text-bone/30 focus-ring"
          />

          <button
            type="submit"
            disabled={!name.trim() || creating}
            className="focus-ring btn-gradient-gold mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {creating && <Loader2 size={14} className="animate-spin" />}
            إنشاء التشكيلة
          </button>
        </form>
      </motion.div>
    </div>
  );
}
