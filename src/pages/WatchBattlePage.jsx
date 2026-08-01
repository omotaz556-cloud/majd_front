import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Swords, ShieldAlert, Heart, ArrowRight, Loader2 } from 'lucide-react';
import { getPublicBattleView } from '../api/castle';
import { getBattleByMarchId } from '../api/battle';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';
import BattleOutcomeModal from '../components/battle/BattleOutcomeModal';
import Ads from '../ads/Ads';

// ====== صفحة "متابعة المعركة" العامة - متاحة لأي مستخدم مسجّل دخول بمعرفة
// march_id بس، من غير أي شرط ملكية: مش لازم تكون صاحب القلعة المهاجَمة ولا
// حليفها ولا حتى المهاجم نفسه. البيانات جايّة من:
//   1) تحميل أولي عبر REST (GET /castle/battles/:marchId/live).
//   2) متابعة لايف عبر الويب سوكيت - الصفحة بتنضم لغرفة المعركة العامة
//      (battle:watch) فتستقبل نفس أحداث castle:power_update/battle:ended
//      اللي صاحب القلعة نفسه بيستقبلها، بس هنا لأي متفرّج. ======

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

function remainingSeconds(targetIso) {
  if (!targetIso) return 0;
  return Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000));
}

export default function WatchBattlePage() {
  const { marchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [battle, setBattle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [ended, setEnded] = useState(null);
  // ====== Battle Outcome Modal - بيتفتح للمهاجم بس (مش لأي متفرّج/مدافع)
  // لحظة ما المعركة تتحسم، ومعاه تفاصيل المعركة الكاملة (winner/loot/battle_id)
  // اللازمة عشان زرار "شاهد إعلان → ضاعف الغنيمة" (double_reward). ======
  const [outcomeModal, setOutcomeModal] = useState({ open: false, battleId: null, outcome: null, lootTotal: 0 });

  // ====== Interstitial عند الدخول لمتابعة معركة قلعة، وعند مغادرة الصفحة -
  // AdsManager.showInterstitial() نفسه بيطبّق الـ cooldown/frequency limiter
  // (راجع adsConfig.interstitialCooldownSeconds)، فمفيش خطر إزعاج اللاعب حتى
  // لو زار صفحات معارك متعددة بسرعة. مفيش أي مقاطعة للعبة الفعلية هنا - الصفحة
  // دي أصلاً صفحة "متابعة" منفصلة عن الجيمبلاي الحي في WorldMapPage. ======
  useEffect(() => {
    Ads.showInterstitial();
    return () => {
      Ads.showInterstitial();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marchId]);

  const load = useCallback(async () => {
    try {
      const data = await getPublicBattleView(marchId);
      setBattle(data);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.error || 'مفيش معركة شغالة بالمعرّف ده دلوقتي');
      setBattle(null);
    } finally {
      setLoading(false);
    }
  }, [marchId]);

  useEffect(() => {
    load();
  }, [load]);

  // ====== عدّاد حي - وقت الوصول (traveling) أو وقت الحسم النهائي (battling) ======
  useEffect(() => {
    if (!battle) return undefined;
    const targetIso = battle.status === 'battling' ? battle.battle_ends_at : battle.arrives_at;
    setSeconds(remainingSeconds(targetIso));
    const id = setInterval(() => setSeconds(remainingSeconds(targetIso)), 1000);
    return () => clearInterval(id);
  }, [battle]);

  // ====== انضمام لغرفة المعركة العامة عبر الويب سوكيت - متاح لأي حد، مش بس
  // صاحب القلعة أو حليفها (راجع battle:watch في realtime/socket.js). ======
  useEffect(() => {
    if (!marchId) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;

    socket.emit('battle:watch', marchId);

    const handlePowerUpdate = (payload) => {
      if (String(payload?.march_id) !== String(marchId)) return;
      setBattle((prev) => (prev ? { ...prev, power_pct: payload.power_pct, status: 'battling' } : prev));
    };

    const handleLiveStarted = (payload) => {
      if (String(payload?.march_id) !== String(marchId)) return;
      setBattle((prev) =>
        prev ? { ...prev, status: 'battling', battle_ends_at: payload.battle_ends_at, power_pct: 100 } : prev
      );
    };

    const handleEnded = (payload) => {
      if (String(payload?.march_id) !== String(marchId)) return;
      setEnded(payload.outcome);

      // ====== البوب أب (BattleOutcomeModal) بيتفتح للمهاجم نفسه بس - المدافع
      // أو أي متفرّج تاني بيشوف بس نص النتيجة تحت من غير زرار double_reward
      // (مبني على إن اللاعب طرف مهاجم في المعركة دي - راجع buildStartPayload
      // في rewardSession.service.js اللي بيرفض أي جلسة لمعركة مش بتاعة
      // المستخدم). ======
      getBattleByMarchId(marchId)
        .then((fullBattle) => {
          if (!fullBattle || !user?._id) return;
          const isAttacker = String(fullBattle.attacker?.user_id) === String(user._id);
          if (!isAttacker) return;

          const outcome = fullBattle.winner === 'attacker' ? 'win' : 'loss';
          const lootTotal = Number(fullBattle.battle_result?.loot?.total_value) || 0;

          setOutcomeModal({
            open: true,
            battleId: fullBattle.battle_id,
            outcome,
            lootTotal,
          });
        })
        .catch(() => {
          // فشل جلب تفاصيل المعركة الكاملة مش مبرر لكسر باقي الصفحة - النص
          // البسيط تحت (ended) لسه بيبان زي ما كان.
        });
    };

    socket.on('castle:power_update', handlePowerUpdate);
    socket.on('battle:live_started', handleLiveStarted);
    socket.on('battle:ended', handleEnded);

    return () => {
      socket.emit('battle:unwatch', marchId);
      socket.off('castle:power_update', handlePowerUpdate);
      socket.off('battle:live_started', handleLiveStarted);
      socket.off('battle:ended', handleEnded);
    };
  }, [marchId, user?._id]);

  // ====== إغلاق البوب أب - بعد ما يتقفل بنجاح (سواء اللاعب استلم مكافأة
  // إعلان ولا لأ)، بنعرض Interstitial واحد ثم نكمّل مسار التنقّل العادي
  // (هنا: رجوع لخريطة العالم، أقرب "مكان طبيعي" بعد ما البوب أب يتقفل). ======
  const closeOutcomeModal = useCallback(() => {
    setOutcomeModal((prev) => ({ ...prev, open: false }));
    Ads.showInterstitial().finally(() => {
      navigate('/world');
    });
  }, [navigate]);

  // ====== "حاول تاني" بعد هزيمة - مفيش أي منطق معركة بيتحسب هنا، بس رجوع
  // لخريطة العالم عشان اللاعب يقدر يجهّز جيشه ويهاجم تاني من هناك. ======
  const handleTryAgain = useCallback(() => {
    navigate('/world');
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={28} />
      </div>
    );
  }

  if (error || !battle) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <ShieldAlert className="mx-auto mb-3 text-red-400" size={36} />
        <p className="text-bone/80">{error || 'مفيش معركة شغالة بالمعرّف ده دلوقتي'}</p>
        <Link to="/world" className="mt-4 inline-flex items-center gap-1.5 text-teal hover:underline">
          <ArrowRight size={16} /> رجوع لخريطة العالم
        </Link>
      </div>
    );
  }

  const powerPct = Math.min(100, Math.max(0, Math.round(battle.power_pct ?? 100)));
  const isPowerLow = powerPct < 35;
  const isBattling = battle.status === 'battling';

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link to="/world" className="mb-6 inline-flex items-center gap-1.5 text-sm text-bone/60 hover:text-bone">
        <ArrowRight size={14} /> رجوع لخريطة العالم
      </Link>

      <div className="rounded-xl border border-ink-600 bg-ink-800/80 p-5 shadow-lg backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg font-bold text-bone">
            <Swords size={20} className="text-gold" />
            متابعة المعركة
          </span>
          {ended ? (
            <span className="rounded-full bg-ink-600 px-2 py-0.5 text-xs text-bone/70">انتهت المعركة</span>
          ) : (
            <span className="rounded-full bg-red-500/90 px-2 py-0.5 text-xs text-white">لايف</span>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-bone/70">المهاجم</span>
          <span className="font-semibold text-bone">{battle.attacker_name}</span>
        </div>
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-bone/70">المدافع</span>
          <span className="font-semibold text-bone">{battle.defender_name}</span>
        </div>

        {!ended && (
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-bone/70">{isBattling ? 'المعركة تتحسم خلال' : 'الجيش هيوصل خلال'}</span>
            <span className="font-mono text-teal">{formatDuration(seconds)}</span>
          </div>
        )}

        {isBattling && !ended && (
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-xs text-bone/60">
              <span className="flex items-center gap-1">
                <Heart size={12} className={isPowerLow ? 'text-red-400' : 'text-teal'} />
                باور القلعة المدافعة
              </span>
              <span className={isPowerLow ? 'text-red-400' : 'text-teal'}>{powerPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-600">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isPowerLow ? 'bg-red-400' : 'bg-teal'
                }`}
                style={{ width: `${powerPct}%` }}
              />
            </div>
          </div>
        )}

        {ended && (
          <p className="mt-2 text-center text-sm text-bone/70">
            {ended === 'defended' ? 'المدافع صدّ الهجوم بنجاح.' : 'المهاجم كسب المعركة.'}
          </p>
        )}
      </div>

      <BattleOutcomeModal
        open={outcomeModal.open}
        outcome={outcomeModal.outcome}
        battleId={outcomeModal.battleId}
        lootTotal={outcomeModal.lootTotal}
        opponentName={battle.defender_name}
        onClose={closeOutcomeModal}
        onTryAgain={handleTryAgain}
      />
    </div>
  );
}
