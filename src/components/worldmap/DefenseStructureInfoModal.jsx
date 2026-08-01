import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hammer, Clock, Shield, Lock, Loader2, Move, Trash2, Wrench, Gem } from 'lucide-react';
import { DefenseStructureSprite } from './defenseBuildingArt';
import { RESOURCE_META, RESOURCE_ORDER } from '../../utils/resourceMeta';
import { formatDuration, formatDurationLabel } from '../../utils/duration';

// ====== بانل معلومات القطعة الدفاعية (Popup) - خريطة العالم ======
// نفس فلسفة BuildingInfoModal بالظبط بس لقطعة دفاعية (سور/بوابة/برج/فخ/
// متراس) بدل مبنى قلعة عادي - كل البيانات (الاسم، الوصف، تكلفة/مدة الترقية
// الجاية) جايه جاهزة من الباك إند (defense.controller formatStructure) من
// غير أي رقم متثبت هنا، بالظبط زي next_upgrade بتاع المباني العادية. ======
export default function DefenseStructureInfoModal({
  open,
  structure,
  resources,
  now,
  submitting,
  removing,
  speedupSubmitting,
  onClose,
  onRequestUpgrade,
  onRequestSpeedup,
  onRequestMove,
  onRequestRemove,
  onRequestRepair,
}) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && structure && (
        <motion.div
          key="defense-structure-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 px-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-stone-950/95 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={structure.name}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute left-3 top-3 z-10 rounded-lg bg-black/40 p-1.5 text-white/60 hover:text-white"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>

            {/* ====== هيدر: رسمة القطعة + الاسم + المستوى ====== */}
            <div className="flex flex-col items-center bg-[radial-gradient(ellipse_at_50%_0%,rgba(96,165,250,.16)_0%,transparent_70%)] pb-2 pt-6">
              <div className="pointer-events-none relative -mb-3 scale-[0.62]">
                <DefenseStructureSprite
                  type={structure.type}
                  level={Math.max(1, structure.level)}
                  destroyed={structure.repair?.state === 'destroyed' || structure.gate_state?.destroyed}
                  open={structure.gate_state?.open}
                  selected
                  width={150}
                  height={210}
                />
                {(structure.build?.state === 'building' || structure.upgrade) && (
                  <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                    <Hammer size={14} />
                  </span>
                )}
              </div>
              <h3 className="font-bold text-white">{structure.name}</h3>
              <span className="mt-1 rounded-full border border-sky-400/40 bg-sky-400/10 px-2.5 py-0.5 font-mono text-xs text-sky-300">
                {structure.build?.state === 'building' ? 'قيد الإنشاء' : `المستوى ${structure.level}`}
              </span>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-5 pb-5">
              {structure.description && (
                <p className="mb-4 text-center text-xs leading-relaxed text-white/60">{structure.description}</p>
              )}

              {/* ====== الصحة الحالية ====== */}
              <div className="mb-4 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Shield size={14} />
                  الصحة
                </div>
                <p className="text-sm font-bold text-white">
                  {structure.hp?.toLocaleString('ar-EG')} / {structure.max_hp?.toLocaleString('ar-EG')}
                </p>
              </div>

              {/* ====== إصلاح - بتظهر بس لو القطعة متضررة فعلاً (hp أقل من
                  max_hp)، وبتفتح بانل الإصلاح جوّه مشهد اللعبة بدل صفحة
                  مستقلة (Repair: open from damaged buildings). ====== */}
              {onRequestRepair && Number(structure.hp) < Number(structure.max_hp) && (
                <button
                  type="button"
                  onClick={() => onRequestRepair(structure)}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-teal-500/25 bg-teal-500/10 py-2.5 text-sm font-bold text-teal-300 transition-colors hover:bg-teal-500/15"
                >
                  <Wrench size={14} />
                  إصلاح القطعة
                </button>
              )}

              {/* ====== حالة البناء/الترقية الحالية (لو شغالة فعلاً) ====== */}
              {(structure.build?.state === 'building' || structure.upgrade) && (
                <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
                  <div className="flex items-center gap-2">
                    <Clock size={15} />
                    {structure.build?.state === 'building'
                      ? 'قيد الإنشاء'
                      : `جاري الترقية لمستوى ${structure.upgrade.target_level}`}{' '}
                    - باقي{' '}
                    {formatDuration(
                      new Date((structure.build?.state === 'building' ? structure.build.completes_at : structure.upgrade.completes_at)).getTime() -
                        (now ?? Date.now())
                    )}
                  </div>

                  {/* ====== تسريع فوري بالجواهر - متاح بس وهي في ترقية شغالة
                      (مش بناء أول مرة). التكلفة جاهزة من الباك إند
                      (speedup_gem_cost) وبتتغيّر تلقائيًا كل ما الوقت المتبقي
                      يقل - نفس نمط BuildingInfoModal بالظبط. ====== */}
                  {structure.upgrade && onRequestSpeedup && (
                    <button
                      type="button"
                      onClick={() => onRequestSpeedup(structure)}
                      disabled={Boolean(speedupSubmitting)}
                      className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-fuchsia-400 to-fuchsia-600 py-2 text-xs font-bold text-white shadow transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {speedupSubmitting ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Gem size={13} />
                      )}
                      {speedupSubmitting
                        ? 'جاري التسريع...'
                        : `سرّع فورًا بـ ${structure.upgrade.speedup_gem_cost?.toLocaleString('ar-EG')} جوهرة`}
                    </button>
                  )}
                </div>
              )}

              {/* ====== تفاصيل الترقية الجاية (لو مفيش بناء/ترقية شغالة والقطعة لسه مش أقصى مستوى) ====== */}
              {structure.build?.state !== 'building' && !structure.upgrade && structure.next_upgrade && (
                <UpgradeSection
                  structure={structure}
                  resources={resources}
                  submitting={submitting}
                  onRequestUpgrade={onRequestUpgrade}
                />
              )}

              {structure.build?.state !== 'building' && !structure.upgrade && !structure.next_upgrade && structure.is_max_level && (
                <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-center text-sm text-white/50">
                  وصلت لأقصى مستوى ممكن 🎉
                </p>
              )}

              {/* ====== نقل القطعة لمكان تاني فاضي - مش متاح وهي لسه قيد
                  الإنشاء أو في ترقية شغالة عليها. ====== */}
              {structure.build?.state !== 'building' && !structure.upgrade && (
                <button
                  type="button"
                  onClick={() => onRequestMove?.(structure)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 py-2.5 text-sm font-bold text-white/80 transition-colors hover:bg-white/10"
                >
                  <Move size={14} />
                  نقل القطعة
                </button>
              )}

              {/* ====== حذف القطعة - نفس شرط النقل (مش وهي بتترقى) ====== */}
              {!structure.upgrade && (
                <button
                  type="button"
                  onClick={() => onRequestRemove?.(structure)}
                  disabled={Boolean(removing)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 py-2.5 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {removing ? 'جاري الحذف...' : 'حذف القطعة'}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function UpgradeSection({ structure, resources, submitting, onRequestUpgrade }) {
  const { next_upgrade: nextUpgrade } = structure;
  const cost = nextUpgrade.cost;

  const missingResources = resources
    ? RESOURCE_ORDER.filter((key) => cost[key] > 0 && resources[key].stored < cost[key])
    : [];
  const canAfford = missingResources.length === 0;
  const disabled = !canAfford || Boolean(submitting);

  return (
    <div>
      <p className="mb-2 text-xs text-white/50">ترقية لمستوى {nextUpgrade.target_level} تحتاج:</p>
      <ul className="mb-3 space-y-1.5">
        {RESOURCE_ORDER.filter((key) => cost[key] > 0).map((key) => {
          const meta = RESOURCE_META[key];
          const Icon = meta.icon;
          const has = resources && resources[key].stored >= cost[key];
          return (
            <li key={key} className={`flex items-center justify-between text-sm ${has ? 'text-white/70' : 'text-red-400'}`}>
              <span className="flex items-center gap-1.5">
                <Icon size={13} style={{ color: meta.color }} />
                {meta.label}
              </span>
              <span className="font-mono">{cost[key].toLocaleString('ar-EG')}</span>
            </li>
          );
        })}
      </ul>

      <div className="mb-4 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50">
        <span className="flex items-center gap-1.5">
          <Clock size={13} />
          مدة الترقية
        </span>
        <span className="font-mono text-white/80">{formatDurationLabel(nextUpgrade.duration_seconds)}</span>
      </div>

      {!canAfford && <p className="mb-3 text-xs text-red-400">الموارد مش كفاية للترقية دي لسه</p>}
      {structure.repair?.state === 'destroyed' && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-red-400">
          <Lock size={13} />
          القطعة دي متدمرة - لازم تتصلح الأول
        </p>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onRequestUpgrade?.(structure)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-sky-400 to-sky-600 py-2.5 text-sm font-bold text-stone-900 shadow transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Hammer size={14} />}
        {submitting ? 'جاري البدء...' : `ترقية لمستوى ${nextUpgrade.target_level}`}
      </button>
    </div>
  );
}