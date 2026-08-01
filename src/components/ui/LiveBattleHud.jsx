import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swords, ShieldAlert, ChevronDown, ChevronUp, Heart, Eye } from 'lucide-react';
import { useBattleAlerts } from '../../context/BattleAlertContext';

// ====== عدّاد تنازلي حي مبني على تاريخ نهاية حقيقي (arrives_at أو
// battle_ends_at جايين من السيرفر) - مش تايمر بيتصفّر لو الصفحة اتقفلت
// ورجع اللاعب تاني: كل ما الكومبوننت يعمل remount أو الـ target يتغيّر،
// بيعيد الحساب من التاريخ الحقيقي نفسه. الفرق بين ده وuseCountdown.js
// العام إن ده بياخد تاريخ مطلق (ISO) بدل ثواني متبقية جاهزة. ======
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
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (d > 0) return `${d}ي ${pad(h)}:${pad(m)}:${pad(sec)}`;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

function BattleRow({ battle, power }) {
  const isDefender = battle.role === 'defender';
  // ====== لسه المسير ماشي ولا وصلش (status: 'traveling') → العدّاد بيعرض
  // وقت الوصول (arrives_at). المعركة بدأت فعليًا (status: 'battling') →
  // العدّاد بيعرض وقت حسمها النهائي (battle_ends_at). ======
  const targetIso = battle.status === 'battling' ? battle.battle_ends_at : battle.arrives_at;
  const seconds = useLiveCountdown(targetIso);
  const winPct = Math.min(99, Math.max(1, Math.round(battle.my_win_probability_pct || 50)));
  const isWinning = winPct >= 50;

  // ====== Phase 1 (Reinforcement & Battle System) - باور قلعتك الحي، بس
  // للصفوف اللي انت فيها مدافع ("لايف المعركة يكون عبارة عن باور قلعتي") -
  // جاي من الويب سوكيت (castle:power_update عبر BattleAlertContext)، بيقل
  // مع الوقت حسب قوة المهاجم وبيرتفع فورًا لو تعزيز جديد وصل ووقف. لو لسه
  // مفيش قراءة وصلت (أول لحظة اتصال) بنفترض 100% لحد ما أول تحديث يوصل. ======
  const showPowerBar = isDefender && battle.status === 'battling';
  const powerPct = Math.min(100, Math.max(0, Math.round(power?.power_pct ?? 100)));
  const isPowerLow = powerPct < 35;

  return (
    <div className="rounded-lg border border-ink-600 bg-ink-800/80 p-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-bone">
          {isDefender ? (
            <ShieldAlert size={14} className="text-red-400" />
          ) : (
            <Swords size={14} className="text-gold" />
          )}
          {isDefender ? 'دفاع' : 'هجوم'} · {battle.opponent_name}
        </span>
        <span className="font-mono text-teal">
          {battle.status === 'battling' ? 'تتحسم خلال' : 'هتوصل خلال'} {formatDuration(seconds)}
        </span>
      </div>
      {showPowerBar && (
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-[11px] text-bone/60">
            <span className="flex items-center gap-1">
              <Heart size={11} className={isPowerLow ? 'text-red-400' : 'text-teal'} />
              باور قلعتك
            </span>
            <span className={isPowerLow ? 'text-red-400' : 'text-teal'}>{powerPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-600">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isPowerLow ? 'bg-red-400' : 'bg-teal'
              }`}
              style={{ width: `${powerPct}%` }}
            />
          </div>
        </div>
      )}
      <div className="mt-2">
        <div className="mb-1 flex items-center justify-between text-[11px] text-bone/60">
          <span>فرصة نجاحك</span>
          <span className={isWinning ? 'text-teal' : 'text-red-400'}>{winPct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-600">
          <div
            className={`h-full rounded-full transition-all ${isWinning ? 'bg-teal' : 'bg-red-400'}`}
            style={{ width: `${winPct}%` }}
          />
        </div>
      </div>
      {/* ====== *** إضافة: زرار "شاهد المعركة" هنا كمان - قبل كده كان الزرار
          ده موجود بس جوه WorldPanel.jsx وبيبان للمهاجم نفسه بعد ما مسيره
          يخلص سفر، فمكانش فيه أي طريقة للمدافع أو لحليفه (اللي بياخدوا
          الصف ده في الـ HUD) يوصلوا لصفحة المتابعة اللايف (/battles/:marchId
          - متاحة لأي حد زي ما هي مصممة في الباك إند/WatchBattlePage.jsx). ====== */}
      <Link
        to={`/battles/${battle.march_id}`}
        className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-gold/15 px-2.5 py-1.5 text-xs font-bold text-gold hover:bg-gold/25"
      >
        <Eye size={12} />
        شاهد المعركة لايف
      </Link>
    </div>
  );
}

// ====== Widget عايم ثابت على الشاشة (زي أي HUD حقيقي) - بيفضل ظاهر في أي
// صفحة/مسار (متركّب من App.jsx نفسه، مش جوه صفحة معيّنة) طول ما اللاعب
// عنده معركة "شغالة لايف" واحدة على الأقل (مهاجم أو مدافع). مفيش أي حاجة
// يتعرض لو مفيش معارك خالص - HUD صامت في الوضع العادي. ======
export default function LiveBattleHud() {
  const { liveBattles, castlePowerByMarchId } = useBattleAlerts();
  const [collapsed, setCollapsed] = useState(false);

  if (!liveBattles || liveBattles.length === 0) return null;

  const underAttackCount = liveBattles.filter((b) => b.role === 'defender').length;

  return (
    <div className="fixed bottom-4 left-4 z-40 w-72 max-w-[calc(100vw-2rem)]">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between rounded-t-lg border border-ink-600 bg-ink-900/95 px-3 py-2 text-xs font-bold text-bone shadow-lg backdrop-blur"
      >
        <span className="flex items-center gap-1.5">
          <Swords size={14} className="text-gold" />
          معارك لايف ({liveBattles.length})
          {underAttackCount > 0 && (
            <span className="rounded-full bg-red-500/90 px-1.5 py-0.5 text-[10px] text-white">
              {underAttackCount} تحت هجوم
            </span>
          )}
        </span>
        {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {!collapsed && (
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-b-lg border border-t-0 border-ink-600 bg-ink-900/90 p-2 shadow-lg backdrop-blur">
          {liveBattles.map((battle) => (
            <BattleRow
              key={battle.march_id}
              battle={battle}
              power={castlePowerByMarchId?.[String(battle.march_id)]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
