import { Shield, ShieldHalf, Swords } from 'lucide-react';
import { FORMATION_LINE_LABELS } from '../../utils/battlePlannerLabels';

// ====== نفس ألوان/أيقونات FormationEditor بالظبط - عرض بس، بدون أي تعديل ======
const LINE_META = {
  front_line: { icon: Swords, accent: 'text-alert bg-alert/10 border-alert/25' },
  middle_line: { icon: ShieldHalf, accent: 'text-gold bg-gold/10 border-gold/25' },
  back_line: { icon: Shield, accent: 'text-teal bg-teal/10 border-teal/25' },
};

// ====== معاينة تشكيل تكتيكي (Battle Formation) للقراءة فقط - بتستخدم جوه
// Attack Dialog عشان تعرض للاعب تشكيل الخطة المختارة قبل ما يبدأ الهجوم من
// غير ما يقدر يعدّلها من هنا (التعديل بيحصل في BattlePlanEditorPanel جوه
// بانل جانبي منفصل). مفيش أي منطق قتالي هنا - بس عرض slot.troop_key
// بالاسم الحقيقي بتاعه من troopTypes. ======
export default function FormationPreview({ lines, battleFormation, troopTypes }) {
  const nameByKey = new Map((troopTypes || []).map((t) => [t.key, t.name]));

  const slotsByLine = {};
  for (const line of lines || []) slotsByLine[line] = [];
  for (const slot of battleFormation || []) {
    if (!slotsByLine[slot.line]) slotsByLine[slot.line] = [];
    slotsByLine[slot.line].push(slot);
  }
  for (const line of Object.keys(slotsByLine)) {
    slotsByLine[line].sort((a, b) => a.slot_index - b.slot_index);
  }

  const hasAnyTroop = (battleFormation || []).some((s) => s.troop_key);

  if (!hasAnyTroop) {
    return (
      <p className="rounded-lg border border-dashed border-ink-600 py-4 text-center text-xs text-bone/40">
        الخطة دي لسه من غير تشكيل تكتيكي - هتتنفّذ الغارة بترتيب افتراضي
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {(lines || Object.keys(slotsByLine)).map((line) => {
        const meta = LINE_META[line] || { icon: Shield, accent: 'text-bone/60 bg-bone/5 border-bone/15' };
        const Icon = meta.icon;
        const slots = (slotsByLine[line] || []).filter((s) => s.troop_key);
        return (
          <div key={line} className="rounded-lg border border-ink-600 bg-ink-800/60 p-2">
            <div className={`mb-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.accent}`}>
              <Icon size={11} />
              {FORMATION_LINE_LABELS[line] || line}
            </div>
            <div className="flex flex-col gap-1">
              {slots.length === 0 && <p className="text-[11px] text-bone/30">فاضي</p>}
              {slots.map((slot) => (
                <span key={slot.slot_index} className="truncate rounded-md bg-ink-900 px-1.5 py-1 text-[11px] text-bone/80">
                  {nameByKey.get(slot.troop_key) || slot.troop_key}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
