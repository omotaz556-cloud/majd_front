import { motion } from 'framer-motion';

// ====== كارت تعزيز واحد في القايمة (Reinforcement Card) - نفس الكارت اللي
// كان جوّه AllianceReinforcementsPage.jsx بالظبط، اتفصل هنا كمكوّن مستقل
// قابل لإعادة الاستخدام (Reusable components). tab بيحدد اتجاه العرض
// (من مين جاي التعزيز، أو عند مين واقف) واحنا في تبويب الوارد ولا الصادر. ======

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function ReinforcementCard({ reinforcement, tab, memberName, troopLabel, selected, onSelect, index = 0 }) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(reinforcement.id)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2) }}
      className={`glass-panel flex items-center justify-between gap-3 rounded-2xl p-3.5 text-right transition-all hover:border-gold/40 ${
        selected ? 'border-gold/50' : ''
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-sm font-bold text-bone">
          {tab === 'incoming' ? `من ${memberName(reinforcement.origin_user_id)}` : `عند ${memberName(reinforcement.target_user_id)}`}
        </span>
        <span className="mt-1 block truncate text-xs text-bone/50">
          {reinforcement.troops?.map((t) => `${troopLabel(t.key)} ×${t.count.toLocaleString('ar-EG')}`).join('، ') || '—'}
        </span>
        <span className="mt-1 block text-[11px] text-bone/40">{formatDateTime(reinforcement.stationed_at)}</span>
      </span>
    </motion.button>
  );
}
