import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Swords,
  Rows3,
  Crosshair,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Star,
  Copy,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  getBattlePlan,
  updateBattlePlan,
  deleteBattlePlan,
  setDefaultBattlePlan,
  duplicateBattlePlan,
  validateBattlePlan,
  setBattleFormation,
  getFormationLines,
  getTargetPriorityTypes,
  getStrategicRetreatRuleTypes,
  getStrategicProtectionRuleTypes,
  getCommanderPreferenceOptions,
  getPlanStatuses,
  updateStrategyConfig,
} from '../../api/army';
import { getTroopTypes } from '../../api/castle';
import { CoinSpinner } from '../ui/Loaders';
import { toastSuccess, toastError } from '../ui/toast';
import { PLAN_STATUS_LABELS, labelOf } from '../../utils/battlePlannerLabels';
import SectionCard from './SectionCard';
import FormationEditor from './FormationEditor';
import TargetPriorityEditor from './TargetPriorityEditor';
import RetreatRulesEditor from './RetreatRulesEditor';
import ProtectionRulesEditor from './ProtectionRulesEditor';
import CommanderPreferencesEditor from './CommanderPreferencesEditor';

// ====== محرر خطة معركة كامل (كل قسم لسه بيتحفظ بنداء API مستقل) - بانل
// جانبي (Slide-over) بيتفتح
// فوق Attack Dialog من غير أي تنقل لصفحة تانية - جزء من "الخطة تتعدّل من
// جوه نافذة الهجوم نفسها" (شوف AttackDialog.jsx). onSaved/onDeleted بيتنادوا
// عشان AttackDialog يقدر يحدّث قايمة الخطط بتاعته من غير ما يعيد تحميل كل
// حاجة. ======
export default function BattlePlanEditorPanel({ planId, onClose, onSaved, onDeleted, onDuplicated }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [plan, setPlan] = useState(null);
  const [refData, setRefData] = useState(null);

  const [nameStatus, setNameStatus] = useState({ name: '', status: 'draft', notes: '' });
  const [battleFormation, setBattleFormation_] = useState([]);
  const [targetPriority, setTargetPriority] = useState([]);
  const [retreatRules, setRetreatRules] = useState([]);
  const [protectionRules, setProtectionRules] = useState([]);
  const [commanderPreferences, setCommanderPreferences] = useState({});

  const [savingSection, setSavingSection] = useState(null);
  const [validating, setValidating] = useState(false);
  const [rowBusy, setRowBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const hydrateFromPlan = useCallback((p) => {
    setPlan(p);
    setNameStatus({ name: p.name, status: p.status, notes: p.notes || '' });
    setBattleFormation_(p.battle_formation || []);
    setTargetPriority(p.strategy_config?.target_priority || []);
    setRetreatRules(p.strategy_config?.retreat_rules || []);
    setProtectionRules(p.strategy_config?.protection_rules || []);
    setCommanderPreferences(p.commander_preferences || {});
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [
        planData,
        formation_lines,
        target_priority_types,
        strategic_retreat_rule_types,
        strategic_protection_rule_types,
        commanderOptions,
        statuses,
        troopTypesData,
      ] = await Promise.all([
        getBattlePlan(planId),
        getFormationLines(),
        getTargetPriorityTypes(),
        getStrategicRetreatRuleTypes(),
        getStrategicProtectionRuleTypes(),
        getCommanderPreferenceOptions(),
        getPlanStatuses(),
        getTroopTypes(),
      ]);

      hydrateFromPlan(planData);
      setRefData({
        formation_lines,
        target_priority_types,
        strategic_retreat_rule_types,
        strategic_protection_rule_types,
        role_preferences: commanderOptions.role_preferences,
        assignment_modes: commanderOptions.assignment_modes,
        statuses,
        troop_types: troopTypesData.troop_types,
      });
    } catch (e) {
      setErr(e.response?.data?.error || 'تعذر تحميل خطة المعركة');
    } finally {
      setLoading(false);
    }
  }, [planId, hydrateFromPlan]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function saveNameStatus() {
    setSavingSection('info');
    try {
      const updated = await updateBattlePlan(planId, {
        name: nameStatus.name.trim(),
        status: nameStatus.status,
        notes: nameStatus.notes || null,
      });
      hydrateFromPlan(updated);
      onSaved?.(updated);
      toastSuccess('اتحفظت بيانات الخطة');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر حفظ بيانات الخطة');
    } finally {
      setSavingSection(null);
    }
  }

  async function saveFormation() {
    setSavingSection('formation');
    try {
      const saved = await setBattleFormation(planId, battleFormation);
      setBattleFormation_(saved);
      onSaved?.({ ...plan, battle_formation: saved });
      toastSuccess('اتحفظ التشكيل التكتيكي');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر حفظ التشكيل التكتيكي');
    } finally {
      setSavingSection(null);
    }
  }

  async function saveTargetPriority() {
    setSavingSection('target_priority');
    try {
      const saved = await updateStrategyConfig(planId, { target_priority: targetPriority });
      setTargetPriority(saved.target_priority || []);
      toastSuccess('اتحفظت أولوية الاستهداف');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر حفظ أولوية الاستهداف');
    } finally {
      setSavingSection(null);
    }
  }

  async function saveRetreatRules() {
    setSavingSection('retreat');
    try {
      const saved = await updateStrategyConfig(planId, { retreat_rules: retreatRules });
      setRetreatRules(saved.retreat_rules || []);
      toastSuccess('اتحفظت قواعد الانسحاب');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر حفظ قواعد الانسحاب');
    } finally {
      setSavingSection(null);
    }
  }

  async function saveProtectionRules() {
    setSavingSection('protection');
    try {
      const saved = await updateStrategyConfig(planId, { protection_rules: protectionRules });
      setProtectionRules(saved.protection_rules || []);
      toastSuccess('اتحفظت قواعد الحماية');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر حفظ قواعد الحماية');
    } finally {
      setSavingSection(null);
    }
  }

  async function saveCommanderPreferences() {
    setSavingSection('commanders');
    try {
      const updated = await updateBattlePlan(planId, { commander_preferences: commanderPreferences });
      hydrateFromPlan(updated);
      onSaved?.(updated);
      toastSuccess('اتحفظت تفضيلات القادة');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر حفظ تفضيلات القادة');
    } finally {
      setSavingSection(null);
    }
  }

  async function handleValidate() {
    setValidating(true);
    try {
      const result = await validateBattlePlan(planId);
      setPlan((p) => ({ ...p, last_validation: { ...result, checked_at: new Date().toISOString() } }));
      if (result.is_valid) {
        toastSuccess('الخطة صالحة بالكامل');
      } else {
        toastError(`فيه ${result.errors.length} ملاحظة على الخطة`);
      }
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر التحقق من الخطة');
    } finally {
      setValidating(false);
    }
  }

  async function handleSetDefault() {
    setRowBusy(true);
    try {
      const updated = await setDefaultBattlePlan(planId);
      hydrateFromPlan(updated);
      onSaved?.(updated);
      toastSuccess('بقت الخطة الافتراضية');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر تعيين الخطة كافتراضية');
    } finally {
      setRowBusy(false);
    }
  }

  async function handleDuplicate() {
    setRowBusy(true);
    try {
      const copy = await duplicateBattlePlan(planId);
      toastSuccess('اتعملت نسخة من الخطة');
      onDuplicated?.(copy);
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر نسخ الخطة');
    } finally {
      setRowBusy(false);
    }
  }

  async function handleDelete() {
    setRowBusy(true);
    try {
      await deleteBattlePlan(planId);
      toastSuccess('اتحذفت الخطة');
      onDeleted?.(planId);
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر حذف الخطة');
      setRowBusy(false);
    }
  }

  const isValid = plan?.last_validation?.is_valid;

  return (
    <AnimatePresence>
      <motion.div
        key="plan-editor-backdrop"
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
          aria-label="تعديل خطة المعركة"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-bone">
              <Swords className="text-gold" size={20} />
              {loading ? 'تحميل الخطة...' : plan?.name}
            </h2>
            <button type="button" onClick={onClose} className="focus-ring rounded-lg p-1.5 text-bone/50 hover:text-bone" aria-label="إغلاق">
              <X size={18} />
            </button>
          </div>

          {loading && (
            <div className="py-10">
              <CoinSpinner label="بيتم تحميل خطة المعركة..." />
            </div>
          )}

          {!loading && (err || !plan) && <p className="mt-6 text-alert">{err || 'خطة المعركة دي مش موجودة'}</p>}

          {!loading && plan && refData && (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={validating}
                  className="focus-ring btn-outline flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  {validating ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                  تحقق من الخطة
                </button>
                <button
                  type="button"
                  onClick={handleSetDefault}
                  disabled={plan.is_default || rowBusy}
                  className="focus-ring btn-outline flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  <Star size={13} /> تعيين كافتراضية
                </button>
                <button
                  type="button"
                  onClick={handleDuplicate}
                  disabled={rowBusy}
                  className="focus-ring btn-outline flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  <Copy size={13} /> نسخ
                </button>
                {!confirmingDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={rowBusy}
                    className="focus-ring mr-auto flex items-center gap-1.5 rounded-lg border border-alert/25 px-3 py-1.5 text-xs text-alert hover:bg-alert/10 disabled:opacity-50"
                  >
                    <Trash2 size={13} /> حذف
                  </button>
                ) : (
                  <span className="mr-auto flex items-center gap-2 text-xs">
                    <span className="text-bone/60">تأكيد؟</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="focus-ring rounded-lg bg-alert px-2.5 py-1 font-bold text-bone hover:bg-alert/85"
                    >
                      نعم
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="focus-ring rounded-lg border border-ink-600 px-2.5 py-1 text-bone/60 hover:text-bone"
                    >
                      لا
                    </button>
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs">
                {isValid ? (
                  <span className="flex items-center gap-1 text-teal">
                    <CheckCircle2 size={13} /> الخطة صالحة
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-alert">
                    <AlertTriangle size={13} />
                    {plan.last_validation?.errors?.length ? `${plan.last_validation.errors.length} ملاحظة تحقق` : 'لسه ما اتحققتش'}
                  </span>
                )}
              </div>
              {!isValid && plan.last_validation?.errors?.length > 0 && (
                <ul className="mt-2 list-inside list-disc rounded-xl border border-alert/25 bg-alert/5 p-3 text-xs text-alert/90">
                  {plan.last_validation.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}

              <div className="mt-6 flex flex-col gap-4">
                <SectionCard icon={Swords} title="بيانات الخطة" onSave={saveNameStatus} saving={savingSection === 'info'}>
                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-bone/50">اسم الخطة</label>
                      <input
                        type="text"
                        value={nameStatus.name}
                        onChange={(e) => setNameStatus((s) => ({ ...s, name: e.target.value }))}
                        className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-bone focus-ring"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-bone/50">الحالة</label>
                      <select
                        value={nameStatus.status}
                        onChange={(e) => setNameStatus((s) => ({ ...s, status: e.target.value }))}
                        className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-bone focus-ring"
                      >
                        {refData.statuses.map((s) => (
                          <option key={s} value={s}>
                            {labelOf(PLAN_STATUS_LABELS, s)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-bone/50">ملاحظات</label>
                      <textarea
                        value={nameStatus.notes}
                        onChange={(e) => setNameStatus((s) => ({ ...s, notes: e.target.value }))}
                        rows={2}
                        className="w-full resize-none rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-bone focus-ring"
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  icon={Rows3}
                  title="محرر التشكيل"
                  description="وزّع مجموعات القوات على الصف الأمامي/الأوسط/الخلفي"
                  onSave={saveFormation}
                  saving={savingSection === 'formation'}
                >
                  <FormationEditor
                    lines={refData.formation_lines}
                    troopTypes={refData.troop_types}
                    value={battleFormation}
                    onChange={setBattleFormation_}
                  />
                </SectionCard>

                <SectionCard
                  icon={Crosshair}
                  title="أولوية الاستهداف"
                  description="رتّب إيه اللي المفروض تشكيلتك تستهدفه الأول"
                  onSave={saveTargetPriority}
                  saving={savingSection === 'target_priority'}
                >
                  <TargetPriorityEditor
                    options={refData.target_priority_types}
                    value={targetPriority}
                    onChange={setTargetPriority}
                  />
                </SectionCard>

                <SectionCard
                  icon={ShieldAlert}
                  title="قواعد الانسحاب"
                  description="حدد الشروط اللي تخلي تشكيلتك تنسحب"
                  onSave={saveRetreatRules}
                  saving={savingSection === 'retreat'}
                >
                  <RetreatRulesEditor
                    options={refData.strategic_retreat_rule_types}
                    value={retreatRules}
                    onChange={setRetreatRules}
                  />
                </SectionCard>

                <SectionCard
                  icon={ShieldCheck}
                  title="قواعد الحماية"
                  description="حدد إيه اللي المفروض يتحمى أثناء تنفيذ الخطة"
                  onSave={saveProtectionRules}
                  saving={savingSection === 'protection'}
                >
                  <ProtectionRulesEditor
                    options={refData.strategic_protection_rule_types}
                    value={protectionRules}
                    onChange={setProtectionRules}
                  />
                </SectionCard>

                <SectionCard icon={UserCog} title="تفضيلات القادة" onSave={saveCommanderPreferences} saving={savingSection === 'commanders'}>
                  <CommanderPreferencesEditor
                    roleOptions={refData.role_preferences}
                    modeOptions={refData.assignment_modes}
                    value={commanderPreferences}
                    onChange={setCommanderPreferences}
                  />
                </SectionCard>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
