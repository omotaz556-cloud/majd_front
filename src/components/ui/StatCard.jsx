import CountUp from './CountUp';

// كارت إحصائية موحّد بنفس هوية المنصة (Glass + Gold/Neon accents) - بيستخدم
// في أي مكان محتاج يعرض رقم بارز (لوحة الأدمن، صفحات اللاعب...) عشان كل
// الداشبوردز تحس إنها نفس المنتج. الرقم بيتحرك بـ CountUp خفيف بس (مش أنيميشن مستمر).
const ACCENTS = {
  gold: 'text-gold bg-gold/10',
  teal: 'text-teal bg-teal/10',
  blue: 'text-neon-blue bg-neon-blue/10',
  purple: 'text-neon-purple bg-neon-purple/10',
  alert: 'text-alert bg-alert/10',
};

export default function StatCard({ icon: Icon, label, value, sub, accent = 'gold', decimals = 0 }) {
  return (
    <div className="glass-card glass-card-hover rounded-2xl p-5">
      {Icon && (
        <div className={`mb-3 inline-flex rounded-lg p-2.5 ${ACCENTS[accent] || ACCENTS.gold}`}>
          <Icon size={20} />
        </div>
      )}
      <p className="font-display text-2xl font-extrabold text-bone">
        {typeof value === 'number' ? <CountUp value={value} decimals={decimals} /> : value}
      </p>
      <p className="mt-0.5 text-sm text-bone/60">{label}</p>
      {sub && <p className="mt-1 text-xs text-bone/40">{sub}</p>}
    </div>
  );
}
