import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Swords, ShieldAlert, ShieldCheck, Trophy, Skull, Gift } from 'lucide-react';
import { getLiveBattles } from '../api/castle';
import { getBattleByMarchId } from '../api/battle';
import { listInbox } from '../api/inbox';
import { connectSocket, disconnectSocket } from '../api/socket';
import { useAuth } from './AuthContext';

// ====== Phase 1 (Reinforcement & Battle System) - polling (زي ما كان) يفضل
// موجود كـ fallback (لو الويب سوكيت انقطع لحظيًا، أو أول تحميل قبل ما
// الاتصال يخلص)، بس دلوقتي الويب سوكيت هو المصدر "اللايف" الحقيقي لخمس حاجات:
//   1) 'battle:under_attack'          → توست فوري لصاحب القلعة نفسه.
//   2) 'battle:ally_under_attack'     → توست فوري لباقي أعضاء التحالف.
//   3) 'castle:power_update'          → باور القلعة الحي (بيقل بمرور الوقت حسب
//      قوة المهاجم، وبيرتفع فورًا لو تعزيز جديد وصل ووقف) - مصدر شريط
//      الحياة في LiveBattleHud.jsx.
//   4) 'battle:ended'                 → 🏆 كسبت المعركة / 💀 خسرت المعركة
//      (المهاجم) أو صديتي/خسرت جزء من مواردك (المدافع) + 🎁 الغنيمة جاهزة
//      لو المهاجم كسب وفيه غنيمة فعلية (راجع handleBattleEnded تحت).
//   5) 'battle:reinforcement_arrived' → 🛡️ توست فوري لصاحب القلعة إن تعزيز
//      حليف وصل ودلوقتي بيشارك في الدفاع (نفس فلسفة battle:under_attack).
const POLL_INTERVAL_MS = 12000;

const BattleAlertContext = createContext(null);

