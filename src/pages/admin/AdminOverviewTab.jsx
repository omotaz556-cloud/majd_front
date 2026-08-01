import { useEffect, useState } from 'react';
import {
  Users,
  Wallet,
  Receipt,
  Megaphone,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { getOverviewStats, getRevenueStats } from '../../api/admin';
import StatCard from '../../components/ui/StatCard';

export default function AdminOverviewTab() {
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [err, setErr] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  function load({ silent = false } = {}) {
    if (silent) setRefreshing(true);
    return Promise.all([getOverviewStats(), getRevenueStats({})])
      .then(([ov, rev]) => {
        setOverview(ov);
        setRevenue(rev);
        setErr(null);
      })
      .catch(() => setErr('تعذر تحميل الإحصائيات'))
      .finally(() => setRefreshing(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (err) return <p className="text-alert">{err}</p>;
  if (!overview || !revenue) return <p className="text-bone/50">جاري التحميل...</p>;

  const deposits = revenue.real_revenue.deposits;
  // التفاصيل الكاملة (إجمالي قبل الضريبة + الضريبة نفسها + الصافي) بتيجي من
  // wallet_activity.breakdown.deposit - دي بتغطي كل معاملات الإيداع المكتملة
  // (status: completed) بس، فأي عملية شحن لسه pending أو فشلت مش داخلة في الرقم
  const depositBreakdown = revenue.wallet_activity.breakdown.deposit || {
    total_gross_amount: 0,
    total_vat_amount: 0,
    total_net_amount: 0,
    transaction_count: 0,
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-bone">إجمالي مبلغ الشحن</h2>
          <p className="mt-1 text-xs text-bone/40">
            إجمالي كل عمليات شحن الرصيد الحقيقية من جميع اللاعبين (بعد خصم ضريبة القيمة المضافة)
          </p>
        </div>
        <button
          onClick={() => load({ silent: true })}
          disabled={refreshing}
          className="focus-ring flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-bone/60 hover:border-gold hover:text-gold disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* ====== الكارت الرئيسي: إجمالي الشحن بعد الضريبة ====== */}
      <div className="glass-card glass-card-hover rounded-2xl border border-gold/30 p-6">
        <div className="flex items-center gap-2 text-sm text-bone/60">
          <Wallet size={16} className="text-gold" />
          إجمالي مبلغ الشحن لكل اللاعبين (صافي بعد الضريبة)
        </div>
        <p className="mt-2 font-display text-4xl font-extrabold text-gold">
          {deposits.total_net_amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          <span className="text-lg font-bold text-bone/50">ريال</span>
        </p>
        <p className="mt-1 text-xs text-bone/40">
          من إجمالي {deposits.transaction_count} عملية شحن ناجحة
        </p>

        <div className="mt-5 grid gap-3 border-t border-ink-600 pt-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg bg-ink-700/50 px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs text-bone/50">
              <Receipt size={13} /> الإجمالي قبل الضريبة
            </span>
            <span className="text-sm font-bold text-bone">
              {depositBreakdown.total_gross_amount.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-ink-700/50 px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs text-bone/50">
              <Receipt size={13} /> ضريبة القيمة المضافة المخصومة
            </span>
            <span className="text-sm font-bold text-alert">
              -{depositBreakdown.total_vat_amount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-display font-bold text-bone">مصادر الإيراد الحقيقي الأخرى</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="إيداعات (شحن رصيد حقيقي)"
          value={overview.real_revenue.deposits.total}
          decimals={2}
          sub={`${overview.real_revenue.deposits.today.toFixed(2)} النهاردة`}
          accent="teal"
        />
        <StatCard
          icon={Megaphone}
          label="إيراد إعلانات فعلي"
          value={overview.real_revenue.ad_revenue.total}
          decimals={2}
          sub={`${overview.real_revenue.ad_revenue.today.toFixed(2)} النهاردة`}
          accent="gold"
        />
        <StatCard
          icon={Users}
          label="إجمالي المستخدمين"
          value={overview.users.total}
          sub={`${overview.users.active} نشط`}
        />
      </div>

      {overview.real_revenue.ad_revenue.total === 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/10 p-3 text-xs text-gold">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {/* <p>
            لسه مفيش أي إيراد إعلانات مسجّل. الرقم ده بيتحدث بس لو الفرونت إند
            متوصل فعلياً بتكامل Google Ad Manager ويبعت الإيراد الحقيقي على
            /api/ads/revenue-event.
          </p> */}
        </div>
      )}
    </div>
  );
}