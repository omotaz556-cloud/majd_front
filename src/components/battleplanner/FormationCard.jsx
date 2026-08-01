import { useState } from 'react';
import { Loader2, Save, Trash2, Star, StarOff, Plus, Minus, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { FORMATION_TYPE_LABELS, MARCH_TYPE_LABELS, labelOf } from '../../utils/battlePlannerLabels';

// ====== كارت تشكيلة واحدة - عرض مختصر + محرر كامل (بيتفتح/يتقفل inline)
// نفس فلسفة SectionCard في BattlePlanEditorPanel: كل تشكيلة بتتحفظ بنداء
// API مستقل بس (updateFormation)، مفيش أي حفظ جماعي. ======
export default function FormationCard({
  formation,
  troopTypes,
  formationTypes,
  marchTypes,
  onSave,
  onDelete,
  onSelect,
  onUnselect,
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(formation.name);
  const [formationType, setFormationType] = useState(formation.formation_type);
  const [marchType, setMarchType] = useState(formation.march_type);
  const [troops, setTroops] = useState(() => {
    const map = {};
    for (const t of formation.troops || []) map[t.key] = t.count;
    return map;
  });
  const [primaryCommander, setPrimaryCommander] = useState(formation.commanders?.primary?.name || '');
  const [secondaryCommander, setSecondaryCommander] = useState(formation.commanders?.secondary?.name || '');
  const [notes, setNotes] = useState(formation.notes || '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingSelect, setTogglingSelect] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function adjustTroop(key, delta) {
    setTroops((prev) => {
      const next = Math.max(0, (prev[key] || 0) + delta);
      return { ...prev, [key]: next };
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const troopsPayload = Object.entries(troops)
        .filter(([, count]) => count > 0)
        .map(([key, count]) => ({ key, count }));

      await onSave(formation.id, {
        name: name.trim(),
        formation_type: formationType,
        march_type: marchType,
        troops: troopsPayload,
        commanders: {
          primary: primaryCommander.trim() ? { name: primaryCommander.trim() } : null,
          secondary: secondaryCommander.trim() ? { name: secondaryCommander.trim() } : null,
        },
        notes: notes.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(formation.id);
    } catch {
      setDeleting(false);
    }
  }

  async function handleToggleSelect() {
    setTogglingSelect(true);
    try {
      if (formation.is_selected) await onUnselect(formation.id);
      else await onSelect(formation.id);
    } finally {
      setTogglingSelect(false);
    }
  }

  const totalTroops = Object.values(troops).reduce((sum, c) => sum + c, 0);

  return (
    <div className={`rounded-xl border p-3 ${formation.is_selected ? 'border-gold/40 bg-gold/5' : 'border-ink-600 bg-ink-800/60'}`}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-right"
        >
          {expanded ? <ChevronUp size={14} className="shrink-0 text-bone/50" /> : <ChevronDown size={14} className="shrink-0 text-bone/50" />}
          <span className="truncate text-sm font-bold text-bone">{formation.name}</span>
          {formation.is_selected && (
            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">
              <Star size={9} fill="currentColor" /> نشطة
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={handleToggleSelect}
          disabled={togglingSelect}
          title={formation.is_selected ? 'إلغاء التفعيل' : 'فعّل التشكيلة دي'}
          className="focus-ring shrink-0 rounded-lg p-1.5 text-bone/50 hover:bg-ink-700 hover:text-gold disabled:opacity-40"
        >
          {togglingSelect ? (
            <Loader2 size={14} className="animate-spin" />
          ) : formation.is_selected ? (
            <StarOff size={14} />
          ) : (
            <Star size={14} />
          )}
        </button>
      </div>

      <p className="mr-6 mt-0.5 flex items-center gap-1 text-[11px] text-bone/40">
        <Users size={11} /> {totalTroops.toLocaleString('ar-EG')} جندي · {labelOf(FORMATION_TYPE_LABELS, formation.formation_type)}
      </p>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-ink-700 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-bone/50">اسم التشكيلة</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-bone focus-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-bone/50">نوع التشكيلة</label>
              <select
                value={formationType}
                onChange={(e) => setFormationType(e.target.value)}
                className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-bone focus-ring"
              >
                {formationTypes.map((opt) => (
                  <option key={opt} value={opt}>
                    {labelOf(FORMATION_TYPE_LABELS, opt)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-bone/50">نوع المسير</label>
              <select
                value={marchType}
                onChange={(e) => setMarchType(e.target.value)}
                className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-bone focus-ring"
              >
                {marchTypes.map((opt) => (
                  <option key={opt} value={opt}>
                    {labelOf(MARCH_TYPE_LABELS, opt)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-bone/50">الوحدات المخصّصة لهذه التشكيلة</label>
            <div className="space-y-1.5">
              {troopTypes.map((t) => (
                <div key={t.key} className="flex items-center justify-between gap-2 rounded-lg bg-ink-900/60 px-2.5 py-1.5">
                  <span className="text-xs text-bone/80">{t.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustTroop(t.key, -1)}
                      className="rounded-md bg-ink-700 p-1 text-bone/70 hover:bg-ink-600"
                      aria-label="تقليل"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-10 text-center font-mono text-xs text-bone">{troops[t.key] || 0}</span>
                    <button
                      type="button"
                      onClick={() => adjustTroop(t.key, 1)}
                      className="rounded-md bg-ink-700 p-1 text-bone/70 hover:bg-ink-600"
                      aria-label="زيادة"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-bone/30">
              دي أعداد مرجعية (قالب) بس - مش حجز فعلي من جيشك الحالي، هتتربط بجيشك الفعلي وقت إرسال مسير حقيقي.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-bone/50">القائد الأساسي (اسم/مفتاح)</label>
              <input
                type="text"
                value={primaryCommander}
                onChange={(e) => setPrimaryCommander(e.target.value)}
                placeholder="اختياري"
                className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-bone placeholder:text-bone/30 focus-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-bone/50">القائد الثانوي (اسم/مفتاح)</label>
              <input
                type="text"
                value={secondaryCommander}
                onChange={(e) => setSecondaryCommander(e.target.value)}
                placeholder="اختياري"
                className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-bone placeholder:text-bone/30 focus-ring"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-bone/50">ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-bone placeholder:text-bone/30 focus-ring"
              placeholder="ملاحظات حرة عن التشكيلة دي"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="focus-ring btn-gradient-gold flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              حفظ التشكيلة
            </button>

            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={deleting}
                className="focus-ring mr-auto flex items-center gap-1.5 rounded-lg border border-alert/25 px-3 py-2 text-xs text-alert hover:bg-alert/10 disabled:opacity-50"
              >
                <Trash2 size={13} /> حذف
              </button>
            ) : (
              <span className="mr-auto flex items-center gap-2 text-xs">
                <span className="text-bone/60">تأكيد الحذف؟</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="focus-ring rounded-lg bg-alert px-2.5 py-1 font-bold text-bone hover:bg-alert/85 disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : 'نعم'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="focus-ring rounded-lg border border-ink-600 px-2.5 py-1 text-bone/60 hover:text-bone"
                >
                  لا
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