export function BattleAlertProvider({ children }) {
  const { user } = useAuth();
  const [liveBattles, setLiveBattles] = useState([]);
  // ====== باور كل معركة "شغالة" حاليًا - مفتاح كل عنصر هو march_id (نفس
  // المفتاح اللي liveBattles بتستخدمه) عشان LiveBattleHud يقدر يربط كل صف
  // بباوره الحي بسهولة. ======
  const [castlePowerByMarchId, setCastlePowerByMarchId] = useState({});

  const knownBattleIdsRef = useRef(new Set());
  const seenAllyAlertIdsRef = useRef(new Set());
  const battlesFirstLoadRef = useRef(true);
  const allyFirstLoadRef = useRef(true);

  // ====== *** فيكس: توست "تحت الهجوم" ما بيظهرش لو الصفحة اتفتحت بعد ما
  // الهجوم بدأ فعليًا (مش قبله) *** السبب: أول pollBattles() بعد فتح الصفحة
  // كانت بتسجّل كل معركة موجودة كـ"معروفة من الأول" (baseline) من غير أي
  // توست - حتى لو المعركة دي بدأت من ثواني قليلة بس والعميل ماكانش متصل
  // بالسوكيت وقتها (فات عليه battle:under_attack اللحظي تمامًا، زي ما بيحصل
  // لما تفتح حساب المدافع/الحليف بعد ما المهاجم يبعت جيشه بلحظات). الحل:
  // بدل ما نفرّق بس بـ"شايفها أول مرة ولا لأ"، بنتأكد كمان إن المعركة دي
  // "حديثة فعلاً" (departed_at قريب من دلوقتي) - لو حديثة، نعمل توست حتى في
  // أول تحميل (يعني اللاعب فاته الحدث اللحظي وده تعويض بأثر رجعي)؛ لو مش
  // حديثة (معركة قديمة كانت شغالة من قبل ما الصفحة تتفتح بفترة طويلة)،
  // تفضل baseline عادي من غير توست زي ما كانت. ======
  const RECENT_BATTLE_WINDOW_MS = 60000; // دقيقة - أي حاجة أقدم من كده تعتبر "قديمة" مش حدث فاتنا لسه

  function isRecentlyDeparted(battle) {
    if (!battle.departed_at) return false;
    return Date.now() - new Date(battle.departed_at).getTime() < RECENT_BATTLE_WINDOW_MS;
  }

  const pollBattles = useCallback(async () => {
    try {
      const battles = await getLiveBattles();
      setLiveBattles(battles);

      if (battlesFirstLoadRef.current) {
        battlesFirstLoadRef.current = false;
        battles.forEach((b) => {
          const id = String(b.march_id);
          // ====== لو أول تحميل وفيه معركة دفاع حديثة فعلاً - يبقى اللاعب
          // فاته الحدث اللحظي (كان لسه بيفتح الصفحة وقت ما الهجوم بدأ)،
          // فبنعوّضه بتوست دلوقتي بدل ما يضيع التنبيه تمامًا. ======
          if (b.role === 'defender' && isRecentlyDeparted(b)) {
            toast.error(`قلعتك تحت الهجوم من ${b.opponent_name}!`, {
              icon: <ShieldAlert size={18} />,
              description: 'المعركة شغالة دلوقتي - تابعها من عداد المعركة اللايف.',
              duration: 8000,
            });
          }
          knownBattleIdsRef.current.add(id);
        });
        return;
      }

      for (const battle of battles) {
        const id = String(battle.march_id);
        if (knownBattleIdsRef.current.has(id)) continue; // eslint-disable-line no-continue
        knownBattleIdsRef.current.add(id);

        if (battle.role === 'defender') {
          toast.error(`قلعتك تحت الهجوم من ${battle.opponent_name}!`, {
            icon: <ShieldAlert size={18} />,
            description: 'المعركة شغالة دلوقتي - تابعها من عداد المعركة اللايف.',
            duration: 8000,
          });
        }
      }
    } catch {
      // فشل بسيط في تحديث المعارك اللايف مش مبرر لكسر أي حاجة تانية في الواجهة
    }
  }, []);

  const pollAllyAlerts = useCallback(async () => {
    try {
      const { messages } = await listInbox({ limit: 10, skip: 0 });

      if (allyFirstLoadRef.current) {
        allyFirstLoadRef.current = false;
        messages
          .filter((m) => m.type === 'ally_under_attack')
          .forEach((m) => {
            const id = String(m.id);
            // ====== نفس فيكس pollBattles فوق بالظبط: لو الرسالة دي حديثة
            // فعلاً (created_at قريب من دلوقتي) ولسه مش مقروءة، يبقى التوست
            // اللحظي (battle:ally_under_attack) فات على الحليف وقت ما كان
            // بيفتح الصفحة - بنعوّضه هنا بأثر رجعي بدل ما يضيع التنبيه. ======
            if (!m.is_read && Date.now() - new Date(m.created_at).getTime() < RECENT_BATTLE_WINDOW_MS) {
              toast.warning(m.title, {
                icon: <Swords size={18} />,
                description: m.body,
                duration: 7000,
              });
            }
            seenAllyAlertIdsRef.current.add(id);
          });
        return;
      }

      for (const msg of messages) {
        if (msg.type !== 'ally_under_attack') continue; // eslint-disable-line no-continue
        const id = String(msg.id);
        if (seenAllyAlertIdsRef.current.has(id)) continue; // eslint-disable-line no-continue
        seenAllyAlertIdsRef.current.add(id);
        if (!msg.is_read) {
          toast.warning(msg.title, {
            icon: <Swords size={18} />,
            description: msg.body,
            duration: 7000,
          });
        }
      }
    } catch {
      // فشل بسيط هنا برضه مش مبرر لكسر أي حاجة تانية
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLiveBattles([]);
      setCastlePowerByMarchId({});
      knownBattleIdsRef.current = new Set();
      seenAllyAlertIdsRef.current = new Set();
      battlesFirstLoadRef.current = true;
      allyFirstLoadRef.current = true;
      return undefined;
    }

    pollBattles();
    pollAllyAlerts();

    const interval = setInterval(() => {
      pollBattles();
      pollAllyAlerts();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, pollBattles, pollAllyAlerts]);

  // ====== اتصال الويب سوكيت نفسه - منفصل عن الـ polling effect فوق عشان
  // يتقفل وينفتح بس لما اللاعب يسجّل دخول/خروج، مش كل ما pollBattles نفسها
  // تتغيّر. ======
  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return undefined;
    }

    const token = localStorage.getItem('majd_token');
    const socket = connectSocket(token);
    if (!socket) return undefined;

    const handleUnderAttack = (payload) => {
      // ====== *** تعديل: الحدث ده بقى بيوصل وقت ما الجيش المعادي يتحرك من
      // قلعته (مش وقت ما يوصل قلعتك زي الأول) - النص اتغيّر عشان يعكس إن
      // المعركة لسه ما بدأتش فعليًا، وإن فيه وقت لتجهيز الدفاع أو طلب
      // تعزيزات قبل ما الجيش يوصل. ******
      toast.error('جيش معادي متحرك ناحية قلعتك!', {
        icon: <ShieldAlert size={18} />,
        description: payload?.duration_label
          ? `المفروض يوصل خلال حوالين ${payload.duration_label} - جهّز دفاعك أو اطلب تعزيزات من حلفائك.`
          : 'جهّز دفاعك أو اطلب تعزيزات من حلفائك قبل ما يوصل.',
        duration: 8000,
      });
      // ====== تحديث فوري لقايمة المعارك اللايف عشان تظهر في الـ HUD في نفس
      // اللحظة، من غير ما نستنى دورة الـ polling الجاية. ======
      pollBattles();
    };

    const handleAllyUnderAttack = (payload) => {
      // ====== المدافع نفسه ممكن يكون عضو في غرفة تحالفه هو كمان، فهيوصله
      // نفس الحدث ده - بيتجاهله لأنه أصلًا اتبعتله toast مخصص (handleUnderAttack). ======
      if (String(payload?.defender_user_id) === String(user._id)) return;
      const isDeparted = payload?.stage === 'departed';
      toast.warning(isDeparted ? 'حليفك مستهدف بهجوم' : 'حليفك تحت الهجوم فعليًا', {
        icon: <Swords size={18} />,
        description: `${payload?.defender_name || 'حليفك'} ${
          isDeparted ? 'مستهدف بجيش معادي متحرك ناحيته' : 'تحت هجوم فعليًا دلوقتي'
        }${payload?.duration_label ? ` - المفروض ${isDeparted ? 'يوصل' : 'تتحسم'} خلال حوالين ${payload.duration_label}` : ''}. تقدر تتابعها لايف أو تبعتله تعزيزات.`,
        duration: 7000,
      });
    };

    const handlePowerUpdate = (payload) => {
      if (!payload?.march_id) return;
      setCastlePowerByMarchId((prev) => ({ ...prev, [String(payload.march_id)]: payload }));
    };

    // ====== المعركة خلصت فعليًا (battle:ended) - بنشيل قراءة الباور بتاعتها
    // فورًا (بدل ما تفضل متجمدة على آخر رقم وصلها لحد الـ poll الجاي) وبنعمل
    // pollBattles() فورية عشان الصف نفسه يختفي من الـ HUD في نفس اللحظة، مش
    // بعد لحد 12 ثانية. أربع نتايج ممكنة حسب outcome:
    //   - 'defended'      (مدافع، صد الهجوم)    → 🛡️ توست نجاح
    //   - 'lost_resources' (مدافع، خسر موارد)    → 💀 توست خسارة
    //   - 'win'           (مهاجم، كسب المعركة)  → 🏆 توست نجاح + 🎁 لو فيه غنيمة
    //   - 'loss'          (مهاجم، خسر المعركة)  → 💀 توست خسارة
    // ======
    const handleBattleEnded = (payload) => {
      if (payload?.march_id) {
        setCastlePowerByMarchId((prev) => {
          if (!(String(payload.march_id) in prev)) return prev;
          const next = { ...prev };
          delete next[String(payload.march_id)];
          return next;
        });
      }
      pollBattles();

      if (payload?.outcome === 'defended') {
        toast.success('🛡️ صديتي الهجوم من غير ما تخسر أي جندي', { icon: <ShieldCheck size={18} />, duration: 6000 });
      } else if (payload?.outcome === 'lost_resources') {
        toast.error('💀 قلعتك اتهاجمت وخسرت جزء من مواردك', { icon: <Skull size={18} />, duration: 6000 });
      } else if (payload?.outcome === 'win') {
        toast.success('🏆 كسبت المعركة!', {
          icon: <Trophy size={18} />,
          description: 'شوف تقرير المعركة من الرسائل عشان تجمع غنيمتك.',
          duration: 6000,
        });
        // ====== 🎁 توست منفصل "الغنيمة جاهزة" - بيتبعت بس لو المعركة دي
        // فعليًا فيها غنيمة (مش كل انتصار بيدي غنيمة، مثلًا لو الهدف مكانش
        // عنده موارد أصلًا) - بنتأكد من الباك إند بنداء getBattleByMarchId
        // (نفس الـ endpoint اللي ReportsMailPanel بيستخدمه لعرض التقرير)
        // بدل ما نفترض غنيمة موجودة دايمًا. ======
        if (payload?.march_id) {
          getBattleByMarchId(payload.march_id)
            .then((battle) => {
              const loot = battle?.battle_result?.loot?.looted;
              const hasLoot = loot && Object.values(loot).some((amount) => Number(amount) > 0);
              if (hasLoot) {
                toast('🎁 مكافأة المعركة جاهزة', {
                  icon: <Gift size={18} />,
                  description: 'اجمع غنيمتك أو شاهد إعلان لمضاعفتها من تقرير المعركة.',
                  duration: 6000,
                });
              }
            })
            .catch(() => {});
        }
      } else if (payload?.outcome === 'loss') {
        toast.error('💀 خسرت المعركة', { icon: <Skull size={18} />, duration: 6000 });
      }
    };

    // ====== 🛡️ تعزيز حليف وصل وأنت تحت هجوم شغال دلوقتي - نفس فلسفة
    // handleUnderAttack بالظبط (توست فوري + pollBattles فوري عشان أي تحديث
    // مرتبط يبان في الـ HUD بسرعة، مع إن قايمة liveBattles نفسها مش بتتغير
    // بوصول تعزيز، بس باور القلعة (castle:power_update) بيوصل منفصل). ======
    const handleReinforcementArrived = () => {
      toast.success('🛡️ وصلتك تعزيزات', {
        icon: <ShieldCheck size={18} />,
        description: 'جنود التعزيز من حليفك وصلوا قلعتك ودلوقتي بيشاركوا في الدفاع.',
        duration: 6000,
      });
    };

    // ====== *** فيكس: إشعارات بتتأخر/بتضيع بعد أي انقطاع مؤقت للسوكيت ***
    // السبب: أي انقطاع لحظي في اتصال الويب سوكيت (ريستارت السيرفر أثناء
    // التطوير مع nodemon، تقلّب شبكة عادي، تبديل تبويب على الموبايل...) يضيّع
    // أي حدث كان المفروض يوصل في نفس لحظة الانقطاع - Socket.IO ما بيعملش
    // "queue" لحدث اتبعت والعميل كان وقتها مفصول. النتيجة: هجوم بدأ فعليًا
    // بينما العميل كان بيعمل reconnect، فالتوست ما يظهرش خالص لحد ما اللاعب
    // يكتشف المعركة بنفسه (أو تخلص) - بالظبط الأعراض المذكورة. الحل: أي
    // 'connect' (أول اتصال أو أي إعادة اتصال بعد انقطاع) بيعمل catch-up فوري
    // (pollBattles + pollAllyAlerts) بدل ما يستنى دورة الـ polling العادية
    // (لحد 12 ثانية) - فأي معركة/تنبيه حصل أثناء الانقطاع بيظهر فورًا لحظة
    // ما الاتصال يرجع، بدل ما يضيع أو يتأخر. ======
    const handleReconnect = () => {
      pollBattles();
      pollAllyAlerts();
    };

    socket.on('connect', handleReconnect);
    socket.on('battle:under_attack', handleUnderAttack);
    socket.on('battle:ally_under_attack', handleAllyUnderAttack);
    socket.on('castle:power_update', handlePowerUpdate);
    socket.on('battle:ended', handleBattleEnded);
    socket.on('battle:reinforcement_arrived', handleReinforcementArrived);

    // ====== لو السوكيت كان أصلًا متصل ومتجهّز وقت ما الـ effect ده اتنفذ
    // (نفس الـ socket instance اتعاد استخدامه - راجع connectSocket singleton
    // في api/socket.js)، حدث 'connect' ممكن يكون فات قبل ما نعمل .on() هنا -
    // فبنعمل catch-up فوري واحد بمجرد تركيب الـ listeners كمان، لضمان مفيش
    // فجوة من أول تحميل. ======
    if (socket.connected) handleReconnect();

    return () => {
      socket.off('connect', handleReconnect);
      socket.off('battle:under_attack', handleUnderAttack);
      socket.off('battle:ally_under_attack', handleAllyUnderAttack);
      socket.off('castle:power_update', handlePowerUpdate);
      socket.off('battle:ended', handleBattleEnded);
      socket.off('battle:reinforcement_arrived', handleReinforcementArrived);
    };
  }, [user, pollBattles, pollAllyAlerts]);

  return (
    <BattleAlertContext.Provider value={{ liveBattles, castlePowerByMarchId, refreshBattles: pollBattles }}>
      {children}
    </BattleAlertContext.Provider>
  );
}

export function useBattleAlerts() {
  const ctx = useContext(BattleAlertContext);
  if (!ctx) return { liveBattles: [], castlePowerByMarchId: {}, refreshBattles: () => {} };
  return ctx;
}
