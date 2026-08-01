import { useEffect, useState } from 'react';
import { Search, Ban, CheckCircle, ShieldCheck, Shield, Gem, X, Loader2 } from 'lucide-react';
import { listUsers, setUserStatus, updateUserRole, creditPlayerWallet } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';

// ====== مودال شحن جواهر يدوي للاعب (Admin Manual Credit) ======
// بينادي POST /admin/players/:userId/wallet/credit الموجود بالفعل في الباك
// إند (creditPlayerWallet في wallet.service.js) - نفس القفل الذري، نفس الـ
// ledger، ونفس الـ audit log بتاع أي عملية تانية. الأدمن هنا بس بيحدد
// المبلغ والسبب، والسبب إجباري عشان الـ audit trail يفضل واضح دايماً.
function CreditGemsModal({ user, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setErr('اكتب مبلغ صحيح أكبر من صفر');
      return;
    }
    if (!reason.trim()) {
      setErr('السبب إجباري (هيتسجل في سجل العمليات)');
      return;
    }

    setBusy(true);
    try {
      const result = await creditPlayerWallet(user._id, {
        amount: parsedAmount,
        reason: reason.trim(),
        category: 'topup',
      });
      onSuccess(result);
    } catch (e2) {
      setErr(e2.response?.data?.error || 'تعذر إتمام عملية الشحن');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 px-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-sm rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-bone">
            <Gem size={18} className="text-sky-400" />
            شحن جواهر يدوي
          </h3>
          <button
            onClick={onClose}
            className="focus-ring rounded-lg p-1.5 text-bone/50 hover:text-bone"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-ink-600 bg-ink-800/80 px-3 py-2">
          <p className="text-sm text-bone">{user.name}</p>
          <p className="text-xs text-bone/50">{user.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-xs text-bone/60">
            عدد الجواهر
            <input
              type="number"
              min="1"
              step="1"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مثلاً 500"
              className="focus-ring mt-1 w-full rounded-lg border border-ink-600 bg-ink-700 px-3 py-2 text-bone placeholder:text-bone/40"
            />
          </label>

          <label className="text-xs text-bone/60">
            السبب (إجباري)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثلاً: تعويض عن مشكلة فنية في الشحن"
              rows={2}
              className="focus-ring mt-1 w-full resize-none rounded-lg border border-ink-600 bg-ink-700 px-3 py-2 text-bone placeholder:text-bone/40"
            />
          </label>

          {err && <p className="text-sm text-alert">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="focus-ring btn-gradient-gold mt-1 flex items-center justify-center gap-2 rounded-lg py-2.5 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Gem size={16} />}
            تأكيد الشحن
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [creditTarget, setCreditTarget] = useState(null); // اللاعب اللي فاتح له مودال الشحن دلوقتي
  const [successMsg, setSuccessMsg] = useState(null);

  function load(searchTerm = search) {
    listUsers({ search: searchTerm, limit: 50 })
      .then((res) => {
        setUsers(res.users);
        setTotal(res.total);
      })
      .catch(() => setErr('تعذر تحميل المستخدمين'));
  }

  useEffect(() => {
    load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggleStatus(user) {
    setBusyId(user._id);
    try {
      const updated = await setUserStatus(user._id, !user.is_active);
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
    } catch {
      setErr('تعذر تحديث حالة المستخدم');
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleRole(user) {
    const nextRole = user.role === 'admin' ? 'player' : 'admin';
    if (user._id === currentUser?._id) {
      setErr('لا يمكنك إزالة صلاحيات الأدمن من حسابك الخاص');
      return;
    }
    setBusyId(user._id);
    try {
      const updated = await updateUserRole(user._id, nextRole);
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
    } catch (e) {
      setErr(e.response?.data?.error || 'تعذر تحديث دور المستخدم');
    } finally {
      setBusyId(null);
    }
  }

  function handleCreditSuccess(user, result) {
    setCreditTarget(null);
    const newBalance = result?.wallet?.balance;
    setSuccessMsg(
      `تم شحن ${user.name} بنجاح${newBalance !== undefined ? ` - الرصيد الحالي: ${newBalance}` : ''}`
    );
    setTimeout(() => setSuccessMsg(null), 5000);
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mb-4 flex gap-2"
      >
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-bone/70" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو البريد الإلكتروني"
            className="focus-ring w-full rounded-lg border border-ink-600 bg-ink-800 py-2 pl-4 pr-9 text-sm text-bone placeholder:text-bone/40"
          />
        </div>
        <button
          type="submit"
          className="focus-ring rounded-lg border border-ink-600 px-4 py-2 text-sm text-bone/70 hover:border-gold hover:text-gold"
        >
          بحث
        </button>
      </form>

      {err && <p className="mb-3 text-alert">{err}</p>}
      {successMsg && (
        <p className="mb-3 flex items-center gap-1.5 text-teal">
          <Gem size={14} /> {successMsg}
        </p>
      )}
      <p className="mb-3 text-xs text-bone/40">{total} مستخدم</p>

      <div className="overflow-x-auto rounded-xl border border-ink-600">
        <table className="w-full text-sm">
          <thead className="bg-ink-700 text-bone/60">
            <tr>
              <th className="px-4 py-3 text-right font-normal">الاسم</th>
              <th className="px-4 py-3 text-right font-normal">البريد الإلكتروني</th>
              <th className="px-4 py-3 text-right font-normal">الدور</th>
              <th className="px-4 py-3 text-right font-normal">الحالة</th>
              <th className="px-4 py-3 text-right font-normal">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-t border-ink-600 bg-ink-800">
                <td className="px-4 py-3 text-bone">{u.name}</td>
                <td className="px-4 py-3 text-bone/70">{u.email}</td>
                <td className="px-4 py-3 text-bone/70">{u.role === 'admin' ? 'أدمن' : 'لاعب'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      u.is_active ? 'bg-teal/10 text-teal' : 'bg-alert/10 text-alert'
                    }`}
                  >
                    {u.is_active ? 'نشط' : 'موقوف'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      disabled={busyId === u._id || u.role === 'admin'}
                      className="focus-ring flex items-center gap-1 rounded-lg border border-ink-600 px-2.5 py-1 text-xs text-bone/70 hover:text-bone disabled:opacity-40"
                    >
                      {u.is_active ? (
                        <>
                          <Ban size={13} /> إيقاف
                        </>
                      ) : (
                        <>
                          <CheckCircle size={13} /> تفعيل
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleToggleRole(u)}
                      disabled={busyId === u._id}
                      className="focus-ring flex items-center gap-1 rounded-lg border border-ink-600 px-2.5 py-1 text-xs text-bone/70 hover:text-bone disabled:opacity-40"
                    >
                      {u.role === 'admin' ? (
                        <>
                          <Shield size={13} /> تنزيل لأدمن
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={13} /> ترقية لأدمن
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setCreditTarget(u)}
                      className="focus-ring flex items-center gap-1 rounded-lg border border-sky-400/30 px-2.5 py-1 text-xs text-sky-400 hover:border-sky-400 hover:bg-sky-400/10"
                    >
                      <Gem size={13} /> شحن جواهر
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-bone/40">
                  لا يوجد مستخدمون مطابقون
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creditTarget && (
        <CreditGemsModal
          user={creditTarget}
          onClose={() => setCreditTarget(null)}
          onSuccess={(result) => handleCreditSuccess(creditTarget, result)}
        />
      )}
    </div>
  );
}