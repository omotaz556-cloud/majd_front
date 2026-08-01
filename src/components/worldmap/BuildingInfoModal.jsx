import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hammer, Clock, TrendingUp, Archive, Landmark, Lock, Loader2, Move, Gem } from 'lucide-react';
import { BuildingSprite } from './buildingArt';
import TrainingPanel from './TrainingPanel';
import { RESOURCE_META, RESOURCE_ORDER } from '../../utils/resourceMeta';
import { formatDuration, formatDurationLabel } from '../../utils/duration';
// ====== Rewarded Ads Gameplay (Speed Up Construction) - نفس الزرار الموحّد
// المستخدم في كل اللعبة لأي إعلان مكافئ (راجع BattleOutcomeModal/
// ReportsMailPanel/ShopPanel) - هنا بيبقى kind='speedup_construction'. ======
import AdvertisementButton from '../../ads/components/AdvertisementButton';

// ====== بانل معلومات المبنى (Popup) - خريطة العالم ======
// مكوّن قابل لإعادة الاستخدام لأي مبنى على الخريطة - كل البيانات (الاسم،
// الوصف، الإنتاج، سعة التخزين، تكلفة ومدة الترقية) جايه جاهزة من الباك إند
// (castle/me API) من غير أي رقم متثبت هنا. زرار الترقية بينادي فعليًا على
// /castle/buildings/:key/upgrade (من WorldMapPage) وبيوريه حالة تحميل لحد
// ما الرد يوصل. لما المبنى المختار يكون الثكنة (category: 'military')،
// بيتعرض كمان بانل تدريب الوحدات (TrainingPanel) تحت قسم الترقية العادي.
export default function BuildingInfoModal({
  open,
  building,
  resources,
  now,
  anotherUpgradeInProgress,
  submitting,
  speedupSubmitting,
  onClose,
  onRequestUpgrade,
  onRequestSpeedup,
  onSpeedupConstructionAdCredited,
  onRequestMove,
  army,
  trainingQueue,
  troopTypes,
  troopTypesLoading,
  trainSubmittingKey,
  cancelSubmittingId,
  speedupTrainingSubmittingId,
  onTrain,
  onTrainPremium,
  onCancelTraining,
  onSpeedupTraining,
  readOnly = false,
}) {
  // إغلاق بزرار Escape - سهولة استخدام إضافية زي أي بوب أب احترافي
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
      {open && building && (
        <motion.div
          key="building-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 px-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            // قفل خارج البانل (على الخلفية) يقفل البوب أب - بس لو الضغطة
            // بدأت وخلصت على الخلفية نفسها (مش سحب من جوه البانل لبرا)
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
            aria-label={building.name}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute left-3 top-3 z-10 rounded-lg bg-black/40 p-1.5 text-white/60 hover:text-white"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>

            {/* ====== هيدر: رسمة المبنى + الاسم + المستوى ====== */}
            <div className="flex flex-col items-center bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,197,66,.16)_0%,transparent_70%)] pb-2 pt-6">
              <div className="pointer-events-none relative -mb-3 scale-[0.62]">
                <BuildingSprite type={building.key} level={Math.max(1, building.level)} selected width={150} height={210} />
                {building.upgrade && (
                  <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                    <Hammer size={14} />
                  </span>
                )}
              </div>
              <h3 className="font-bold text-white">{building.name}</h3>
              <span className="mt-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 font-mono text-xs text-amber-300">
                {building.level === 0 ? 'قيد الإنشاء' : `المستوى ${building.level}`}
              </span>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-5 pb-5">
              {building.description && (
                <p className="mb-4 text-center text-xs leading-relaxed text-white/60">{building.description}</p>
              )}

              {/* ====== الإنتاج الحالي ====== */}
              {building.production && (
                <InfoRow
                  icon={TrendingUp}
                  label="الإنتاج الحالي"
                  value={`+${building.production.current_per_hour.toLocaleString('ar-EG')} / ساعة`}
                  next={
                    building.production.next_per_hour != null
                      ? `+${building.production.next_per_hour.toLocaleString('ar-EG')} / ساعة بعد الترقية`
                      : null
                  }
                />
              )}

              {/* ====== سعة التخزين الحالية ====== */}
              {building.storage && (
                <InfoRow
                  icon={Archive}
                  label="سعة التخزين"
                  value={building.storage.current_capacity.toLocaleString('ar-EG')}
                  next={
                    building.storage.next_capacity != null
                      ? `${building.storage.next_capacity.toLocaleString('ar-EG')} بعد الترقية`
                      : null
                  }
                />
              )}

              {building.category === 'headquarters' && (
                <InfoRow icon={Landmark} label="أقصى مستوى لباقي المباني" value={`مستوى ${building.level + 2}`} />
              )}

              {/* ====== بانل تدريب الوحدات - يظهر بس لما المبنى المختار
                  يكون الثكنة، وبيتعرض حتى لو المبنى قيد الترقية (تقدر
                  تدرب وحدات وانت في نفس الوقت بترقي الثكنة نفسها). ====== */}
              {building.category === 'military' && building.level > 0 && !readOnly && (
                <TrainingPanel
                  troopTypes={troopTypes}
                  troopTypesLoading={troopTypesLoading}
                  army={army}
                  trainingQueue={trainingQueue}
                  maxQueueSize={building.barracks?.max_queue_size}
                  resources={resources}
                  now={now}
                  submittingKey={trainSubmittingKey}
                  cancelSubmittingId={cancelSubmittingId}
                  speedupSubmittingId={speedupTrainingSubmittingId}
                  onTrain={onTrain}
                  onTrainPremium={onTrainPremium}
                  onCancel={onCancelTraining}
                  onSpeedup={onSpeedupTraining}
                />
              )}

              {/* ====== حالة الترقية/الإنشاء الحالية (لو شغالة فعلاً) ====== */}
              {building.upgrade && (
                <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
                  <div className="flex items-center gap-2">
                    <Clock size={15} />
                    {building.level === 0
                      ? 'قيد الإنشاء'
                      : `جاري الترقية لمستوى ${building.upgrade.target_level}`}{' '}
                    - باقي {formatDuration(new Date(building.upgrade.completes_at).getTime() - (now ?? Date.now()))}
                  </div>

                  {/* ====== تسريع فوري بالجواهر - مش متاح في وضع العرض بس
                      (زيارة قلعة تانية). التكلفة جاهزة من الباك إند
                      (speedup_gem_cost) وبتتغيّر تلقائيًا كل ما الوقت المتبقي
                      يقل. ====== */}
                  {!readOnly && onRequestSpeedup && (
                    <button
                      type="button"
                      onClick={() => onRequestSpeedup(building)}
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
                        : `سرّع فورًا بـ ${building.upgrade.speedup_gem_cost?.toLocaleString('ar-EG')} جوهرة`}
                    </button>
                  )}

                  {/* ====== Rewarded Ads Gameplay (Speed Up Construction) -
                      زرار "سرّع بإعلان" منفصل عن التسريع الفوري بالجواهر فوق:
                      ده بس بيقتطع جزء من الوقت (مش يخلّص الترقية فورًا زي
                      الجواهر)، مرة واحدة بس لكل ترقية. مش متاح في وضع العرض،
                      ومش بيظهر أصلًا غير لو ad_speedup_eligible=true (جايه
                      جاهزة من الباك إند - مفيش أي شرط حد أدنى بيتكرر هنا). ====== */}
                  {!readOnly && onSpeedupConstructionAdCredited && building.upgrade.ad_speedup_eligible && (
                    <div className="mt-2.5">
                      <AdvertisementButton
                        kind="speedup_construction"
                        context={{ buildingId: building.id }}
                        label="شاهد إعلان → سرّع البناء"
                        successLabel="تم تسريع البناء"
                        onRewardCredited={() => onSpeedupConstructionAdCredited()}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ====== تفاصيل الترقية الجاية (لو مفيش ترقية شغالة والمبنى لسه مش أقصى مستوى) - مش متاحة في وضع العرض بس (زيارة قلعة تانية) ====== */}
              {!readOnly && !building.upgrade && building.next_upgrade && (
                <UpgradeSection
                  building={building}
                  resources={resources}
                  anotherUpgradeInProgress={anotherUpgradeInProgress}
                  submitting={submitting}
                  onRequestUpgrade={onRequestUpgrade}
                />
              )}

              {!readOnly && !building.upgrade && !building.next_upgrade && building.is_max_level && (
                <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-center text-sm text-white/50">
                  وصل لأقصى مستوى ممكن 🎉
                </p>
              )}

              {/* ====== نقل المبنى لمكان تاني فاضي على شبكة القلعة - مش متاح
                  في وضع العرض بس (زيارة قلعة تانية)، والمبنى الرئيسي
                  (town_hall) مينفعش يتنقل أصلًا، وكمان مينفعش وهو لسه قيد
                  الإنشاء أو في ترقية شغالة عليه/على مبنى تاني. ====== */}
              {!readOnly && building.category !== 'headquarters' && !building.upgrade && (
                <button
                  type="button"
                  onClick={() => onRequestMove?.(building)}
                  disabled={Boolean(anotherUpgradeInProgress)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 py-2.5 text-sm font-bold text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Move size={14} />
                  نقل المبنى
                </button>
              )}

              {readOnly && (
                <p className="mt-1 text-center text-[11px] text-white/30">وضع عرض بس - مش قلعتك</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InfoRow({ icon: Icon, label, value, next }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs text-white/50">
        <Icon size={14} />
        {label}
      </div>
      <div className="text-left">
        <p className="text-sm font-bold text-white">{value}</p>
        {next && <p className="text-[11px] text-emerald-300">{next}</p>}
      </div>
    </div>
  );
}

function UpgradeSection({ building, resources, anotherUpgradeInProgress, submitting, onRequestUpgrade }) {
  const { next_upgrade: nextUpgrade } = building;
  const cost = nextUpgrade.cost;

  const missingResources = RESOURCE_ORDER.filter((key) => cost[key] > 0 && resources[key].stored < cost[key]);
  const withinCap = nextUpgrade.within_town_hall_cap;
  const canAfford = missingResources.length === 0;
  const disabled = !canAfford || !withinCap || Boolean(anotherUpgradeInProgress) || Boolean(submitting);

  return (
    <div>
      <p className="mb-2 text-xs text-white/50">ترقية لمستوى {nextUpgrade.target_level} تحتاج:</p>
      <ul className="mb-3 space-y-1.5">
        {RESOURCE_ORDER.filter((key) => cost[key] > 0).map((key) => {
          const meta = RESOURCE_META[key];
          const Icon = meta.icon;
          const has = resources[key].stored >= cost[key];
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

      {!withinCap && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-red-400">
          <Lock size={13} />
          لازم تطور المبنى الرئيسي الأول قبل ما تكمل هنا
        </p>
      )}
      {withinCap && !canAfford && <p className="mb-3 text-xs text-red-400">الموارد مش كفاية للترقية دي لسه</p>}
      {withinCap && canAfford && anotherUpgradeInProgress && (
        <p className="mb-3 text-xs text-white/50">في ترقية شغالة بالفعل في القلعة - استنى لحد ما تخلص</p>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onRequestUpgrade?.(building)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-amber-400 to-amber-600 py-2.5 text-sm font-bold text-stone-900 shadow transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Hammer size={14} />}
        {submitting ? 'جاري البدء...' : `ترقية لمستوى ${nextUpgrade.target_level}`}
      </button>
    </div>
  );
}
