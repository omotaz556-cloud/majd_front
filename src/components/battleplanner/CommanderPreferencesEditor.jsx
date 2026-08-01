import { COMMANDER_ROLE_PREFERENCE_LABELS, COMMANDER_PREFERENCE_MODE_LABELS, labelOf } from '../../utils/battlePlannerLabels';

// ====== محرر تفضيلات القادة (commander_preferences) - نظام القادة نفسه مش
// موجود في اللعبة لسه (زي ما هو موضّح في الباك إند)، فبنكتفي بحقول حرة
// (مفتاح قائد أساسي/ثانوي) + تفضيل دور عسكري + وضع تعيين، جاهزة إن نظام
// قادة حقيقي يتبنى فوقها لاحقًا من غير ما تتغيّر الواجهة. ======
export default function CommanderPreferencesEditor({ roleOptions, modeOptions, value, onChange }) {
  const prefs = value || {};

  function set(field, val) {
    onChange({ ...prefs, [field]: val });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs text-bone/50">القائد المفضّل (مفتاح)</label>
        <input
          type="text"
          value={prefs.preferred_commander_key || ''}
          onChange={(e) => set('preferred_commander_key', e.target.value || null)}
          placeholder="مثال: commander_001"
          className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-bone placeholder:text-bone/30 focus-ring"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-bone/50">القائد الثانوي (مفتاح)</label>
        <input
          type="text"
          value={prefs.secondary_commander_key || ''}
          onChange={(e) => set('secondary_commander_key', e.target.value || null)}
          placeholder="اختياري"
          className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-bone placeholder:text-bone/30 focus-ring"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-bone/50">الدور العسكري المفضّل</label>
        <select
          value={prefs.role_preference || ''}
          onChange={(e) => set('role_preference', e.target.value || null)}
          className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-bone focus-ring"
        >
          <option value="">— بدون تفضيل —</option>
          {roleOptions.map((opt) => (
            <option key={opt} value={opt}>
              {labelOf(COMMANDER_ROLE_PREFERENCE_LABELS, opt)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-bone/50">وضع تعيين القائد</label>
        <select
          value={prefs.assignment_mode || 'manual'}
          onChange={(e) => set('assignment_mode', e.target.value)}
          className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-bone focus-ring"
        >
          {modeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {labelOf(COMMANDER_PREFERENCE_MODE_LABELS, opt)}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs text-bone/50">ملاحظات</label>
        <textarea
          value={prefs.notes || ''}
          onChange={(e) => set('notes', e.target.value || null)}
          rows={2}
          className="w-full resize-none rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-bone placeholder:text-bone/30 focus-ring"
          placeholder="ملاحظات حرة عن تفضيلات القادة لهذه الخطة"
        />
      </div>
    </div>
  );
}
