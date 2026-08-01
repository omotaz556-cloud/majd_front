import { useCallback, useEffect, useRef, useState } from 'react';
import { getDailyRewardStatus } from '../../api/dailyReward';
import { getHourlyGiftStatus } from '../../ads/adsApi';

/**
 * ====== useRewardPopups ======
 *
 * المايسترو اللي بيقرر إمتى بوب أب المكافأة اليومية/هدية الساعة يظهر
 * تلقائيًا فوق خريطة العالم، وإمتى يختفي لبادج صغير بس. بيحل محل الكاردين
 * الدائمين اللي كانوا في GamesPage بالكامل.
 *
 * ====== ليه مفيش polling دوري مستقل ======
 * السيرفر هو مصدر الحقيقة الوحيد للأهلية دايمًا - بس ده مايستلزمش إننا
 * نسأله كل كام ثانية "لسه؟". بدل كده، بنسأل بس وقت لحظات حقيقية فيها احتمال
 * إن الأهلية اتغيّرت أو اللاعب محتاج يشوفها:
 *
 *   1) أول ما WorldMapPage يتحمّل (بيغطي "تسجيل الدخول" و"دخول خريطة
 *      العالم" مع بعض - البوب آبات دي أصلًا مش موجودة إلا جوه WorldMapPage).
 *   2) لما اللاعب يرجع للعبة بعد ما يكون سايبها (تبديل تاب، تصغير
 *      المتصفح/التطبيق، قفل الشاشة) - `visibilitychange` + `focus`.
 *   3) لما العدّاد المحلي (المبني على آخر secondsRemaining رجّعه السيرفر)
 *      يوصل صفر - بنتأكد من السيرفر مرة واحدة بس وقتها (مش قبل كده)، عشان
 *      فرق بسيط في الساعة أو تأخير شبكة ما يخلّيش البوب أب يفتح قبل وقته
 *      فعليًا أو يتأخر كتير.
 *   4) "أثناء التحديثات العادية للبيانات" - checkOnRefresh() مصمم عشان
 *      يتنادى من نفس الـ silent refresh الموجود أصلًا لقلعة اللاعب في
 *      WorldMapPage (كل 20 ثانية) بدل ما نضيف تايمر مستقل تاني بس لده -
 *      طلب واحد إضافي بس بيتلحق بطلب موجود أصلًا، مش نداء شبكة جديد بيتكرر
 *      لوحده.
 *
 * مفيش أي setInterval مستقل هنا بيسأل السيرفر بمفرده - كل نداء لازم يتبرر
 * بحدث حقيقي من اللي فوق.
 */
