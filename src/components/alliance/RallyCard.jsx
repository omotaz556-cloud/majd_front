import { motion } from 'framer-motion';
import { Castle, Tent, Users, Clock, ChevronLeft } from 'lucide-react';
import { useCountdown, formatCountdown } from '../../utils/useCountdown';
import RallyStatusBadge from './RallyStatusBadge';

// ====== كارت تجمّع واحد (Rally Card) - كان بيفتح صفحة تفاصيل مستقلة عبر
// راوت (/alliance/rallies/:id)، دلوقتي بيستدعي onSelect عشان يفتح تفاصيل
// التجمّع جوّه نفس بانل التحالف (مفيش خروج من مشهد اللعبة). ======

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function RallyCard({ rally, index = 0, onSelect }) {
  const remainingSeed =
    rally.status === 'gathering' ? Math.max(0, Math.floor((new Date(rally.launch_at).getTime() - Date.now()) / 1000)) : 0;
  const remaining = useCountdown(remainingSeed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2) }}
    >
      <button
        type="button"
        onClick={() => onSelect?.(rally.id)}
        className="glass-panel glass-card-hover flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-right transition-all"
      >
        <div className="flex items-center gap-3">
          <span className={`shrink-0 rounded-lg p-2 ${rally.target_is_npc ? 'bg-alert/10 text-alert' : 'bg-neon-blue/10 text-neon-blue'}`}>
            {rally.target_is_npc ? <Tent size={18} /> : <Castle size={18} />}
          </span>
          <div>
            <p className="font-display text-sm font-bold text-bone">{rally.target_name || 'هدف غير معروف'}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-bone/50">
              <RallyStatusBadge status={rally.status} className="px-2 py-0.5 text-xs" />
              <span className="flex items-center gap-1">
                <Users size={12} />
                {rally.participants?.length || 0} مشارك
              </span>
              {rally.status === 'gathering' && (
                <span className="flex items-center gap-1 text-gold">
                  <Clock size={12} />
                  {formatCountdown(remaining)}
                </span>
              )}
              {rally.status !== 'gathering' && <span>{formatDateTime(rally.created_at)}</span>}
            </div>
          </div>
        </div>
        <ChevronLeft className="shrink-0 text-bone/30" size={18} />
      </button>
    </motion.div>
  );
}
