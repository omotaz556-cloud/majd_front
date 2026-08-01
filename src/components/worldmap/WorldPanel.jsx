import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Swords, Castle, Tent, MapPin, Undo2, Trophy, Skull, Shield } from 'lucide-react';
import { formatDuration } from '../../utils/duration';

// ====== بانل "العالم" - قايمتين: القلاع القريبة (تصفّح + هجوم) والمسايرات
// الحالية (متابعة جيوشك الماشية/الراجعة) - كل البيانات جايه من الباك إند
// (castle/nearby + castle/army/marches) من غير أي حساب هجوم/مسافة هنا.
// اختيار "هجوم" على أي قلعة من هنا بيفتح AttackDialog مباشرة (شوف
// onSelectCastle) - مفيش فورم إرسال جيش inline جوه البانل ده نفسه، عشان
// الهجوم بكامل تفاصيله (جيش/خطة معركة/تشكيل/تقدير) بقى حاجة واحدة متكاملة
// في مكان واحد بس. ======
export default function WorldPanel({
  open,
  onClose,
  tab,
  onSelectTab,
  nearbyCastles,
  nearbyLoading,
  marches,
  marchesLoading,
  now,
  recallingId,
  onRecallMarch,
  onWatchBattle,
  battleIdsByMarchId,
  onSelectCastle,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="world-panel-backdrop"
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
            aria-label="العالم"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-white">
                <Swords size={16} className="text-amber-300" />
                <h3 className="font-bold">العالم</h3>
              </div>
              <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-lg bg-white/5 p-1.5 text-white/60 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* ====== تبديل بين القلاع القريبة والمسايرات الحالية ====== */}
            <div className="flex gap-2 border-b border-white/10 px-3 py-2">
              <TabButton label="القلاع القريبة" active={tab === 'nearby'} onClick={() => onSelectTab('nearby')} />
              <TabButton
                label="مسايراتي"
                // ====== Phase 1 (Reinforcement & Battle System): بادچ "مسايراتي"
                // لازم يعد مسايرات 'battling' كمان مش 'traveling' بس - وإلا
                // العدّاد هيرجع صفر طول ما معركة شغالة (ممكن تفضل ساعات/أيام)
                // مع إن جيشك لسه فعليًا "مشغول" في حاجة محتاجة متابعة. ======
                badge={marches?.filter((m) => m.status === 'traveling' || m.status === 'battling').length || 0}
                active={tab === 'marches'}
                onClick={() => onSelectTab('marches')}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {tab === 'nearby' && <NearbyList loading={nearbyLoading} castles={nearbyCastles} onSelectCastle={onSelectCastle} />}

              {tab === 'marches' && (
                <MarchesList
                  loading={marchesLoading}
                  marches={marches}
                  now={now}
                  recallingId={recallingId}
                  onRecallMarch={onRecallMarch}
                  onWatchBattle={onWatchBattle}
                  battleIdsByMarchId={battleIdsByMarchId}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TabButton({ label, badge, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
        active ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-white/60 hover:text-white'
      }`}
    >
      {label}
      {Boolean(badge) && (
        <span className="ms-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] text-white">{badge}</span>
      )}
    </button>
  );
}

function NearbyList({ loading, castles, onSelectCastle }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-white/50">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  if (!castles || castles.length === 0) {
    return <p className="px-2 py-8 text-center text-sm text-white/50">مفيش قلاع قريبة ظاهرة لسه - افتح الخريطة تاني كمان شوية.</p>;
  }

  return (
    <div className="space-y-2.5">
      {castles.map((c) => (
        <div
          key={c.id}
          role={onSelectCastle ? 'button' : undefined}
          tabIndex={onSelectCastle ? 0 : undefined}
          onClick={() => onSelectCastle?.(c)}
          onKeyDown={(e) => {
            if (onSelectCastle && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onSelectCastle(c);
            }
          }}
          className={`rounded-xl border border-white/10 bg-white/5 p-3 transition-colors ${
            onSelectCastle ? 'cursor-pointer hover:border-amber-400/40 hover:bg-white/[0.07]' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  c.is_npc ? 'bg-red-500/20 text-red-300' : 'bg-sky-500/20 text-sky-300'
                }`}
              >
                {c.is_npc ? <Tent size={16} /> : <Castle size={16} />}
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-bold text-white">
                  {c.is_npc ? c.name : 'قلعة لاعب'}
                  {c.alliance_tag && (
                    <span
                      className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        c.is_same_alliance ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/60'
                      }`}
                    >
                      <Shield size={9} /> {c.alliance_tag}
                    </span>
                  )}
                </p>
                <p className="flex items-center gap-2 text-[11px] text-white/50">
                  <span>مبنى رئيسي {c.town_hall_level}</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin size={10} /> {c.distance_slots} خانة
                  </span>
                </p>
              </div>
            </div>
            {c.is_same_alliance ? (
              <span className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">حليف</span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCastle?.(c);
                }}
                className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30"
              >
                <Swords size={12} /> هجوم
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MarchesList({ loading, marches, now, recallingId, onRecallMarch, onWatchBattle, battleIdsByMarchId }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-white/50">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  if (!marches || marches.length === 0) {
    return <p className="px-2 py-8 text-center text-sm text-white/50">لسه مبعتش أي جيش - اختَر قلعة من "القلاع القريبة" وابعت غارة.</p>;
  }

  return (
    <div className="space-y-2.5">
      {marches.map((m) => (
        <MarchRow
          key={m.id}
          march={m}
          now={now}
          recalling={recallingId === m.id}
          onRecall={() => onRecallMarch(m.id)}
          battleId={battleIdsByMarchId?.get(m.id) || null}
          onWatchBattle={onWatchBattle}
        />
      ))}
    </div>
  );
}

