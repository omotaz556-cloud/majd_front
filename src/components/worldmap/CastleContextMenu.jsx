import { useRef } from 'react';
import { DoorOpen, Swords, X, Star, Shield, Eye, Pickaxe, Handshake } from 'lucide-react';
import { gridToWorld, nearbyCastleToGrid, mapSlotToGrid } from './isoGrid';

// ====== قائمة سياق (Context Menu) بتظهر فوق القلعة القريبة نفسها على
// الخريطة مباشرة لما اللاعب يضغط عليها - "دخول المملكة" / "هجوم" - بدون فتح
// أي بوب أب معاينة مصغّرة أو الانتقال لصفحة تانية. "دخول المملكة" بيحمّل
// قلعة اللاعب/المعسكر ده كاملة وبيرسمها بنفس مشهد القلعة (Castle Scene)
// المستخدم لقلعة اللاعب نفسه - مش نسخة تقريبية. بترتسم جوه نفس اللوحة
// الإيزومترية (isoGrid.gridToWorld) عشان تتحرك وتتكبر/تصغر مع الخريطة
// بالظبط زي أي قلعة أو مبنى تاني. ======
export default function CastleContextMenu({ castle, myMapSlot, onEnterKingdom, onAttack, onScout, onGather, onInteract, onClose }) {
  const downPos = useRef(null);

  if (!castle || !myMapSlot) return null;

  // ====== NEW (Attackable World Objects) - كائنات العالم بترتسم على الخريطة
  // بـ mapSlotToGrid (مقياس حقيقي متناسب - راجع WorldObjectMarker في
  // IsometricWorld.jsx)، مش nearbyCastleToGrid (مقياس مضغوط جوه نصف قطر
  // الضباب المستخدم للقلاع بس) - لازم القائمة تتمركز بنفس الدالة بالظبط عشان
  // تبان فوق الماركر مباشرة مش في مكان تاني على الشاشة. ======
  const { gx, gy } = castle.is_world_object ? mapSlotToGrid(castle.map_slot, myMapSlot) : nearbyCastleToGrid(castle, myMapSlot);
  const { x, y } = gridToWorld(gx, gy);

  // نفس منطق "منع الحدث من الوصول لـ IsoViewport" المستخدم في كل ماركر تاني
  // على الخريطة (BuildingMarker/NearbyCastleMarker) - لولاها كان هيتعامل مع
  // الضغطة كأنها سحب/بان للكاميرا.
  function stopAll(e) {
    e.stopPropagation();
  }

  // ====== FIX (Attack/Gather/Interact must only appear for their matching
  // interaction_type) - كان الهجوم/الاستكشاف بيتحسبوا لأي كائن عالم
  // (is_world_object) من غير ما يتفحص نوع التفاعل بتاعه فعليًا، وكان مفيش أي
  // فرع خالص لـ gatherable/interactable (فمكنش يظهر زرار "حصاد" ولا "تفاعل"
  // أبدًا لأي كائن، حتى لو النوع بتاعه يستاهل). دلوقتي كل فرع محسوب من
  // castle.interaction_type (نفس المصدر الوحيد للحقيقة المستخدم في
  // attackableWorldObject.js) - مفيش أي تخمين من category. ======
  const isHostile = castle.is_world_object && castle.interaction_type === 'attackable';
  const isGatherable = castle.is_world_object && castle.interaction_type === 'gatherable';
  const isInteractable = castle.is_world_object && castle.interaction_type === 'interactable';

  const canAttack = castle.is_world_object ? isHostile && !castle.depleted : !castle.is_same_alliance;
  const canScout = castle.is_world_object ? isHostile && !castle.depleted : true;
  const canGather = isGatherable && !castle.depleted;

  return (
    <div
      onPointerDown={stopAll}
      onPointerUp={stopAll}
      onClick={stopAll}
      className="pointer-events-auto absolute z-30 -translate-x-1/2 flex flex-col items-stretch gap-1 rounded-xl border border-amber-400/30 bg-stone-950/95 p-1.5 shadow-2xl backdrop-blur-sm"
      style={{ left: x, top: y - 92, width: 190 }}
    >
      <div className="flex items-center justify-between px-1.5 pb-1 pt-0.5">
        <span className="truncate text-[11px] font-bold text-white/80">
          {castle.is_npc ? castle.name : castle.owner_name || 'قلعة لاعب'}
        </span>
        <button
          type="button"
          onPointerDown={(e) => {
            downPos.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            const d = downPos.current;
            const moved = d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6;
            if (!moved) onClose?.();
          }}
          aria-label="إغلاق"
          className="rounded-md p-0.5 text-white/50 hover:text-white"
        >
          <X size={13} />
        </button>
      </div>

      {/* ====== NEW: درجة صعوبة معسكر NPC - نظرة سريعة قبل ما تدخل المملكة
          أصلًا، جاية من formatNearbyCastle.npc_tier (نفس بيانات القائمة
          القريبة، من غير أي استعلام إضافي). ====== */}
      {castle.npc_tier && (
        <div className="flex items-center gap-1 px-1.5 pb-1 text-[10px] font-bold text-amber-300">
          <Star size={11} />
          {castle.npc_tier.name_ar} · صعوبة {castle.npc_tier.difficulty_rank}/{castle.npc_tier.difficulty_out_of}
        </div>
      )}

      {/* ====== NEW (NPC Faction System) - اسم مملكة/فصيل الـ NPC - جاية من
          formatNearbyCastle.npc_faction (نفس بيانات القائمة القريبة). ====== */}
      {castle.npc_faction && (
        <div className="flex items-center gap-1 px-1.5 pb-1 text-[10px] font-bold text-fuchsia-300">
          <Shield size={11} />
          {castle.npc_faction.name_ar}
        </div>
      )}

      {/* ====== "معاينة"/"دخول المملكة" - بترسم القلعة الحقيقية أو القلعة الظل
          (كائن معادي) بمشهد القلعة الكامل. مش منطقية لكائنات gatherable
          (مفيش قلعة/جيش يتعرض أصلًا - الفعل الوحيد المتاح هو الحصاد المباشر)
          ولا interactable (زيارة سلمية بسيطة، زرار "تفاعل" تحت كافي). ====== */}
      {!isGatherable && !isInteractable && (
        <MenuButton
          icon={castle.is_world_object ? <Eye size={13} /> : <DoorOpen size={13} />}
          label={castle.is_world_object ? 'معاينة' : 'دخول المملكة'}
          onSelect={() => onEnterKingdom?.(castle)}
        />
      )}

      {/* ====== NEW (Attackable World Objects) - زرار استكشاف مباشر من نفس
          القائمة لكائنات العالم المعادية (مش لازم تدخل "معاينة" الأول زي
          القلاع العادية) - نفس castleService.scoutCastle/resolveAttackableCastle
          بالظبط، مفيش نظام استكشاف منفصل. مقصور على attackable بس (الاستكشاف
          الاستخباراتي بيقرا جيش/دفاع هدف، مبيبقاش له معنى لعقدة موارد أو زيارة
          سلمية). ====== */}
      {isHostile && onScout && (
        <MenuButton
          icon={<Eye size={13} />}
          label={canScout ? 'استكشاف' : 'منهوب - بينتظر التجدد'}
          onSelect={() => canScout && onScout(castle)}
        />
      )}

      {castle.is_world_object ? (
        <>
          {isHostile &&
            (canAttack ? (
              <MenuButton icon={<Swords size={13} />} label="هجوم" tone="danger" onSelect={() => onAttack?.(castle)} />
            ) : (
              <span className="rounded-lg bg-stone-500/10 px-2.5 py-1.5 text-center text-xs font-bold text-stone-300">
                منهوب - بينتظر التجدد
              </span>
            ))}

          {/* ====== FIX (Gather action for gatherable world objects) - زرار
              "حصاد" لعقدة موارد - نفس منطق "منهوب - بينتظر التجدد" المستخدم
              للهدف المعادي بعد ما يتنهب، بس بيتحصد فورًا (castleService.gatherWorldObject)
              من غير أي جيش/مسير. ====== */}
          {isGatherable &&
            (canGather ? (
              <MenuButton icon={<Pickaxe size={13} />} label="حصاد" tone="gather" onSelect={() => onGather?.(castle)} />
            ) : (
              <span className="rounded-lg bg-stone-500/10 px-2.5 py-1.5 text-center text-xs font-bold text-stone-300">
                منهوب - بينتظر التجدد
              </span>
            ))}

          {/* ====== FIX (Interact action for interactable world objects) -
              زيارة سلمية بسيطة (قرية/مدينة محايدة) - مفيش قتال ولا حصاد، بس
              فعل وصفي عن طريق onInteract (client-side بحت، مفيش endpoint
              مخصص لأن الكائنات دي أصلًا loot: 0 دايمًا - راجع
              worldPopulation.generator.buildWorldObjectDoc). ====== */}
          {isInteractable && (
            <MenuButton icon={<Handshake size={13} />} label="تفاعل" onSelect={() => onInteract?.(castle)} />
          )}
        </>
      ) : canAttack ? (
        <MenuButton icon={<Swords size={13} />} label="هجوم" tone="danger" onSelect={() => onAttack?.(castle)} />
      ) : (
        <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-center text-xs font-bold text-emerald-300">
          حليف - مينفعش تهاجمه
        </span>
      )}

      {/* ====== سهم صغير تحت القائمة بيأشّر على القلعة نفسها ====== */}
      <span
        className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-amber-400/30 bg-stone-950/95"
      />
    </div>
  );
}

function MenuButton({ icon, label, onSelect, tone = 'default' }) {
  const downPos = useRef(null);

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.stopPropagation();
        downPos.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        const d = downPos.current;
        const moved = d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6;
        if (!moved) onSelect?.();
      }}
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
        tone === 'danger'
          ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
          : tone === 'gather'
          ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
          : 'bg-white/5 text-white/80 hover:bg-white/10'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
