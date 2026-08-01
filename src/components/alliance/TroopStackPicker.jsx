import { Minus, Plus } from 'lucide-react';

// ====== منتقي وحدات جيش بسيط (نفس فكرة الـ stepper في AttackDialog بس
// بهوية بصرية alliance/glass-panel) - بياخد جيش القلعة (castle.army:
// [{key,name,count}]) ورجع { selected, troopsToSend } لأي صفحة محتاجة
// تخلّي اللاعب يختار كام وحدة من كل نوع (هنا: الانضمام لتجمّع). مفيش أي
// حساب هنا غير المضبوطة بين 0 والحد الأقصى المتاح. ======
export default function TroopStackPicker({ army, selected, onChange }) {
  const availableStacks = (army || []).filter((s) => s.count > 0);

  function adjust(key, max, delta) {
    const current = selected[key] || 0;
    const next = Math.min(max, Math.max(0, current + delta));
    onChange({ ...selected, [key]: next });
  }

  if (availableStacks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-ink-600 py-4 text-center text-xs text-bone/40">
        لسه معندكش وحدات جاهزة في قلعتك
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {availableStacks.map((stack) => (
        <div key={stack.key} className="flex items-center justify-between gap-2 rounded-lg border border-ink-600 bg-ink-800 px-2.5 py-2">
          <span className="text-xs text-bone/80">
            {stack.name} <span className="text-bone/40">(متاح {stack.count.toLocaleString('ar-EG')})</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjust(stack.key, stack.count, -1)}
              className="focus-ring rounded-md bg-ink-700 p-1 text-bone/70 hover:text-gold"
              aria-label="تقليل"
            >
              <Minus size={12} />
            </button>
            <span className="w-8 text-center font-mono text-xs text-bone">{selected[stack.key] || 0}</span>
            <button
              type="button"
              onClick={() => adjust(stack.key, stack.count, 1)}
              className="focus-ring rounded-md bg-ink-700 p-1 text-bone/70 hover:text-gold"
              aria-label="زيادة"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
