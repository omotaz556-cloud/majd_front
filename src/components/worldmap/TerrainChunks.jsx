import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { bakeTerrainChunk } from './terrain';
import { CHUNK_SIZE } from './isoGrid';

// ====== تحميل أجزاء العالم (Chunk Loading) ======
// بدل ما نباك كانفاس واحد بحجم العالم كله من أول لحظة (زي ما كان قبل كده)،
// المكوّن ده بيراقب مكان الكاميرا (اللي بتوصله من IsoViewport عن طريق
// onViewportChange) وبيقرر بس أي أجزاء (chunks) من الأرض لازم تتحمّل (قريبة
// من اللي ظاهر على الشاشة + هامش صغير)، وأي أجزاء بعيدة كفاية تتشال (يتفك
// تحميلها) عشان نفضّي الذاكرة بتاعتها. اللعب نفسه (المباني/الضباب/شبكة
// البناء) مبيتأثرش خالص - دول لسه بيترسموا زي ما كانوا بالظبط.

// هامش التحميل: قد إيه من الـ chunks الإضافية (حوالين اللي ظاهر فعليًا على
// الشاشة) بنحمّلها مقدّمًا - عشان لما اللاعب يسحب الخريطة، الجزء الجديد يكون
// خلاص محمّل من قبل ما يبان، مش هيبان فاضي للحظة.
export const LOAD_MARGIN_CHUNKS = 1;
// هامش التفريغ: أكبر من هامش التحميل، ولازم يكون كده عشان لما الكاميرا تتحرك
// شوية قدام ورا على حدود شنك، الشنك مايتحمّلش ويتفك تحميله كل شوية (thrashing)
// - بيفضل محمّل لحد ما يبعد بمسافة معقولة فعلاً.
export const UNLOAD_MARGIN_CHUNKS = 2;

// بيحسب مدى الـ chunks (بالأعمدة/الصفوف) اللي المفروض تتحمّل حسب مكان
// الكاميرا الحالي + هامش معين - نفس الحساب مستخدم للتحميل (هامش صغير) وللتفريغ
// (هامش أكبر). العالم من غير حافة عملية فمفيش أي clamp هنا - minCx/maxCx و
// minCy/maxCy ممكن يبقوا أي رقم صحيح (موجب أو سالب) حسب مكان الكاميرا، وكل
// إحداثية chunk بتولّد نفسها إجرائيًا من بذرتها هي بس (chunkSeed) من غير أي
// اعتماد على حدود عالم ثابتة.
export function computeChunkRange({ x, y, scale, viewportWidth, viewportHeight }, marginChunks) {
  const worldLeft = -x / scale;
  const worldTop = -y / scale;
  const worldRight = worldLeft + viewportWidth / scale;
  const worldBottom = worldTop + viewportHeight / scale;

  return {
    minCx: Math.floor(worldLeft / CHUNK_SIZE) - marginChunks,
    maxCx: Math.ceil(worldRight / CHUNK_SIZE) + marginChunks,
    minCy: Math.floor(worldTop / CHUNK_SIZE) - marginChunks,
    maxCy: Math.ceil(worldBottom / CHUNK_SIZE) + marginChunks,
  };
}

export function chunkKey(cx, cy) {
  return `${cx},${cy}`;
}

export function inRange(cx, cy, range) {
  return cx >= range.minCx && cx <= range.maxCx && cy >= range.minCy && cy <= range.maxCy;
}

// كانفاس شنك واحد - بيتباك مرة واحدة بس أول ما يتركّب (mount)، وبيتشال من
// الذاكرة أوتوماتيك أول ما يتفك تركيبه (unmount) لما المكوّن الأب يسيبه برّه
// نطاق التفريغ. React.memo هنا مهم: بيمنع أي إعادة رسم/باكينج تاني للشنك ده
// لمجرد إن المكوّن الأب (TerrainChunks) اتعاد تنفيذه لسبب تاني (زي عدّاد
// الوقت في الصفحة) - الباكينج بيحصل مرة واحدة بس طول ما cx/cy/dpr ثابتين.
const TerrainChunkCanvas = memo(function TerrainChunkCanvas({ cx, cy, dpr }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) bakeTerrainChunk(canvasRef.current, cx, cy, dpr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cx, cy, dpr]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute left-0 top-0"
      style={{ left: cx * CHUNK_SIZE, top: cy * CHUNK_SIZE, width: CHUNK_SIZE, height: CHUNK_SIZE }}
    />
  );
});

export default function TerrainChunks({ viewport, dpr }) {
  const [loadedChunks, setLoadedChunks] = useState(() => new Map()); // key -> { cx, cy }

  useEffect(() => {
    if (!viewport || !viewport.viewportWidth || !viewport.viewportHeight) return;
    const loadRange = computeChunkRange(viewport, LOAD_MARGIN_CHUNKS);
    const unloadRange = computeChunkRange(viewport, UNLOAD_MARGIN_CHUNKS);

    setLoadedChunks((prev) => {
      let changed = false;
      const next = new Map();

      // نسيب أي شنك لسه جوه نطاق التفريغ (الأوسع) زي ما هو - من غير ما نعيد باكينجه
      prev.forEach((coords, key) => {
        if (inRange(coords.cx, coords.cy, unloadRange)) {
          next.set(key, coords);
        } else {
          changed = true; // خرج برّه نطاق التفريغ -> يتشال (unload)
        }
      });

      // نضيف أي شنك جوه نطاق التحميل (الأضيق) لسه مش محمّل
      for (let cx = loadRange.minCx; cx <= loadRange.maxCx; cx++) {
        for (let cy = loadRange.minCy; cy <= loadRange.maxCy; cy++) {
          const key = chunkKey(cx, cy);
          if (!next.has(key)) {
            next.set(key, { cx, cy });
            changed = true; // شنك جديد -> يتحمّل (load)
          }
        }
      }

      return changed ? next : prev;
    });
  }, [viewport]);

  const chunks = useMemo(() => [...loadedChunks.entries()], [loadedChunks]);

  return (
    <>
      {chunks.map(([key, { cx, cy }]) => (
        <TerrainChunkCanvas key={key} cx={cx} cy={cy} dpr={dpr} />
      ))}
    </>
  );
}
