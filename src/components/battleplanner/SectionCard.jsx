import { Loader2, Save } from 'lucide-react';

// ====== غلاف موحّد لكل قسم في محرر خطة المعركة - عنوان + أيقونة + زرار حفظ
// خاص بالقسم ده بس (كل قسم بيتحفظ بنداء API مستقل - راجع BattlePlanEditorPanel). ======
export default function SectionCard({ icon: Icon, title, description, onSave, saving, children }) {
  return (
    <section className="glass-panel rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold">
              <Icon size={17} />
            </span>
          )}
          <div>
            <h2 className="font-display text-base font-bold text-bone">{title}</h2>
            {description && <p className="text-xs text-bone/45">{description}</p>}
          </div>
        </div>

        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="focus-ring btn-outline flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            حفظ القسم
          </button>
        )}
      </div>

      {children}
    </section>
  );
}
