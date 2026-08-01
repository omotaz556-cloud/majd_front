import { motion } from 'framer-motion';
import { Clock, ArrowUpFromLine } from 'lucide-react';
import { useCountdown, formatCountdown } from '../../utils/useCountdown';

// ====== تعزيز صادر لسه "ماشي" (Remaining march time) - قبل ما يوصل قلعة
// الحليف ويتسجّل كـ AllianceReinforcement "واقف" (stationed)، بيكون لسه
// مسير (March) عادي بـ direction: 'reinforcement' و status: 'traveling' -
// نفس المستند اللي بيتعرض في خريطة العالم لمسايرات الهجوم بالظبط، بس هنا
// بنفلتر عليه من getMarches() الموجودة بالفعل (api/castle.js، مستخدمة أصلاً
// في WorldMapPage) عشان نوريه في صفحة التعزيزات كمان. الباك إند مبيسمحش
// بسحب مسير تعزيز لسه ماشي (march.service.recallMarch بيقبل direction:
// 'attack' بس) فمفيش أي إجراء إلغاء هنا - عرض بس، زي ما هو متاح فعليًا. ======

function formatEta(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function PendingReinforcementMarch({ march, troopLabel, index = 0 }) {
  const remainingSeed = Math.max(0, Math.floor((new Date(march.arrives_at).getTime() - Date.now()) / 1000));
  const remaining = useCountdown(remainingSeed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2) }}
      className="glass-panel flex items-center justify-between gap-3 rounded-2xl border border-gold/20 p-3.5"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate font-display text-sm font-bold text-bone">
          <ArrowUpFromLine size={13} className="text-gold" />
          في الطريق إلى {march.target_name || 'قلعة حليف'}
        </span>
        <span className="mt-1 block truncate text-xs text-bone/50">
          {march.troops?.map((t) => `${troopLabel(t.key)} ×${t.count.toLocaleString('ar-EG')}`).join('، ') || '—'}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="flex items-center gap-1 font-mono text-sm font-bold text-gold">
          <Clock size={13} />
          {formatCountdown(remaining)}
        </span>
        <span className="text-[11px] text-bone/40">يوصل {formatEta(march.arrives_at)}</span>
      </span>
    </motion.div>
  );
}
