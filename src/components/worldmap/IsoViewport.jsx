import { forwardRef, useCallback, useImperativeHandle, useRef, useState, useEffect } from 'react';

const MIN_SCALE = 0.45;
const MAX_SCALE = 2.2;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// بيقيّد إحداثية واحدة (x أو y) بتاعة الكاميرا عشان الفيوبورت (الشاشة) يفضل
// دايمًا شايف جزء من العالم بس، ومايعديش حدوده - ده بس لما bounded=true. لو
// bounded=false (العالم من غير حافة عملية - استكشاف مفتوح)، مفيش أي قيد
// خالص: الكاميرا تقدر تتحرك لأي اتجاه وأي مسافة، وأرضية العالم (chunks)
// بتتولّد إجرائيًا في أي اتجاه بتتحرك له (شوف TerrainChunks.jsx).
function clampCameraAxis(pos, worldSize, viewportSize, bounded) {
  if (!bounded) return pos;
  if (worldSize <= viewportSize) {
    return (viewportSize - worldSize) / 2;
  }
  const min = viewportSize - worldSize; // أقصى إزاحة لليسار/لأعلى (سالبة)
  return clamp(pos, min, 0);
}

// عشان نسمح بأكتر من إصبع (pinch-zoom) بنتتبع كل الـ pointers الشغالة دلوقتي
// في map واحدة، بدل ما نعتمد بس على touch events القديمة.
const IsoViewport = forwardRef(function IsoViewport(
  { worldWidth, worldHeight, initialScale = 0.62, children, className = '', onViewportChange, bounded = true },
  ref
) {
  const containerRef = useRef(null);
  const layerRef = useRef(null);
  const camera = useRef({ x: 0, y: 0, scale: initialScale });
  const pointers = useRef(new Map());
  const dragState = useRef(null);
  const [, forceRerender] = useState(0);

  // أحدث نسخة من onViewportChange - بنسيبها في ref عشان notifyViewportChange
  // يفضل ثابت (useCallback من غير deps) ومايحتاجش يتعمل له إعادة إنشاء كل مرة
  // الأب يعيد رسم نفسه بدالة callback جديدة.
  const onViewportChangeRef = useRef(onViewportChange);
  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  });

  // بنبلّغ الأب (لو مهتم) بمكان الكاميرا الحالي - مستخدم عشان "تحميل أجزاء
  // العالم" (chunk loading): الأب بيعرف منها أي جزء من العالم ظاهر فعليًا
  // دلوقتي، فيحمّل بس الأجزاء القريبة منه ويشيل البعيدة. بنأجّل الإبلاغ لأول
  // فريم رسم جاي (requestAnimationFrame) بدل ما نبلّغه على طول مع كل حركة
  // ماوس/إصبع - عشان السحب (pan) يفضل سلس من غير ما نعمل setState في الأب
  // مع كل بكسل بيتحرك.
  const rafRef = useRef(null);
  const notifyViewportChange = useCallback(() => {
    if (!onViewportChangeRef.current) return;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const container = containerRef.current;
      if (!container || !onViewportChangeRef.current) return;
      const rect = container.getBoundingClientRect();
      const { x, y, scale } = camera.current;
      onViewportChangeRef.current({ x, y, scale, viewportWidth: rect.width, viewportHeight: rect.height });
    });
  }, []);

  useEffect(() => () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const applyTransform = useCallback(() => {
    const el = layerRef.current;
    if (!el) return;
    const { x, y, scale } = camera.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    notifyViewportChange();
  }, [notifyViewportChange]);

  // بيرجع موضع كاميرا مسموح بيه (x/y مقيدين لحدود العالم) لأي (x, y, scale)
  // مقترح - المرجع الوحيد اللي بيتحكم في حركة الكاميرا جوه العالم. أي تعديل
  // على موضع الكاميرا (سحب، زووم، توسيط، تغيير حجم الشاشة) لازم يعدي من هنا
  // الأول قبل ما يتطبق، عشان الكاميرا مايبقاش ليها طريقة تخرج بيها برّه
  // حدود العالم.
  const clampCamera = useCallback(
    (x, y, scale) => {
      const container = containerRef.current;
      if (!container) return { x, y, scale };
      const rect = container.getBoundingClientRect();
      return {
        scale,
        x: clampCameraAxis(x, worldWidth * scale, rect.width, bounded),
        y: clampCameraAxis(y, worldHeight * scale, rect.height, bounded),
      };
    },
    [worldWidth, worldHeight, bounded]
  );

  const centerCamera = useCallback(
    (scale = camera.current.scale) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      camera.current = clampCamera(
        rect.width / 2 - (worldWidth / 2) * scale,
        rect.height / 2 - (worldHeight / 2) * scale,
        scale
      );
      applyTransform();
    },
    [applyTransform, clampCamera, worldWidth, worldHeight]
  );

  useEffect(() => {
    centerCamera(initialScale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== حركة كاميرا سلسة (animated) لنقطة معيّنة على لوحة العالم - مستخدمة
  // وقت ما اللاعب يضغط على قلعة قريبة (تتحرك الكاميرا ليها) أو يضغط "ارجع
  // لقلعتي" (بترجع لمركز العالم). بنعمل lerp بسيط بين مكان الكاميرا الحالي
  // والمكان المستهدف عبر عدة فريمات (requestAnimationFrame) بدل قفزة فورية،
  // عشان يبان بصريًا إن الكاميرا "بتتحرك" مش بتقفز. ======
  const cameraAnimRef = useRef(null);
  const animateCameraTo = useCallback(
    (targetX, targetY, targetScale, duration = 450) => {
      if (cameraAnimRef.current) {
        cancelAnimationFrame(cameraAnimRef.current);
        cameraAnimRef.current = null;
      }
      const from = { ...camera.current };
      const to = clampCamera(targetX, targetY, targetScale);
      const startTime = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        camera.current = {
          x: from.x + (to.x - from.x) * eased,
          y: from.y + (to.y - from.y) * eased,
          scale: from.scale + (to.scale - from.scale) * eased,
        };
        applyTransform();
        if (t < 1) {
          cameraAnimRef.current = requestAnimationFrame(step);
        } else {
          cameraAnimRef.current = null;
        }
      };
      cameraAnimRef.current = requestAnimationFrame(step);
    },
    [applyTransform, clampCamera]
  );

  useEffect(
    () => () => {
      if (cameraAnimRef.current) cancelAnimationFrame(cameraAnimRef.current);
    },
    []
  );

  const zoomAt = useCallback(
    (factor, anchorClientX, anchorClientY) => {
      const container = containerRef.current;
      if (!container) return;
      if (cameraAnimRef.current) {
        cancelAnimationFrame(cameraAnimRef.current);
        cameraAnimRef.current = null;
      }
      const rect = container.getBoundingClientRect();
      const anchorX = anchorClientX ?? rect.left + rect.width / 2;
      const anchorY = anchorClientY ?? rect.top + rect.height / 2;
      const localX = anchorX - rect.left;
      const localY = anchorY - rect.top;
      const { x, y, scale } = camera.current;
      const newScale = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
      const ratio = newScale / scale;
      camera.current = clampCamera(
        localX - (localX - x) * ratio,
        localY - (localY - y) * ratio,
        newScale
      );
      applyTransform();
    },
    [applyTransform, clampCamera]
  );

  // ====== يحرّك الكاميرا (بحركة سلسة) لنقطة (worldX, worldY) على لوحة العالم
  // وتخليها في نص الشاشة - مستخدمة وقت ما اللاعب يضغط على قلعة قريبة على
  // الخريطة عشان الكاميرا "تتحرك" ليها بدل ما تفضل واقفة مكانها. لو مفيش
  // scale متبعت، بنستخدم مستوى التكبير الحالي للكاميرا زي ما هو. ======
  const focusOn = useCallback(
    (worldX, worldY, scale) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const targetScale = scale ?? camera.current.scale;
      animateCameraTo(rect.width / 2 - worldX * targetScale, rect.height / 2 - worldY * targetScale, targetScale);
    },
    [animateCameraTo]
  );

  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomAt(1.25),
    zoomOut: () => zoomAt(0.8),
    // توسيط فوري (يستخدم داخليًا/وقت تغيير حجم الشاشة)
    recenter: () => centerCamera(initialScale),
    // "ارجع لقلعتي" - نفس نقطة توسيط الكاميرا (مركز العالم = قلعة اللاعب)
    // بس بحركة سلسة عشان تحس إن الكاميرا فعلًا "رجعت" مش قفزت.
    goToMyCastle: () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      animateCameraTo(
        rect.width / 2 - (worldWidth / 2) * initialScale,
        rect.height / 2 - (worldHeight / 2) * initialScale,
        initialScale
      );
    },
    focusOn,
  }));

  const onPointerDown = (e) => {
    if (cameraAnimRef.current) {
      cancelAnimationFrame(cameraAnimRef.current);
      cameraAnimRef.current = null;
    }
    containerRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragState.current = { startX: e.clientX, startY: e.clientY, camX: camera.current.x, camY: camera.current.y, moved: false };
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      dragState.current = { pinchDist: dist, pinchScale: camera.current.scale };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && dragState.current?.pinchDist) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const targetScale = clamp(dragState.current.pinchScale * (dist / dragState.current.pinchDist), MIN_SCALE, MAX_SCALE);
      zoomAt(targetScale / camera.current.scale, midX, midY);
      return;
    }

    if (pointers.current.size === 1 && dragState.current && dragState.current.startX !== undefined) {
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragState.current.moved = true;
      camera.current = clampCamera(dragState.current.camX + dx, dragState.current.camY + dy, camera.current.scale);
      applyTransform();
    }
  };

  const endDrag = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      // موجات صغيرة عشان أي حد يضغط دوس عادي مش سحب يفضل شغال طبيعي
      setTimeout(() => {
        if (dragState.current) dragState.current.moved = false;
      }, 0);
    } else if (pointers.current.size === 1) {
      const [[, p]] = pointers.current;
      dragState.current = { startX: p.x, startY: p.y, camX: camera.current.x, camY: camera.current.y, moved: true };
    }
  };

  const onWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomAt(factor, e.clientX, e.clientY);
  };

  // ====== React بيسجل onWheel (لو استخدمناه كـ prop في الـ JSX زي
  // onWheel={onWheel}) كـ passive listener افتراضيًا (تحسين أداء scroll من
  // React نفسه)، وده معناه إن أي e.preventDefault() جوه بيتجاهله المتصفح
  // بصمت ويطلّع warning "Unable to preventDefault inside passive event
  // listener invocation" في الـ console - مرة لكل عملية زوم بعجلة الماوس،
  // وده اللي كان بيغرق الـ console وبيبطّئ اللعبة. الحل: نسجل الـ wheel
  // listener يدويًا بـ addEventListener مع { passive: false } صراحةً، عشان
  // نضمن إن الـ preventDefault يشتغل فعليًا ويوقف الـ scroll الطبيعي
  // للصفحة وقت الزوم على الخريطة. ======
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // نفرض إعادة رسم بسيطة أول ما الحاوية تتغير حجمها (مثلاً فتح/قفل الشريط
  // الجانبي) عشان نعيد توسيط الكاميرا صح.
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const { x, y, scale } = camera.current;
      camera.current = clampCamera(x, y, scale);
      applyTransform();
      forceRerender((n) => n + 1);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative touch-none select-none overflow-hidden ${className}`}
      style={{ cursor: dragState.current?.moved ? 'grabbing' : 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <div
        ref={layerRef}
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: worldWidth, height: worldHeight, willChange: 'transform' }}
      >
        {children}
      </div>
    </div>
  );
});

export default IsoViewport;