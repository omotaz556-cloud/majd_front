import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  bakeFogChunk,
  chunkOverlapsVision,
  getVisionCenter,
  getVisionRadiusInfo,
  isChunkExplored,
  markChunkExplored,
} from './terrain';
import { CHUNK_SIZE } from './isoGrid';
import { computeChunkRange, chunkKey, inRange, LOAD_MARGIN_CHUNKS, UNLOAD_MARGIN_CHUNKS } from './TerrainChunks';

// ====== ضباب الحرب - استكشاف حقيقي بالـ chunk (Fog of War / Exploration) ======
// المكوّن ده هو اللي بيحوّل الضباب من "فتحة ثابتة" لاستكشاف حقيقي:
//   1) بيتابع نفس دورة تحميل/تفريغ الـ chunks بالظبط اللي بتستخدمها
//      TerrainChunks (نفس الهوامش، نفس computeChunkRange) عشان الضباب يفضل
//      متزامن مع الأرض المحمّلة تحته دايمًا.
//   2) كل مرة الكاميرا تتحرك، بيحسب مركز نطاق الرؤية الحالي (منتصف الفيوبورت
//      الظاهر)، وأي chunk محمّل واقع جوه النطاق ده بيتسجّل "مستكشف" للأبد عن
//      طريق markChunkExplored - العملية دي مش بترجع للخلف أبدًا.
//   3) وقت الرسم: أي chunk اتسجّل مستكشف وواقع دلوقتي جوه نطاق الرؤية
//      الحالي مبيترسملوش أي ضباب خالص (إضاءة كاملة). أي chunk اتسجّل مستكشف
//      قبل كده بس دلوقتي برّه نطاق الرؤية بيترسم بتظليل خفيف شبه شفاف (يفضل
//      واضح إنه اتكتشف قبل كده، من غير ما يترجع يتغطى بضباب أسود تاني). وأي
//      chunk لسه ما اتسجّلش استكشاف بيترسم بضباب كامل (مع فتحة ناعمة لو
//      قاطع نطاق الرؤية الحالي - نفس شكل الفتحة القديمة بالظبط).

// تظليل خفيف لأي منطقة اتكشفت قبل كده لكن مش جوه نطاق الرؤية دلوقتي - عنصر
// بسيط (مش كانفاس) لأنه مجرد لون شبه شفاف ثابت، أرخص بكتير من إعادة رسم
// كانفاس لكل chunk قديم كل مرة الكاميرا تتحرك.
const FogDimOverlay = memo(function FogDimOverlay({ cx, cy }) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[15]"
      style={{
        left: cx * CHUNK_SIZE,
        top: cy * CHUNK_SIZE,
        width: CHUNK_SIZE,
        height: CHUNK_SIZE,
        background: 'rgba(4,6,10,0.32)',
      }}
    />
  );
});

// كانفاس ضباب "ثابت" - للـ chunks اللي بعيدة أوي عن نطاق الرؤية الحالي (مش
// هتتقاطع مع الفتحة أصلًا حتى لو الكاميرا اهتزت شوية) - بيتباك مرة واحدة بس
// (زي TerrainChunkCanvas بالظبط) وملء أسود بالكامل من غير أي حساب فتحة، عشان
// نفضّي معظم الـ chunks المحمّلة من إعادة الرسم المتكررة وقت السحب.
const StaticFogCanvas = memo(function StaticFogCanvas({ cx, cy, dpr }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (canvasRef.current) bakeFogChunk(canvasRef.current, cx, cy, dpr, 0, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cx, cy, dpr]);
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute left-0 top-0 z-[15]"
      style={{ left: cx * CHUNK_SIZE, top: cy * CHUNK_SIZE, width: CHUNK_SIZE, height: CHUNK_SIZE }}
    />
  );
});

// كانفاس ضباب "حي" - للـ chunks القريبة من حدود نطاق الرؤية الحالي بس (قليلة
// جدًا في أي وقت)، بيعيد الرسم كل ما مركز الرؤية يتحرك عشان يرسم فتحة ناعمة
// في المكان الصح بالظبط.
const LiveFogCanvas = memo(function LiveFogCanvas({ cx, cy, dpr, visionX, visionY }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (canvasRef.current) bakeFogChunk(canvasRef.current, cx, cy, dpr, visionX, visionY, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cx, cy, dpr, visionX, visionY]);
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute left-0 top-0 z-[15]"
      style={{ left: cx * CHUNK_SIZE, top: cy * CHUNK_SIZE, width: CHUNK_SIZE, height: CHUNK_SIZE }}
    />
  );
});

