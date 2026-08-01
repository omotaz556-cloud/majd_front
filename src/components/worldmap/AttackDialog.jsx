import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Swords,
  Plus,
  Minus,
  Star,
  Pencil,
  Loader2,
  Eye,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Equal,
  Castle,
  Tent,
  Users,
  Flag,
} from 'lucide-react';
import { listBattlePlans, getDefaultBattlePlan, createBattlePlan } from '../../api/army';
import { scoutCastle } from '../../api/castle';
import { toastSuccess, toastError } from '../ui/toast';
import { estimatePlanReadiness } from '../../utils/battlePlanReadiness';
import FormationPreview from '../battleplanner/FormationPreview';
import BattlePlanEditorPanel from '../battleplanner/BattlePlanEditorPanel';
import CreatePlanModal from '../battleplanner/CreatePlanModal';
import FormationsManagerPanel from '../battleplanner/FormationsManagerPanel';
import RallyCreateDialog from './RallyCreateDialog';

const FORMATION_LINES = ['front_line', 'middle_line', 'back_line'];

// ====== Attack Dialog - النافذة الوحيدة اللي اللاعب بيهاجم منها. بتتفتح
// مباشرة أول ما يضغط "هجوم" على أي قلعة (من الخريطة، بانل العالم، أو شريط
// الزيارة) - مفيش صفحة مستقلة ولا تبويب خارجي لمخطط المعارك خالص، وتعديل/
// إنشاء خطة معركة بيحصل من جوه النافذة دي نفسها (BattlePlanEditorPanel
// كبانل جانبي) من غير ما اللاعب يسيب مشهد اللعبة. كل خطة قلعة بتستخدم
// الخطة الافتراضية بتاعتها أوتوماتيك (getDefaultBattlePlan) مع إمكانية
// تغييرها قبل إطلاق الهجوم. ======
export default function AttackDialog({ open, target, army, troopTypes, submitting, onClose, onLaunch }) {
  const [selected, setSelected] = useState({});
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  const [editingPlanId, setEditingPlanId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [showFormationsPanel, setShowFormationsPanel] = useState(false);

  const [scout, setScout] = useState({ loading: false, data: null, error: null });

  // ====== "ابدأ تجمّع" - نفس هدف وخطة الهجوم الفردي، بس بيفتح
  // RallyCreateDialog بدل ما يبعت جيشك انت لوحدك (Rally accessible from
  // world-map attack flow). ======
  const [rallyDialogOpen, setRallyDialogOpen] = useState(false);

  // ====== تصفير الحالة + تحميل الخطط أول ما النافذة تتفتح لهدف جديد ======
  useEffect(() => {
    if (!open) return;
    setSelected({});
    setScout({ loading: false, data: null, error: null });
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.id]);

  function loadPlans(preferPlanId) {
    setPlansLoading(true);
    Promise.all([listBattlePlans(), getDefaultBattlePlan()])
      .then(([list, defaultPlan]) => {
        setPlans(list);
        const preferred = preferPlanId && list.find((p) => p.id === preferPlanId);
        const fallback = preferred || defaultPlan || list[0] || null;
        setSelectedPlanId(fallback?.id || null);
      })
      .catch(() => toastError('تعذر تحميل خطط المعارك'))
      .finally(() => setPlansLoading(false));
  }

  const availableStacks = (army || []).filter((s) => s.count > 0);
  const statsByKey = useMemo(() => new Map((troopTypes || []).map((t) => [t.key, t.stats])), [troopTypes]);

  function adjust(key, max, delta) {
    setSelected((prev) => {
      const current = prev[key] || 0;
      const next = Math.min(max, Math.max(0, current + delta));
      return { ...prev, [key]: next };
    });
  }

  const troopsToSend = Object.entries(selected)
    .filter(([, qty]) => qty > 0)
    .map(([key, qty]) => ({ key, quantity: qty }));

  const attackPower = troopsToSend.reduce((sum, t) => sum + (statsByKey.get(t.key)?.attack || 0) * t.quantity, 0);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;

  // ====== تقدير "قوة الجيش بعد الخطة" - عرض بس (راجع battlePlanReadiness.js
  // للتفاصيل والحدود)، بيختلف فعلاً من خطة لخطة حسب مدى تجهيزها. ======
  const readiness = estimatePlanReadiness(selectedPlan);
  const planAdjustedPower = Math.round(attackPower * readiness.multiplier);

  const canLaunch = troopsToSend.length > 0 && !submitting;

  function handleRunScout() {
    if (!target) return;
    setScout({ loading: true, data: null, error: null });
    scoutCastle(target.id)
      .then((report) => setScout({ loading: false, data: report, error: null }))
      .catch((err) => setScout({ loading: false, data: null, error: err.response?.data?.error || 'تعذر الاستكشاف دلوقتي' }));
  }

  async function handleCreatePlan(name) {
    setCreatingPlan(true);
    try {
      const created = await createBattlePlan({ name });
      toastSuccess('اتعملت خطة جديدة');
      setShowCreateModal(false);
      loadPlans(created.id);
      setEditingPlanId(created.id);
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر إنشاء الخطة');
    } finally {
      setCreatingPlan(false);
    }
  }

  function handleLaunch() {
    if (!canLaunch) return;
    onLaunch?.(target.id, troopsToSend, selectedPlanId);
  }

  if (!target) return null;

  const targetLabel = target.is_npc ? target.name : target.owner_name || 'قلعة لاعب';

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="attack-dialog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 px-3 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) onClose?.();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-stone-950/95 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="هجوم"
            >
              {/* ====== هيدر - اسم الهدف + إغلاق ====== */}
              <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      target.is_npc ? 'bg-red-500/20 text-red-300' : 'bg-sky-500/20 text-sky-300'
                    }`}
                  >
                    {target.is_npc ? <Tent size={16} /> : <Castle size={16} />}
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 font-bold text-white">
                      <Swords size={14} className="text-red-400" /> هجوم على {targetLabel}
                    </p>
                    {typeof target.distance_slots === 'number' && (
                      <p className="text-[11px] text-white/50">على بعد {target.distance_slots} خانة</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-white/5 p-1.5 text-white/60 hover:text-white"
                  aria-label="إغلاق"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="grid gap-5 sm:grid-cols-2">
                  {/* ====== عمود شمال: اختيار الجيش + اختيار الخطة ====== */}
                  <div className="flex flex-col gap-4">
                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-white/70">اختَر الجيش اللي هتبعته</h3>
                        <button
                          type="button"
                          onClick={() => setShowFormationsPanel(true)}
                          className="flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200"
                        >
                          <Users size={12} /> تشكيلات الجيش
                        </button>
                      </div>
                      {availableStacks.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-white/10 py-4 text-center text-xs text-white/40">
                          لسه معندكش جنود جاهزين - درّب وحدات في الثكنة الأول
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {availableStacks.map((stack) => (
                            <div key={stack.key} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-2">
                              <span className="text-xs text-white/80">
                                {stack.name} <span className="text-white/40">(متاح {stack.count.toLocaleString('ar-EG')})</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => adjust(stack.key, stack.count, -1)}
                                  className="rounded-md bg-white/10 p-1 text-white/70 hover:bg-white/20"
                                  aria-label="تقليل"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-8 text-center font-mono text-xs text-white">{selected[stack.key] || 0}</span>
                                <button
                                  type="button"
                                  onClick={() => adjust(stack.key, stack.count, 1)}
                                  className="rounded-md bg-white/10 p-1 text-white/70 hover:bg-white/20"
                                  aria-label="زيادة"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-white/70">خطة المعركة</h3>
                        <button
                          type="button"
                          onClick={() => setShowCreateModal(true)}
                          className="flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200"
                        >
                          <Plus size={12} /> خطة جديدة
                        </button>
                      </div>

                      {plansLoading && (
                        <div className="flex items-center justify-center py-6 text-white/50">
                          <Loader2 className="animate-spin" size={18} />
                        </div>
                      )}

                      {!plansLoading && plans.length === 0 && (
                        <p className="rounded-lg border border-dashed border-white/10 py-4 text-center text-xs text-white/40">
                          لسه معندكش أي خطط معارك - اعمل أول خطة عشان تحدد تشكيلك وأولوية استهدافك
                        </p>
                      )}

                      {!plansLoading && plans.length > 0 && (
                        <div className="space-y-1.5">
                          {plans.map((plan) => (
                            <label
                              key={plan.id}
                              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                                selectedPlanId === plan.id
                                  ? 'border-amber-400/50 bg-amber-500/10'
                                  : 'border-white/10 bg-white/5 hover:border-white/20'
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-1.5">
                                <input
                                  type="radio"
                                  name="battle-plan"
                                  checked={selectedPlanId === plan.id}
                                  onChange={() => setSelectedPlanId(plan.id)}
                                  className="shrink-0"
                                />
                                <span className="truncate text-xs font-bold text-white/90">{plan.name}</span>
                                {plan.is_default && (
                                  <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                    <Star size={9} fill="currentColor" /> افتراضية
                                  </span>
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setEditingPlanId(plan.id);
                                }}
                                className="shrink-0 rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white"
                                aria-label="تعديل الخطة"
                              >
                                <Pencil size={13} />
                              </button>
                            </label>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  {/* ====== عمود يمين: معاينة التشكيل + التقدير ====== */}
                  <div className="flex flex-col gap-4">
                    <section>
                      <h3 className="mb-2 text-xs font-bold text-white/70">معاينة التشكيل</h3>
                      {selectedPlan ? (
                        <FormationPreview lines={FORMATION_LINES} battleFormation={selectedPlan.battle_formation} troopTypes={troopTypes} />
                      ) : (
                        <p className="rounded-lg border border-dashed border-white/10 py-4 text-center text-xs text-white/40">
                          اختَر خطة عشان تشوف تشكيلها
                        </p>
                      )}
                    </section>

                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-white/70">تقدير نتيجة المعركة</h3>
                        <button
                          type="button"
                          onClick={handleRunScout}
                          disabled={scout.loading}
                          className="flex items-center gap-1 text-[11px] font-bold text-sky-300 hover:text-sky-200 disabled:opacity-50"
                        >
                          {scout.loading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                          استكشاف للتقدير
                        </button>
                      </div>

                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60">قوة هجوم الجيش المختار (خام)</span>
                          <span className="font-mono font-bold text-white/70">{attackPower.toLocaleString('ar-EG')}</span>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <span className="text-white/60">قوة الجيش بعد الخطة (تقديري)</span>
                          <span className="font-mono font-bold text-amber-300">{planAdjustedPower.toLocaleString('ar-EG')}</span>
                        </div>
                        {readiness.factors.length > 0 && (
                          <p className="mt-1 text-[10px] text-white/40">
                            متأثرة بـ: {readiness.factors.join('، ')}
                          </p>
                        )}

                        {scout.error && <p className="mt-2 text-[11px] text-red-300">{scout.error}</p>}

                        {scout.data && (
                          <>
                            <div className="mt-2 flex items-center justify-between text-xs">
                              <span className="text-white/60">قوة دفاع الهدف التقديرية</span>
                              <span className="font-mono font-bold text-sky-300">{scout.data.defense_power.toLocaleString('ar-EG')}</span>
                            </div>
                            <VerdictBadge attackPower={planAdjustedPower} defensePower={scout.data.defense_power} />
                          </>
                        )}

                        {!scout.data && !scout.error && (
                          <p className="mt-2 text-[11px] text-white/40">
                            استكشف الهدف عشان تشوف قوة دفاعه المتوقعة مقابل الجيش اللي اخترته
                          </p>
                        )}

                        <p className="mt-2 flex items-start gap-1 text-[10px] text-white/30">
                          <ShieldAlert size={11} className="mt-0.5 shrink-0" />
                          تقدير تقريبي - الخطة فعلاً بتضيف بونص هجوم/دفاع حقيقي وقت الاشتباك، لكن النتيجة النهائية بتتحدد لحظة القتال حسب كل ضربة وسلوك وحداتك
                        </p>
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {/* ====== شريط سفلي - زرار بدء الهجوم الفردي + زرار بدء تجمّع
                  تحالف على نفس الهدف (Rally accessible from world-map
                  attack flow) ====== */}
              <div className="flex gap-2 border-t border-white/10 bg-black/30 px-4 py-3">
                <button
                  type="button"
                  disabled={!canLaunch}
                  onClick={handleLaunch}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-red-500 to-red-700 py-2.5 text-sm font-bold text-white shadow transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <Swords size={15} />}
                  {submitting ? 'جاري إرسال الجيش...' : 'ابدأ الهجوم'}
                </button>
                <button
                  type="button"
                  onClick={() => setRallyDialogOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-300 hover:bg-amber-500/20"
                >
                  <Flag size={15} />
                  ابدأ تجمّع
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {editingPlanId && (
        <BattlePlanEditorPanel
          planId={editingPlanId}
          onClose={() => {
            setEditingPlanId(null);
            loadPlans(selectedPlanId);
          }}
          onSaved={() => loadPlans(selectedPlanId)}
          onDuplicated={(copy) => {
            setEditingPlanId(null);
            loadPlans(copy.id);
          }}
          onDeleted={() => {
            setEditingPlanId(null);
            loadPlans();
          }}
        />
      )}

      {showCreateModal && (
        <CreatePlanModal onClose={() => setShowCreateModal(false)} onCreate={handleCreatePlan} creating={creatingPlan} />
      )}

      {showFormationsPanel && <FormationsManagerPanel onClose={() => setShowFormationsPanel(false)} />}

      <RallyCreateDialog
        open={rallyDialogOpen}
        targetId={target?.id}
        targetLabel={targetLabel}
        battlePlanId={selectedPlanId}
        onClose={() => setRallyDialogOpen(false)}
        onCreated={() => onClose?.()}
      />
    </>
  );
}

function VerdictBadge({ attackPower, defensePower }) {
  if (!defensePower) return null;
  const ratio = attackPower / defensePower;
  let label, className, Icon;
  if (ratio >= 1.3) {
    label = 'مرجّح تكسب';
    className = 'text-emerald-300 bg-emerald-500/10';
    Icon = TrendingUp;
  } else if (ratio >= 0.8) {
    label = 'المعركة متقاربة';
    className = 'text-amber-300 bg-amber-500/10';
    Icon = Equal;
  } else {
    label = 'مرجّح تخسر';
    className = 'text-red-300 bg-red-500/10';
    Icon = TrendingDown;
  }
  return (
    <div className={`mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ${className}`}>
      <Icon size={13} />
      {label}
    </div>
  );
}
