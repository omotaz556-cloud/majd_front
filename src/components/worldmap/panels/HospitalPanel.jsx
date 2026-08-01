import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, BedDouble, Users, ShieldCheck, Clock, Sparkles, X } from 'lucide-react';
import { getHospitalOverview, healBatch, healAll, cancelHealing } from '../../../api/hospital';
import { RESOURCE_META, RESOURCE_ORDER } from '../../../utils/resourceMeta';
import { toastSuccess, toastError } from '../../ui/toast';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import { CoinSpinner } from '../../ui/Loaders';
import { useCountdown, formatCountdown } from '../../../utils/useCountdown';
import PanelShell from './PanelShell';

// =============================================================================
// Hospital Panel (in-game) - moved from the standalone /hospital page into an
// overlay opened from the City interface (Town Hall / Castle Info panel) so
// the player never leaves the game scene. Built entirely on the unchanged
// api/hospital.js (getHospitalOverview, healBatch, healAll, cancelHealing) -
// no backend/API changes, same data, same actions.
// =============================================================================

function batchLabel(batch) {
  return batch.troop_key || 'جنود متعافون';
}

function HealingBatchCard({ batch, onHeal, onCancel, healing, cancelling }) {
  const remaining = useCountdown(batch.remaining_healing_seconds);
  const isReady = batch.status === 'ready';
  const costEntries = RESOURCE_ORDER.filter((key) => Number(batch.resource_cost_charged?.[key]) > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 shrink-0 rounded-lg p-2.5 ${
            isReady ? 'bg-teal/10 text-teal' : 'bg-gold/10 text-gold'
          }`}
        >
          {isReady ? <ShieldCheck size={18} /> : <HeartPulse size={18} />}
        </span>
        <div>
          <p className="font-display text-sm font-bold text-bone">
            {batchLabel(batch)} × {Number(batch.count || 0).toLocaleString('ar-EG')}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-bone/60">
            <span className="flex items-center gap-1">
              <Clock size={12} className={isReady ? 'text-teal' : 'text-gold'} />
              {isReady ? 'جاهزة للعلاج' : formatCountdown(remaining)}
            </span>
            {costEntries.length > 0 && (
              <span className="flex items-center gap-2">
                {costEntries.map((key) => (
                  <span key={key} style={{ color: RESOURCE_META[key].color }}>
                    -{Math.floor(batch.resource_cost_charged[key]).toLocaleString('ar-EG')} {RESOURCE_META[key].label}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        <button
          type="button"
          onClick={onCancel}
          disabled={cancelling}
          className="focus-ring flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-bone/60 hover:border-alert hover:text-alert disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X size={13} />
          إلغاء
        </button>
        <button
          type="button"
          onClick={onHeal}
          disabled={!isReady || healing}
          className="focus-ring btn-gradient-teal flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HeartPulse size={13} />
          {healing ? 'جاري العلاج...' : 'علاج'}
        </button>
      </div>
    </motion.div>
  );
}

function HospitalPanelContent() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [healingId, setHealingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [healingAll, setHealingAll] = useState(false);

  function load() {
    setLoading(true);
    setErr(null);
    getHospitalOverview()
      .then(setOverview)
      .catch(() => setErr('تعذر تحميل المستشفى الآن'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleHeal(batchId) {
    setHealingId(batchId);
    try {
      const updated = await healBatch(batchId);
      setOverview(updated);
      toastSuccess('اتعالجت الدفعة ورجعت لجيشك');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر العلاج دلوقتي');
    } finally {
      setHealingId(null);
    }
  }

  async function handleHealAll() {
    setHealingAll(true);
    try {
      const result = await healAll();
      setOverview(result);
      if (result.healed_batches > 0) {
        toastSuccess(`اتعالج ${result.troops_recovered.toLocaleString('ar-EG')} جندي في ${result.healed_batches} دفعة`);
      } else {
        toastError('مفيش دفعات جاهزة للعلاج دلوقتي');
      }
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر إتمام العلاج');
    } finally {
      setHealingAll(false);
    }
  }

  async function handleCancel(batchId) {
    setCancellingId(batchId);
    try {
      const updated = await cancelHealing(batchId);
      setOverview(updated);
      toastSuccess('اتلغت دفعة العلاج');
    } catch (e) {
      toastError(e.response?.data?.error || 'تعذر إلغاء دفعة العلاج');
    } finally {
      setCancellingId(null);
    }
  }

  const queue = overview?.healing_queue || [];
  const readyCount = queue.filter((b) => b.status === 'ready').length;

  return (
    <div className="p-4">
      {err && <ErrorState message={err} onRetry={load} />}

      {loading && <CoinSpinner label="جاري تحميل المستشفى..." />}

      {!loading && !err && overview && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatPill icon={BedDouble} label="السعة الكلية" value={overview.capacity} accent="text-gold" />
            <StatPill icon={Users} label="أسرّة مشغولة" value={overview.occupied_beds} accent="text-alert" />
            <StatPill icon={Sparkles} label="أسرّة فاضية" value={overview.free_beds} accent="text-teal" />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-bone">
              <HeartPulse className="text-gold" size={18} />
              الجنود المصابون ({queue.length})
            </h2>
            <button
              type="button"
              onClick={handleHealAll}
              disabled={healingAll || readyCount === 0}
              className="focus-ring btn-gradient-teal flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShieldCheck size={13} />
              {healingAll ? 'جاري العلاج...' : `علاج الكل (${readyCount})`}
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {queue.length === 0 && (
              <EmptyState
                icon={HeartPulse}
                title="مفيش جنود في المستشفى دلوقتي"
                subtitle="أي جنود يتصابوا في معركة هيتحطوا هنا تلقائيًا لحد ما تعالجهم"
              />
            )}

            {queue.map((batch) => (
              <HealingBatchCard
                key={batch.id}
                batch={batch}
                healing={healingId === batch.id}
                cancelling={cancellingId === batch.id}
                onHeal={() => handleHeal(batch.id)}
                onCancel={() => handleCancel(batch.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatPill({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
      <Icon size={16} className={`mx-auto mb-1 ${accent}`} />
      <p className="font-mono text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  );
}

// ====== نقطة الدخول - بتتفتح من بانل معلومات القلعة (زرار "المستشفى")
// جوّه مشهد اللعبة، مش من راوت مستقل. ======
export default function HospitalPanel({ open, onClose }) {
  return (
    <PanelShell open={open} onClose={onClose} title="المستشفى" icon={HeartPulse}>
      <HospitalPanelContent />
    </PanelShell>
  );
}
