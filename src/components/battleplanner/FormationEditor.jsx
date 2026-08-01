import { Plus, Trash2, Shield, Swords, ShieldHalf } from 'lucide-react';
import { FORMATION_LINE_LABELS } from '../../utils/battlePlannerLabels';

// ====== أيقونة/لون مميز لكل خط - عرض بس، مفيش أي منطق قتالي هنا. ======
const LINE_META = {
  front_line: { icon: Swords, accent: 'text-alert bg-alert/10 border-alert/25' },
  middle_line: { icon: ShieldHalf, accent: 'text-gold bg-gold/10 border-gold/25' },
  back_line: { icon: Shield, accent: 'text-teal bg-teal/10 border-teal/25' },
};

// ====== محرر التشكيل التكتيكي للمعركة (Battle Formation System) - بيعرض
// كل خط (Front/Middle/Back - جايين من الباك إند عشان أي خط جديد يتضاف
// لاحقًا يبان هنا تلقائيًا) كعمود فيه خانات (slots)، وكل خانة بتاخد مجموعة
// قوات (troop_key) من جيش اللاعب الحقيقي أو تفضل فاضية. مصمم يكون قابل
// للتوسّع: أي مجموعة "قوات" مستقبلية (أسلحة حصار/وحدات جديدة) هتظهر تلقائيًا
// طول ما هي موجودة في troopTypes الجايه من /castle/troop-types. ======
export default function FormationEditor({ lines, troopTypes, value, onChange }) {
  const slotsByLine = {};
  for (const line of lines) slotsByLine[line] = [];
  for (const slot of value || []) {
    if (!slotsByLine[slot.line]) slotsByLine[slot.line] = [];
    slotsByLine[slot.line].push(slot);
  }
  for (const line of lines) {
    slotsByLine[line].sort((a, b) => a.slot_index - b.slot_index);
  }

  // ====== أي مجموعة قوات متعيّنة بالفعل في خانة تانية - نستخدمها عشان نمنع
  // نفس المجموعة تتكرر في أكتر من قايمة اختيار (نفس قاعدة الباك إند:
  // "مفيش مجموعة قوات متكررة في أكتر من خانة"). ======
  const usedTroopKeys = new Set((value || []).map((s) => s.troop_key).filter(Boolean));

  function updateSlots(line, nextLineSlots) {
    const rest = (value || []).filter((s) => s.line !== line);
    onChange([...rest, ...nextLineSlots]);
  }

  function addSlot(line) {
    const current = slotsByLine[line] || [];
    const nextIndex = current.length ? Math.max(...current.map((s) => s.slot_index)) + 1 : 0;
    updateSlots(line, [...current, { line, slot_index: nextIndex, troop_key: null }]);
  }

  function removeSlot(line, slotIndex) {
    const current = slotsByLine[line] || [];
    updateSlots(
      line,
      current.filter((s) => s.slot_index !== slotIndex)
    );
  }

  function changeTroop(line, slotIndex, troopKey) {
    const current = slotsByLine[line] || [];
    updateSlots(
      line,
      current.map((s) => (s.slot_index === slotIndex ? { ...s, troop_key: troopKey || null } : s))
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {lines.map((line) => {
        const meta = LINE_META[line] || { icon: Shield, accent: 'text-bone/60 bg-bone/5 border-bone/15' };
        const Icon = meta.icon;
        const slots = slotsByLine[line] || [];
        return (
          <div key={line} className="rounded-xl border border-ink-600 bg-ink-800/60 p-3">
            <div
              className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${meta.accent}`}
            >
              <Icon size={13} />
              {FORMATION_LINE_LABELS[line] || line}
            </div>

            <div className="flex flex-col gap-2">
              {slots.length === 0 && (
                <p className="rounded-lg border border-dashed border-ink-600 py-3 text-center text-xs text-bone/40">
                  لا توجد خانات بعد
                </p>
              )}
              {slots.map((slot) => (
                <div key={slot.slot_index} className="flex items-center gap-1.5">
                  <select
                    value={slot.troop_key || ''}
                    onChange={(e) => changeTroop(line, slot.slot_index, e.target.value)}
                    className="w-full rounded-lg border border-ink-600 bg-ink-900 px-2 py-1.5 text-sm text-bone focus-ring"
                  >
                    <option value="">— خانة فاضية —</option>
                    {troopTypes.map((t) => (
                      <option
                        key={t.key}
                        value={t.key}
                        disabled={usedTroopKeys.has(t.key) && slot.troop_key !== t.key}
                      >
                        {t.name}
                        {!t.unlocked ? ' (غير متاحة)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeSlot(line, slot.slot_index)}
                    aria-label="حذف الخانة"
                    className="focus-ring shrink-0 rounded-lg p-1.5 text-bone/40 hover:bg-alert/10 hover:text-alert"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addSlot(line)}
              className="focus-ring mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-ink-600 py-1.5 text-xs text-bone/60 hover:border-gold/40 hover:text-gold"
            >
              <Plus size={13} /> إضافة خانة
            </button>
          </div>
        );
      })}
    </div>
  );
}