// هامش إضافي حوالين نطاق الرؤية - أي chunk جواه (حتى لو مش متقاطع فعليًا مع
// الفتحة النهائية) بيتعامل معاه كـ"حي" (LiveFogCanvas) بدل "ثابت" - عشان لما
// الكاميرا تتحرك شوية، الفتحة تتحدّث في نفس الـ chunk بدل ما تتقطع بصريًا.
const LIVE_MARGIN_PX = CHUNK_SIZE;

export default function FogChunks({ viewport, dpr }) {
  const [loadedChunks, setLoadedChunks] = useState(() => new Map());
  // بنزوّد الرقم ده كل مرة chunk جديد يتسجّل "مستكشف" عشان نجبر إعادة رسم
  // القائمة (isChunkExplored بترجع من مجموعة عادية، مش state - فمحتاجين
  // نبلّغ React بنفسنا إن فيه حاجة اتغيرت). مش محتاجين نقرا الرقم نفسه في أي
  // مكان - مجرد استدعاء الـ setter بيكفي عشان يعمل re-render.
  const [, setExploreVersion] = useState(0);

  useEffect(() => {
    if (!viewport || !viewport.viewportWidth || !viewport.viewportHeight) return;
    const loadRange = computeChunkRange(viewport, LOAD_MARGIN_CHUNKS);
    const unloadRange = computeChunkRange(viewport, UNLOAD_MARGIN_CHUNKS);

    setLoadedChunks((prev) => {
      let changed = false;
      const next = new Map();

      prev.forEach((coords, key) => {
        if (inRange(coords.cx, coords.cy, unloadRange)) {
          next.set(key, coords);
        } else {
          changed = true;
        }
      });

      for (let cx = loadRange.minCx; cx <= loadRange.maxCx; cx++) {
        for (let cy = loadRange.minCy; cy <= loadRange.maxCy; cy++) {
          const key = chunkKey(cx, cy);
          if (!next.has(key)) {
            next.set(key, { cx, cy });
            changed = true;
          }
        }
      }

      return changed ? next : prev;
    });
  }, [viewport]);

  const visionCenter = useMemo(() => (viewport ? getVisionCenter(viewport) : null), [viewport]);
  const { outerR } = useMemo(() => getVisionRadiusInfo(), []);

  // بعد كل رسم: أي chunk محمّل وواقع جوه نطاق الرؤية الحالي ولسه ما اتسجّلش
  // مستكشف، بنسجّله دلوقتي - العملية دي "للأبد" (شوف markChunkExplored)،
  // فمهما الكاميرا بعدت بعد كده، الـ chunk ده هيفضل مكشوف.
  useEffect(() => {
    if (!visionCenter) return;
    let revealedAny = false;
    loadedChunks.forEach(({ cx, cy }) => {
      if (isChunkExplored(cx, cy)) return;
      if (chunkOverlapsVision(cx, cy, visionCenter, outerR)) {
        if (markChunkExplored(cx, cy)) revealedAny = true;
      }
    });
    if (revealedAny) setExploreVersion((v) => v + 1);
  }, [loadedChunks, visionCenter, outerR]);

  const chunks = useMemo(() => [...loadedChunks.entries()], [loadedChunks]);

  return (
    <>
      {chunks.map(([key, { cx, cy }]) => {
        const explored = isChunkExplored(cx, cy);
        const inVision = visionCenter ? chunkOverlapsVision(cx, cy, visionCenter, outerR) : false;

        if (explored && inVision) return null; // إضاءة كاملة - مفيش أي تظليل خالص

        if (explored) {
          // اتكشف قبل كده، بس مش جوه نطاق الرؤية دلوقتي - يفضل واضح للأبد،
          // بس بتظليل خفيف يميّزه عن المنطقة المضيئة حاليًا.
          return <FogDimOverlay key={key} cx={cx} cy={cy} />;
        }

        // لسه ما اتكشفش خالص - ضباب كامل، مع فتحة ناعمة لو قريب من نطاق
        // الرؤية الحالي (LiveFogCanvas)، وإلا ملء أسود ثابت رخيص (StaticFogCanvas).
        const nearVision = visionCenter
          ? chunkOverlapsVision(cx, cy, visionCenter, outerR + LIVE_MARGIN_PX)
          : false;

        return nearVision ? (
          <LiveFogCanvas key={key} cx={cx} cy={cy} dpr={dpr} visionX={visionCenter.x} visionY={visionCenter.y} />
        ) : (
          <StaticFogCanvas key={key} cx={cx} cy={cy} dpr={dpr} />
        );
      })}
    </>
  );
}
