import { TROOP_TYPE_LABELS } from '../../utils/battleReportLabels';

// ====== كارت ملخص جيش طرف واحد (مهاجم/دافع) - بيعرض القوة الابتدائية،
// الخسائر، والناجين. القيم كلها جايه جاهزة من battle.snapshot (تعداد
// ابتدائي) و battle.battle_result.casualties (خسائر/ناجين) - مفيش أي حساب
// بيحصل هنا، بس تجميع وعرض. ======
export default function ArmySummaryCard({ label, accent = 'gold', initialTroops = [], casualtiesTotals }) {
  const initialCount = initialTroops.reduce((sum, t) => sum + Number(t.count || 0), 0);
  const lost = casualtiesTotals?.lost ?? 0;
  const survivors = casualtiesTotals?.remaining ?? 0;

  const accentClasses = {
    gold: 'text-gold',
    teal: 'text-teal',
    alert: 'text-alert',
  }[accent] || 'text-gold';

  return (
    <div className="rounded-xl border border-ink-600 bg-ink-800/60 p-4">
      <h3 className={`mb-3 font-display text-sm font-bold ${accentClasses}`}>{label}</h3>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="font-mono text-xl text-bone">{initialCount.toLocaleString('en-US')}</p>
          <p className="text-xs text-bone/50">القوة الابتدائية</p>
        </div>
        <div>
          <p className="font-mono text-xl text-alert">{lost.toLocaleString('en-US')}</p>
          <p className="text-xs text-bone/50">الخسائر</p>
        </div>
        <div>
          <p className="font-mono text-xl text-teal">{survivors.toLocaleString('en-US')}</p>
          <p className="text-xs text-bone/50">الناجون</p>
        </div>
      </div>

      {initialTroops.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-ink-600 pt-3">
          {initialTroops.map((t) => (
            <li key={t.key} className="flex items-center justify-between text-xs text-bone/70">
              <span>{TROOP_TYPE_LABELS[t.key] || t.key}</span>
              <span className="font-mono">{Number(t.count || 0).toLocaleString('en-US')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
