import { Shield, HeartHandshake } from 'lucide-react';
import { TROOP_TYPE_LABELS } from '../../utils/battleReportLabels';

// ====== قسم "مشاركو الدفاع" (Defender Participants) - تكسير Phase 14 لكل
// طرف دافع كان في المعركة: صاحب القلعة نفسه + أي جيش تعزيز حليف كان واقف
// فيها وقت الهجوم، كل واحد بقوته الابتدائية/خسائره/الناجين منه لوحده. كل
// القيم جايه جاهزة من battle.battle_result.defender_participants
// (resultBuilder.js's buildDefenderParticipants) - مفيش أي حساب هنا، بس
// تجميع وعرض. لو المعركة القديمة مالهاش تكسير (مصفوفة فاضية/مش موجودة)،
// القسم ده بيختفي تلقائيًا بدل ما يعرض حاجة فاضية. ======
export default function ParticipantsSection({ participants = [] }) {
  if (!participants || participants.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {participants.map((p) => {
        const isReinforcement = Boolean(p.is_reinforcement);
        const startingCount = (p.starting_troops || []).reduce((sum, t) => sum + Number(t.count || 0), 0);
        const lost = p.casualties?.lost ?? 0;
        const remaining = p.casualties?.remaining ?? 0;
        const lossPercent = Math.round((p.loss_percent_applied || 0) * 1000) / 10;

        return (
          <div key={p.id} className="rounded-xl border border-ink-600 bg-ink-800/60 p-4">
            <h3
              className={`mb-3 flex items-center gap-1.5 font-display text-sm font-bold ${
                isReinforcement ? 'text-neon-blue' : 'text-teal'
              }`}
            >
              {isReinforcement ? <HeartHandshake size={14} /> : <Shield size={14} />}
              {isReinforcement ? `تعزيز حليف${p.label ? ` · ${p.label}` : ''}` : 'قلعة الدافع'}
            </h3>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-mono text-lg text-bone">{startingCount.toLocaleString('en-US')}</p>
                <p className="text-xs text-bone/50">القوة الابتدائية</p>
              </div>
              <div>
                <p className="font-mono text-lg text-alert">{lost.toLocaleString('en-US')}</p>
                <p className="text-xs text-bone/50">الخسائر ({lossPercent}%)</p>
              </div>
              <div>
                <p className="font-mono text-lg text-teal">{remaining.toLocaleString('en-US')}</p>
                <p className="text-xs text-bone/50">الناجون</p>
              </div>
            </div>

            {p.remaining_troops?.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-ink-600 pt-3">
                {p.remaining_troops.map((t, i) => (
                  <li key={`${t.key}-${i}`} className="flex items-center justify-between text-xs text-bone/70">
                    <span>{TROOP_TYPE_LABELS[t.key] || t.key || 'وحدات'}</span>
                    <span className="font-mono">{Number(t.count || 0).toLocaleString('en-US')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