export function useRewardPopups() {
  const [dailyStatus, setDailyStatus] = useState(null);
  const [hourlyStatus, setHourlyStatus] = useState(null);

  const [dailyPopupOpen, setDailyPopupOpen] = useState(false);
  const [hourlyPopupOpen, setHourlyPopupOpen] = useState(false);

  // ====== "اتقفل يدويًا من غير استلام" - بيمنع إعادة الفتح التلقائي الفوري
  // بعد ما اللاعب يقفل البوب أب بنفسه، لحد ما الأهلية "تتجدد" (يستلم، أو
  // يعدي الكولداون تاني بعد استلام سابق) - عشان مايضلش يطارد اللاعب بنفس
  // البوب أب كل ما WorldMapPage يعيد render. ======
  const dailyDismissedRef = useRef(false);
  const hourlyDismissedRef = useRef(false);

  // ====== آخر seconds_remaining رجّعه السيرفر فعليًا - بيتحسب منه عدّاد
  // محلي تنازلي (تيك كل ثانية) بس للعرض؛ لما يوصل صفر بنعيد التأكد من
  // السيرفر مرة واحدة (شوف useEffect العدّاد تحت) بدل ما نفترض الأهلية
  // محليًا. ======
  const [dailySecondsLeft, setDailySecondsLeft] = useState(null);
  const [hourlySecondsLeft, setHourlySecondsLeft] = useState(null);

  const loadDailyStatus = useCallback(async () => {
    try {
      const data = await getDailyRewardStatus();
      setDailyStatus(data);
      setDailySecondsLeft(data.eligible ? 0 : data.seconds_remaining ?? null);
      return data;
    } catch {
      return null;
    }
  }, []);

  const loadHourlyStatus = useCallback(async () => {
    try {
      const data = await getHourlyGiftStatus();
      setHourlyStatus(data);
      setHourlySecondsLeft(data.eligible ? 0 : data.secondsRemaining ?? null);
      return data;
    } catch {
      return null;
    }
  }, []);

  const loadBothStatuses = useCallback(() => {
    loadDailyStatus();
    loadHourlyStatus();
  }, [loadDailyStatus, loadHourlyStatus]);

  // ====== (1) تحميل أولي وحيد - أول ما WorldMapPage (اللي البوب آبات دي
  // جواه بس) يتحمّل. ده بيغطي "تسجيل الدخول" و"دخول خريطة العالم" مع بعض،
  // لأن مفيش طريقة تانية اللاعب يوصل بيها لحالة "جوه اللعبة" غير من هنا. ======
  useEffect(() => {
    loadBothStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== (2) الرجوع للعبة بعد غياب - تبديل تاب، تصغير المتصفح/التطبيق،
  // قفل الشاشة، إلخ. بنتأكد من السيرفر تاني وقتها لأن وقت الغياب ممكن يكون
  // كافي إن كولداون يخلص من غير ما أي تايمر محلي يكون شغال أصلًا (مثلاً
  // المتصفح بيوقف/يبطّئ الـ JS تايمرز وقت التاب يكون في الخلفية). ======
  useEffect(() => {
    function handleVisible() {
      if (document.visibilityState === 'visible') {
        loadBothStatuses();
      }
    }
    function handleFocus() {
      loadBothStatuses();
    }
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadBothStatuses]);

  // ====== (3) العدّاد المحلي - تيك كل ثانية بس للعرض (مفيش نداء شبكة هنا).
  // لما يوصل صفر، بنسأل السيرفر مرة واحدة بس عشان نتأكد الأهلية فعلًا
  // تحققت (مش بس عدّادنا المحلي وصل صفر - ممكن يكون فيه فرق بسيط عن وقت
  // السيرفر الحقيقي). ======
  useEffect(() => {
    if (dailySecondsLeft === null || dailySecondsLeft <= 0) return undefined;
    const timer = setInterval(() => {
      setDailySecondsLeft((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          loadDailyStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [dailySecondsLeft > 0, loadDailyStatus]);

  useEffect(() => {
    if (hourlySecondsLeft === null || hourlySecondsLeft <= 0) return undefined;
    const timer = setInterval(() => {
      setHourlySecondsLeft((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          loadHourlyStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hourlySecondsLeft > 0, loadHourlyStatus]);

  // ====== (4) "أثناء التحديثات العادية للبيانات" - بيتنادى من WorldMapPage
  // جوّه نفس الـ silent refresh الموجود أصلًا لقلعة اللاعب (كل 20 ثانية)،
  // مش من تايمر مستقل هنا. بنتأكد بس لو مفيش عدّاد محلي شغال أصلًا (يعني
  // مفيش سبب نتوقع تغيّر - العدّاد نفسه هيمسك اللحظة اللي الأهلية تتغيّر
  // فيها) أو لو الأهلية أهل بالفعل (عشان أي حالة نادرة اتقفلت فيها لسبب ما). ======
  const checkOnRefreshImpl = useCallback(() => {
    if (dailySecondsLeft === null || dailySecondsLeft <= 0) loadDailyStatus();
    if (hourlySecondsLeft === null || hourlySecondsLeft <= 0) loadHourlyStatus();
  }, [dailySecondsLeft, hourlySecondsLeft, loadDailyStatus, loadHourlyStatus]);

  // ====== checkOnRefresh لازم يفضل نفس المرجع (reference) طول عمر
  // الكومبوننت - المستدعي (WorldMapPage) بيمسكه جوّه useEffect بـ deps
  // فاضية (بيتنفذ مرة واحدة بس عند mount)، فلو checkOnRefresh اتغيّر
  // مرجعه كل render (زي أي useCallback عادي بتتغيّر deps بتاعته)، الاستدعاء
  // القديم المحفوظ في الـ closure كان هيفضل شغال بمنطق/state قديم (stale
  // closure) لحد الأبد. الحل: ref بيتحدّث كل render بأحدث نسخة من المنطق،
  // ودالة ثابتة واحدة بس بتنادي اللي جوه الـ ref وقت التنفيذ الفعلي - مش
  // وقت ما اتمسكت. ======
  const checkOnRefreshRef = useRef(checkOnRefreshImpl);
  checkOnRefreshRef.current = checkOnRefreshImpl;
  const checkOnRefresh = useCallback(() => {
    checkOnRefreshRef.current();
  }, []);

  // ====== الفتح التلقائي: لما الحالة تبقى "أهل" ولسه ما اتقفلتش يدويًا،
  // يفتح البوب أب - مرة واحدة بس لكل فترة أهلية (مش هيفضل يفتح نفسه تاني
  // كل ما re-render يحصل، لأن dailyPopupOpen نفسه هيبقى true أصلًا). ======
  useEffect(() => {
    if (dailyStatus?.eligible && !dailyDismissedRef.current) {
      setDailyPopupOpen(true);
    }
    if (dailyStatus && !dailyStatus.eligible) {
      // ====== مكافأة النهاردة اتاخدت (من تبويب/جهاز تاني مثلاً) - نصفّر
      // علم "اتقفل يدويًا" عشان لو أهلية جديدة تيجي (بعد 24 ساعة) تقدر
      // تفتح البوب أب تلقائيًا تاني من غير ما تفضل متأثرة بقفلة قديمة. ======
      dailyDismissedRef.current = false;
    }
  }, [dailyStatus]);

  useEffect(() => {
    if (hourlyStatus?.eligible && !hourlyDismissedRef.current) {
      setHourlyPopupOpen(true);
    }
    if (hourlyStatus && !hourlyStatus.eligible) {
      hourlyDismissedRef.current = false;
    }
  }, [hourlyStatus]);

  const dismissDaily = useCallback(() => {
    dailyDismissedRef.current = true;
    setDailyPopupOpen(false);
  }, []);

  const dismissHourly = useCallback(() => {
    hourlyDismissedRef.current = true;
    setHourlyPopupOpen(false);
  }, []);

  const onDailyClaimed = useCallback(() => {
    dailyDismissedRef.current = false;
    setDailyPopupOpen(false);
    loadDailyStatus();
  }, [loadDailyStatus]);

  const onHourlyClaimed = useCallback(() => {
    hourlyDismissedRef.current = false;
    setHourlyPopupOpen(false);
    loadHourlyStatus();
  }, [loadHourlyStatus]);

  // ====== Badge على أيقونة الهدايا في WorldHUD - ظاهر طالما فيه مكافأة
  // متاحة ولسه ما اتاخدتش، بغض النظر هل البوب أب مفتوح دلوقتي أو اتقفل
  // يدويًا. ده اللي بيحقق "لو اتقفل من غير استلام، تظهر بادج بس لحد
  // الاستلام". ======
  const hasDailyBadge = Boolean(dailyStatus?.eligible);
  const hasHourlyBadge = Boolean(hourlyStatus?.eligible);
  const giftBadgeCount = (hasDailyBadge ? 1 : 0) + (hasHourlyBadge ? 1 : 0);

  // ====== فتح يدوي (من زرار أيقونة الهدايا في WorldHUD) - يفتح أي بوب أب
  // فيه مكافأة متاحة حاليًا، حتى لو اللاعب كان قفله قبل كده. ======
  const openAvailableManually = useCallback(() => {
    if (dailyStatus?.eligible) setDailyPopupOpen(true);
    if (hourlyStatus?.eligible) setHourlyPopupOpen(true);
  }, [dailyStatus, hourlyStatus]);

  return {
    dailyStatus,
    hourlyStatus,
    dailyPopupOpen,
    hourlyPopupOpen,
    dismissDaily,
    dismissHourly,
    onDailyClaimed,
    onHourlyClaimed,
    hasDailyBadge,
    hasHourlyBadge,
    giftBadgeCount,
    openAvailableManually,
    checkOnRefresh,
  };
}
