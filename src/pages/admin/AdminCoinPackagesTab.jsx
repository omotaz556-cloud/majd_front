import { useEffect, useState } from 'react';
import { Plus, X, Trash2, Power, Coins } from 'lucide-react';
import {
  listCoinPackages,
  createCoinPackage,
  updateCoinPackage,
  deleteCoinPackage,
} from '../../api/admin';

const EMPTY_FORM = {
  name: '',
  coins_amount: 100,
  bonus_coins: 0,
  price: 10,
  currency: 'SAR',
  badge: '',
  sort_order: 0,
};

export default function AdminCoinPackagesTab() {
  const [packages, setPackages] = useState([]);
  const [err, setErr] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  function load() {
    listCoinPackages()
      .then(setPackages)
      .catch(() => setErr('تعذر تحميل باقات الشحن'));
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        name: form.name,
        coins_amount: Number(form.coins_amount),
        bonus_coins: Number(form.bonus_coins) || 0,
        price: Number(form.price),
        currency: form.currency || 'SAR',
        badge: form.badge || null,
        sort_order: Number(form.sort_order) || 0,
      };
      const created = await createCoinPackage(payload);
      setPackages((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e2) {
      setErr(e2.response?.data?.error || 'تعذر إنشاء الباقة');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(pkg) {
    setBusyId(pkg._id);
    try {
      const updated = await updateCoinPackage(pkg._id, { is_active: !pkg.is_active });
      setPackages((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    } catch {
      setErr('تعذر تحديث حالة الباقة');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(pkg) {
    if (!window.confirm(`هل تريد حذف باقة "${pkg.name}" نهائياً؟`)) return;
    setBusyId(pkg._id);
    try {
      await deleteCoinPackage(pkg._id);
      setPackages((prev) => prev.filter((p) => p._id !== pkg._id));
    } catch {
      setErr('تعذر حذف الباقة');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-bone/40">
          كتالوج باقات الشحن الجاهزة (الاسم، عدد الـ Coins، هدية إضافية، والسعر الحقيقي)
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="focus-ring flex shrink-0 items-center gap-1.5 rounded-lg btn-gradient-gold px-4 py-2 text-sm"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'إلغاء' : 'باقة جديدة'}
        </button>
      </div>

      {err && <p className="mb-3 text-alert">{err}</p>}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 grid gap-3 rounded-xl glass-card p-5 sm:grid-cols-2"
        >
          <input
            required
            placeholder="اسم الباقة (مثال: باقة البداية)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="focus-ring rounded-lg border border-ink-600 bg-ink-700 px-3 py-2 text-sm text-bone sm:col-span-2"
          />
          <input
            type="number"
            min="1"
            required
            placeholder="عدد الـ Coins الأساسي"
            value={form.coins_amount}
            onChange={(e) => setForm({ ...form, coins_amount: e.target.value })}
            className="focus-ring rounded-lg border border-ink-600 bg-ink-700 px-3 py-2 text-sm text-bone"
          />
          <input
            type="number"
            min="0"
            placeholder="Coins هدية إضافية (اختياري)"
            value={form.bonus_coins}
            onChange={(e) => setForm({ ...form, bonus_coins: e.target.value })}
            className="focus-ring rounded-lg border border-ink-600 bg-ink-700 px-3 py-2 text-sm text-bone"
          />
          <input
            type="number"
            min="0"
            step="0.5"
            required
            placeholder="السعر الحقيقي"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="focus-ring rounded-lg border border-ink-600 bg-ink-700 px-3 py-2 text-sm text-bone"
          />
          <input
            placeholder="العملة"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="focus-ring rounded-lg border border-ink-600 bg-ink-700 px-3 py-2 text-sm text-bone"
          />
          <input
            placeholder="شارة تسويقية (اختياري، مثال: الأكثر قيمة)"
            value={form.badge}
            onChange={(e) => setForm({ ...form, badge: e.target.value })}
            className="focus-ring rounded-lg border border-ink-600 bg-ink-700 px-3 py-2 text-sm text-bone"
          />
          <input
            type="number"
            placeholder="ترتيب العرض"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            className="focus-ring rounded-lg border border-ink-600 bg-ink-700 px-3 py-2 text-sm text-bone"
          />
          <button
            type="submit"
            disabled={saving}
            className="focus-ring rounded-lg btn-gradient-teal py-2 text-sm sm:col-span-2"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الباقة'}
          </button>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((p) => (
          <div key={p._id} className="rounded-xl glass-card glass-card-hover p-4">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <p className="font-display font-bold text-bone">{p.name}</p>
                {p.badge && (
                  <span className="mt-1 inline-block rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold">
                    {p.badge}
                  </span>
                )}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  p.is_active ? 'bg-teal/10 text-teal' : 'bg-alert/10 text-alert'
                }`}
              >
                {p.is_active ? 'نشطة' : 'موقوفة'}
              </span>
            </div>
            <p className="flex items-center gap-1.5 font-mono text-lg text-gold">
              <Coins size={16} />
              {p.coins_amount}
              {p.bonus_coins > 0 && (
                <span className="text-sm text-teal">+{p.bonus_coins} هدية</span>
              )}
            </p>
            <p className="mt-1 text-sm text-bone/60">
              {p.price} {p.currency}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleToggleActive(p)}
                disabled={busyId === p._id}
                className="focus-ring flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-bone/70 hover:text-bone disabled:opacity-40"
              >
                <Power size={13} />
                {p.is_active ? 'إيقاف' : 'تفعيل'}
              </button>
              <button
                onClick={() => handleDelete(p)}
                disabled={busyId === p._id}
                className="focus-ring flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-bone/70 hover:border-alert hover:text-alert disabled:opacity-40"
              >
                <Trash2 size={13} /> حذف
              </button>
            </div>
          </div>
        ))}
        {packages.length === 0 && <p className="text-bone/50">لا توجد باقات بعد</p>}
      </div>
    </div>
  );
}
