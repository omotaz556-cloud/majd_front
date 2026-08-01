import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Hammer, Clock, X, TrendingUp } from 'lucide-react';
import { getRepairOverview, repairOne, repairAll, cancelRepair } from '../../../api/repair';
import { RESOURCE_META, RESOURCE_ORDER } from '../../../utils/resourceMeta';
import { STRUCTURE_TYPE_LABELS, REPAIR_STATE_LABELS } from '../../../utils/repairLabels';
import { toastSuccess, toastError } from '../../ui/toast';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import { CoinSpinner } from '../../ui/Loaders';
import { useCountdown, formatCountdown } from '../../../utils/useCountdown';
import PanelShell from './PanelShell';

// =============================================================================
// Repair Panel (in-game) - moved from the standalone /repair page into an
// overlay reachable from damaged defensive structures or the City interface,
// so the player never leaves the game scene. Built entirely on the unchanged
// api/repair.js (getRepairOverview, repairOne, repairAll, cancelRepair) - no
// backend/API changes, same data, same actions.
// =============================================================================

function hpPercent(structure) {
  const max = Number(structure.max_hp) || 0;
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(structure.hp) || 0) / max * 100)));
}

function DamagedStructureCard({ structure, onRepair, repairing }) {
  const costEntries = RESOURCE_ORDER.filter((key) => Number(structure.estimated_repair_cost?.[key]) > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-1 items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded-lg bg-alert/10 p-2.5 text-alert">
          <Hammer size={18} />
        </span>
        <div className="flex-1">
          <p className="font-display text-sm font-bold text-bone">
            {STRUCTURE_TYPE_LABELS[structure.type] || structure.type}
          </p>
          <p className="mt-0.5 text-xs text-bone/50">
            {REPAIR_STATE_LABELS[structure.repair_state] || structure.repair_state} · {structure.hp.toLocaleString('ar-EG')} / {structure.max_hp.toLocaleString('ar-EG')}
          </p>
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-ink-700">
            <div className="h-full rounded-full bg-alert" style={{ width: `${hpPercent(structure)}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-bone/60">
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-gold" />
              {formatCountdown(structure.estimated_repair_seconds)}
            </span>
            {costEntries.length > 0 && (
              <span className="flex items-center gap-2">
                {costEntries.map((key) => (
                  <span key={key} style={{ color: RESOURCE_META[key].color }}>
                    {Math.ceil(structure.estimated_repair_cost[key]).toLocaleString('ar-EG')} {RESOURCE_META[key].label}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onRepair}
        disabled={repairing}
        className="focus-ring btn-gradient-teal flex shrink-0 items-center gap-1.5 self-end rounded-lg px-3.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
      >
        <Wrench size={13} />
        {repairing ? 'جاري الإصلاح...' : 'إصلاح'}
      </button>
    </motion.div>
  );
}

function ActiveRepairCard({ structure, onCancel, cancelling }) {
  const remaining = useCountdown(structure.remaining_repair_seconds);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-1 items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded-lg bg-gold/10 p-2.5 text-gold">
          <Wrench size={18} />
        </span>
        <div className="flex-1">
          <p className="font-display text-sm font-bold text-bone">
            {STRUCTURE_TYPE_LABELS[structure.type] || structure.type}
          </p>
          <p className="mt-0.5 text-xs text-bone/50">
            {structure.hp.toLocaleString('ar-EG')} / {structure.max_hp.toLocaleString('ar-EG')}
          </p>
          <div className="mt-2 flex items-center gap-1 text-xs text-bone/60">
            <Clock size={12} className="text-gold" />
            {formatCountdown(remaining)} متبقية
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onCancel}
        disabled={cancelling}
        className="focus-ring flex shrink-0 items-center gap-1.5 self-end rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-bone/60 hover:border-alert hover:text-alert disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
      >
        <X size={13} />
        إلغاء
      </button>
    </motion.div>
  );
}

function RepairPanelContent() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [repairingId, setRepairingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [repairingAll, setRepairingAll] = useState(false);

  function load() {
    setLoading(true);
    setErr(null);
    getRepairOverview()
      .then(setOverview)
      .catch(() => setErr('تعذر تحميل حالة الإصلاح الآن'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRepairOne(structureId) {
    setRepairingId(structureId);
    try {
      await repairOne(structureId);
      toastSuccess('بدأ إصلاح القطعة');
      load();
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر بدء الإصلاح');
    } finally {
      setRepairingId(null);
    }
  }

  async function handleRepairAll() {
    setRepairingAll(true);
    try {
      const result = await repairAll();
      if (result.repaired_count > 0) {
        toastSuccess(`بدأ إصلاح ${result.repaired_count} قطعة`);
      } else {
        toastError('مفيش قطع متضررة تحتاج إصلاح دلوقتي');
      }
      load();
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر إصلاح كل القطع');
    } finally {
      setRepairingAll(false);
    }
  }

  async function handleCancel(repairId) {
    setCancellingId(repairId);
    try {
      await cancelRepair(repairId);
      toastSuccess('اتلغى الإصلاح');
      load();
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر إلغاء الإصلاح');
    } finally {
      setCancellingId(null);
    }
  }

  const damaged = overview?.damaged_structures || [];
  const active = overview?.active_repairs || [];
  const speedBonusPercent = Math.round((overview?.speed_bonus?.total_percent || 0) * 100) / 100;

  return (
    <div className="p-4">
      {err && <ErrorState message={err} onRetry={load} />}

      {loading && <CoinSpinner label="جاري تحميل حالة الإصلاح..." />}

      {!loading && !err && overview && (
        <>
          {speedBonusPercent > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-teal/20 bg-teal/5 px-4 py-2.5 text-sm text-teal">
              <TrendingUp size={16} />
              بونص سرعة الإصلاح: +{speedBonusPercent}%
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-bone">
              <Hammer className="text-alert" size={18} />
              المباني المتضررة ({damaged.length})
            </h2>
            <button
              type="button"
              onClick={handleRepairAll}
              disabled={repairingAll || damaged.length === 0}
              className="focus-ring btn-gradient-teal flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Wrench size={13} />
              {repairingAll ? 'جاري الإصلاح...' : 'إصلاح الكل'}
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {damaged.length === 0 && (
              <EmptyState
                icon={Hammer}
                title="مفيش مباني متضررة دلوقتي"
                subtitle="أي ضرر يحصل لدفاعاتك في معركة هيظهر هنا"
              />
            )}

            {damaged.map((structure) => (
              <DamagedStructureCard
                key={structure.id}
                structure={structure}
                repairing={repairingId === structure.id}
                onRepair={() => handleRepairOne(structure.id)}
              />
            ))}
          </div>

          <h2 className="mt-6 flex items-center gap-2 font-display text-sm font-bold text-bone">
            <Wrench className="text-gold" size={18} />
            قيد الإصلاح ({active.length})
          </h2>

          <div className="mt-4 flex flex-col gap-3">
            {active.length === 0 && (
              <p className="rounded-lg border border-dashed border-ink-600 py-6 text-center text-xs text-bone/40">
                مفيش إصلاحات شغالة دلوقتي
              </p>
            )}

            {active.map((structure) => (
              <ActiveRepairCard
                key={structure.id}
                structure={structure}
                cancelling={cancellingId === structure.id}
                onCancel={() => handleCancel(structure.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ====== نقطة الدخول - بتتفتح من قطعة دفاعية متضررة (DefenseStructureInfoModal)
// أو من بانل معلومات القلعة، مش من راوت مستقل. ======
export default function RepairPanel({ open, onClose }) {
  return (
    <PanelShell open={open} onClose={onClose} title="الإصلاح" icon={Wrench}>
      <RepairPanelContent />
    </PanelShell>
  );
}
