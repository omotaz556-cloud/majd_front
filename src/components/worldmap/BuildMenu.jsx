import { motion, AnimatePresence } from 'framer-motion';
import { X, Hammer, Clock, Lock, Loader2 } from 'lucide-react';
import { RESOURCE_META, RESOURCE_ORDER } from '../../utils/resourceMeta';
import { formatDurationLabel } from '../../utils/duration';

// ====== قائمة وضع البناء (Build Menu) ======
// بتعرض كل أنواع المباني "المتاحة" (لسه مبنيتش) جايه بالكامل من
// /castle/building-types (اسم/وصف/تكلفة/مدة/شرط مستوى المبنى الرئيسي كله
// محسوب في الباك إند - castle.controller.js formatBuildingType) من غير أي
// رقم متثبت هنا. اختيار كارت بيدخل المستخدم في وضع "اختيار مكان" على الخريطة
// (هيتم التعامل معه في WorldMapPage عن طريق onSelect).
export default function BuildMenu({ open, buildingTypes, resources, loading, submittingKey, onSelect, onClose }) {
  const available = (buildingTypes || []).filter((t) => !t.already_built);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="build-menu-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-stone-950/70 backdrop-blur-sm sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-stone-950/95 shadow-2xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="وضع البناء"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-white">
                <Hammer size={16} className="text-amber-300" />
                <h3 className="font-bold">اختَر مبنى للبناء</h3>
              </div>
              <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-lg bg-white/5 p-1.5 text-white/60 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {loading && (
                <div className="flex items-center justify-center py-10 text-white/50">
                  <Loader2 className="animate-spin" size={22} />
                </div>
              )}

              {!loading && available.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-white/50">مفيش مباني جديدة متاحة دلوقتي - كل المباني الأساسية اتبنت بالفعل 🎉</p>
              )}

              {!loading &&
                available.map((type) => (
                  <BuildCard
                    key={type.key}
                    type={type}
                    resources={resources}
                    submitting={submittingKey === type.key}
                    disabledOther={Boolean(submittingKey) && submittingKey !== type.key}
                    onSelect={() => onSelect?.(type)}
                  />
                ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BuildCard({ type, resources, submitting, disabledOther, onSelect }) {
  const cost = type.cost || {};
  const missing = resources ? RESOURCE_ORDER.filter((k) => cost[k] > 0 && resources[k].stored < cost[k]) : [];
  const canAfford = missing.length === 0;
  const meetsRequirement = type.within_town_hall_cap;
  const disabled = !canAfford || !meetsRequirement || submitting || disabledOther;

  return (
    <div className="mb-2.5 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-white">{type.name}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/50">{type.description}</p>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        {RESOURCE_ORDER.filter((k) => cost[k] > 0).map((k) => {
          const meta = RESOURCE_META[k];
          const Icon = meta.icon;
          const has = resources && resources[k].stored >= cost[k];
          return (
            <span key={k} className={`flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs ${has ? 'text-white/80' : 'text-red-400'}`}>
              <Icon size={12} style={{ color: meta.color }} />
              {cost[k].toLocaleString('ar-EG')}
            </span>
          );
        })}
        <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-white/60">
          <Clock size={12} />
          {formatDurationLabel(type.build_seconds)}
        </span>
      </div>

      {!meetsRequirement && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-red-400">
          <Lock size={12} />
          لازم تطور المبنى الرئيسي الأول قبل ما تقدر تبني ده
        </p>
      )}
      {meetsRequirement && !canAfford && <p className="mb-2 text-xs text-red-400">الموارد مش كفاية لبناء ده لسه</p>}

      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-amber-400 to-amber-600 py-2 text-sm font-bold text-stone-900 shadow transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Hammer size={14} />}
        {submitting ? 'جاري الاختيار...' : 'اختَر مكان البناء'}
      </button>
    </div>
  );
}
