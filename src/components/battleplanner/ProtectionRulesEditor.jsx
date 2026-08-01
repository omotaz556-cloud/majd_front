import { STRATEGIC_PROTECTION_RULE_LABELS, labelOf } from '../../utils/battlePlannerLabels';

// ====== محرر قواعد الحماية الاستراتيجية (strategy_config.protection_rules) -
// كل نوع (من /army/strategic-protection-rule-types) بيتفعّل/يتعطّل بمفتاح،
// وبيدي priority (رقم أصغر = أعلى أولوية تنفيذ لو أكتر من قاعدة انطبقت في
// نفس اللحظة - نفس اتفاقية الباك إند). ======
export default function ProtectionRulesEditor({ options, value, onChange }) {
  const list = value || [];
  const byType = Object.fromEntries(list.map((r) => [r.rule_type, r]));

  function toggle(ruleType) {
    const isActive = Boolean(byType[ruleType]);
    if (isActive) {
      onChange(list.filter((r) => r.rule_type !== ruleType));
    } else {
      onChange([...list, { rule_type: ruleType, priority: 0 }]);
    }
  }

  function setPriority(ruleType, priority) {
    onChange(list.map((r) => (r.rule_type === ruleType ? { ...r, priority } : r)));
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
              active ? 'border-teal/35 bg-teal/5' : 'border-ink-600 bg-ink-800/40'
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(ruleType)}
              className={`focus-ring relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                active ? 'bg-teal' : 'bg-ink-600'
              }`}
              aria-pressed={active}
              aria-label={labelOf(STRATEGIC_PROTECTION_RULE_LABELS, ruleType)}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink-950 transition-transform ${
                  active ? 'translate-x-[-1.15rem]' : 'translate-x-[-0.15rem]'
                } right-0`}
              />
            </button>

            <span className={`flex-1 text-sm ${active ? 'text-bone' : 'text-bone/60'}`}>
              {labelOf(STRATEGIC_PROTECTION_RULE_LABELS, ruleType)}
            </span>

            {active && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-bone/40">الأولوية</span>
                <input
                  type="number"
                  value={rule.priority ?? 0}
                  onChange={(e) => setPriority(ruleType, Number(e.target.value))}
                  className="w-14 rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-center text-sm text-bone focus-ring"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
