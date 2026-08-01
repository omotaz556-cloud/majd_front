import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Hash, Landmark, MapPin, Shield, Swords, Copy, Loader2, Hammer, HeartPulse, Wrench, Sparkles, ShieldAlert } from 'lucide-react';
import { getMyAlliance } from '../../api/alliances';
import { useBattleAlerts } from '../../context/BattleAlertContext';
import { formatCompactNumber } from '../../utils/format';
import { toastSuccess } from '../ui/toast';

// ====== NEW (Castle Under Attack - task 1) - نفس فكرة useLiveCountdown في
// LiveBattleHud.jsx بالظبط (عداد تنازلي حي مبني على تاريخ نهاية حقيقي، مش
// تايمر بيتصفّر لو الصفحة اتقفلت). منسوخة هنا بدل ما تتستورد عشان
// LiveBattleHud.jsx مكوّن HUD منفصل خالص، مش ملف مشترك - نفس منطق حساب
// الوقت المتبقي بالظبط. ======
function remainingSeconds(targetIso) {
  if (!targetIso) return 0;
  return Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000));
}

function useLiveCountdown(targetIso) {
  const [seconds, setSeconds] = useState(() => remainingSeconds(targetIso));

  useEffect(() => {
    setSeconds(remainingSeconds(targetIso));
    const id = setInterval(() => setSeconds(remainingSeconds(targetIso)), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return seconds;
}

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

// ====== بانر "تحت الهجوم" - بيتعرض بس لو قلعتي أنا نفسها (مش أي قلعة تانية
// بيزورها اللاعب) عندها معركة دفاع "شغالة لايف" دلوقتي (role='defender' من
// liveBattles - راجع BattleAlertContext). بيختفي أوتوماتيك بمجرد ما المعركة
// تخلص (battle:ended بيشيلها فورًا من liveBattles، فالبانر مش هيلاقي أي
// معركة يعرضها في المرة الجاية اللي الكومبوننت يعيد الرسم فيها). ======
function UnderAttackBanner({ battle }) {
  const isBattling = battle.status === 'battling';
  const targetIso = isBattling ? battle.battle_ends_at : battle.arrives_at;
  const seconds = useLiveCountdown(targetIso);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-300">
        <ShieldAlert size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-red-300">
          ⚔️ قلعتك تحت الهجوم من {battle.opponent_name || 'خصم مجهول'}
        </p>
        <p className="mt-0.5 text-xs text-red-300/70">
          {isBattling ? 'المعركة شغالة دلوقتي - تتحسم خلال' : 'الجيش المعادي هيوصل خلال'}{' '}
          <span className="font-mono">{formatDuration(seconds)}</span>
        </p>
      </div>
    </div>
  );
}

// ====== بانل "معلومات القلعة" (Castle Info) - المكان الثابت والوحيد اللي
// اللاعب يقدر يشوف فيه هويته الكاملة (اسمه، رقمه، رقم مملكته) في أي وقت من
// غير ما يفتح بحث العالم أصلًا - ده الفرق عن WorldSearchModal اللي بيدوّر
// بيه على لاعبين تانيين. بيتفتح من زرار "معلومات القلعة" في WorldHUD، وكمان
// من الضغط على قلعتك انت نفسك على الخريطة (شوف WorldMapPage).
//
// castle هنا هو نفس الأوبچكت اللي بيرجّعه GET /castle/me (formatCastle مع
// owner=req.user في الباك إند) - فيه player_name/player_id/kingdom_id/
// castle_name/coordinates/power جاهزين، من غير أي حساب إضافي هنا. التحالف
// مش موجود في القلعة نفسها فبنجيبه لوحده من /alliances/me وقت الفتح (نفس
// استدعاء AlliancePanel بالظبط). ======
export default function CastleInfoModal({ open, onClose, castle, onManageTownHall, onOpenHospital, onOpenRepair }) {
  const [alliance, setAlliance] = useState(null);
  const [loadingAlliance, setLoadingAlliance] = useState(false);
  // ====== NEW (Castle Under Attack - task 1) - نفس معارك role='defender'
  // اللي IsometricWorld بيستخدمها لرسم التأثير البصري على الخريطة، هنا
  // بنعرض بانر نصي بالمعلومة نفسها (اسم المهاجم + عداد الوقت المتبقي). ======
  const { liveBattles } = useBattleAlerts();
  const defenderBattle = liveBattles.find(
    (b) => b.role === 'defender' && ['traveling', 'battling'].includes(b.status)
  );

  useEffect(() => {
    if (!open) return;
    setLoadingAlliance(true);
    getMyAlliance()
      .then((a) => setAlliance(a))
      .catch(() => setAlliance(null))
      .finally(() => setLoadingAlliance(false));
  }, [open]);

  function handleCopy(value, label) {
    if (value === null || value === undefined || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(String(value))
      .then(() => toastSuccess(`اتنسخ ${label}`))
      .catch(() => {});
  }

  const allianceLabel = loadingAlliance
    ? null
    : alliance
      ? `${alliance.name} [${alliance.tag}]`
      : 'بدون تحالف';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="castle-info-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-stone-950/70 backdrop-blur-sm sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-white/10 bg-stone-950/95 shadow-2xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="معلومات القلعة"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-white">
                <Landmark size={16} className="text-amber-300" />
                <h3 className="font-bold">معلومات القلعة</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="rounded-lg bg-white/5 p-1.5 text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 p-3">
              {defenderBattle && <UnderAttackBanner battle={defenderBattle} />}
              <InfoRow icon={Crown} label="اسم اللاعب" value={castle?.player_name ?? '—'} />
              <InfoRow
                icon={Hash}
                label="رقم اللاعب (Player ID)"
                value={castle?.player_id ?? '—'}
                onCopy={castle?.player_id != null ? () => handleCopy(castle.player_id, 'رقم اللاعب') : null}
              />
              <InfoRow
                icon={Hash}
                label="رقم المملكة (Kingdom ID)"
                value={castle?.kingdom_id ?? '—'}
                onCopy={castle?.kingdom_id != null ? () => handleCopy(castle.kingdom_id, 'رقم المملكة') : null}
              />
              <InfoRow icon={Landmark} label="اسم القلعة" value={castle?.castle_name ?? '—'} />
              <InfoRow
                icon={MapPin}
                label="الإحداثيات"
                value={castle?.coordinates ? `(${castle.coordinates.x}, ${castle.coordinates.y})` : '—'}
              />
              <InfoRow
                icon={Shield}
                label="التحالف"
                value={
                  loadingAlliance ? (
                    <Loader2 size={13} className="animate-spin text-white/40" />
                  ) : (
                    allianceLabel
                  )
                }
              />
              <InfoRow
                icon={Swords}
                label="القوة"
                value={castle?.power != null ? formatCompactNumber(castle.power) : '—'}
              />
              {/* ====== الهيرو المختار - اختيار نهائي (راجع ChooseHeroModal)،
                  فبيتعرض هنا بس للمعلومية، من غير أي زرار تغيير. ====== */}
              {castle?.hero && (
                <InfoRow
                  icon={Sparkles}
                  label="البطل"
                  value={`${castle.hero.name} (${heroBonusText(castle.hero)})`}
                />
              )}

              {onManageTownHall && (
                <button
                  type="button"
                  onClick={onManageTownHall}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500/15 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25"
                >
                  <Hammer size={13} />
                  إدارة المبنى الرئيسي
                </button>
              )}

              {/* ====== المستشفى والإصلاح - مفيش نوع مبنى "مستشفى" مستقل في
                  كتالوج المباني حاليًا (castle.config.js)، فبيتفتحوا من هنا
                  (بانل معلومات القلعة) كنظامين على مستوى القلعة كلها، بدل
                  صفحتين مستقلتين خارج مشهد اللعبة. ====== */}
              {(onOpenHospital || onOpenRepair) && (
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {onOpenHospital && (
                    <button
                      type="button"
                      onClick={onOpenHospital}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 py-2 text-xs font-bold text-white/80 hover:bg-red-500/15 hover:text-red-300"
                    >
                      <HeartPulse size={13} />
                      المستشفى
                    </button>
                  )}
                  {onOpenRepair && (
                    <button
                      type="button"
                      onClick={onOpenRepair}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 py-2 text-xs font-bold text-white/80 hover:bg-teal-500/15 hover:text-teal-300"
                    >
                      <Wrench size={13} />
                      الإصلاح
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ====== نص بونص البطل جاهز للعرض - hero.bonuses بييجي من hero.config.js في
// الباك إند بنفس شكل bonusAggregator (attack_percent أو defense_percent) -
// هنا بس تنسيق نسبة مئوية، مفيش أي حساب. ======
function heroBonusText(hero) {
  const attack = hero.bonuses?.attack_percent;
  const defense = hero.bonuses?.defense_percent;
  if (attack) return `+${Math.round(attack * 100)}% هجوم`;
  if (defense) return `+${Math.round(defense * 100)}% دفاع`;
  return hero.title || '';
}

// ====== صف بيانات واحد ثابت (تسمية + قيمة)، مع زرار نسخ اختياري (بس للـ
// IDs الدائمة - Player ID وKingdom ID) عشان اللاعب يقدر يبعتها لحد تاني
// بسهولة (تحالفه مثلًا) من غير ما يكتبها يدوي. ======
function InfoRow({ icon: Icon, label, value, onCopy }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2 text-white/60">
        <Icon size={14} className="shrink-0 text-amber-300/80" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="truncate text-sm font-bold text-white">{value}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            aria-label={`انسخ ${label}`}
            className="rounded-md bg-white/5 p-1 text-white/50 hover:bg-amber-500/15 hover:text-amber-300"
          >
            <Copy size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
