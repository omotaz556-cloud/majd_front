import { useEffect, useRef, useState } from 'react';

import { Loader2, X, RotateCw } from 'lucide-react';
import IsometricWorld from '../components/worldmap/IsometricWorld';
import { worldObjectToAttackTarget } from '../components/worldmap/attackableWorldObject';
import { gridPositionToOffset, gridToWorld, nearbyCastleToGrid, mapSlotToGrid, slotToGrid, worldToGrid, gridToMapSlot } from '../components/worldmap/isoGrid';
import WorldHUD from '../components/worldmap/WorldHUD';
import BuildingInfoModal from '../components/worldmap/BuildingInfoModal';
import BuildMenu from '../components/worldmap/BuildMenu';
import DefenseBuildMenu from '../components/worldmap/DefenseBuildMenu';
import DefenseStructureInfoModal from '../components/worldmap/DefenseStructureInfoModal';
import WorldPanel from '../components/worldmap/WorldPanel';
import VisitKingdomBar from '../components/worldmap/VisitKingdomBar';
import AlliancePanel from '../components/worldmap/AlliancePanel';
import ScoutReportModal from '../components/worldmap/ScoutReportModal';
import SendResourcesModal from '../components/worldmap/SendResourcesModal';
import SendReinforcementModal from '../components/worldmap/SendReinforcementModal';
import PlayerProfileModal from '../components/worldmap/PlayerProfileModal';
import MessagePlayerModal from '../components/worldmap/MessagePlayerModal';
import WorldSearchModal from '../components/worldmap/WorldSearchModal';
import CastleInfoModal from '../components/worldmap/CastleInfoModal';
import ChooseHeroModal from '../components/worldmap/ChooseHeroModal';
import AttackDialog from '../components/worldmap/AttackDialog';
import HospitalPanel from '../components/worldmap/panels/HospitalPanel';
import RepairPanel from '../components/worldmap/panels/RepairPanel';
import ReportsMailPanel from '../components/worldmap/panels/ReportsMailPanel';
import RankingPanel from '../components/worldmap/panels/RankingPanel';
import QuestsPanel from '../components/worldmap/panels/QuestsPanel';
import ShopPanel from '../components/worldmap/panels/ShopPanel';
import DepositModal from '../components/DepositModal';
import Banner from '../ads/components/Banner';
import DailyRewardPopup from '../components/dailyReward/DailyRewardPopup';
import HourlyGiftPopup from '../components/dailyReward/HourlyGiftPopup';
import { useRewardPopups } from '../components/dailyReward/useRewardPopups';
import { useAuth } from '../context/AuthContext';
import { useBattleAlerts } from '../context/BattleAlertContext';
import { useInbox } from '../context/InboxContext';
import { getVipRanking } from '../api/ranking';
import { useWalletBalance } from '../context/WalletBalanceContext';
import {
  getMyCastle,
  getHeroes,
  chooseHero,
  upgradeBuilding,
  speedupBuilding,
  getBuildingTypes,
  buildNewBuilding,
  moveBuilding,
  getTroopTypes,
  trainTroops,
  trainPremiumTroops,
  cancelTraining,
  speedupTraining,
  getNearbyCastles,
  getNearbyWorldObjects,
  getCastleView,
  scoutCastle,
  sendResourcesToCastle,
  getMarches,
  getNearbyMarches,
  sendMarch,
  recallMarch,
  gatherWorldObject,
} from '../api/castle';
import { sendReinforcement } from '../api/allianceReinforcements';
import {
  getMyDefense,
  getDefenseStructureTypes,
  buildDefenseStructure,
  upgradeDefenseStructure,
  speedupDefenseStructure,
  moveDefenseStructure,
  removeDefenseStructure,
  getDefenseView,
} from '../api/defense';
import { getBattleByMarchId, startBattle, cancelBattle } from '../api/battle';
import { sendPrivateMessage } from '../api/inbox';
import { getPlayerProfile } from '../api/users';
import { toastSuccess, toastError } from '../components/ui/toast';
import { formatCompactNumber } from '../utils/format';
import { useCityState } from '../state/cityState';

// لسه مفيش سكان/جواهر حقيقيين من الباك إند (هيتفعلوا في مرحلة لاحقة) -
// دي القيمتين الوحيدتين المعروضتين شكليًا لحد ما ده يتوصل، أما الدهب/الخشب/
// الحجر فبييجوا لايف من /castle/me.
const PLACEHOLDER_POPULATION = '0/0';