function MarchRow({ march, now, recalling, onRecall, battleId, onWatchBattle }) {
  const traveling = march.status === 'traveling';
  // ====== Phase 1 (Reinforcement & Battle System) - Requirement 6/8/9:
  // المعركة مبقتش بتتحسم لحظة الوصول - المسير بيدخل حالة 'battling' لمدة
  // حقيقية (ممكن تطول لساعات أو أيام لمعارك كبيرة) قبل ما march.report
  // يتحسب. ======
  const battling = march.status === 'battling';
  const remainingMs = new Date(march.arrives_at).getTime() - (now ?? Date.now());
  const battleRemainingMs = march.battle_ends_at ? new Date(march.battle_ends_at).getTime() - (now ?? Date.now()) : 0;
  const troopsLabel = march.troops.map((t) => `${t.count.toLocaleString('ar-EG')}× ${t.name}`).join('، ');

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-white">
          {march.direction === 'attack' ? <Swords size={13} className="text-red-400" /> : <Undo2 size={13} className="text-emerald-400" />}
          {march.direction === 'attack' ? `غارة على ${march.target_is_npc ? march.target_name : 'قلعة لاعب'}` : 'جيش راجع لقلعتك'}
        </span>
        {traveling && <span className="font-mono text-xs text-white/60">{formatDuration(remainingMs)}</span>}
      </div>

      {battling && (
        <div className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300">
          <Swords size={12} className="animate-pulse" />
          المعركة شغالة الآن{battleRemainingMs > 0 ? ` - هتتحسم خلال ${formatDuration(battleRemainingMs)}` : ' - جاري الحسم...'}
        </div>
      )}

      <p className="mb-2 text-[11px] text-white/50">{troopsLabel}</p>

      {!traveling && march.report && (
        <div
          className={`mb-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${
            march.report.outcome === 'win'
              ? 'bg-emerald-500/10 text-emerald-300'
              : march.report.outcome === 'recalled'
                ? 'bg-white/10 text-white/60'
                : 'bg-red-500/10 text-red-300'
          }`}
        >
          {march.report.outcome === 'win' && <Trophy size={12} />}
          {march.report.outcome === 'loss' && <Skull size={12} />}
          {march.report.outcome === 'win' && `كسبت المعركة - غنمت ${march.report.loot.gold + march.report.loot.wood + march.report.loot.stone} مورد`}
          {march.report.outcome === 'loss' && 'خسرت المعركة'}
          {march.report.outcome === 'recalled' && 'اتسحب الجيش قبل ما يوصل'}
        </div>
      )}

      {!traveling && march.report && (march.report.troops_lost.length > 0 || march.report.defender_troops_lost.length > 0) && (
        <p className="mb-1 text-[11px] text-white/40">
          {march.report.troops_lost.length > 0 && (
            <>خسرت {march.report.troops_lost.reduce((s, t) => s + t.count, 0).toLocaleString('ar-EG')} من جيشك</>
          )}
          {march.report.troops_lost.length > 0 && march.report.defender_troops_lost.length > 0 && ' - '}
          {march.report.defender_troops_lost.length > 0 && (
            <>قتلت {march.report.defender_troops_lost.reduce((s, t) => s + t.count, 0).toLocaleString('ar-EG')} من دفاع الهدف</>
          )}
        </p>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-2">
        {traveling && march.direction === 'attack' && (
          <button
            type="button"
            onClick={onRecall}
            disabled={recalling}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white/70 hover:text-white disabled:opacity-40"
          >
            {recalling ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
            اسحب الجيش
          </button>
        )}

        {/* ====== "شاهد المعركة" - بيبان بس لو عندنا battleId متسجّل لنفس
            المسير ده (Battle Foundation الحقيقية، مش march.report القديم).
            ====== Phase 12 - Battle Screen Removal: مفيش أي شاشة/مودال
            بيتفتح هنا - onWatchBattle (openBattle جوه WorldMapPage.jsx) بس
            بيحرّك كاميرا خريطة العالم لمكان مدينة الهدف (نفس أي تنقل عادي
            تاني على الخريطة) ويبدأ تتبّع بيانات المعركة في الخلفية عشان
            IsometricWorld نفسها ترسمها زي ما هي، من غير أي طبقة UI إضافية. ====== */}
        {!traveling && march.direction === 'attack' && battleId && (
          <button
            type="button"
            onClick={() => onWatchBattle?.(battleId)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25"
          >
            <Swords size={12} />
            شاهد المعركة
          </button>
        )}
      </div>
    </div>
  );
}