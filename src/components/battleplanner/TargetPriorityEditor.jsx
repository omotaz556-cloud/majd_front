import { ArrowUp, ArrowDown, X, Plus } from 'lucide-react';
import { TARGET_PRIORITY_LABELS, labelOf } from '../../utils/battlePlannerLabels';

// ====== محرر أولوية الاستهداف الاستراتيجية (strategy_config.target_priority) -
// مصفوفة مرتّبة من الأنواع الجايه من الباك إند (/army/target-priority-types) -
// أول عنصر في القايمة = أعلى أولوية. كل نوع مسموح مرة واحدة بس (نفس تحقق
// الباك إند). ======
export default function TargetPriorityEditor({ options, value, onChange }) {
  const list = value || [];
  const remaining = options.filter((opt) => !list.includes(opt));

  function move(index, dir) {
    const next = [...list];
    const swapWith = index + dir;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    onChange(next);
  }

  function remove(index) {
    onChange(list.filter((_, i) => i !== index));
  }

  function add(type) {
    if (!type || list.includes(type)) return;
    onChange([...list, type]);
  }

  return (
    <div>
      {list.length === 0 && (
        <p className="rounded-lg border border-dashed border-ink-600 py-4 text-center text-sm text-bone/40">
          لسه مفيش أولويات استهداف - اختار من القايمة تحت
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {list.map((type, index) => (
          <li
            key={type}
            className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800/60 px-3 py-2"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">
              {index + 1}
            </span>
            <span className="flex-1 text-sm text-bone">{labelOf(TARGET_PRIORITY_LABELS, type)}</span>
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label="تحريك لأعلى"
              className="focus-ring rounded-md p-1 text-bone/50 hover:text-gold disabled:opacity-25"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === list.length - 1}
              aria-label="تحريك لأسفل"
              className="focus-ring rounded-md p-1 text-bone/50 hover:text-gold disabled:opacity-25"
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label="حذف"
              className="focus-ring rounded-md p-1 text-bone/50 hover:text-alert"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ol>

      {remaining.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <select
            onChange={(e) => {
              add(e.target.value);
              e.target.value = '';
            }}
            defaultValue=""
            className="w-full rounded-lg border border-ink-600 bg-ink-900 px-2 py-1.5 text-sm text-bone focus-ring"
          >
            <option value="" disabled>
              إضافة أولوية استهداف...
            </option>
            {remaining.map((opt) => (
              <option key={opt} value={opt}>
                {labelOf(TARGET_PRIORITY_LABELS, opt)}
              </option>
            ))}
          </select>
          <Plus size={16} className="shrink-0 text-bone/40" />
        </div>
      )}
    </div>
  );
}
