import { useRef } from 'react';
import { gridPositionToOffset, gridToWorld } from './isoGrid';
import { DefenseStructureSprite } from './defenseBuildingArt';
import { formatDuration } from '../../utils/duration';

// =============================================================================
// DefenseStructureLayer - rendering of a castle's real defensive structures
// (walls/gates/towers/traps/barricades)
// =============================================================================
// ====== ده أول رندر بصري لقطع الدفاع (defense.structures) في اللعبة كلها -
// النظام الخلفي (backend/src/modules/defense) موجود بالفعل بمواقعه وحالاته
// الحقيقية. القطع بقى ليها شكل حقيقي خاص بيها (defenseBuildingArt.jsx) بنفس
// مقياس مباني القلعة العادية (VB_W/VB_H) بدل شكل صغير مجرّد - وبقت قابلة
// للضغط (زي BuildingMarker في IsometricWorld.jsx بالظبط: نفس منطق منع
// انتشار حدث الـ pointer عشان الكليك يشتغل صح فوق IsoViewport) عشان اللاعب
// يقدر يشوف بانل معلوماتها ويرقّيها/ينقلها/يحذفها - قبل كده كانت read-only
// بالكامل (مفيش onClick خالص). ======
const VB_W = 120;
const VB_H = 190;

// حجم بصري مختلف لكل نوع (زي VISUAL_LAYOUT بتاع المباني بالظبط) - الأبراج
// والبوابة أكبر (منشآت مهيبة)، السور أصغر شوية (قطعة مستقلة بمكانها)،
// والفخ/المتراس أصغر عمدًا (مش المفروض يبانوا "مبنى" ضخم).
const VISUAL_SCALE = {
  wall: 0.85,
  gate: 1.15,
  archer_tower: 1.3,
  ballista_tower: 1.3,
  catapult_tower: 1.3,
  watch_tower: 1.1,
  trap: 0.7,
  barricade: 0.75,
};
const DEFAULT_SCALE = 1;

const CATEGORY_LABELS = {
  wall: 'سور',
  gate: 'بوابة',
  tower: 'برج',
  trap: 'فخ',
  barricade: 'متراس',
};

function DefenseStructureMarker({ structure, cityOrigin, now, selected, onSelect }) {
  const { gx, gy } = gridPositionToOffset(structure.position.x, structure.position.y);
  const { x, y } = gridToWorld(gx + cityOrigin.gx, gy + cityOrigin.gy);
  const label = CATEGORY_LABELS[structure.category] || '';
  const destroyed = structure.repair?.state === 'destroyed' || structure.gate_state?.destroyed;
  const downPos = useRef(null);

  const scale = VISUAL_SCALE[structure.type] ?? DEFAULT_SCALE;
  const w = VB_W * scale;
  const h = VB_H * scale;

  const building = structure.build?.state === 'building' && structure.build.completes_at;
  const upgrading = structure.upgrade?.in_progress && structure.upgrade.completes_at;
  const nowMs = now ?? Date.now();
  const countdownMs = building
    ? new Date(structure.build.completes_at).getTime() - nowMs
    : upgrading
    ? new Date(structure.upgrade.completes_at).getTime() - nowMs
    : null;

  return (
    <button
      type="button"
      aria-label={structure.name || label}
      // نفس منطق منع انتشار حدث الـ pointer بتاع BuildingMarker بالظبط -
      // من غيره IsoViewport (اللي بيعمل setPointerCapture على نفسه) بيلقّف
      // كل أحداث move/up الجاية بعد كده والكليك مبيوصلش للزرار خالص.
      onPointerDown={(e) => {
        e.stopPropagation();
        downPos.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        const d = downPos.current;
        const moved = d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6;
        if (!moved) onSelect?.(structure);
      }}
      onClick={(e) => e.stopPropagation()}
      className="group absolute z-10 flex cursor-pointer flex-col items-center pointer-events-auto focus:outline-none"
      style={{ left: x - w / 2, top: y - h + 40, width: w, height: h + 30 }}
    >
      <DefenseStructureSprite
        type={structure.type}
        level={Math.max(1, structure.level)}
        destroyed={destroyed}
        open={structure.gate_state?.open}
        selected={selected}
        width={w}
        height={h}
      />
      {(building || upgrading) && (
        <div
          className="pointer-events-none absolute rounded-full bg-stone-950/35"
          style={{ left: 0, top: 40, width: w, height: h, backdropFilter: 'grayscale(1)' }}
        />
      )}

      <span
        className={`-mt-2 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow transition-colors ${
          selected
            ? 'border-sky-300 bg-sky-400/95 text-stone-900'
            : 'border-black/30 bg-stone-900/85 text-sky-100 group-hover:bg-stone-900'
        }`}
      >
        {label} {structure.category === 'gate' && structure.gate_state?.destroyed ? '(متدمرة)' : `Lv.${structure.level}`}
      </span>

      {(building || upgrading) && (
        <>
          <span className="mt-1 rounded bg-emerald-600/90 px-1.5 text-[10px] font-mono text-white">
            {building ? 'قيد الإنشاء' : 'قيد الترقية'}
          </span>
          <span className="mt-1 rounded bg-emerald-950/80 px-1.5 font-mono text-[10px] text-emerald-300">
            {formatDuration(countdownMs)}
          </span>
        </>
      )}
    </button>
  );
}

export default function DefenseStructureLayer({
  structures = [],
  cityOrigin = { gx: 0, gy: 0 },
  now,
  selectedId,
  onSelect,
}) {
  if (!structures.length) return null;

  return (
    <>
      {structures.map((s) => (
        <DefenseStructureMarker
          key={s.id || s._id}
          structure={s}
          cityOrigin={cityOrigin}
          now={now}
          selected={selectedId === s.id}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
