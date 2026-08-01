// ====== شارة حالة التجمّع (Rally Status Badge) - مصدر واحد لـ STATUS_META
// بدل ما يتكرر في AllianceRalliesPage و RallyDetailPage. أي حالة جديدة
// تتضاف لـ rally.status في الباك إند (rally.model) تتضاف هنا بس مرة واحدة. ======

export const RALLY_STATUS_META = {
  gathering: { label: 'بيتجمّع', className: 'text-gold bg-gold/10' },
  resolved: { label: 'اتنفّذ', className: 'text-teal bg-teal/10' },
  cancelled: { label: 'اتلغى', className: 'text-bone/50 bg-ink-700/60' },
};

export default function RallyStatusBadge({ status, className = '' }) {
  const meta = RALLY_STATUS_META[status] || RALLY_STATUS_META.gathering;
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-bold ${meta.className} ${className}`}>{meta.label}</span>
  );
}
