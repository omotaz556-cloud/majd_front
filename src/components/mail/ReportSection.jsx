// ====== كارت قسم موحّد لتقرير المعركة - نفس هوية المنصة (glass-card) عشان
// كل أقسام التقرير (ملخص الجيوش/الغنائم/الأضرار/تفاصيل المعركة/الأحداث)
// تحس إنها نفس المكوّن، بدل ما كل قسم يبني الكارت بتاعه لوحده. ======
export default function ReportSection({ icon: Icon, title, accent = 'gold', children, className = '' }) {
  const accentText = {
    gold: 'text-gold',
    teal: 'text-teal',
    blue: 'text-neon-blue',
    purple: 'text-neon-purple',
    alert: 'text-alert',
  }[accent] || 'text-gold';

  return (
    <section className={`glass-card rounded-2xl p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        {Icon && <Icon size={18} className={accentText} />}
        <h2 className="font-display text-lg font-bold text-bone">{title}</h2>
      </div>
      {children}
    </section>
  );
}
