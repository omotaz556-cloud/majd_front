import { STRATEGIC_RETREAT_RULE_LABELS, labelOf } from '../../utils/battlePlannerLabels';

const NEEDS_THRESHOLD = new Set(['hp_threshold', 'morale_threshold']);
const NEVER_RETREAT = 'never_retreat';

// ====== محرر قواعد الانسحاب الاستراتيجية (strategy_config.retreat_rules) -
// كل نوع (من /army/strategic-retreat-rule-types) بيتفعّل/يتعطّل بمفتاح، وبعض
// الأنواع محتاجة قيمة (threshold 0-100). "عدم الانسحاب أبدًا" قاعدة حصرية -
// لو مفعّلة، لازم تكون القاعدة الوحيدة (نفس تحقق الباك إند بالظبط)، فبنعكس
// الحصرية دي في الواجهة بدل ما نسيب المستخدم يكتشفها بس وقت الحفظ. ======
export default function RetreatRulesEditor({ options, value, onChange }) {
  const list = value || [];
  const byType = Object.fromEntries(list.map((r) => [r.rule_type, r]));

  function toggle(ruleType) {
    const isActive = Boolean(byType[ruleType]);

    if (isActive) {
      onChange(list.filter((r) => r.rule_type !== ruleType));
      return;
    }

    if (ruleType === NEVER_RETREAT) {
      // تفعيل "عدم الانسحاب أبدًا" بيلغي أي قاعدة تانية فورًا (حصرية).
      onChange([{ rule_type: NEVER_RETREAT, threshold: null }]);
      return;
    }

    // تفعيل أي قاعدة تانية بيلغي "عدم الانسحاب أبدًا" لو كانت مفعّلة.
    const withoutNever = list.filter((r) => r.rule_type !== NEVER_RETREAT);
    const threshold = NEEDS_THRESHOLD.has(ruleType) ? 50 : null;
    onChange([...withoutNever, { rule_type: ruleType, threshold }]);
  }

  function setThreshold(ruleType, threshold) {
    onChange(list.map((r) => (r.rule_type === ruleType ? { ...r, threshold } : r)));
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map((ruleType) => {
        const active = Boolean(byType[ruleType]);
        const rule = byType[ruleType];
        return (
          <div
            key={ruleType}
            className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
              active ? 'border-gold/35 bg-gold/5' : 'border-ink-600 bg-ink-800/40'
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(ruleType)}
              className={`focus-ring relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                active ? 'bg-gold' : 'bg-ink-600'
              }`}
              aria-pressed={active}
              aria-label={labelOf(STRATEGIC_RETREAT_RULE_LABELS, ruleType)}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink-950 transition-transform ${
                  active ? 'translate-x-[-1.15rem]' : 'translate-x-[-0.15rem]'
                } right-0`}
              />
            </button>

            <span className={`flex-1 text-sm ${active ? 'text-bone' : 'text-bone/60'}`}>
              {labelOf(STRATEGIC_RETREAT_RULE_LABELS, ruleType)}
            </span>

            {active && NEEDS_THRESHOLD.has(ruleType) && (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={rule.threshold ?? 0}
                  onChange={(e) => setThreshold(ruleType, Number(e.target.value))}
                  className="w-16 rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-center text-sm text-bone focus-ring"
                />
                <span className="text-xs text-bone/40">%</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
