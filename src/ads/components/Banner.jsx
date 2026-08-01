import { useEffect, useRef, useState, useId } from 'react';
import Ads from '../Ads';
import { adsConfig, loadAdsConfig } from '../adsConfig';

/**
 * ====== Banner ======
 * كومبوننت بانر قابل لإعادة الاستخدام. بيدعم:
 *   - position="top" | "bottom" | "inline"
 *   - lazy loading (بيستنى العنصر يدخل الشاشة قبل ما يطلب الإعلان)
 *   - تدمير تلقائي عند unmount
 *
 * الاستخدام:
 *   <Banner position="bottom" />
 *   <Banner position="inline" adUnit="custom-slot" />
 */
export default function Banner({ position = 'inline', adUnit, className = '', lazy = true }) {
  const generatedId = useId().replace(/:/g, '');
  const containerId = `ads-banner-${generatedId}`;
  const containerRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(!lazy);
  const [shown, setShown] = useState(false);
  // ====== adsConfig.enabled fix ======
  // adsConfig هو object عادي بيتحدّث بالـ mutation (نفس الـ reference) من
  // جوه loadAdsConfig() - مش React state. لو الكومبوننت اتعمله render الأول
  // قبل ما GET /ads/config يخلّص (السيناريو العادي، لأنه طلب شبكة)،
  // adsConfig.enabled بتكون لسه على القيمة الافتراضية false، فالكومبوننت
  // كان بيرجع null نهائياً (return null) ومكانش بيعمل re-render تاني أبداً
  // حتى لو enabled بقت true بعد كده - يعني البانر يفضل مختفي طول عمر
  // الصفحة. الحل: نتابع القيمة دي بـ local state حقيقي، ونستنى نفس الـ
  // promise بتاع loadAdsConfig() (بيرجع فورًا لو خلص قبل كده) عشان نحدّثها.
  const [configEnabled, setConfigEnabled] = useState(adsConfig.enabled);

  useEffect(() => {
    let cancelled = false;
    loadAdsConfig().then(() => {
      if (!cancelled) setConfigEnabled(adsConfig.enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ====== Lazy loading: بنستخدم IntersectionObserver عشان نطلب الإعلان
  // بس لما الكونتينر يقرب يدخل الشاشة، بدل ما نحمّل بانرات مش هتتشاف أصلاً
  useEffect(() => {
    if (!lazy || shouldLoad) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [lazy, shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    let pollId = null;

    // ====== Race condition fix ======
    // Ads.initialize() (اللي بينادى من AdsBootstrap عند إقلاع التطبيق) async
    // وبيستنى GET /ads/config الأول - ده بياخد وقت شبكة حقيقي. لو الـ Banner
    // اتعمله mount (مثلاً المستخدم فتح GamesPage بسرعة) قبل ما التهيئة دي
    // تخلص، كان Ads.isAvailable() بيرجع false في اللحظة دي، والـ effect كان
    // بيرجع فورًا من غير أي إعادة محاولة لاحقة - فالبانر يفضل مخفي طول عمر
    // الصفحة حتى لو التهيئة خلصت بنجاح بعد جزء من الثانية. الحل: لو لسه مش
    // متاح، نستنى (polling خفيف) لحد ما يبقى متاح أو التهيئة تفشل نهائياً.
    const tryShowBanner = () => {
      if (cancelled) return;

      if (Ads.isAvailable()) {
        Ads.showBanner({ containerId, position, adUnit }).then((result) => {
          if (!cancelled) setShown(result.shown);
        });
        return;
      }

      // لسه بيتهيّأ (أو مش متاح خالص) - نجرب تاني كل 300ms. AdsManager
      // بيفشل بأمان (ADS_ENABLED=false أو خطأ تهيئة)، فمفيش خطر infinite
      // loop حقيقي: isAvailable() هترجع false باستمرار من غير ما تتغير،
      // والـ polling ده رخيص جدًا (فحص متزامن، مفيش شبكة).
      pollId = window.setTimeout(tryShowBanner, 300);
    };

    tryShowBanner();

    return () => {
      cancelled = true;
      if (pollId) window.clearTimeout(pollId);
      // تدمير تلقائي عند unmount عشان منسربش slots من غير استخدام
      import('../AdsManager').then(({ default: AdsManager }) => {
        AdsManager.destroyBanner(containerId);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldLoad]);

  if (!configEnabled) return null;

  const positionClass =
    position === 'top'
      ? 'w-full flex justify-center'
      : position === 'bottom'
        ? 'w-full flex justify-center'
        : '';

  return (
    <div
      ref={containerRef}
      id={containerId}
      data-ads-position={position}
      className={`ads-banner min-h-[50px] ${positionClass} ${className}`}
      aria-hidden={!shown}
    />
  );
}