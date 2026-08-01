import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Plus, Loader2 } from 'lucide-react';
import {
  listFormations,
  createFormation,
  updateFormation,
  deleteFormation,
  selectFormation,
  unselectFormation,
  getFormationTypes,
} from '../../api/army';
import { getTroopTypes } from '../../api/castle';
import { CoinSpinner } from '../ui/Loaders';
import { toastSuccess, toastError } from '../ui/toast';
import FormationCard from './FormationCard';
import CreateFormationModal from './CreateFormationModal';

// ====== إدارة تشكيلات الجيش (Army Formations) - بانل جانبي مستقل (نفس
// نمط BattlePlanEditorPanel بالظبط) بيدير قوالب جيش قابلة لإعادة الاستخدام:
// اسم + نوع تشكيلة + نوع مسير + وحدات + قادة + ملاحظات، وتفعيل تشكيلة
// واحدة كـ"نشطة" (is_selected) في نفس الوقت. مفيش أي ربط تلقائي بين
// التشكيلة دي والهجوم الفعلي في AttackDialog لسه - دي طبقة "تخطيط/قوالب"
// منفصلة (زي ما موضّح في formation.service.js: التشكيلة قالب، مش حجز فعلي
// من castle.army). ======
export default function FormationsManagerPanel({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [formations, setFormations] = useState([]);
  const [refData, setRefData] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [formationsData, typesData, troopTypesData] = await Promise.all([
        listFormations(),
        getFormationTypes(),
        getTroopTypes(),
      ]);
      setFormations(formationsData);
      setRefData({
        formation_types: typesData.formation_types,
        march_types: typesData.march_types,
        troop_types: troopTypesData.troop_types,
      });
    } catch (e) {
      setErr(e.response?.data?.error || 'تعذر تحميل تشكيلات الجيش');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleCreate(name) {
    setCreating(true);
    try {
      const created = await createFormation({ name });
      toastSuccess('اتعملت تشكيلة جديدة');
      setShowCreateModal(false);
      setFormations((prev) => [...prev, created]);
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر إنشاء التشكيلة');
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(id, payload) {
    try {
      const updated = await updateFormation(id, payload);
      setFormations((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      toastSuccess('اتحفظت التشكيلة');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر حفظ التشكيلة');
      throw e;
    }
  }

  async function handleDelete(id) {
    try {
      await deleteFormation(id);
      toastSuccess('اتحذفت التشكيلة');
      setFormations((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر حذف التشكيلة');
      throw e;
    }
  }

  async function handleSelect(id) {
    try {
      await selectFormation(id);
      // ====== select حصري في الباك إند (بيلغي تحديد أي تشكيلة تانية) -
      // بنعكس نفس الحصرية هنا محليًا من غير ما نحتاج نعيد تحميل القايمة كلها. ======
      setFormations((prev) => prev.map((f) => ({ ...f, is_selected: f.id === id })));
      toastSuccess('اتفعّلت التشكيلة');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر تفعيل التشكيلة');
      throw e;
    }
  }

  async function handleUnselect(id) {
    try {
      await unselectFormation(id);
      setFormations((prev) => prev.map((f) => (f.id === id ? { ...f, is_selected: false } : f)));
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر إلغاء تفعيل التشكيلة');
      throw e;
    }
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="formations-panel-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex justify-end bg-ink-950/70 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-ink-600 bg-ink-950 px-5 py-6 shadow-2xl sm:px-6"
            role="dialog"
            aria-modal="true"
            aria-label="إدارة تشكيلات الجيش"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-bone">
                <Users className="text-gold" size={20} />
                تشكيلات الجيش
              </h2>
              <button type="button" onClick={onClose} className="focus-ring rounded-lg p-1.5 text-bone/50 hover:text-bone" aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            {loading && (
              <div className="py-10">
                <CoinSpinner label="بيتم تحميل تشكيلات الجيش..." />
              </div>
            )}

            {!loading && err && <p className="text-alert">{err}</p>}

            {!loading && !err && (
              <>
                <p className="mb-4 text-xs text-bone/45">
                  قوالب جيش جاهزة (وحدات + قادة) تقدر تحفظها وتعيد استخدامها بدل ما تختار الجيش يدوي كل
                  مرة. تشكيلة واحدة بس تقدر تكون "نشطة" في نفس الوقت.
                </p>

                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="focus-ring btn-outline mb-4 flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs"
                >
                  <Plus size={14} /> تشكيلة جديدة
                </button>

                {formations.length === 0 && (
                  <p className="rounded-lg border border-dashed border-ink-600 py-8 text-center text-xs text-bone/40">
                    لسه معندكش أي تشكيلات محفوظة - اعمل أول تشكيلة عشان تحفظ جيشك وقادتك كقالب جاهز
                  </p>
                )}

                <div className="space-y-2.5">
                  {formations.map((f) => (
                    <FormationCard
                      key={f.id}
                      formation={f}
                      troopTypes={refData.troop_types}
                      formationTypes={refData.formation_types}
                      marchTypes={refData.march_types}
                      onSave={handleSave}
                      onDelete={handleDelete}
                      onSelect={handleSelect}
                      onUnselect={handleUnselect}
                    />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {showCreateModal && (
        <CreateFormationModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} creating={creating} />
      )}
    </>
  );
}
