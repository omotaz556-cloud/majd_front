// ====== حالة "فاضي" موحّدة (Empty States) - بتتستخدم في أي قايمة ممكن ترجع
// فاضية (بريد التحالف، طلبات المساعدة، التجمّعات...) عشان كل الواجهات تحس
// بنفس الهوية بدل ما كل صفحة تكرر نفس الـ markup. ======
export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="glass-panel flex flex-col items-center gap-2 rounded-2xl px-6 py-12 text-center">
      {Icon && (
        <div className="mb-1 rounded-full bg-ink-700/60 p-3">
          <Icon className="text-bone/40" size={26} />
        </div>
      )}
      <p className="font-display text-base font-bold text-bone/80">{title}</p>
      {subtitle && <p className="max-w-sm text-sm text-bone/50">{subtitle}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
