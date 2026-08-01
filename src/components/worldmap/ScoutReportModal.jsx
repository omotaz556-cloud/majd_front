import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Loader2, Shield, Swords, ShieldCheck, ShieldAlert, Crown, Star } from 'lucide-react';
import { RESOURCE_META, RESOURCE_ORDER } from '../../utils/resourceMeta';
import { formatCompactNumber } from '../../utils/format';

// ====== بانل تقرير الاستكشاف (Scout Report) - بيبان فورًا بعد ما اللاعب
// يضغط "استكشاف" وهو داخل مملكة تانية. بيعرض موارد الهدف الحالية، جيشه
// الواقف، وقوة دفاعه الكلية مقابل قوة هجومك الحالية - نفس المعادلة اللي
// بتتحسب فعليًا وقت الهجوم الحقيقي (resolveAttackArrival في الباك إند) عشان
// التقرير يبقى مفيد فعلاً قبل ما تقرر تهاجم. ======
export default function ScoutReportModal({ open, loading, report, targetName, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scout-report-backdrop"
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
            aria-label="تقرير استكشاف"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute left-3 top-3 z-10 rounded-lg bg-black/40 p-1.5 text-white/60 hover:text-white"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center gap-2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,.16)_0%,transparent_70%)] px-6 pb-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
                <Eye size={22} />
              </div>
              <p className="text-center text-sm font-bold text-white/90">تقرير استكشاف</p>
              <p className="truncate text-center text-xs text-white/50">{targetName || 'هدف'}</p>
              {/* ====== NEW: درجة صعوبة النطاق + اسم القائد الدفاعي - جايين
                  دلوقتي من report.npc_tier/report.commander_name (شوف
                  castle.service.scoutCastle). null للاعبين الحقيقيين. ====== */}
              {!loading && report && (report.npc_tier || report.npc_faction || report.commander_name) && (
                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold">
                  {report.npc_tier && (
                    <span className="flex items-center gap-1 text-amber-300">
                      <Star size={11} /> {report.npc_tier.name_ar} ({report.npc_tier.difficulty_rank}/
                      {report.npc_tier.difficulty_out_of})
                    </span>
                  )}
                  {/* ====== NEW (NPC Faction System) - اسم مملكة/فصيل الـ NPC
                      - جاي من report.npc_faction (شوف castle.service.scoutCastle). ====== */}
                  {report.npc_faction && (
                    <span className="flex items-center gap-1 text-fuchsia-300">
                      <Shield size={11} /> {report.npc_faction.name_ar}
                    </span>
                  )}
                  {report.commander_name && (
                    <span className="flex items-center gap-1 text-rose-300">
                      <Crown size={11} /> {report.commander_name}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 pb-5">
              {loading || !report ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-white/60">
                  <Loader2 size={16} className="animate-spin text-sky-400" />
                  جاري جمع المعلومات...
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* ====== الموارد ====== */}
                  <div>
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">الموارد المخزّنة</p>
                    <div className="grid grid-cols-3 gap-2">
                      {RESOURCE_ORDER.map((key) => {
                        const meta = RESOURCE_META[key];
                        const Icon = meta.icon;
                        return (
                          <div
                            key={key}
                            className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-2"
                          >
                            <Icon size={16} style={{ color: meta.color }} />
                            <span className="text-xs font-bold text-white">
                              {formatCompactNumber(report.resources?.[key] || 0)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ====== الجيش الواقف ====== */}
                  <div>
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">الجيش الواقف</p>
                    {report.army?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {report.army.map((stack) => (
                          <span
                            key={stack.key}
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/80"
                          >
                            {stack.name} × {stack.count.toLocaleString('ar-EG')}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/40">مفيش جيش واقف ظاهر</p>
                    )}
                  </div>

                  {/* ====== المقارنة: قوة الدفاع مقابل قوة هجومك ====== */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col items-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-2 py-2.5">
                      <Shield size={16} className="text-red-300" />
                      <span className="text-[10px] text-white/50">قوة الدفاع</span>
                      <span className="text-sm font-bold text-red-300">{report.defense_power}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 rounded-xl border border-amber-400/20 bg-amber-400/10 px-2 py-2.5">
                      <Swords size={16} className="text-amber-300" />
                      <span className="text-[10px] text-white/50">قوة هجومك</span>
                      <span className="text-sm font-bold text-amber-300">{report.attacker_power}</span>
                    </div>
                  </div>

                  <div
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
                      report.would_win ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
                    }`}
                  >
                    {report.would_win ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                    {report.would_win ? 'جيشك الحالي أقوى من دفاعه' : 'دفاعه أقوى من جيشك الحالي'}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