export default function WorldMapPage() {
  const { user } = useAuth();
  // ====== NEW (Castle Under Attack - task 1) - نفس مصدر liveBattles اللي
  // LiveBattleHud.jsx بيستخدمه (BattleAlertContext) - بيتغذى بيه IsometricWorld
  // عشان يظهّر تأثيرات "تحت الهجوم" (سيوف/دخان/نبضة حمراء) على قلعتي نفسها
  // (role='defender') أو على أي قلعة قريبة باص عليها هجومي أنا (role='attacker'
  // + target_castle_id) - وكمان CastleInfoModal (بانر "تحت الهجوم" + عداد). ======
  const { liveBattles, refreshBattles } = useBattleAlerts();
  const { unreadCount } = useInbox();
  const { balance: walletBalance, refresh: refreshWalletBalance } = useWalletBalance();
  const viewportRef = useRef(null);

  // ====== المستشفى/الإصلاح/الرسائل - أنظمة على مستوى القلعة/الحساب كله،
  // اتفتحت كبانلات جوّه مشهد اللعبة (مش صفحات مستقلة). ====== Battle Reports
  // removal: reportsPanel كانت بتحمل battleId لفتح تقرير معركة معيّن مباشرة
  // (تبويب "تقارير المعارك" المنفصل) - اتشال بالكامل، فالبانل بقى مجرد
  // open/close عادي زي أي بانل تاني؛ فتح رسالة معركة بعينها بيحصل من جوّه
  // قايمة الرسائل نفسها (توسيع الصف) مش عن طريق state هنا. ======
  const [hospitalOpen, setHospitalOpen] = useState(false);
  const [repairOpen, setRepairOpen] = useState(false);
  // ====== بوب أب شحن رصيد المحفظة (الجواهر) - بيتفتح من زرار "+" جوه
  // بانل الجواهر في WorldHUD، نفس مكوّن DepositModal المستخدم في صفحة
  // PaymentCallbackPage/محفظة اللاعب بالظبط. ======
  const [depositOpen, setDepositOpen] = useState(false);
  const [reportsPanelOpen, setReportsPanelOpen] = useState(false);
  // ====== المكافأة اليومية / هدية الساعة - بوب أب فوق خريطة العالم بيفتح
  // تلقائيًا لما يبقى فيه مكافأة متاحة (كل التوقيت من السيرفر، شوف
  // useRewardPopups.js). مفيش صفحة/بانل دائم لهم - البوب أب بيختفي تمامًا
  // بعد الاستلام، أو بيسيب بادج صغير بس على أيقونة الهدايا في WorldHUD لو
  // اتقفل من غير استلام. ======
  const rewardPopups = useRewardPopups();
  const [selectedId, setSelectedId] = useState(null);
  const [selectedCastleId, setSelectedCastleId] = useState(null);
  const [activePanel, setActivePanel] = useState('city');
  // ====== ترتيب اللاعب الحقيقي (القوة الكلية) - نفس مصدر بيانات RankingPanel
  // (/api/ranking/vip)، بيتحدّث دوريًا عشان الرقم المعروض في WorldHUD يفضل
  // صحيح لحظيًا حتى من غير ما اللاعب يفتح بانل الترتيب بنفسه. ======
  const [myRank, setMyRank] = useState(null);
  useEffect(() => {
    let cancelled = false;
    function loadRank() {
      getVipRanking()
        .then((res) => {
          if (!cancelled) setMyRank(res.me?.rank ?? null);
        })
        .catch(() => {});
    }
    loadRank();
    const interval = setInterval(loadRank, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  // ====== حالة المدينة الموحّدة: `castle` (قلعة اللاعب نفسه) و`visit` (وضع
  // "زيارة مملكة"). لا الخريطة ولا الحالة دي عندها أي مفهوم "معركة مفتوحة
  // حاليًا" - مشاهدة المعركة بتحصل من صفحة تقرير المعركة (شوف openBattle تحت). ======
  const { castle, setCastle, visit, setVisit } = useCityState();
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [upgradingKey, setUpgradingKey] = useState(null);
  // ====== تسريع فوري بالجواهر - ترقية/إنشاء مبنى شغال بالفعل - state
  // منفصلة عن upgradingKey (اللي بتتبع بدء ترقية جديدة) عشان الزرارين (بدء
  // الترقية / تسريعها بالجواهر) يقدروا يبقوا في حالتين مختلفتين لو حصل
  // أي تداخل نادر. ======
  const [speedupSubmittingKey, setSpeedupSubmittingKey] = useState(null);

  // ====== وضع البناء (Phase 4) ======
  const [buildingTypes, setBuildingTypes] = useState([]);
  const [buildTypesLoading, setBuildTypesLoading] = useState(false);
  const [placingKey, setPlacingKey] = useState(null); // نوع المبنى المختار حاليًا لاختيار مكانه
  const [placingSubmitting, setPlacingSubmitting] = useState(false);

  // ====== وضع بناء الدفاعات (أسوار/بوابات/أبراج/فخاخ/متاريس) - نفس فكرة
  // وضع البناء العادي فوق بالظبط، بس لقطع الدفاع (defense.structures) بدل
  // مباني القلعة. القطع دي بتترسم على نفس الخريطة (IsometricWorld
  // defenseStructures prop) عشان اللاعب يشوف شكل دفاعاته الحقيقي وهو بيبني. ======
  const [defenseStructures, setDefenseStructures] = useState([]);
  const [defenseLoading, setDefenseLoading] = useState(false);
  // ====== قطع دفاع القلعة اللي بنزورها حاليًا (أسوار/بوابات/أبراج) - لازم
  // تتحمّل بشكل منفصل عن defenseStructures بتاعتي أنا (اللي فوق) لأن دي
  // بتاعة قلعة تانية (لاعب حقيقي أو NPC). كانت مش بتتحمّل خالص قبل كده،
  // فكل قلعة تتزار كانت بتبان من غير أي أسوار/أبراج/بوابات حتى لو عندها
  // فعلًا. ======
  const [visitDefenseStructures, setVisitDefenseStructures] = useState([]);
  // ====== NEW: قائد دفاعي + وضعية الذكاء الاصطناعي للقلعة اللي بنزورها -
  // بتتحمّل من نفس نداء getDefenseView (شوف handleEnterKingdom) عشان "دخول
  // المملكة" يعرض بيانات القائد الحقيقية لمعسكرات NPC بدل ما تفضل مخزنة في
  // الباك إند بس من غير ما تتعرض أبدًا. ======
  const [visitDefenseInfo, setVisitDefenseInfo] = useState({ commander: null, aiPosture: null });
  const [defenseTypes, setDefenseTypes] = useState([]);
  const [defenseTypesLoading, setDefenseTypesLoading] = useState(false);
  const [placingDefenseKey, setPlacingDefenseKey] = useState(null); // نوع القطعة الدفاعية المختارة حاليًا لاختيار مكانها
  const [placingDefenseRotation, setPlacingDefenseRotation] = useState(0);
  const [placingDefenseSubmitting, setPlacingDefenseSubmitting] = useState(false);

  // ====== اختيار قطعة دفاعية مبنية بالفعل (لعرض بانل معلوماتها/ترقيتها/
  // نقلها/حذفها) - نفس فكرة selectedId بتاع المباني العادية بالظبط، بس
  // مصفوفة مستقلة (defenseStructures) مش buildings. ======
  const [selectedDefenseId, setSelectedDefenseId] = useState(null);
  const [defenseUpgradingId, setDefenseUpgradingId] = useState(null);
  const [defenseSpeedupSubmittingId, setDefenseSpeedupSubmittingId] = useState(null);
  const [defenseRemovingId, setDefenseRemovingId] = useState(null);

  // ====== وضع نقل مبنى موجود بالفعل لمكان تاني (Move) ======
  const [movingBuilding, setMovingBuilding] = useState(null); // المبنى المختار حاليًا للنقل
  const [movingSubmitting, setMovingSubmitting] = useState(false);

  // ====== وضع نقل قطعة دفاعية موجودة بالفعل - نفس فكرة movingBuilding
  // فوق بالظبط بس لقطع الدفاع. ======
  const [movingDefenseStructure, setMovingDefenseStructure] = useState(null);
  const [movingDefenseSubmitting, setMovingDefenseSubmitting] = useState(false);

  // ====== تدريب الوحدات في الثكنة ======
  const [troopTypes, setTroopTypes] = useState([]);
  const [troopTypesLoading, setTroopTypesLoading] = useState(false);
  const [trainSubmittingKey, setTrainSubmittingKey] = useState(null);
  const [cancelSubmittingId, setCancelSubmittingId] = useState(null);
  // ====== تسريع فوري بالجواهر - أمر تدريب واقف في طابور الثكنة - نفس فكرة
  // cancelSubmittingId فوق بالظبط بس لعملية التسريع بدل الإلغاء. ======
  const [speedupTrainingSubmittingId, setSpeedupTrainingSubmittingId] = useState(null);

  // ====== القلاع القريبة (ضباب الحرب على الخريطة الرئيسية + بانل "العالم")
  // - نفس نقطة /castle/nearby ونفس الحالة (state) بيستخدمها الاتنين، لأن
  // دلوقتي في خريطة عالم واحدة بس (مش خريطة منفصلة لكل غرض). بتتحمّل مع
  // قلعة اللاعب نفسها من البداية (مش لازي/lazy) عشان الضباب والقلاع يبانوا
  // على الخريطة الرئيسية من أول ما اللاعب يفتح اللعبة. ======
  const [worldTab, setWorldTab] = useState('nearby');
  const [nearbyCastles, setNearbyCastles] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  // ====== NEW (World Manager fix) - كائنات العالم القريبة (معسكرات بربر/
  // أبراج حراسة/قرى/مدن/حصون محايدة/أطلال/عقد موارد/ديكور...إلخ) - نفس فكرة
  // nearbyCastles فوق بالظبط (حالة واحدة، مصدر واحد /castle/nearby-world-objects،
  // نفس نطاق رؤية اللاعب)، بس مصفوفة منفصلة عشان معملش أي تعديل على شكل
  // nearbyCastles أو رد /castle/nearby الموجود. ======
  const [worldObjects, setWorldObjects] = useState([]);
  const worldObjectsPollRef = useRef(null);
  // ====== NEW (World exploration fix) - آخر مركز استكشاف اتبعت للباك إند
  // فعلًا (map_slot) - بنستخدمه عشان مانكررش نفس النداء كل ما الكاميرا
  // تتحرك بكسل واحد، وexploreDebounceRef عشان نستنى الكاميرا تستقر (توقف عن
  // الحركة) قبل ما نطلب بيانات جديدة، بدل نداء API مع كل فريم سحب. ======
  const lastExploreCenterRef = useRef(null);
  const exploreDebounceRef = useRef(null);
  const [marches, setMarches] = useState([]);
  const [marchesLoading, setMarchesLoading] = useState(false);
  // ====== مسايرات الخريطة (mapMarches) - بتاعتي + بتاعة أي لاعب تاني جوه
  // نطاق رؤيتي (/castle/army/marches/nearby)، منفصلة عن `marches` (بتاعتي
  // بس - مستخدمة في بانل "جيوشي" وأزرار السحب). دي المصدر الوحيد اللي
  // بيتغذّى بيه خط/أيقونة المسير على الخريطة الرئيسية، عشان مسايرات اللاعبين
  // التانيين (صديق أو عدو) تبان لأي حد شايف نفس المنطقة، مش بس صاحب المسير. ======
  const [mapMarches, setMapMarches] = useState([]);
  const [sendingTargetId, setSendingTargetId] = useState(null);
  const [recallingId, setRecallingId] = useState(null);

  // ====== Attack Dialog - القلعة اللي اللاعب بيهاجمها دلوقتي (أو null لو
  // مفيش هجوم مفتوح). ده الحالة الوحيدة اللي بتفتح/تقفل AttackDialog - نفس
  // شكل بيانات القلعة اللي بيرجّعها /castle/nearby (أو شكل الزيارة
  // المطابق له، شوف handleAttackFromVisit). لا يوجد صفحة أو تبويب خارجي
  // لمخطط المعارك - كل حاجة (اختيار جيش/خطة/تشكيل/تقدير) بتحصل جوه
  // AttackDialog نفسها. ======
  const [attackDialogTarget, setAttackDialogTarget] = useState(null);
  const marchesPollRef = useRef(null);
  const mapMarchesPollRef = useRef(null);
  const lastMarchAutoRefreshRef = useRef(0);
  const nearbyPollRef = useRef(null);

  // ====== ربط مسير هجوم (march.id) بمعركته الحقيقية (Battle Foundation) -
  // الباك إند هو مصدر الحقيقة الوحيد للربط ده: المعركة بتتسجّل مرة واحدة بس
  // (عن طريق march.service وقت إنشاء مسير الهجوم نفسه)، ومربوطة بيه فعليًا
  // عن طريق battle.march_id في الموديل. الفرونت إند هنا بيسترجع الربط ده بس
  // (resolveBattleForMarch تحت، عن طريق GET /battles/by-march/:marchId) -
  // مفيش أي إنشاء معركة من الفرونت إند خالص، عشان تفضل معركة واحدة بالظبط
  // لكل مسير هجوم. الـ Map/Set دول مجرد cache محلي لتقليل عدد النداءات
  // (وتفادي سباق نداءات متزامنة لنفس المسير) - مش "مصدر الحقيقة": لو الصفحة
  // اترفريشت، الـ cache بيبقى فاضي وبيتملى تاني من الباك إند من غير ما أي
  // معركة تتفقد أو تتكرر. ======
  const battleIdsByMarchIdRef = useRef(new Map()); // march.id -> battle_id (cache only, always re-derivable from the backend)
  const resolvingMarchIdsRef = useRef(new Set()); // march.id لسه بيتسأل عليه دلوقتي - يمنع نداءات GET متزامنة مكررة لنفس المسير
  const startedBattleIdsRef = useRef(new Set()); // battle_id اتقال له startBattle خلال الجلسة دي (مجرد تقليل نداءات - startBattle نفسها idempotent في الباك إند)
  const [battleIdsByMarchId, setBattleIdsByMarchId] = useState(new Map()); // نفس الـ cache، بس في state عشان الواجهة (زرار "شاهد المعركة" في قايمة المسايرات) تعمل re-render

  // ====== يسترجع battle_id بتاع مسير هجوم معيّن من الباك إند (أو من الـ
  // cache المحلي لو موجود بالفعل) - دي الفانكشن الوحيدة اللي بتربط march.id
  // بـ battle_id في كل الصفحة دي؛ مفيش أي مكان تاني بيبني الربط ده أو
  // بيخترعه. بترجع null لو مفيش معركة اتسجّلت للمسير ده لسه (حالة طبيعية،
  // مش خطأ - مثلاً لو march.service لسه ما سجّلش المعركة). ======
  async function resolveBattleForMarch(marchId) {
    if (battleIdsByMarchIdRef.current.has(marchId)) {
      return battleIdsByMarchIdRef.current.get(marchId);
    }
    if (resolvingMarchIdsRef.current.has(marchId)) return null;

    resolvingMarchIdsRef.current.add(marchId);
    try {
      const battle = await getBattleByMarchId(marchId);
      if (battle?.battle_id) {
        battleIdsByMarchIdRef.current.set(marchId, battle.battle_id);
        setBattleIdsByMarchId((prev) => new Map(prev).set(marchId, battle.battle_id));
        return battle.battle_id;
      }
      return null;
    } catch (err) {
      return null;
    } finally {
      resolvingMarchIdsRef.current.delete(marchId);
    }
  }

  // ====== قائمة السياق على الخريطة (Inspect/Attack/Profile) - بتتفتح لما
  // اللاعب يضغط على قلعة قريبة مباشرة على الخريطة، وبانل التفاصيل الخفيف
  // (معاينة القلعة/ملف اللاعب) اللي بيتفتح من خيارات القائمة دي. كله بيحصل
  // فوق نفس الخريطة من غير أي انتقال لصفحة تانية. ======
  const [contextMenuCastleId, setContextMenuCastleId] = useState(null);
  // ====== وضع "زيارة مملكة" - لما اللاعب يختار "دخول المملكة" لقلعة قريبة،
  // بنحمّل القلعة الحقيقية بالكامل (نفس شكل getMyCastle) ونعرضها بنفس مشهد
  // القلعة (IsometricWorld) بدل بوب أب معاينة مصغّرة. visit.data == null
  // لحد ما الطلب يرجع (شوف VisitKingdomBar لحالة التحميل). ======
  const [visitSelectedId, setVisitSelectedId] = useState(null);

  // ====== أفعال إضافية جوه وضع "زيارة مملكة" - استكشاف/إرسال موارد/ملف
  // اللاعب/رسالة (شوف VisitKingdomBar). كل واحدة state مستقلة بسيطة
  // (null = مقفولة) عشان تتفتح/تتقفل من غير ما تأثر على وضع الزيارة نفسه. ======
  const [scoutReport, setScoutReport] = useState(null); // { loading, data, targetName } | null
  const [sendResourcesModal, setSendResourcesModal] = useState(null); // { targetId, targetName, submitting } | null
  // ====== Phase 1 (Reinforcement & Battle System) - Requirement 2/3/4: نفس
  // فكرة sendResourcesModal بالظبط بس لإرسال تعزيزات (جنود) بدل موارد. ======
  const [sendReinforcementModal, setSendReinforcementModal] = useState(null); // { targetId, targetName, submitting } | null
  const [playerProfile, setPlayerProfile] = useState(null); // { loading, data } | null
  const [messageModal, setMessageModal] = useState(null); // { targetId, targetName, submitting } | null

  // ====== بانل "بحث العالم" (World Search) - بحث باسم/رقم لاعب/رقم مملكة
  // بيتخطى ضباب الحرب تمامًا (شوف WorldSearchModal) + "اذهب للإحداثيات" +
  // مفضّلة القلاع. مفيش أي حالة تانية لازمة هنا غير فتح/قفل البانل نفسه -
  // البحث والمفضّلة كلهم جوه المكوّن نفسه. ======
  const [worldSearchOpen, setWorldSearchOpen] = useState(false);

  // ====== بانل "معلومات القلعة" (Castle Info) - المكان الثابت لهوية اللاعب
  // (اسمه/رقمه/رقم مملكته/إحداثياته/تحالفه/قوته) - بيتفتح من زرار "معلوماتي"
  // الثابت في WorldHUD (متاح في أي وقت، حتى وقت الزيارة)، وكمان من الضغط
  // على المبنى الرئيسي (Town Hall) بتاعك نفسك على الخريطة - شوف
  // handleSelectDisplayBuilding وhandleManageTownHall تحت. ======
  const [castleInfoOpen, setCastleInfoOpen] = useState(false);

  // ====== اختيار الهيرو الإجباري - بيبان قبل ما اللاعب يشوف الخريطة لأول
  // مرة (castle.hero === null بعد أول تحميل ناجح للقلعة). `heroesList` بترجع
  // فاضية لحد ما /castle/heroes يرد، فالمودال هيفضل من غير أبطال (وبالتالي
  // من غير زرار مفعّل) لحظة ما استحوى - نفس فلسفة أي لودر تاني هنا. ======
  const [heroesList, setHeroesList] = useState([]);
  const needsHeroSelection = Boolean(castle) && !castle.hero;

  const pollRef = useRef(null);
  const defensePollRef = useRef(null);
  const lastAutoRefreshRef = useRef(0);
  const lastDefenseAutoRefreshRef = useRef(0);

  function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    return getMyCastle()
      .then((c) => setCastle(c))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // ====== قائمة الأبطال المتاحة - بتتحمّل بس أول ما نكتشف إن اللاعب لسه
  // مختارش بطل (castle.hero === null) عشان اللاعب اللي خلاص عنده بطل ميعملش
  // طلب زيادة مالوش لازمة كل مرة يفتح فيها الخريطة. ======
  useEffect(() => {
    if (needsHeroSelection && heroesList.length === 0) {
      getHeroes()
        .then((data) => setHeroesList(data.heroes || []))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsHeroSelection]);

  // ====== تأكيد اختيار البطل - القلعة الراجعة من الباك إند فيها hero
  // مملوء دلوقتي، فتحديث castle بيها بيقفل المودال تلقائيًا (needsHeroSelection
  // بيرجع false على طول من غير أي state تانية لازم نديرها هنا). ======
  function handleChooseHero(heroKey) {
    return chooseHero(heroKey).then((updatedCastle) => {
      setCastle(updatedCastle);
    });
  }

  function loadBuildingTypes() {
    setBuildTypesLoading(true);
    getBuildingTypes()
      .then((types) => setBuildingTypes(types))
      .catch(() => {})
      .finally(() => setBuildTypesLoading(false));
  }

  // ====== تحميل قطع الدفاع الحقيقية بتاعة قلعتي - عشان تترسم على الخريطة
  // وتتحسب منها الخانات المشغولة وقت وضع بناء (مبنى عادي أو قطعة دفاعية). ======
  function loadMyDefense({ silent = false } = {}) {
    if (!silent) setDefenseLoading(true);
    return getMyDefense()
      .then((data) => setDefenseStructures(data.structures || []))
      .catch(() => {})
      .finally(() => setDefenseLoading(false));
  }

  function loadDefenseTypes() {
    setDefenseTypesLoading(true);
    getDefenseStructureTypes()
      .then((types) => setDefenseTypes(types))
      .catch(() => {})
      .finally(() => setDefenseTypesLoading(false));
  }

  function loadTroopTypes() {
    setTroopTypesLoading(true);
    getTroopTypes()
      .then((data) => setTroopTypes(data.troop_types))
      .catch(() => {})
      .finally(() => setTroopTypesLoading(false));
  }

  // ====== تحميل القلاع القريبة - المصدر الوحيد لهما (الخريطة الرئيسية
  // وبانل "العالم" الاتنين). /castle/nearby هي فعليًا الفلترة الوحيدة
  // لأي بيانات (الباك إند مبيرجّعش أي قلعة برّه نصف قطر رؤية اللاعب أصلًا)
  // - الفرونت إند هنا مش بيعمل أي فلترة إضافية، بيعرض بس اللي وصله. ======
  // ====== دمج نتايج جديدة (من قلعتك أو من مكان استكشاف بعيد) مع القايمة
  // الحالية بدل استبدالها بالكامل - نفس فلسفة الضباب (FogChunks): أي منطقة
  // اتشافت قبل كده تفضل مكشوفة، فأي NPC/كائن اتشاف قبل كده يفضل ظاهر حتى
  // لو الكاميرا رجعت لقلعتك تاني ونداء البولّينج العادي رجع نتيجة مختلفة. ======
  function mergeById(prev, incoming) {
    const map = new Map(prev.map((item) => [item.id, item]));
    for (const item of incoming) map.set(item.id, item);
    return Array.from(map.values());
  }

  // ====== تحميل القلاع القريبة - المصدر الوحيد لهما (الخريطة الرئيسية
  // وبانل "العالم" الاتنين). /castle/nearby هي فعليًا الفلترة الوحيدة
  // لأي بيانات (الباك إند مبيرجّعش أي قلعة برّه نصف قطر رؤية اللاعب أصلًا)
  // - الفرونت إند هنا مش بيعمل أي فلترة إضافية، بيعرض بس اللي وصله.
  // `exploreCenter` اختياري (map_slot) - لو موجود، الباك إند بيولّد ويرجّع
  // القلاع حوالين النقطة دي بدل قلعتك (شوف handleCameraChange تحت). ======
  function loadNearbyCastles({ silent = false, exploreCenter = null } = {}) {
    if (!silent) setNearbyLoading(true);
    return getNearbyCastles(exploreCenter)
      .then((castles) => setNearbyCastles((prev) => mergeById(prev, castles)))
      .catch(() => {})
      .finally(() => setNearbyLoading(false));
  }

  // ====== NEW (World Manager fix) - نفس فكرة loadNearbyCastles فوق بالظبط،
  // بس لكائنات العالم (/castle/nearby-world-objects). دايمًا silent (زي
  // loadMapMarches) - مفيش لودر مخصوص ليها لأنها بتترسم على الخريطة الرئيسية
  // بس، مفيش تاب منفصل ليها في بانل "العالم" حاليًا. ======
  function loadWorldObjects(exploreCenter = null) {
    return getNearbyWorldObjects(exploreCenter)
      .then((objects) => setWorldObjects((prev) => mergeById(prev, objects)))
      .catch(() => {});
  }

  // ====== NEW (World exploration fix) - بتتنادى من IsometricWorld (شوف
  // onCameraChange) كل ما الكاميرا تتحرك - بنستنى شوية (debounce) لحد ما
  // تستقر، وبعدين لو استقرت في مكان بعيد كفاية عن آخر نقطة اتبعتت، بنحوّل
  // مكان الكاميرا الحالي (بكسل حقيقي على لوحة العالم) لإحداثية map_slot
  // حقيقية، ونطلب من الباك إند يولّد ويرجّع القلاع/الكائنات حوالين النقطة
  // دي - عشان أي حتة في العالم اللاعب يستكشفها فعليًا (مش بس حوالين قلعته)
  // تتملى بمعسكرات NPC وكائنات عالم زي أي منطقة تانية. ======
  function handleCameraChange(v) {
    if (!castle?.map_slot) return;
    if (exploreDebounceRef.current) clearTimeout(exploreDebounceRef.current);
    exploreDebounceRef.current = setTimeout(() => {
      const screenCenterWorldX = (v.viewportWidth / 2 - v.x) / v.scale;
      const screenCenterWorldY = (v.viewportHeight / 2 - v.y) / v.scale;
      const { gx, gy } = worldToGrid(screenCenterWorldX, screenCenterWorldY);
      const center = gridToMapSlot(gx, gy, castle.map_slot);

      const last = lastExploreCenterRef.current;
      const movedSlots = last
        ? Math.max(Math.abs(center.x - last.x), Math.abs(center.y - last.y)) / 40
        : Infinity;
      // أقل من 3 خانات فرق عن آخر نداء - مش مستاهل نداء API جديد (لسه جوه
      // نفس المنطقة تقريبًا، النطاق اللي اتطلب قبل كده لسه بيغطيها).
      if (movedSlots < 3) return;

      lastExploreCenterRef.current = center;
      loadNearbyCastles({ silent: true, exploreCenter: center });
      loadWorldObjects(center);
    }, 500);
  }

  function loadMarches({ silent = false } = {}) {
    if (!silent) setMarchesLoading(true);
    return getMarches()
      .then((data) => setMarches(data))
      .catch(() => {})
      .finally(() => setMarchesLoading(false));
  }

  // ====== تحميل مسايرات الخريطة (بتاعتي + بتاعة لاعبين تانيين قريبين) - دايمًا
  // silent، لأن دي بتتحدّث في الخلفية بس (مفيش لودر مخصوص لها زي المسايرات
  // بتاعتي في بانل "العالم"). ======
  function loadMapMarches() {
    return getNearbyMarches()
      .then((data) => setMapMarches(data))
      .catch(() => {});
  }

  useEffect(() => {
    load();
    // قطع الدفاع الحقيقية بتاعة قلعتي - بتتحمّل من البداية برضه (مش لازي)
    // عشان تبان على الخريطة الرئيسية من أول ما اللعبة تفتح، وعشان خانات
    // البناء (عادي أو دفاعي) تتحسب صح من أول لحظة.
    loadMyDefense();
    // القلاع القريبة (ضباب الحرب على الخريطة الرئيسية) بتتحمّل من البداية
    // برضه - مش لازي (lazy) زي زمان لما كانت مستخدمة بس جوه بانل "العالم" -
    // عشان الخريطة تتعرض عليها القلاع القريبة والضباب من أول ما اللعبة تفتح.
    loadNearbyCastles();
    // ====== NEW (World Manager fix) - نفس منطق تحميل القلاع القريبة فوق
    // بالظبط، بس لكائنات العالم - بتتحمّل من البداية (مش لازي) عشان تبان على
    // الخريطة الرئيسية من أول ما اللعبة تفتح. ======
    loadWorldObjects();
    // نفس المنطق للمسايرات (marches) - لازم تتحمّل من البداية وتفضل متبولّة
    // طول الوقت (مش لازي زي زمان) عشان خطوط المسايرات وأيقونة الجيش يبانوا
    // على الخريطة الرئيسية دايمًا، حتى لو بانل "العالم" مقفول أصلًا.
    loadMarches({ silent: true });
    loadMapMarches();
    // عدّاد الوقت المعروض كل ثانية (لعدّاد الترقية/البناء)، ومزامنة حقيقية مع
    // السيرفر كل 20 ثانية (تصحيح أي فرق + اكتشاف الترقيات اللي خلصت)
    const tick = setInterval(() => setNow(Date.now()), 1000);
    pollRef.current = setInterval(() => {
      load({ silent: true });
      // ====== المكافأة اليومية/هدية الساعة - بنتأكد من أهليتهم هنا "أثناء
      // التحديثات العادية للبيانات" (نفس التيك ده بالظبط) بدل ما نعمل
      // تايمر مستقل بيسأل السيرفر لوحده كل كام ثانية (شوف checkOnRefresh
      // في useRewardPopups.js - بيتأكد بس لو مفيش عدّاد محلي شغال أصلًا). ======
      rewardPopups.checkOnRefresh();
    }, 20000);
    defensePollRef.current = setInterval(() => loadMyDefense({ silent: true }), 20000);
    // بولّينج خفيف مستقل للقلاع القريبة - شغال طول ما الخريطة مفتوحة (يعني
    // طول الوقت دلوقتي، مش بس لما بانل معيّن يتفتح)، عشان أي تغيّر في العالم
    // حوالين اللاعب (قلعة جديدة اتولّدت، لاعب اتحرك...) يتحدّث على الخريطة
    // والضباب أوتوماتيك من غير ما اللاعب يعمل رفرش بنفسه.
    nearbyPollRef.current = setInterval(() => loadNearbyCastles({ silent: true }), 15000);
    // ====== NEW (World Manager fix) - بولّينج خفيف مستقل لكائنات العالم -
    // نفس فترة القلاع القريبة بالظبط (15 ثانية)، عشان أي كائن جديد اتولّد
    // حوالين اللاعب (منطقة جديدة اتعمّرت) يبان أوتوماتيك من غير رفرش يدوي. ======
    worldObjectsPollRef.current = setInterval(loadWorldObjects, 15000);
    // بولّينج خفيف مستقل للمسايرات - شغال طول الوقت (مش بس وقت ما بانل
    // "العالم" مفتوح) عشان مسايرات جديدة تظهر على الخريطة أوتوماتيك، والمسايرات
    // اللي وصلت وخلصت تتشال منها أوتوماتيك برضه أول ما حالتها تتحدّث لـ
    // "resolved" من الباك إند.
    marchesPollRef.current = setInterval(() => loadMarches({ silent: true }), 15000);
    // بولّينج مستقل لمسايرات الخريطة (بتاعتي + بتاعة لاعبين تانيين) - أسرع
    // شوية من بولّينج مسايراتي (5 ثواني بدل 15) عشان حركة الجيوش على
    // الخريطة (بتاعتي وبتاعة غيري) تبان محدّثة بشكل قريب من اللحظي لكل
    // اللاعبين الشايفين نفس المنطقة - بما فيهم ظهور مسير جديد واختفاء مسير
    // خلص لكل واحد فيهم في نفس التوقيت تقريبًا (كلهم بيستعلموا نفس
    // الشرط: status=traveling وarrives_at لسه في المستقبل).
    mapMarchesPollRef.current = setInterval(loadMapMarches, 5000);
    return () => {
      clearInterval(tick);
      clearInterval(pollRef.current);
      clearInterval(defensePollRef.current);
      clearInterval(nearbyPollRef.current);
      clearInterval(worldObjectsPollRef.current);
      clearInterval(marchesPollRef.current);
      clearInterval(mapMarchesPollRef.current);
      if (exploreDebounceRef.current) clearTimeout(exploreDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildings = castle?.buildings || [];
  const selectedBuilding = buildings.find((b) => b.id === selectedId) || null;
  const selectedDefenseStructure = defenseStructures.find((s) => s.id === selectedDefenseId) || null;
  const activeUpgradeBuilding = buildings.find((b) => b.upgrade);

  // ====== FIX (city_decor rendering) - نفس فكرة buildings/unlockedTiles فوق
  // بالظبط: مصدرها الوحيد castle.city_decor (جاي من formatCastle) - مفيش أي
  // حساب/توليد هنا في الفرونت إند خالص. ======
  const cityDecor = castle?.city_decor || [];

  // ====== خانات الأرض المفتوحة فعليًا - مصدرها الوحيد castle.city (جايه
  // بالكامل من /castle/me، محسوبة في الباك إند). مفيش أي حساب لحدود المدينة
  // هنا في الفرونت إند خالص؛ مساحة المدينة بتكبر تلقائيًا في الباك إند كل ما
  // المبنى الرئيسي يترقّى (مفيش شراء أرض خالص) - لو الباك إند رجّع خانات
  // أكتر بعد ترقية، هي هتبان على الخريطة على طول من غير أي منطق إضافي هنا. ======
  const unlockedTiles = castle?.city?.unlocked_tiles || [];

  // ====== لما اللاعب يفتح بانل معلومات الثكنة، نجيب أنواع الوحدات (Lazy) -
  // نفس فكرة loadBuildingTypes بتاعة قائمة البناء، بس هنا بيتفعّل أول ما
  // مبنى الثكنة يتفتح مش لازم زرار مخصوص. ======
  useEffect(() => {
    if (selectedBuilding?.key === 'barracks') {
      loadTroopTypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBuilding?.id]);

  // ====== *** فيكس: "قوة الجيش الخام وقوة الجيش بعد الخطة دايمًا صفر في
  // Attack Dialog" *** - السبب: troopTypes (اللي AttackDialog بيحسب منها
  // attackPower - statsByKey.get(key)?.attack لكل وحدة مختارة) كانت بتتحمّل
  // بس لما اللاعب يفتح بانل الثكنة (useEffect فوق)، مش لما يفتح Attack
  // Dialog. لو اللاعب هاجم قلعة من غير ما يفتح بانل الثكنة الأول في نفس
  // الجلسة، troopTypes كانت بتفضل [] طول الوقت → statsByKey فاضية →
  // attackPower = 0 دايمًا (وبالتبعية planAdjustedPower كمان، لأنها ضرب
  // attackPower في المضاعف). الحل: نحمّل troopTypes أول ما Attack Dialog
  // يتفتح لو لسه معندناش نسخة محمّلة، بنفس فلسفة الـ lazy load بتاعة بانل
  // الثكنة بالظبط - من غير طلب مكرر لو اللاعب فتح البانلين في نفس الجلسة. ======
  useEffect(() => {
    if (attackDialogTarget && troopTypes.length === 0 && !troopTypesLoading) {
      loadTroopTypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackDialogTarget?.id]);

  // ====== لما بانل "العالم" يتفتح على تبويب المسايرات، نعمل تحديث فوري
  // (مش silent - يبيّن لودر) عشان القايمة تبان محدّثة على طول - المسايرات
  // نفسها بقت متحمّلة وبتتبولّ أصلًا من البداية (شوف الـ useEffect الأول)
  // عشان تبان على الخريطة الرئيسية دايمًا، فمفيش داعي لـ interval تاني هنا. ======
  useEffect(() => {
    if (activePanel === 'world' && worldTab === 'marches') loadMarches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, worldTab]);

  // ====== لما مسير يوصل وقته (سواء غارة أو عودة)، نعمل تحديث فوري (silent)
  // للقلعة والمسايرات مع بعض - عشان جيشك/مواردك يتحدّثوا أوتوماتيك. وكمان:
  // لو المسير ده غارة (direction === 'attack')، نسترجع الـ battle_id بتاعه
  // من الباك إند (resolveBattleForMarch - مفيش أي إنشاء هنا)، وبعدين نبدأ
  // المعركة فعليًا عن طريق startBattle. مفيش أي حساب معركة هنا، بس نداء API
  // بس - مشاهدة المعركة نفسها بتحصل من صفحة تقرير المعركة (`/battle/:battleId`).
  // لأن الاسترجاع دايمًا من الباك إند، حتى لو الصفحة اترفريشت وهي المعركة
  // لسه شغالة/لسه مبدأتش، التأثير ده هيلاقيها تاني عادي. ======
  useEffect(() => {
    const overdueMarch = marches.some((m) => m.status === 'traveling' && new Date(m.arrives_at).getTime() <= now);
    if (overdueMarch && Date.now() - lastMarchAutoRefreshRef.current > 1500) {
      lastMarchAutoRefreshRef.current = Date.now();
      load({ silent: true });
      loadMarches({ silent: true });
      loadMapMarches();
    }

    for (const m of marches) {
      if (m.direction !== 'attack') continue;
      if (m.status === 'traveling') continue; // لسه في الطريق
      if (m.report?.outcome === 'recalled') continue; // اتسحب قبل ما يوصل - مفيش معركة فعلية حصلت

      resolveBattleForMarch(m.id).then((battleId) => {
        if (!battleId || startedBattleIdsRef.current.has(battleId)) return;

        startedBattleIdsRef.current.add(battleId);
        // ====== المسير وصل - نبدأ المعركة فعليًا في الباك إند (idempotent).
        // مفيش أي تتبّع/عرض هنا بعد كده: مشاهدة المعركة بقت من خلال صفحتها
        // المستقلة (`/battle/:battleId`, شوف openBattle تحت) لما اللاعب
        // يضغط "شاهد المعركة" بنفسه. ======
        startBattle(battleId).catch((err) => {
          // فشل بدء المعركة ميوقفش باقي تدفق اللعبة. لكن لو الباك إند رد
          // بـ 400 (رفض واضح ودائم - زي إن المعركة خلصت/اتلغت خلاص)، مبنعيدش
          // المحاولة تاني: كانت بتفضل تفشل بنفس الشكل كل تيك وتغرق الشبكة
          // بمئات الطلبات المتكررة (المشكلة اللي كانت ظاهرة قبل كده). بنشيلها
          // من "started" بس لو الفشل ممكن يكون مؤقت (مشكلة شبكة/سيرفر).
          const status = err?.response?.status;
          if (status !== 400) {
            startedBattleIdsRef.current.delete(battleId);
          }
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, marches]);

  // ====== لما عدّاد ترقية/بناء أو أمر تدريب يوصل صفر، نعمل تحديث فوري
  // (silent) بدل ما ننتظر لحد الـ poll الدوري كل 20 ثانية - عشان المبنى/
  // الجيش يتحدّث أوتوماتيك من غير ما المستخدم يعمل رفرش بنفسه. ======
  useEffect(() => {
    const overdueBuilding = buildings.some((b) => b.upgrade && new Date(b.upgrade.completes_at).getTime() <= now);
    const overdueTraining = (castle?.training_queue || []).some(
      (o) => new Date(o.completes_at).getTime() <= now
    );
    if ((overdueBuilding || overdueTraining) && Date.now() - lastAutoRefreshRef.current > 1500) {
      lastAutoRefreshRef.current = Date.now();
      load({ silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  // ====== نفس فكرة overdueBuilding فوق بالظبط، بس لقطع الدفاع
  // (defenseStructures): لما عدّاد بناء/ترقية قطعة دفاعية يوصل صفر، نعمل
  // تحديث فوري (silent) بدل ما ننتظر لحد الـ poll الدوري كل 20 ثانية
  // (defensePollRef تحت) - قبل الإضافة دي كان لازم اللاعب يستنى لحد 20
  // ثانية (أو يعمل رفرش يدوي) عشان يشوف إن القطعة خلصت بناء فعليًا. ======
  useEffect(() => {
    const overdueDefense = defenseStructures.some((s) => {
      const buildDue = s.build?.state === 'building' && s.build.completes_at && new Date(s.build.completes_at).getTime() <= now;
      const upgradeDue = s.upgrade?.in_progress && s.upgrade.completes_at && new Date(s.upgrade.completes_at).getTime() <= now;
      return buildDue || upgradeDue;
    });
    if (overdueDefense && Date.now() - lastDefenseAutoRefreshRef.current > 1500) {
      lastDefenseAutoRefreshRef.current = Date.now();
      loadMyDefense({ silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  // ====== "الجواهر" المعروضة في الشريط العلوي (WorldHUD) دلوقتي بقت رصيد
  // المحفظة الحقيقي (wallet balance) - نفس الرصيد المستخدم فعليًا في تدريب
  // الوحدة المميّزة (elite_guard - راجع castleService.startPremiumTraining)،
  // مش رقم Placeholder ثابت زي الأول (كان مربوط بحاجة). formatCompactNumber
  // بيقبل رقم عادي (زي resources.gold.stored) فمفيش داعي لأي تحويل هنا. ======
  const resources = castle
    ? {
        gold: formatCompactNumber(castle.resources.gold.stored),
        wood: formatCompactNumber(castle.resources.wood.stored),
        stone: formatCompactNumber(castle.resources.stone.stored),
        population: PLACEHOLDER_POPULATION,
        gems: formatCompactNumber(walletBalance ?? 0),
      }
    : { gold: '0', wood: '0', stone: '0', population: PLACEHOLDER_POPULATION, gems: formatCompactNumber(walletBalance ?? 0) };

  // ====== وضع "زيارة مملكة" - مشتقات جاهزة للعرض من حالة visit. ملحوظة
  // Phase A: `visit` بقت دايمًا كائن { loading, data } (بدل null) جاي من
  // useCityState - عشان isVisiting يفضل بنفس المعنى بالظبط زي الأول (true
  // بس وقت في تحميل شغال أو بيانات زيارة فعلية)، بقينا بنتحقق من
  // loading/data نفسهم بدل ما نتحقق من truthiness الكائن كله. ======
  const isVisiting = Boolean(visit.loading || visit.data);
  const visitLoading = Boolean(visit?.loading);
  const visitData = visit?.data || null;
  const visitBuildings = visitData?.buildings || [];
  const visitSelectedBuilding = visitBuildings.find((b) => b.id === visitSelectedId) || null;

  // ====== مباني ومبنى مختار جاهزين للعرض: القلعة اللي بيزورها لو وضع
  // الزيارة شغال، وإلا قلعة اللاعب نفسه. ======
  const displayBuildings = isVisiting ? visitBuildings : buildings;
  const displaySelectedId = isVisiting ? visitSelectedId : selectedId;
  const displaySelectedBuilding = isVisiting ? visitSelectedBuilding : selectedBuilding;

  // ====== نفس فكرة displayBuildings بالظبط لخانات الأرض - وقت الزيارة بنعرض
  // أرض القلعة اللي بيزورها (readOnly)، وعادي بنعرض أرض قلعة اللاعب نفسها. ======
  const displayUnlockedTiles = isVisiting ? visitData?.city?.unlocked_tiles || [] : unlockedTiles;

  // ====== FIX (city_decor rendering) - نفس فكرة displayBuildings/
  // displayUnlockedTiles بالظبط: قلعة الزيارة وقت "دخول مملكة"، وإلا قلعة
  // اللاعب نفسه. ======
  const displayCityDecor = isVisiting ? visitData?.city_decor || [] : cityDecor;

  function handleSelectDisplayBuilding(building) {
    if (isVisiting) {
      setVisitSelectedId(building.id);
      return;
    }
    // ====== المبنى الرئيسي (Town Hall) هو اللي بصريًا بيمثّل "القلعة" ككل
    // (أكبر مبنى في النص) - الضغط عليه (وانت مش زايِر حد) بيفتح بانل هويتك
    // بدل بانل ترقية عادي. الترقية نفسها لسه متاحة من جوه البانل ده (زرار
    // "إدارة المبنى الرئيسي" - شوف handleManageTownHall). ======
    if (building.key === 'town_hall') {
      setCastleInfoOpen(true);
      return;
    }
    setSelectedId(building.id);
  }

  // ====== زرار "إدارة المبنى الرئيسي" جوه بانل معلومات القلعة - بيقفل
  // البانل ويفتح بانل ترقية المبنى الرئيسي العادي (BuildingInfoModal) بدل
  // ما نكسر إمكانية ترقيته أصلًا (المسار الوحيد ليها كان الضغط على المبنى
  // نفسه قبل ما نحوّله لبانل الهوية). بيخرج من وضع الزيارة الأول لو كان
  // شغال عشان مايفتحش مبنى قلعة حد تاني بالغلط. ======
  function handleManageTownHall() {
    setCastleInfoOpen(false);
    if (isVisiting) {
      setVisit(null);
      setVisitSelectedId(null);
    }
    const townHall = buildings.find((b) => b.key === 'town_hall');
    if (townHall) setSelectedId(townHall.id);
  }

  // ====== "شاهد المعركة" (زرار صريح من اللاعب في قايمة المسايرات أو تجمّع
  // تحالف) - ====== Battle Reports removal: مبقاش بيفتح تقرير معركة منفصل
  // بمعرّف معيّن (الشاشة دي اتشالت بالكامل) - دلوقتي بيفتح بانل "الرسائل"
  // بس، لأن تقرير المعركة (لو خلصت فعليًا) بقى وصل كرسالة بريد فيها الملخص
  // الكامل بالفعل. خريطة العالم نفسها متعرفش حاجة عن حالة المعركة ولا بترسم
  // أي حاجة منها. ======
  function openBattle() {
    setReportsPanelOpen(true);
  }

  // ====== المستخدم اختار "هجوم" (من قائمة السياق على الخريطة، من قايمة
  // "القلاع القريبة" جوه بانل العالم، أو من شريط زيارة مملكة) - بنفتح
  // AttackDialog مباشرة على القلعة دي (جيش + خطة معركة + تشكيل + تقدير في
  // نافذة واحدة متكاملة - مفيش صفحة أو تبويب خارجي)، وكمان بنحرّك الكاميرا
  // فعليًا لمكان القلعة دي على الخريطة عشان تبان وراء النافذة. ======
  // ====== NEW (Attackable World Objects) - كائنات العالم بترتسم على الخريطة
  // بمقياس حقيقي متناسب (mapSlotToGrid - راجع WorldObjectMarker في
  // IsometricWorld.jsx)، مش المقياس المضغوط جوه نصف قطر الضباب المستخدم
  // للقلاع القريبة (nearbyCastleToGrid). لازم نفس الفرع هنا وإلا الكاميرا
  // هتتحرك لمكان غير مكان الماركر الحقيقي على الشاشة. ======
  function focusCameraOnTarget(target) {
    if (!castle?.map_slot) return;
    const { gx, gy } = target.is_world_object
      ? mapSlotToGrid(target.map_slot, castle.map_slot)
      : nearbyCastleToGrid(target, castle.map_slot);
    const { x, y } = gridToWorld(gx, gy);
    viewportRef.current?.focusOn(x, y);
  }

  function openAttackPanelFor(nearbyCastle) {
    setContextMenuCastleId(null);
    setSelectedCastleId(nearbyCastle.id);
    setAttackDialogTarget(nearbyCastle);
    focusCameraOnTarget(nearbyCastle);
  }

  // ====== المستخدم ضغط على قلعة قريبة (لاعب أو NPC) على الخريطة الرئيسية
  // نفسها - بنفتح قائمة سياق (Inspect/Attack/Profile) فوق القلعة على الخريطة
  // مباشرة (زي Rise of Kingdoms/Lords Mobile) بدل ما نفتح بانل جانبي على
  // طول، وبنحرّك الكاميرا لمكانها عشان تبان في نص الشاشة. ======
  function handleMapCastleClick(nearbyCastle) {
    setSelectedCastleId(nearbyCastle.id);
    setContextMenuCastleId(nearbyCastle.id);
    focusCameraOnTarget(nearbyCastle);
  }

  function closeCastleMenu() {
    setContextMenuCastleId(null);
  }

  // ====== NEW (Attackable World Objects) - نفس فكرة handleMapCastleClick
  // بالظبط بس لكائن عالم معادي خام (Barbarian Camp/Military Camp/...) - بنهوّي
  // شكله لنفس شكل "قلعة قريبة" (worldObjectToAttackTarget - راجع
  // attackableWorldObject.js) وبعدين بنعيد استخدام handleMapCastleClick زي ما
  // هي بالظبط، فمفيش أي منطق قائمة سياق/تركيز كاميرا مكرر هنا. ======
  function handleSelectWorldObject(object) {
    handleMapCastleClick(worldObjectToAttackTarget(object));
  }

  // ====== NEW (Attackable World Objects) - "استكشاف" مباشر من قائمة السياق
  // نفسها (مفيش حاجة لدخول "معاينة"/وضع الزيارة الأول) - نفس
  // castleService.scoutCastle/resolveAttackableCastle بالظبط، ونفس
  // ScoutReportModal العام (scoutReport state) اللي شريط الزيارة بيستخدمه. ======
  function handleScoutFromContextMenu(target) {
    if (!target) return;
    closeCastleMenu();
    const targetName = target.is_npc ? target.name : target.owner_name;
    setScoutReport({ loading: true, data: null, targetName });
    scoutCastle(target.id)
      .then((report) => setScoutReport({ loading: false, data: report, targetName }))
      .catch((err) => {
        toastError(err.response?.data?.error || 'تعذر تنفيذ الاستكشاف');
        setScoutReport(null);
      });
  }

  // ====== FIX (Gather action for gatherable world objects) - حصاد فوري
  // لعقدة موارد من قائمة السياق - بيقفل القائمة ويستخدم raw_id (الـ WorldObject
  // id الخام، مش شكل الهدف المهوّى wobj:<id> - راجع attackableWorldObject.js)
  // عشان ينادي /castle/world-objects/:id/gather، وبيحدّث قلعة اللاعب فورًا
  // (نفس نمط أي فعل تاني بيرجع قلعة محدّثة زي upgradeBuilding). ======
  function handleGatherFromContextMenu(target) {
    if (!target) return;
    closeCastleMenu();
    gatherWorldObject(target.raw_id || target.id)
      .then(({ castle: updatedCastle, gained }) => {
        setCastle(updatedCastle);
        const total = (gained?.gold || 0) + (gained?.wood || 0) + (gained?.stone || 0);
        toastSuccess(total > 0 ? `اتحصد ${total} وحدة موارد ⛏️` : 'مفيش موارد اتحصدت - مخازنك مليانة');
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'تعذر الحصاد');
      });
  }

  // ====== FIX (Interact action for interactable world objects) - زيارة سلمية
  // بسيطة (قرية/مدينة محايدة) - الكائنات دي loot: 0 دايمًا ومفيش لها قلعة
  // ظل خالص (راجع worldObjectCastleBridge.getOrCreateShadowCastle - بترفض
  // أي حاجة مش attackable)، فمفيش أي حاجة تتطلب استعلام سيرفر هنا - مجرد
  // رسالة وصفية عن الزيارة نفسها (client-side بحت). ======
  function handleInteractFromContextMenu(target) {
    if (!target) return;
    closeCastleMenu();
    toastSuccess(`زرت ${target.name || 'المكان ده'} - أهله رحّبوا بيك بسلام 🤝`);
  }

  // ====== "دخول المملكة" من قائمة السياق - بيحمّل القلعة الحقيقية بالكامل
  // (نفس شكل getMyCastle) ويدخل وضع الزيارة فورًا (اللودر بيبان جوه
  // VisitKingdomBar لحد ما الرد يوصل) - مفيش أي بوب أب معاينة مصغّرة. ======
  function handleEnterKingdom(nearbyCastle) {
    closeCastleMenu();
    setSelectedCastleId(null);
    setActivePanel('city');
    setVisit({ loading: true, data: null });
    setVisitDefenseStructures([]);
    getCastleView(nearbyCastle.id)
      .then((data) => {
        setVisit({ loading: false, data });
        viewportRef.current?.goToMyCastle();
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'تعذر دخول المملكة دي دلوقتي');
        setVisit(null);
      });
    // ====== قطع دفاع القلعة اللي بنزورها (أسوار/بوابات/أبراج) - نداء منفصل
    // عن getCastleView فوق (اللي بيرجّع مباني/جيش/موارد بس) عشان مشهد
    // الزيارة يرسم نفس الدفاعات الحقيقية بتاعة القلعة دي (لاعب حقيقي أو
    // NPC)، بالظبط زي ما بيحصل لقلعتي انا (loadMyDefense). فشل هنا مش لازم
    // يمنع الزيارة نفسها، فبنسيب المصفوفة فاضية بس لو النداء فشل. ======
    getDefenseView(nearbyCastle.id)
      .then(({ structures, commander, aiPosture }) => {
        setVisitDefenseStructures(structures);
        setVisitDefenseInfo({ commander, aiPosture });
      })
      .catch(() => {
        setVisitDefenseStructures([]);
        setVisitDefenseInfo({ commander: null, aiPosture: null });
      });
  }

  // ====== خروج من وضع الزيارة - بيرجّع الكاميرا والواجهة لقلعة اللاعب نفسه ======
  function handleExitVisit() {
    setVisit(null);
    setVisitSelectedId(null);
    setVisitDefenseStructures([]);
    setVisitDefenseInfo({ commander: null, aiPosture: null });
    setScoutReport(null);
    setSendResourcesModal(null);
    setSendReinforcementModal(null);
    setPlayerProfile(null);
    setMessageModal(null);
    viewportRef.current?.goToMyCastle();
  }

  // ====== "هجوم" من جوه شريط الزيارة نفسه - بنخرج من وضع الزيارة الأول
  // وبعدين نفتح بانل "العالم" على نفس الهدف (نفس تجربة الهجوم من الخريطة
  // الرئيسية - openAttackPanelFor بتتوقع نفس شكل بيانات القلعة اللي
  // بيرجّعها /castle/nearby، وده بالظبط شكل بيانات الزيارة). ======
  function handleAttackFromVisit() {
    const target = visit?.data;
    if (!target) return;
    setVisit(null);
    setVisitSelectedId(null);
    openAttackPanelFor(target);
  }

  // ====== "استكشاف" من جوه شريط الزيارة - تقرير فوري (موارد/جيش/قوة دفاع
  // مقابل قوة هجومك الحالية) من غير ما تخرج من وضع الزيارة ولا يتحرك أي
  // جيش فعليًا. متاح حتى لمعسكرات NPC. ======
  function handleScoutFromVisit() {
    const target = visit?.data;
    if (!target) return;
    const targetName = target.is_npc ? target.name : target.owner_name;
    setScoutReport({ loading: true, data: null, targetName });
    scoutCastle(target.id)
      .then((report) => setScoutReport({ loading: false, data: report, targetName }))
      .catch((err) => {
        toastError(err.response?.data?.error || 'تعذر تنفيذ الاستكشاف');
        setScoutReport(null);
      });
  }

  // ====== "إرسال موارد" - بيفتح بس الفورم؛ الإرسال الفعلي بيحصل في
  // handleSubmitSendResources لما اللاعب يأكّد الكمية. ======
  function handleOpenSendResources() {
    const target = visit?.data;
    if (!target) return;
    setSendResourcesModal({ targetId: target.id, targetName: target.owner_name, submitting: false });
  }

  function handleSubmitSendResources(amounts) {
    if (!sendResourcesModal) return;
    setSendResourcesModal((prev) => (prev ? { ...prev, submitting: true } : prev));
    sendResourcesToCastle(sendResourcesModal.targetId, amounts)
      .then(({ castle: updatedCastle }) => {
        setCastle(updatedCastle);
        toastSuccess('اتبعتت الموارد للحليف بنجاح');
        setSendResourcesModal(null);
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'تعذر إرسال الموارد');
        setSendResourcesModal((prev) => (prev ? { ...prev, submitting: false } : prev));
      });
  }

  // ====== "إرسال تعزيزات" (Phase 1: Reinforcement & Battle System) - نفس
  // فكرة handleOpenSendResources/handleSubmitSendResources بالظبط بس بيبعت
  // جنود (allianceReinforcement.controller.js::sendReinforcement) بدل موارد.
  // بيفتح بس الفورم؛ الإرسال الفعلي بيحصل في handleSubmitSendReinforcement
  // لما اللاعب يختار الوحدات والكميات ويأكّد. ======
  function handleOpenSendReinforcement() {
    const target = visit?.data;
    if (!target) return;
    setSendReinforcementModal({ targetId: target.id, targetName: target.owner_name, submitting: false });
  }

  function handleSubmitSendReinforcement(troops) {
    if (!sendReinforcementModal) return;
    setSendReinforcementModal((prev) => (prev ? { ...prev, submitting: true } : prev));
    sendReinforcement(sendReinforcementModal.targetId, troops)
      .then(({ castle: updatedCastle }) => {
        setCastle(updatedCastle);
        toastSuccess('اتبعتت التعزيزات لحليفك بنجاح');
        setSendReinforcementModal(null);
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'تعذر إرسال التعزيزات');
        setSendReinforcementModal((prev) => (prev ? { ...prev, submitting: false } : prev));
      });
  }

  // ====== "ملف اللاعب" - متاح للاعبين حقيقيين بس (مش NPC) ======
  function handleOpenProfile() {
    const target = visit?.data;
    if (!target || target.is_npc || !target.owner_id) return;
    setPlayerProfile({ loading: true, data: null });
    getPlayerProfile(target.owner_id)
      .then((data) => setPlayerProfile({ loading: false, data }))
      .catch((err) => {
        toastError(err.response?.data?.error || 'تعذر تحميل ملف اللاعب');
        setPlayerProfile(null);
      });
  }

  // ====== "رسالة" - بيفتح بس فورم الكتابة؛ الإرسال الفعلي بيحصل في
  // handleSubmitMessage لما اللاعب يضغط "إرسال". ======
  function handleOpenMessage() {
    const target = visit?.data;
    if (!target || target.is_npc || !target.owner_id) return;
    setMessageModal({ targetId: target.owner_id, targetName: target.owner_name, submitting: false });
  }

  function handleSubmitMessage(body) {
    if (!messageModal) return;
    setMessageModal((prev) => (prev ? { ...prev, submitting: true } : prev));
    sendPrivateMessage(messageModal.targetId, body)
      .then(() => {
        toastSuccess('اتبعتت الرسالة');
        setMessageModal(null);
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'تعذر إرسال الرسالة');
        setMessageModal((prev) => (prev ? { ...prev, submitting: false } : prev));
      });
  }

  // ====== زرار "ارجع لقلعتي" - بيرجّع الكاميرا لمكان قلعة اللاعب نفسه
  // (مركز العالم)، ويقفل أي تحديد لقلعة قريبة أو وضع زيارة كان مفتوح. ======
  function handleReturnToMyCastle() {
    setSelectedCastleId(null);
    setVisit(null);
    setVisitSelectedId(null);
    setScoutReport(null);
    setSendResourcesModal(null);
    setSendReinforcementModal(null);
    setPlayerProfile(null);
    setMessageModal(null);
    closeCastleMenu();
    viewportRef.current?.goToMyCastle();
  }

  // ====== "اذهب للقلعة" من بانل بحث العالم (نتيجة بحث أو عنصر مفضّلة) -
  // بيحرّك الكاميرا مباشرة لمكان القلعة دي (map_slot الخام الراجع من نتيجة
  // البحث) على نفس العالم المفتوح (bounded=false)، حتى لو القلعة دي برّه
  // نطاق رؤيتك تمامًا (بحث العالم بيتخطى ضباب الحرب أصلًا). بنخرج من وضع
  // الزيارة الأول لو كان شغال عشان الكاميرا والمشهد يفضلوا متسقين (نفس فكرة
  // handleReturnToMyCastle). ======
  function handleGoToCastleFromSearch(result) {
    setWorldSearchOpen(false);
    if (isVisiting) {
      setVisit(null);
      setVisitSelectedId(null);
    }
    if (castle?.map_slot && result?.map_slot) {
      const { gx, gy } = mapSlotToGrid(result.map_slot, castle.map_slot);
      const { x, y } = gridToWorld(gx, gy);
      viewportRef.current?.focusOn(x, y, 0.6);
    }
  }

  // ====== "اذهب للإحداثيات" - نفس فكرة handleGoToCastleFromSearch بالظبط
  // بس x,y جايين من فورم مدخل يدوي (وحدة "خانة" slot، نفس وحدة "coordinates"
  // الراجعة من بحث العالم) بدل نتيجة بحث جاهزة. ======
  function handleGoToCoordinates(x, y) {
    setWorldSearchOpen(false);
    if (isVisiting) {
      setVisit(null);
      setVisitSelectedId(null);
    }
    if (castle?.map_slot) {
      const { gx, gy } = slotToGrid(x, y, castle.map_slot);
      const { x: worldX, y: worldY } = gridToWorld(gx, gy);
      viewportRef.current?.focusOn(worldX, worldY, 0.6);
    }
  }

  // ====== طلب ترقية مبنى فعليًا ======
  function handleRequestUpgrade(building) {
    if (upgradingKey) return;
    setUpgradingKey(building.key);
    upgradeBuilding(building.key)
      .then((updatedCastle) => {
        setCastle(updatedCastle);
        // ====== لو الأدمن، الباك إند بيطبّق الترقية فورًا (مفيش
        // upgrade.in_progress خالص - شوف castle.service.startUpgrade) - في
        // الحالة دي بنعرض رسالة "اترقّى فورًا" بدل "بدأت الترقية" المضلّلة،
        // عشان تعكس إن المستوى اتغيّر فعليًا على طول من غير أي استنى. ======
        const updatedBuilding = updatedCastle.buildings.find((b) => b.id === building.id);
        const completedInstantly = Boolean(updatedBuilding) && !updatedBuilding.upgrade;
        toastSuccess(
          completedInstantly
            ? `${building.name} اترقّى فورًا لمستوى ${updatedBuilding.level} ⚡`
            : `بدأت ترقية ${building.name}`
        );
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setUpgradingKey(null));
  }

  // ====== طلب تسريع فوري بالجواهر لترقية/إنشاء مبنى شغال بالفعل - نفس فكرة
  // handleRequestUpgrade فوق بالظبط، بس بينادي speedupBuilding (خصم من رصيد
  // المحفظة/الجواهر مش من الموارد العادية) وبيعمل refresh لرصيد المحفظة
  // بعدها عشان أي كومبوننت تاني شايف الرصيد (زي WorldHUD) يتحدّث لحظيًا. ======
  function handleSpeedupBuilding(building) {
    if (upgradingKey || speedupSubmittingKey) return;
    setSpeedupSubmittingKey(building.key);
    speedupBuilding(building.key)
      .then((updatedCastle) => {
        setCastle(updatedCastle);
        const updatedBuilding = updatedCastle.buildings.find((b) => b.id === building.id);
        toastSuccess(
          updatedBuilding
            ? `${building.name} اترقّى فورًا لمستوى ${updatedBuilding.level} بالجواهر 💎`
            : 'اترقّى المبنى فورًا بالجواهر 💎'
        );
        refreshWalletBalance();
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setSpeedupSubmittingKey(null));
  }

  // ====== Rewarded Ads Gameplay (Speed Up Construction) - بينادى من
  // AdvertisementButton.onRewardCredited بعد ما الإعلان يخلص وRewardSession
  // تتكمّل على السيرفر بنجاح (راجع rewardSession.service.js kind
  // speedup_construction). مفيش أي حساب هنا خالص - بس بنعيد تحميل القلعة
  // كاملة (getMyCastle) عشان عدّاد الترقية في BuildingInfoModal يتحدّث
  // فورًا بالـ completes_at الجديد (أو المستوى الجديد لو الاقتطاع خلّى
  // الترقية تخلص فورًا) من غير ما نستنى أي دورة تحديث تانية. ======
  async function handleSpeedupConstructionAdCredited() {
    try {
      const updatedCastle = await getMyCastle();
      setCastle(updatedCastle);
    } catch (err) {
      toastError(err.response?.data?.error || 'اتسرّع البناء بس تعذر تحديث القلعة - هيتحدّث تلقائيًا');
    }
  }

  // ====== دخول/خروج وضع البناء ======
  function openBuildPanel() {
    setActivePanel('build');
    setPlacingDefenseKey(null);
    loadBuildingTypes();
  }

  function closeBuildPanel() {
    setActivePanel('city');
    setPlacingKey(null);
  }

  // ====== المستخدم اختار نوع مبنى من القائمة -> بندخل "اختيار مكان" ======
  function handleSelectBuildingType(type) {
    setPlacingKey(type.key);
  }

  // ====== دخول/خروج وضع بناء الدفاعات - نفس فكرة وضع البناء العادي فوق
  // بالظبط بس لقطع الدفاع. ======
  function openDefenseBuildPanel() {
    setActivePanel('defense');
    setPlacingKey(null);
    loadDefenseTypes();
    if (!defenseStructures.length) loadMyDefense();
  }

  function closeDefenseBuildPanel() {
    setActivePanel('city');
    setPlacingDefenseKey(null);
  }

  // ====== المستخدم اختار نوع قطعة دفاعية من القائمة -> بندخل "اختيار مكان" ======
  function handleSelectDefenseType(type) {
    setPlacingDefenseKey(type.key);
    setPlacingDefenseRotation(0);
  }

  // ====== حساب خانات البناء المعروضة على الخريطة وقت اختيار مكان ======
  // شبكة "حرة" فعلًا: مبنية بالكامل على unlocked_tiles الحقيقية الراجعة من
  // الباك إند (مش مربع GRID_SIZE ثابت زي الأول) - يعني أي أرض جديدة اتشرت
  // بتبقى صالحة للبناء فيها فورًا، وأي خانة لسه مقفولة (برّه unlocked_tiles)
  // مش هتظهر أصلًا هنا فمينفعش تتبنى فيها. أي خانة فاضية بتتلوّن أخضر (قابلة
  // للضغط)، وأي خانة فيها مبنى موجود بالفعل (من موقعه الحقيقي position)
  // بتتلوّن أحمر (مشغولة - مش قابلة للضغط)، بغض النظر عن نوع المبنى المختار.
  // شبكة الخانات دي بتتحسب وقت وضع البناء (اختيار نوع مبنى جديد) أو وقت
  // وضع نقل مبنى موجود - في الحالتين نفس المنطق: أي خانة فاضية = خضراء
  // قابلة للضغط. في وضع النقل بس، خانة المبنى الحالي نفسه (اللي بننقله)
  // بتتستثنى من "المشغولة" عشان تفضل قابلة للاختيار برضه (يقدر يسيبه مكانه).
  const placementTiles =
    placingKey || movingBuilding || placingDefenseKey || movingDefenseStructure
      ? unlockedTiles.map(({ x, y }) => {
          const occupied =
            buildings.some(
              (b) => b.position.x === x && b.position.y === y && (!movingBuilding || b.id !== movingBuilding.id)
            ) ||
            defenseStructures.some(
              (s) =>
                s.position.x === x &&
                s.position.y === y &&
                (!movingDefenseStructure || s.id !== movingDefenseStructure.id)
            );
          const { gx, gy } = gridPositionToOffset(x, y);
          return { x, y, gx, gy, status: occupied ? 'invalid' : 'valid' };
        })
      : [];

  function handlePlaceAt({ x, y }) {
    if (movingBuilding) {
      handleMoveTo({ x, y });
      return;
    }
    if (movingDefenseStructure) {
      handleDefenseMoveTo({ x, y });
      return;
    }
    if (placingDefenseKey) {
      handlePlaceDefenseAt({ x, y });
      return;
    }
    if (placingSubmitting) return;
    setPlacingSubmitting(true);
    buildNewBuilding(placingKey, { x, y })
      .then((updatedCastle) => {
        setCastle(updatedCastle);
        // ====== نفس فكرة handleRequestUpgrade بالظبط - لو الأدمن، المبنى
        // بيتحط جاهز على مستوى 1 فورًا من غير مؤقّت (شوف
        // castle.service.startNewBuilding) - بنطابق المبنى الجديد بمكانه
        // (position فريد) عشان نعرف نعرض "اتبنى فورًا" بدل "بدأ البناء". ======
        const newBuilding = updatedCastle.buildings.find((b) => b.position.x === x && b.position.y === y);
        const completedInstantly = Boolean(newBuilding) && !newBuilding.upgrade;
        toastSuccess(completedInstantly ? `${newBuilding.name} اتبنى فورًا ⚡` : 'بدأ بناء المبنى الجديد 🏗️');
        setPlacingKey(null);
        setActivePanel('city');
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setPlacingSubmitting(false));
  }

  // ====== المستخدم ضغط على خانة خضراء وهو في وضع بناء الدفاعات -> بنبعت
  // نوع القطعة المختار + المكان + اتجاه الدوران الحالي (لو القطعة قابلة
  // للتدوير زي السور/البوابة) لـ /defense/structures. ======
  function handlePlaceDefenseAt({ x, y }) {
    if (placingDefenseSubmitting) return;
    setPlacingDefenseSubmitting(true);
    buildDefenseStructure(placingDefenseKey, { x, y }, placingDefenseRotation)
      .then((structure) => {
        setDefenseStructures((prev) => [...prev, structure]);
        // ====== تكلفة البناء اتخصمت فعليًا من موارد القلعة في الباك إند -
        // بنعمل تحديث فوري (silent) للقلعة عشان شريط الموارد في WorldHUD
        // يعكس الخصم على طول من غير ما يستنى البولّينج العادي (20 ثانية). ======
        load({ silent: true });
        toastSuccess('بدأ بناء القطعة الدفاعية 🏰');
        setPlacingDefenseKey(null);
        setActivePanel('city');
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setPlacingDefenseSubmitting(false));
  }

  // ====== المستخدم ضغط "نقل المبنى" في بانل معلومات المبنى -> بندخل
  // "اختيار مكان" على الخريطة (نفس تجربة اختيار مكان البناء الجديد) ======
  function handleRequestMove(building) {
    setSelectedId(null);
    setMovingBuilding(building);
  }

  function handleMoveTo({ x, y }) {
    if (!movingBuilding || movingSubmitting) return;
    setMovingSubmitting(true);
    moveBuilding(movingBuilding.id, { x, y })
      .then((updatedCastle) => {
        setCastle(updatedCastle);
        toastSuccess('اتنقل المبنى لمكانه الجديد');
        setMovingBuilding(null);
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setMovingSubmitting(false));
  }

  // ====== المستخدم ضغط على قطعة دفاعية مبنية بالفعل على الخريطة -> بيفتح
  // بانل معلوماتها (DefenseStructureInfoModal) - نفس فكرة اختيار مبنى عادي
  // بالظبط. ======
  function handleSelectDefenseStructure(structure) {
    setSelectedDefenseId(structure.id);
  }

  // ====== طلب ترقية قطعة دفاعية فعليًا ======
  function handleRequestDefenseUpgrade(structure) {
    if (defenseUpgradingId) return;
    setDefenseUpgradingId(structure.id);
    upgradeDefenseStructure(structure.id)
      .then((updated) => {
        setDefenseStructures((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        load({ silent: true }); // الموارد اتخصمت فعليًا في الباك إند
        toastSuccess(`بدأت ترقية ${structure.name}`);
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setDefenseUpgradingId(null));
  }

  // ====== طلب تسريع فوري بالجواهر لترقية قطعة دفاعية شغالة بالفعل - نفس
  // فكرة handleSpeedupBuilding بتاعة المباني العادية بالظبط، بس للقطع
  // الدفاعية. بينادي speedupDefenseStructure (خصم من رصيد المحفظة/الجواهر
  // مش من الموارد العادية) وبيعمل refresh لرصيد المحفظة بعدها عشان أي
  // كومبوننت تاني شايف الرصيد (زي WorldHUD) يتحدّث لحظيًا. ======
  function handleSpeedupDefenseStructure(structure) {
    if (defenseUpgradingId || defenseSpeedupSubmittingId) return;
    setDefenseSpeedupSubmittingId(structure.id);
    speedupDefenseStructure(structure.id)
      .then((updated) => {
        setDefenseStructures((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toastSuccess(`${structure.name} اترقّى فورًا لمستوى ${updated.level} بالجواهر 💎`);
        refreshWalletBalance();
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setDefenseSpeedupSubmittingId(null));
  }

  // ====== المستخدم ضغط "نقل" في بانل معلومات القطعة الدفاعية -> بندخل
  // "اختيار مكان" على الخريطة، نفس تجربة handleRequestMove بالظبط. ======
  function handleRequestDefenseMove(structure) {
    setSelectedDefenseId(null);
    setMovingDefenseStructure(structure);
  }

  function handleDefenseMoveTo({ x, y }) {
    if (!movingDefenseStructure || movingDefenseSubmitting) return;
    setMovingDefenseSubmitting(true);
    moveDefenseStructure(movingDefenseStructure.id, { x, y })
      .then((updated) => {
        setDefenseStructures((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toastSuccess('اتنقلت القطعة الدفاعية لمكانها الجديد');
        setMovingDefenseStructure(null);
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setMovingDefenseSubmitting(false));
  }

  // ====== حذف قطعة دفاعية موجودة بالفعل من بانل معلوماتها ======
  function handleRemoveDefenseStructure(structure) {
    if (defenseRemovingId) return;
    setDefenseRemovingId(structure.id);
    removeDefenseStructure(structure.id)
      .then(() => {
        setDefenseStructures((prev) => prev.filter((s) => s.id !== structure.id));
        toastSuccess(`اتشالت ${structure.name}`);
        setSelectedDefenseId(null);
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setDefenseRemovingId(null));
  }

  // ====== نجاح شحن رصيد المحفظة (الجواهر) - بيقفل البوب أب وبيعمل refresh
  // لرصيد المحفظة فورًا عشان رقم الجواهر في WorldHUD يتحدّث لحظيًا. ======
  function handleDepositSuccess() {
    setDepositOpen(false);
    toastSuccess('تم شحن رصيدك بنجاح 🎉');
    refreshWalletBalance();
  }

  // ====== طلب بدء تدريب دفعة وحدات جديدة في الثكنة ======
  function handleTrain(troopKey, quantity) {
    if (trainSubmittingKey) return;
    setTrainSubmittingKey(troopKey);
    trainTroops(troopKey, quantity)
      .then((updatedCastle) => {
        setCastle(updatedCastle);
        toastSuccess('بدأ تدريب الوحدات 🗡️');
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setTrainSubmittingKey(null));
  }

  // ====== طلب تدريب وحدة مميّزة (بالجواهر/رصيد المحفظة) - نفس فكرة
  // handleTrain فوق بالظبط، بس بينادي trainPremiumTroops (خصم من المحفظة
  // مش من الموارد، والوحدات بتتضاف للجيش فورًا من غير طابور)، وبعدين بيعمل
  // refresh لرصيد المحفظة عشان أي كومبوننت تاني شايف الرصيد (Navbar مثلاً)
  // يتحدّث لحظيًا. ======
  function handleTrainPremium(troopKey, quantity) {
    if (trainSubmittingKey) return;
    setTrainSubmittingKey(troopKey);
    trainPremiumTroops(troopKey, quantity)
      .then((updatedCastle) => {
        setCastle(updatedCastle);
        toastSuccess('اتدرّبت الوحدة المميّزة فورًا 💎');
        refreshWalletBalance();
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setTrainSubmittingKey(null));
  }

  // ====== طلب إلغاء أمر تدريب لسه في الطابور ======
  function handleCancelTraining(orderId) {
    if (cancelSubmittingId) return;
    setCancelSubmittingId(orderId);
    cancelTraining(orderId)
      .then((updatedCastle) => {
        setCastle(updatedCastle);
        toastSuccess('اتلغى أمر التدريب وترجعت الموارد');
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setCancelSubmittingId(null));
  }

  // ====== طلب تسريع فوري بالجواهر لأمر تدريب واقف في طابور الثكنة - نفس
  // فكرة handleCancelTraining فوق بالظبط، بس بينادي speedupTraining (خصم من
  // رصيد المحفظة، والوحدات بتتضاف للجيش فورًا) وبيعمل refresh لرصيد المحفظة
  // بعدها. ======
  function handleSpeedupTraining(orderId) {
    if (cancelSubmittingId || speedupTrainingSubmittingId) return;
    setSpeedupTrainingSubmittingId(orderId);
    speedupTraining(orderId)
      .then((updatedCastle) => {
        setCastle(updatedCastle);
        toastSuccess('اتدرّبت الوحدات فورًا بالجواهر 💎');
        refreshWalletBalance();
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setSpeedupTrainingSubmittingId(null));
  }

  // ====== طلب بعت جيش لهدف معين (غارة) - المعركة (Battle Foundation)
  // المقابلة للمسير ده بتتسجّل تلقائيًا في الباك إند (march.service بينادي
  // battleService.createBattleFromAttack وقت إنشاء مسير الهجوم نفسه، وبيربطها
  // بـ march_id). الفرونت إند هنا **مايعملش أي إنشاء معركة تاني** - ده كان
  // بيسبب معركتين منفصلتين لنفس المسير (واحدة مربوطة بـ march_id فعليًا من
  // الباك إند، وواحدة تانية بـ march_id فاضي (null) من نداء الفرونت إند
  // المباشر). الاسترجاع بيحصل لاحقًا لما المسير يوصل (تأثير "المسير وصل"
  // فوق، عن طريق resolveBattleForMarch). نظام المسايرات نفسه (حركته/عدّاده/
  // إلغاءه) فاضل زي ما هو بالظبط - مفيش أي تعديل عليه. ======
  // ====== إطلاق هجوم من جوه AttackDialog - نفس منطق إرسال المسير القديم
  // بالظبط (شوف الملحوظة فوق عن Battle Foundation)، بس بيبعت كمان
  // battlePlanId اللي اللاعب اختاره جوه النافذة (أو null لو مفيش خطط
  // أصلًا) عشان march.service يربطه بالمسير والمعركة المسجّلة له. بعد
  // النجاح بنقفل AttackDialog ونفتح تبويب "مسايراتي" عشان اللاعب يتابع
  // جيشه على طول. ======
  function handleLaunchAttack(targetCastleId, troops, battlePlanId) {
    if (sendingTargetId) return;
    setSendingTargetId(targetCastleId);
    sendMarch(targetCastleId, troops, battlePlanId)
      .then(({ castle: updatedCastle, march }) => {
        setCastle(updatedCastle);
        setMarches((prev) => [march, ...prev]);
        loadMapMarches();
        refreshBattles();
        setAttackDialogTarget(null);
        setSelectedCastleId(null);
        setActivePanel('world');
        setWorldTab('marches');
        toastSuccess('جيشك اتحرك ⚔️');
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setSendingTargetId(null));
  }

  // ====== طلب سحب مسير هجوم لسه ماشي - بيرجّع الجيش فورًا ======
  function handleRecallMarch(marchId) {
    if (recallingId) return;
    setRecallingId(marchId);
    recallMarch(marchId)
      .then(({ castle: updatedCastle, march }) => {
        setCastle(updatedCastle);
        setMarches((prev) => prev.map((m) => (m.id === march.id ? march : m)));
        loadMapMarches();
        refreshBattles();
        toastSuccess('اترجّع الجيش لقلعتك');

        // ====== لو المسير ده كان ليه معركة متسجّلة (لسه "preparing" -
        // مفيش محرك اتشغّل ليها أصلًا)، نلغيها عن طريق cancelBattle الموجودة
        // بالفعل في الباك إند - نفس فكرة battle.service.cancelBattle
        // ("المسير اترجّع قبل ما يوصل"). بنسترجع الـ battleId من الباك إند
        // (resolveBattleForMarch) بدل أي mapping محلي، عشان الإلغاء يشتغل
        // صح حتى لو الصفحة اترفريشت قبل كده. فشل هنا مش خطير (المعركة أصلًا
        // لسه متبدأتش)، فمش محتاج نبلّغ المستخدم بيه. ======
        resolveBattleForMarch(marchId).then((battleId) => {
          if (!battleId) return;
          cancelBattle(battleId).catch(() => {});
          battleIdsByMarchIdRef.current.delete(marchId);
          setBattleIdsByMarchId((prev) => {
            const next = new Map(prev);
            next.delete(marchId);
            return next;
          });
        });
      })
      .catch((err) => {
        toastError(err.response?.data?.error || 'حصل خطأ - حاول تاني');
      })
      .finally(() => setRecallingId(null));
  }

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-stone-950"
      onPointerDown={() => {
        // ====== أي ضغطة توصل لهنا (يعني مش على ماركر/قائمة سياق بتعمل
        // stopPropagation) لازم تقفل قائمة السياق المفتوحة لو موجودة. ======
        if (contextMenuCastleId) closeCastleMenu();
      }}
    >
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-stone-950">
          <Loader2 className="animate-spin text-amber-400" size={32} />
        </div>
      )}

      {/* ====== اختيار الهيرو الإجباري - بيبان فوق كل حاجة (z-[60] جوه
          ChooseHeroModal نفسها) قبل ما اللاعب يشوف الخريطة لأول مرة، لحد ما
          castle.hero يبقى موجود. مفيش زرار إغلاق - الاختيار ده لازم يحصل
          قبل بداية اللعب فعليًا. ====== */}
      <ChooseHeroModal open={needsHeroSelection} heroes={heroesList} onChoose={handleChooseHero} />

      <IsometricWorld
        ref={viewportRef}
        buildings={displayBuildings}
        selectedId={displaySelectedId}
        onSelectBuilding={handleSelectDisplayBuilding}
        buildMode={
          !isVisiting &&
          (activePanel === 'build' || activePanel === 'defense' || Boolean(movingBuilding) || Boolean(movingDefenseStructure))
        }
        placementTiles={isVisiting ? [] : placementTiles}
        onPlaceAt={handlePlaceAt}
        unlockedTiles={displayUnlockedTiles}
        cityDecor={displayCityDecor}
        defenseStructures={isVisiting ? visitDefenseStructures : defenseStructures}
        selectedDefenseId={selectedDefenseId}
        onSelectDefenseStructure={isVisiting ? undefined : handleSelectDefenseStructure}
        now={now}
        myMapSlot={castle?.map_slot}
        nearbyCastles={isVisiting ? [] : nearbyCastles}
        worldObjects={isVisiting ? [] : worldObjects}
        marches={isVisiting ? [] : mapMarches}
        liveBattles={isVisiting ? [] : liveBattles}
        selectedCastleId={selectedCastleId}
        onSelectCastle={handleMapCastleClick}
        onSelectWorldObject={handleSelectWorldObject}
        contextMenuCastleId={contextMenuCastleId}
        onEnterKingdom={handleEnterKingdom}
        onAttackCastle={openAttackPanelFor}
        onScoutCastle={handleScoutFromContextMenu}
        onGatherWorldObject={handleGatherFromContextMenu}
        onInteractWorldObject={handleInteractFromContextMenu}
        onCloseCastleMenu={closeCastleMenu}
        hideFog={isVisiting}
        onCameraChange={isVisiting ? undefined : handleCameraChange}
      />

      {/* ====== شريط "زيارة مملكة" - بيظهر فوق كل حاجة وضع الزيارة شغال ====== */}
      <VisitKingdomBar
        loading={visitLoading}
        data={visitData}
        commander={visitDefenseInfo.commander}
        now={now}
        onAttack={handleAttackFromVisit}
        onScout={handleScoutFromVisit}
        onSendResources={handleOpenSendResources}
        onSendReinforcements={handleOpenSendReinforcement}
        onViewProfile={handleOpenProfile}
        onMessage={handleOpenMessage}
        onExit={handleExitVisit}
      />

      <WorldHUD
        resources={resources}
        playerName={user?.name || 'لاعب'}
        rank={myRank}
        activePanel={activePanel}
        visiting={isVisiting}
        onSelectPanel={(panel) => {
          if (panel === 'build') {
            openBuildPanel();
          } else if (panel === 'defense') {
            openDefenseBuildPanel();
          } else {
            setActivePanel(panel);
            setPlacingKey(null);
            setPlacingDefenseKey(null);
          }
        }}
        onZoomIn={() => viewportRef.current?.zoomIn()}
        onZoomOut={() => viewportRef.current?.zoomOut()}
        onRecenter={() => viewportRef.current?.recenter()}
        onReturnToMyCastle={handleReturnToMyCastle}
        onOpenSearch={() => setWorldSearchOpen(true)}
        onOpenCastleInfo={() => setCastleInfoOpen(true)}
        onOpenReports={() => setReportsPanelOpen(true)}
        onOpenWallet={() => setDepositOpen(true)}
        unreadMailCount={unreadCount}
        onOpenRewards={rewardPopups.openAvailableManually}
        giftBadgeCount={rewardPopups.giftBadgeCount}
        onFullscreen={() => {
          const el = document.documentElement;
          if (!document.fullscreenElement) el.requestFullscreen?.();
          else document.exitFullscreen?.();
        }}
      />

      {/* ====== شريط "اختَر مكان" وقت ما نوع مبنى يتحدد من القائمة ====== */}
      {placingKey && (
        <div className="pointer-events-auto absolute inset-x-0 top-16 z-20 flex justify-center px-3 sm:top-20">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-stone-950/90 px-4 py-2 shadow-lg backdrop-blur-sm">
            <span className="text-sm text-emerald-300">اضغط على الخانة الخضراء على الخريطة عشان تبني هناك</span>
            <button
              type="button"
              onClick={() => setPlacingKey(null)}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs text-white/70 hover:text-white"
            >
              <X size={13} />
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ====== شريط "اختَر مكان" وقت ما نوع قطعة دفاعية يتحدد من القائمة -
          نفس شريط البناء العادي بالظبط، بس بلون سماوي (يميّزه عن البناء
          العادي) + زرار "تدوير" اختياري لو القطعة قابلة للتدوير (سور/بوابة). ====== */}
      {placingDefenseKey && (
        <div className="pointer-events-auto absolute inset-x-0 top-16 z-20 flex justify-center px-3 sm:top-20">
          <div className="flex items-center gap-3 rounded-xl border border-sky-400/40 bg-stone-950/90 px-4 py-2 shadow-lg backdrop-blur-sm">
            <span className="text-sm text-sky-300">اضغط على الخانة الخضراء على الخريطة عشان تبني هناك</span>
            {defenseTypes.find((t) => t.key === placingDefenseKey)?.rotation_applicable && (
              <button
                type="button"
                onClick={() => setPlacingDefenseRotation((r) => (r + 90) % 360)}
                className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs text-white/70 hover:text-white"
              >
                <RotateCw size={13} />
                تدوير ({placingDefenseRotation}°)
              </button>
            )}
            <button
              type="button"
              onClick={() => setPlacingDefenseKey(null)}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs text-white/70 hover:text-white"
            >
              <X size={13} />
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ====== شريط "اختَر مكان" وقت نقل مبنى موجود بالفعل ====== */}
      {movingBuilding && (
        <div className="pointer-events-auto absolute inset-x-0 top-16 z-20 flex justify-center px-3 sm:top-20">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-stone-950/90 px-4 py-2 shadow-lg backdrop-blur-sm">
            <span className="text-sm text-emerald-300">
              اضغط على الخانة الخضراء عشان تنقل {movingBuilding.name} هناك
            </span>
            <button
              type="button"
              onClick={() => setMovingBuilding(null)}
              disabled={movingSubmitting}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-40"
            >
              <X size={13} />
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ====== شريط "اختَر مكان" وقت نقل قطعة دفاعية موجودة بالفعل ====== */}
      {movingDefenseStructure && (
        <div className="pointer-events-auto absolute inset-x-0 top-16 z-20 flex justify-center px-3 sm:top-20">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-stone-950/90 px-4 py-2 shadow-lg backdrop-blur-sm">
            <span className="text-sm text-emerald-300">
              اضغط على الخانة الخضراء عشان تنقل {movingDefenseStructure.name} هناك
            </span>
            <button
              type="button"
              onClick={() => setMovingDefenseStructure(null)}
              disabled={movingDefenseSubmitting}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-40"
            >
              <X size={13} />
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ====== قائمة وضع البناء ====== */}
      <BuildMenu
        open={activePanel === 'build' && !placingKey && !movingBuilding}
        buildingTypes={buildingTypes}
        resources={castle?.resources}
        loading={buildTypesLoading}
        submittingKey={placingSubmitting ? placingKey : null}
        onSelect={handleSelectBuildingType}
        onClose={closeBuildPanel}
      />

      {/* ====== قائمة وضع بناء الدفاعات ====== */}
      <DefenseBuildMenu
        open={activePanel === 'defense' && !placingDefenseKey}
        types={defenseTypes}
        resources={castle?.resources}
        loading={defenseTypesLoading}
        submittingKey={placingDefenseSubmitting ? placingDefenseKey : null}
        onSelect={handleSelectDefenseType}
        onClose={closeDefenseBuildPanel}
      />

      {/* ====== بانل "العالم" (تصفّح القلاع القريبة + متابعة مسايراتي) -
          اختيار "هجوم" من هنا بيفتح AttackDialog مباشرة (onSelectCastle)
          بدل أي فورم إرسال جيش inline جوه البانل ده. ====== */}
      <WorldPanel
        open={activePanel === 'world'}
        onClose={() => {
          setActivePanel('city');
          setSelectedCastleId(null);
        }}
        tab={worldTab}
        onSelectTab={setWorldTab}
        nearbyCastles={nearbyCastles}
        nearbyLoading={nearbyLoading}
        marches={marches}
        marchesLoading={marchesLoading}
        now={now}
        recallingId={recallingId}
        onRecallMarch={handleRecallMarch}
        onWatchBattle={openBattle}
        battleIdsByMarchId={battleIdsByMarchId}
        onSelectCastle={openAttackPanelFor}
      />

      {/* ====== Attack Dialog - النافذة المتكاملة الوحيدة للهجوم (جيش +
          خطة معركة + تشكيل + تقدير + بدء الهجوم) - بتتفتح مباشرة فوق
          الخريطة من غير أي صفحة أو تبويب خارجي، وتعديل/إنشاء خطة معركة
          بيحصل من جواها (شوف AttackDialog.jsx). ====== */}
      <AttackDialog
        open={Boolean(attackDialogTarget)}
        target={attackDialogTarget}
        army={castle?.army}
        troopTypes={troopTypes}
        submitting={Boolean(attackDialogTarget) && sendingTargetId === attackDialogTarget?.id}
        onClose={() => {
          setAttackDialogTarget(null);
          setSelectedCastleId(null);
        }}
        onLaunch={handleLaunchAttack}
      />

      {/* ====== بانل التصنيف (🏆 VIP Ranking) ====== */}
      <RankingPanel open={activePanel === 'ranking'} onClose={() => setActivePanel('city')} />

      {/* ====== بانل المهام اليومية (📜) ====== */}
      <QuestsPanel open={activePanel === 'quests'} onClose={() => setActivePanel('city')} />

      {/* ====== بانل المتجر (🛒) - بانل جوّه مشهد اللعبة زي أي بانل تاني، مش
          راوت/صفحة مستقلة. ====== */}
      <ShopPanel open={activePanel === 'shop'} onClose={() => setActivePanel('city')} />

      {/* ====== بانل التحالفات ====== */}
      <AlliancePanel
        open={activePanel === 'alliance'}
        onClose={() => setActivePanel('city')}
        currentUserId={user?._id}
        onViewBattle={openBattle}
      />

      {/* ====== بانل معلومات المبنى (Popup) - قلعة اللاعب نفسه أو القلعة
          اللي بيزورها دلوقتي (وضع عرض بس - readOnly) ====== */}
      <BuildingInfoModal
        open={Boolean(displaySelectedBuilding)}
        building={displaySelectedBuilding}
        resources={isVisiting ? visitData?.resources : castle?.resources}
        now={now}
        anotherUpgradeInProgress={
          !isVisiting && Boolean(activeUpgradeBuilding) && activeUpgradeBuilding.id !== selectedBuilding?.id
        }
        submitting={!isVisiting && Boolean(selectedBuilding) && upgradingKey === selectedBuilding.key}
        speedupSubmitting={!isVisiting && Boolean(selectedBuilding) && speedupSubmittingKey === selectedBuilding.key}
        onClose={() => (isVisiting ? setVisitSelectedId(null) : setSelectedId(null))}
        onRequestUpgrade={handleRequestUpgrade}
        onRequestSpeedup={handleSpeedupBuilding}
        onSpeedupConstructionAdCredited={handleSpeedupConstructionAdCredited}
        onRequestMove={handleRequestMove}
        army={isVisiting ? visitData?.army : castle?.army}
        trainingQueue={isVisiting ? visitData?.training_queue : castle?.training_queue}
        troopTypes={troopTypes}
        troopTypesLoading={troopTypesLoading}
        trainSubmittingKey={trainSubmittingKey}
        cancelSubmittingId={cancelSubmittingId}
        speedupTrainingSubmittingId={speedupTrainingSubmittingId}
        onTrain={handleTrain}
        onTrainPremium={handleTrainPremium}
        onCancelTraining={handleCancelTraining}
        onSpeedupTraining={handleSpeedupTraining}
        readOnly={isVisiting}
      />

      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} onSuccess={handleDepositSuccess} />

      <DefenseStructureInfoModal
        open={Boolean(selectedDefenseStructure)}
        structure={selectedDefenseStructure}
        resources={castle?.resources}
        now={now}
        submitting={Boolean(selectedDefenseStructure) && defenseUpgradingId === selectedDefenseStructure?.id}
        removing={Boolean(selectedDefenseStructure) && defenseRemovingId === selectedDefenseStructure?.id}
        speedupSubmitting={Boolean(selectedDefenseStructure) && defenseSpeedupSubmittingId === selectedDefenseStructure?.id}
        onClose={() => setSelectedDefenseId(null)}
        onRequestUpgrade={handleRequestDefenseUpgrade}
        onRequestSpeedup={handleSpeedupDefenseStructure}
        onRequestMove={handleRequestDefenseMove}
        onRequestRemove={handleRemoveDefenseStructure}
        onRequestRepair={() => {
          setSelectedDefenseId(null);
          setRepairOpen(true);
        }}
      />

      {/* ====== بانلات أفعال "دخول المملكة" الإضافية - استكشاف/إرسال موارد/
          ملف اللاعب/رسالة (شوف VisitKingdomBar) ====== */}
      <ScoutReportModal
        open={Boolean(scoutReport)}
        loading={Boolean(scoutReport?.loading)}
        report={scoutReport?.data}
        targetName={scoutReport?.targetName}
        onClose={() => setScoutReport(null)}
      />

      <SendResourcesModal
        open={Boolean(sendResourcesModal)}
        targetName={sendResourcesModal?.targetName}
        myResources={castle?.resources}
        submitting={Boolean(sendResourcesModal?.submitting)}
        onClose={() => setSendResourcesModal(null)}
        onSubmit={handleSubmitSendResources}
      />

      <SendReinforcementModal
        open={Boolean(sendReinforcementModal)}
        targetName={sendReinforcementModal?.targetName}
        army={castle?.army}
        submitting={Boolean(sendReinforcementModal?.submitting)}
        onClose={() => setSendReinforcementModal(null)}
        onSubmit={handleSubmitSendReinforcement}
      />

      <PlayerProfileModal
        open={Boolean(playerProfile)}
        loading={Boolean(playerProfile?.loading)}
        profile={playerProfile?.data}
        targetUserId={visit?.data?.owner_id}
        onClose={() => setPlayerProfile(null)}
      />

      <MessagePlayerModal
        open={Boolean(messageModal)}
        targetName={messageModal?.targetName}
        submitting={Boolean(messageModal?.submitting)}
        onClose={() => setMessageModal(null)}
        onSubmit={handleSubmitMessage}
      />

      {/* ====== بانل "بحث العالم" (World Search) - بحث باسم/رقم لاعب/رقم
          مملكة + "اذهب للإحداثيات" + مفضّلة القلاع (شوف WorldSearchModal) ====== */}
      <WorldSearchModal
        open={worldSearchOpen}
        onClose={() => setWorldSearchOpen(false)}
        onGoToCastle={handleGoToCastleFromSearch}
        onGoToCoordinates={handleGoToCoordinates}
      />

      {/* ====== بانل "معلومات القلعة" (Castle Info) - هويتك الثابتة (اسم/
          أرقام/إحداثيات/تحالف/قوة)، متاح دايمًا من زرار "معلوماتي" أو من
          الضغط على مبناك الرئيسي (شوف handleSelectDisplayBuilding). ====== */}
      <CastleInfoModal
        open={castleInfoOpen}
        onClose={() => setCastleInfoOpen(false)}
        castle={castle}
        onManageTownHall={handleManageTownHall}
        onOpenHospital={() => {
          setCastleInfoOpen(false);
          setHospitalOpen(true);
        }}
        onOpenRepair={() => {
          setCastleInfoOpen(false);
          setRepairOpen(true);
        }}
      />

      {/* ====== المستشفى والإصلاح - بانلات على مستوى القلعة كلها، بتتفتح من
          بانل معلومات القلعة أو من قطعة دفاعية متضررة (شوف فوق). ====== */}
      <HospitalPanel open={hospitalOpen} onClose={() => setHospitalOpen(false)} />
      <RepairPanel open={repairOpen} onClose={() => setRepairOpen(false)} />

      {/* ====== الرسائل - بانل واحد جوّه مشهد اللعبة (زرار "الرسائل" في
          WorldHUD)، بديل صفحة /inbox المستقلة القديمة. ====== Battle Reports
          removal: مفيش تبويب/صفحة تقارير معارك منفصلة بعد كده - تقرير أي
          معركة خلصت فعليًا بيوصل كرسالة بريد كاملة هنا (شوف openBattle
          فوق). ====== */}
      <ReportsMailPanel open={reportsPanelOpen} onClose={() => setReportsPanelOpen(false)} />

      {/* ====== المكافأة اليومية / هدية الساعة - بوب أب "لحظة مكافأة" فوق
          خريطة العالم (مش صفحة/بانل دائم). بيتفتح تلقائيًا (شوف
          useRewardPopups.js) وبيختفي تمامًا بعد الاستلام. ====== */}
      <DailyRewardPopup
        open={rewardPopups.dailyPopupOpen}
        status={rewardPopups.dailyStatus}
        onClose={rewardPopups.dismissDaily}
        onClaimed={rewardPopups.onDailyClaimed}
      />

      <HourlyGiftPopup
        open={rewardPopups.hourlyPopupOpen}
        onClose={rewardPopups.dismissHourly}
        onClaimed={rewardPopups.onHourlyClaimed}
      />
      {/* ====== بانر إعلانات - جوّه اللعب الحي نفسه (خريطة العالم). شريط
          ثابت (fixed) في أسفل الشاشة، منفصل تمامًا عن الـ document flow
          بتاع IsometricWorld/canvas اللعبة - فمبياخدش أي مساحة من مساحة
          اللعب ولا بيزحزح أي حاجة. z-40 عشان يفضل تحت أي مودال (المودالات
          هنا بتستخدم z-50+)، وpointer-events-none على الـ wrapper عشان
          الشريط الفاضي (لو مفيش إعلان اتحمّل فعليًا) مايحجبش الضغط على
          الخريطة تحته - الـ Banner نفسه بيرجّع pointer-events-auto. ====== */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[env(safe-area-inset-bottom)]">
        <div className="pointer-events-auto">
          <Banner position="bottom" />
        </div>
      </div>
    </div>
  );
}