import { useEffect, useState } from 'react';
import { RotateCcw, Filter } from 'lucide-react';
import { listTransactions, reverseTransaction } from '../../api/admin';
import { toNumber } from '../../utils/money';

const TYPE_LABELS = {
  deposit: 'إيداع',
  reward: 'مكافأة',
  spend: 'إنفاق',
  reversal: 'استرداد',
  admin_credit: 'إضافة إدارية',
  admin_debit: 'خصم إداري',
};

const STATUS_META = {
  completed: 'bg-teal/10 text-teal',
  pending: 'bg-gold/10 text-gold',
  failed: 'bg-alert/10 text-alert',
  reversed: 'bg-bone/10 text-bone/50',
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('ar-EG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PAGE_SIZE = 25;

export default function AdminTransactionsTab() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [filters, setFilters] = useState({ type: '', status: '', search: '' });
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function load(currentSkip = skip, currentFilters = filters) {
    listTransactions({
      limit: PAGE_SIZE,
      skip: currentSkip,
      type: currentFilters.type || undefined,
      status: currentFilters.status || undefined,
    })
      .then((res) => {
        setTransactions(res.transactions);
        console.log("OmarSharmt",res.transactions)
        setTotal(res.total);
      })
      .catch(() => setErr('تعذر تحميل المعاملات'));
  }

  useEffect(() => {
    load(0, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters(e) {
    e.preventDefault();
    setSkip(0);
    load(0, filters);
  }

  function goPage(newSkip) {
    setSkip(newSkip);
    load(newSkip, filters);
  }

  async function handleReverse(txnId) {
    if (!window.confirm('هل أنت متأكد من عمل استرداد لهذه المعاملة؟ العملية دي مش هترجع فيها')) {
      return;
    }
    const reason = window.prompt('سبب الاسترداد (هيتسجل في الـ Audit Log):');
    if (!reason || !reason.trim()) {
      return;
    }
    setBusyId(txnId);
    setErr(null);
    try {
      await reverseTransaction(txnId, reason.trim());
      load(skip, filters);
    } catch (e) {
      setErr(e.response?.data?.error || 'تعذر عمل الاسترداد');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <form onSubmit={applyFilters} className="mb-4 flex flex-wrap items-center gap-2">
        <Filter size={15} className="text-bone/70" />
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="focus-ring rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-bone"
        >
          <option value="">كل الأنواع</option>
          <option value="deposit">إيداع</option>
          <option value="reward">مكافأة</option>
          <option value="spend">إنفاق</option>
          <option value="reversal">استرداد</option>
          <option value="admin_credit">إضافة إدارية</option>
          <option value="admin_debit">خصم إداري</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="focus-ring rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-bone"
        >
          <option value="">كل الحالات</option>
          <option value="completed">مكتملة</option>
          <option value="pending">معلّقة</option>
          <option value="failed">فاشلة</option>
          <option value="reversed">مُستردة</option>
        </select>
        <button
          type="submit"
          className="focus-ring rounded-lg border border-ink-600 px-4 py-2 text-sm text-bone/70 hover:border-gold hover:text-gold"
        >
          تطبيق
        </button>
        <p className="mr-auto text-xs text-bone/40">{total} معاملة</p>
      </form>

      {err && <p className="mb-3 text-alert">{err}</p>}

      <div className="overflow-x-auto rounded-xl border border-ink-600">
        <table className="w-full text-sm">
          <thead className="bg-ink-700 text-bone/60">
            <tr>
              <th className="px-4 py-3 text-right font-normal">المستخدم</th>
              <th className="px-4 py-3 text-right font-normal">النوع</th>
              <th className="px-4 py-3 text-right font-normal">مبلغ الشحن</th>
              <th className="px-4 py-3 text-right font-normal">الحالة</th>
              <th className="px-4 py-3 text-right font-normal">التاريخ</th>
              <th className="px-4 py-3 text-right font-normal">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t._id} className="border-t border-ink-600 bg-ink-800">
                <td className="px-4 py-3 text-bone">
                  {t.user_id?.name || '—'}
                  <p className="text-xs text-bone/40">{t.user_id?.email}</p>
                </td>
                <td className="px-4 py-3 text-bone/70">{TYPE_LABELS[t.type] || t.type}</td>
                <td className="px-4 py-3 font-mono text-bone">
                {t.gross_amount.$numberDecimal}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      STATUS_META[t.status] || 'bg-bone/10 text-bone/50'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-bone/50">
                  {formatDateTime(t.created_at)}
                </td>
                <td className="px-4 py-3">
                  {t.status === 'completed' && !t.reversal_of && (
                    <button
                      onClick={() => handleReverse(t._id)}
                      disabled={busyId === t._id}
                      className="focus-ring flex items-center gap-1 rounded-lg border border-ink-600 px-2.5 py-1 text-xs text-bone/70 hover:border-alert hover:text-alert disabled:opacity-40"
                    >
                      <RotateCcw size={12} /> استرداد
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-bone/40">
                  لا توجد معاملات مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between text-xs text-bone/50">
          <button
            onClick={() => goPage(Math.max(0, skip - PAGE_SIZE))}
            disabled={skip === 0}
            className="focus-ring rounded-lg border border-ink-600 px-3 py-1.5 disabled:opacity-30"
          >
            السابق
          </button>
          <span>
            {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} من {total}
          </span>
          <button
            onClick={() => goPage(skip + PAGE_SIZE)}
            disabled={skip + PAGE_SIZE >= total}
            className="focus-ring rounded-lg border border-ink-600 px-3 py-1.5 disabled:opacity-30"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
