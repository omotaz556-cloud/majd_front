import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { Castle as CastleIcon, Tent, Shield, Swords, Flame } from 'lucide-react';
import IsoViewport from './IsoViewport';
import TerrainChunks from './TerrainChunks';
import FogChunks from './FogChunks';
import CastleContextMenu from './CastleContextMenu';
import DefenseStructureLayer from './DefenseStructureLayer';
import { BuildingSprite } from './buildingArt';
import { getWorldObjectRenderer } from './worldObjectRenderers';
import {
  isHostileWorldObject,
  isGatherableWorldObject,
  isInteractableWorldObject,
  worldObjectToAttackTarget,
  encodeWorldObjectTargetId,
} from './attackableWorldObject';
import {
  WORLD_W,
  WORLD_H,
  TILE_W,
  TILE_H,
  gridToWorld,
  gridPositionToOffset,
  nearbyCastleToGrid,
  mapSlotToGrid,
  slotToNearbyGrid,
} from './isoGrid';
import { formatDuration } from '../../utils/duration';
// ====== سبرايتات الجيش الماشي - صور PNG حقيقية متحفوظة في مجلد الأصول
// (frontend/src/assets/sprites)، مش أشكال SVG/CSS بتترسم لحظيًا في الواجهة.
// كل واحدة فيها نفس تشكيلة الـ 3 جنود بنفس بالتة ألوان مباني اللعبة
// (buildingArt.jsx: ستيل رمادي داكن/فاتح)، والفرق الوحيد بينهم لون العلم
// اللي شايله قائد التشكيلة - نفس تصنيف الألوان المستخدم أصلًا في WorldPanel
// (شوف marchColor تحت) بس مرسوم جوه الصورة نفسها مش بلون CSS. ======
import spriteAttackMine from '../../assets/sprites/army-attack-mine.png';
import spriteAttackEnemy from '../../assets/sprites/army-attack-enemy.png';
import spriteAttackAlly from '../../assets/sprites/army-attack-ally.png';
import spriteReturn from '../../assets/sprites/army-return.png';
import spriteReinforcement from '../../assets/sprites/army-reinforcement.png';
import spriteGathering from '../../assets/sprites/army-gathering.png';

// ====== حجم بصري ثابت لكل نوع مبنى (مقاس رسمته بس - مش مكانه) ======
// ده جزء عرض بحت (مقاس السبرايت) - مكان المبنى الفعلي بقى بييجي بالكامل من
// building.position (جايه من الباك إند - شبكة حرة، مش خانة ثابتة لكل نوع)
// وبيتحول لإحداثية عرض عن طريق gridPositionToOffset. أي مبنى جديد يتضاف في
// المستقبل يكفي يتضاف ليه سطر هنا عشان يكون له مقاس مناسب.
const VB_W = 120;
const VB_H = 190;
export const VISUAL_LAYOUT = {
  town_hall: { scale: 2.05 },
  gold_mine: { scale: 1.55 },
  sawmill: { scale: 1.55 },
  quarry: { scale: 1.55 },
  gold_storage: { scale: 1.4 },
  wood_storage: { scale: 1.4 },
  stone_storage: { scale: 1.4 },
};
const DEFAULT_LAYOUT = { scale: 1.4 };

function BuildingMarker({ building, selected, onSelect, now, underAttack, underAttackBattle }) {
  const { x, y } = gridToWorld(building.gx, building.gy);
  const downPos = useRef(null);
  const underConstruction = building.level === 0 && building.upgrade;

  return (
    <button
      type="button"
      aria-label={building.name}
      // مهم جدًا: بنمنع الحدث من إنه يوصل للـ IsoViewport اللي فوقه (اللي
      // بيعمل setPointerCapture على نفسه في onPointerDown). لو الحدث وصله،
      // الـ pointer capture بتاعته بتلقّف كل أحداث الـ pointer الجاية بعد
      // كده (move/up) وتوجّهها للحاوية مش للزرار، فالزرار مايوصلوش onPointerUp
      // أبدًا وييجي الكليك "مايشتغلش خالص". stopPropagation هنا بيمنع المشكلة دي.
      onPointerDown={(e) => {
        e.stopPropagation();
        downPos.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        const d = downPos.current;
        const moved = d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6;
        if (!moved) onSelect(building);
      }}
      onClick={(e) => {
        // شبكة أمان: بعض المتصفحات/الأجهزة بتولّد click عادي حتى لو حصل
        // تعارض في أحداث الـ pointer - بنمنعه من الوصول للحاوية برضه.
        e.stopPropagation();
      }}
      className="group absolute z-20 flex cursor-pointer flex-col items-center pointer-events-auto focus:outline-none"
      style={{ left: x - building.w / 2, top: y - building.h + 40, width: building.w, height: building.h + 30 }}
    >
      {/* ====== NEW (Castle Under Attack) - بترتسم بس فوق المبنى الرئيسي
          (town_hall = "القلعة" اللي المعركة بتستهدفها فعليًا)، مش أي مبنى
          تاني في المدينة. ====== */}
      {underAttack && building.key === 'town_hall' && (
        <UnderAttackEffect width={building.w} height={building.h} battle={underAttackBattle} now={now} />
      )}
      <BuildingSprite
        type={building.key}
        level={Math.max(1, building.level)}
        selected={selected}
        width={building.w}
        height={building.h}
      />
      {underConstruction && (
        // تينت رمادي شفاف فوق رسمة المبنى وقت ما لسه "تحت الإنشاء" (مستوى 0)
        <div
          className="pointer-events-none absolute rounded-full bg-stone-950/35"
          style={{ left: 0, top: 40, width: building.w, height: building.h, backdropFilter: 'grayscale(1)' }}
        />
      )}
      <span
        className={`-mt-2 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow transition-colors ${
          selected
            ? 'border-amber-300 bg-amber-400/95 text-stone-900'
            : 'border-black/30 bg-stone-900/85 text-amber-100 group-hover:bg-stone-900'
        }`}
      >
        {building.name}
      </span>
      {underConstruction ? (
        <span className="mt-1 rounded bg-emerald-600/90 px-1.5 text-[10px] font-mono text-white">قيد الإنشاء</span>
      ) : (
        <span className="mt-1 rounded bg-black/55 px-1.5 text-[10px] font-mono text-white/80">{building.level}</span>
      )}
      {building.upgrade && (
        <>
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14.7 6.3a1 1 0 0 0-1.4 0L6.3 13.3a1 1 0 0 0 0 1.4l3 3a1 1 0 0 0 1.4 0l7-7a1 1 0 0 0 0-1.4l-3-3ZM9 15l-4 4M4 20l1-3" />
            </svg>
          </span>
          {/* ====== عدّاد تنازلي حي تحت المبنى (شغال في وضع البناء والترقية) ====== */}
          <span className="mt-1 rounded bg-emerald-950/80 px-1.5 font-mono text-[10px] text-emerald-300">
            {formatDuration(new Date(building.upgrade.completes_at).getTime() - (now ?? Date.now()))}
          </span>
        </>
      )}
    </button>
  );
}

// ====== NEW (Castle Under Attack - task 1) - تأثير بصري بيتحط فوق أي قلعة
// (قلعة اللاعب نفسه أو قلعة قريبة بيزورها/شايفها) عندها معركة "شغالة" حاليًا
// (traveling أو battling - راجع liveBattles من BattleAlertContext). سيوف
// متقاطعة (⚔️) ثابتة فوق القلعة، دخان/نار (🔥) متحركين بهدوء جنبها، ونبضة
// حمراء (halo) حوالين القلعة كلها. التأثيرات كلها pointer-events-none عشان
// متأثرش على الضغط/الاختيار العادي للقلعة تحتها - مجرد طبقة بصرية فوقها.
// بتختفي أوتوماتيك بمجرد ما liveBattles تبطّل تحتوي المعركة دي (battle:ended
// بيشيلها فورًا من القايمة عن طريق pollBattles في BattleAlertContext، فمفيش
// أي منطق إخفاء إضافي مطلوب هنا - بس عدم-عرض لما battle يبقى undefined). ======
// ====== NEW (Under Attack - World Objects) - عدّاد تنازلي اختياري تحت
// التأثير - نفس فلسفة عدّاد الترقية في BuildingMarker (formatDuration) بس
// للمعركة نفسها: لو لسه traveling بيعد لحد arrives_at (الجيش وصل = بدأت
// المعركة فعليًا)، ولو battling بيعد لحد battle_ends_at (المعركة هتتحسم).
// اختياري تمامًا (battle=null = مفيش عدّاد، زي ما كان قبل الإضافة دي) عشان
// أي استخدام قديم لـ UnderAttackEffect (لو موجود) يفضل شغال زي ما هو. ======
function underAttackCountdownMs(battle, now) {
  if (!battle) return null;
  const targetIso = battle.status === 'battling' ? battle.battle_ends_at : battle.arrives_at;
  if (!targetIso) return null;
  return new Date(targetIso).getTime() - (now ?? Date.now());
}

function UnderAttackEffect({ width, height, battle = null, now }) {
  const countdownMs = underAttackCountdownMs(battle, now);
  return (
    <div
      className="pointer-events-none absolute z-30 flex items-center justify-center"
      style={{ left: -width * 0.15, top: -height * 0.1, width: width * 1.3, height: height * 1.2 }}
    >
      {/* ====== نبضة حمراء حوالين القلعة كلها - halo متحرك (scale + opacity) ====== */}
      <span className="absolute inset-0 animate-ping rounded-full bg-red-500/20" style={{ animationDuration: '1.8s' }} />
      <span className="absolute inset-6 rounded-full border-2 border-red-500/60 shadow-[0_0_25px_6px_rgba(239,68,68,0.35)]" />

      {/* ====== سيوف متقاطعة ثابتة فوق القلعة - أوضح إشارة بصرية إن فيه معركة شغالة ====== */}
      <span className="absolute -top-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-red-400 bg-red-950/90 text-red-300 shadow-lg">
        <Swords size={16} />
      </span>

      {/* ====== دخان/نار خفيفة على الجانبين - حركة بسيطة (bounce/pulse) عشان
          تدي إحساس "تحت هجوم فعلي" من غير ما تحجب القلعة أو تتفاعل مع الضغط ====== */}
      <span className="absolute -left-2 bottom-1 animate-pulse text-orange-400/90">
        <Flame size={14} />
      </span>
      <span className="absolute -right-2 bottom-3 animate-bounce text-orange-400/70" style={{ animationDuration: '2.2s' }}>
        <Flame size={12} />
      </span>

      {/* ====== عدّاد المعركة الحي - بس لو battle متبعت فعليًا (اختياري) ====== */}
      {countdownMs != null && (
        <span className="absolute -bottom-4 rounded bg-red-950/90 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-200 shadow">
          {formatDuration(countdownMs)}
        </span>
      )}
    </div>
  );
}

// ====== FIX (city_decor rendering) - نفس شكل BuildingMarker بصريًا (نفس
// BuildingSprite/تسمية/مستوى) بس بدون أي تفاعل خالص (مش زرار، مفيش
// onSelect/selected) - ديكور بصري بس زي ما هو موصوف في castle.model
// (city_decor: "بدون أي تأثير اقتصادي أو قتالي"). ======
function CityDecorMarker({ decor }) {
  return (
    <div
      className="pointer-events-none absolute z-10 flex flex-col items-center"
      style={{ left: decor.gx - decor.w / 2, top: decor.gy - decor.h + 40, width: decor.w, height: decor.h + 30 }}
    >
      <BuildingSprite type={decor.key} level={Math.max(1, decor.level)} width={decor.w} height={decor.h} />
    </div>
  );
}

// ====== NEW (NPC Faction System) - لون حلقة الماركر حسب فصيل الـ NPC
// (نفس مفاتيح الألوان المعرّفة في world/factions.config.js) - fallback
// للأحمر العادي لو مفيش فصيل (قلاع NPC قديمة اتولّدت قبل النظام ده). ======
const FACTION_MARKER_STYLES = {
  red: 'border-red-400/70 bg-red-950/90 text-red-300',
  sky: 'border-sky-400/70 bg-sky-950/90 text-sky-300',
  amber: 'border-amber-400/70 bg-amber-950/90 text-amber-300',
  emerald: 'border-emerald-400/70 bg-emerald-950/90 text-emerald-300',
  violet: 'border-violet-400/70 bg-violet-950/90 text-violet-300',
};

function npcMarkerStyle(castle) {
  return FACTION_MARKER_STYLES[castle.npc_faction?.color] || 'border-red-400/70 bg-red-950/90 text-red-300';
}

// ====== قلعة قريبة (لاعب تاني أو NPC) - جايه بالكامل من /castle/nearby اللي
// بيرجّعها الباك إند، وهو أصلًا مبيرجّعش غير القلاع جوه نطاق رؤية اللاعب.
// مكانها هنا محسوب بـ nearbyCastleToGrid على نفس شبكة العالم اللي فيها قلعة
// اللاعب نفسه، عشان ترتسم في نفس اللوحة الإيزومترية الواحدة - مش خريطة تانية
// منفصلة. بتترسم تحت طبقة الضباب (z-index أقل) فمش بتبان أصلًا لو خارج
// الفتحة المكشوفة، بالظبط زي أي حاجة تانية على الأرض. ======
function NearbyCastleMarker({ castle, myMapSlot, selected, onSelect, underAttackBattle, now }) {
  const { gx, gy } = nearbyCastleToGrid(castle, myMapSlot);
  const { x, y } = gridToWorld(gx, gy);
  const downPos = useRef(null);
  const underAttack = Boolean(underAttackBattle);

  return (
    <button
      type="button"
      aria-label={castle.is_npc ? castle.name : castle.owner_name || 'قلعة لاعب'}
      onPointerDown={(e) => {
        e.stopPropagation();
        downPos.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        const d = downPos.current;
        const moved = d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6;
        if (!moved) onSelect?.(castle);
      }}
      onClick={(e) => e.stopPropagation()}
      className="group absolute z-10 flex -translate-x-1/2 -translate-y-full cursor-pointer flex-col items-center pointer-events-auto focus:outline-none"
      style={{ left: x, top: y }}
    >
      {/* ====== NEW (Castle Under Attack) - قلعة قريبة (مش قلعة اللاعب نفسه)
          عندها معركة شغالة حاليًا استهدفتها (لو اللاعب الحالي هو المهاجم
          وبيشوفها على الخريطة، أو أي قلعة تانية جوّه نطاق الرؤية استهدفها
          حد تاني). حجم التأثير هنا أصغر (نص مقاس دائرة الماركر) لأن القلعة
          القريبة أصغر بكتير من BuildingMarker الحقيقي. ====== */}
      {underAttack && <UnderAttackEffect width={40} height={40} battle={underAttackBattle} now={now} />}
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-lg transition-transform group-hover:scale-110 ${
          castle.is_npc
            ? npcMarkerStyle(castle)
            : castle.is_same_alliance
              ? 'border-emerald-400/70 bg-emerald-950/90 text-emerald-300'
              : 'border-sky-400/70 bg-sky-950/90 text-sky-300'
        } ${selected ? 'ring-2 ring-white' : ''}`}
      >
        {castle.is_npc ? <Tent size={17} /> : <CastleIcon size={17} />}
      </div>
      {/* ====== اسم صاحب القلعة الحقيقي (أو اسم معسكر الـ NPC) + مستوى القلعة
          - المطلوب يبانوا على الخريطة نفسها من غير ما تحتاج تفتح أي بانل. ====== */}
      <span className="-mt-1 flex items-center gap-1 rounded-full border border-black/30 bg-stone-950/85 px-2 py-0.5 text-[10px] font-bold text-white/90 shadow">
        {castle.is_npc ? castle.name : castle.owner_name || 'قلعة لاعب'}
        <span className="rounded-full bg-black/40 px-1 text-amber-300">Lv.{castle.town_hall_level}</span>
      </span>
      {/* ====== NEW (NPC Faction System) - اسم المملكة/الفصيل التابعة له
          القلعة تحت اسمها مباشرة، بنفس لون حلقة الماركر (npcMarkerStyle) -
          بيبان بس للقلاع اللي is_npc وليها npc_faction. ====== */}
      {castle.is_npc && castle.npc_faction && (
        <span className="-mt-0.5 flex items-center gap-0.5 rounded-full bg-black/40 px-1.5 py-0.5 text-[9px] font-bold text-white/70">
          <Shield size={9} /> {castle.npc_faction.name_ar}
        </span>
      )}
      {castle.alliance_tag && (
        <span
          className={`mt-0.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
            castle.is_same_alliance ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/60'
          }`}
        >
          <Shield size={9} /> {castle.alliance_tag}
        </span>
      )}
    </button>
  );
}

// ====== NEW (World Manager fix) - كائن عالم واحد (معسكر برابرة/برج حراسة/
// قرية/مدينة/حصن محايد/أطلال/عقدة موارد/ديكور...إلخ) - راجع من
// /castle/nearby-world-objects (نفس نطاق رؤية اللاعب المستخدم في
// /castle/nearby بالظبط). مكانه على الخريطة بـ mapSlotToGrid (نفس الدالة
// المستخدمة أصلًا لـ "اذهب لقلعة" - مقياس حقيقي غير مضغوط، مناسب هنا لأن
// object.map_slot جايه بنفس وحدة castle.map_slot الخام بالظبط). الشكل
// (أيقونة/لون/اسم) بييجي بالكامل من getWorldObjectRenderer (سجل رسم -
// worldObjectRenderers.js) مش من أي if/switch هنا، فأي نوع كائن جديد يتسجّل
// على الباك إند بيترسم صح من أول لحظة من غير أي تعديل في المكوّن ده. ======
function WorldObjectMarker({ object, myMapSlot, selected, onSelect, underAttackBattle, now }) {
  const { gx, gy } = mapSlotToGrid(object.map_slot, myMapSlot);
  const { x, y } = gridToWorld(gx, gy);
  const downPos = useRef(null);
  // ====== NEW (World Object Under Attack) - نفس منطق NearbyCastleMarker
  // بالظبط: كائن العالم ده تحت هجوم لو فيه معركة لايف هدفها shadow_castle_id
  // بتاعه (شوف attackedCastleIdBattles فوق + shadow_castle_id الجديدة من
  // getNearbyWorldObjects). أي نوع كائن عنده shadow_castle_id فعلي بيتغطى
  // هنا أوتوماتيك - مفيش أي شرط على object.type نفسه. ======
  const underAttack = Boolean(underAttackBattle);
  // ====== توولتيب "مثبّت" (pinned) - بيتفتح بالضغط ويفضل ظاهر حتى من غير
  // hover (مهم للموبايل اللي مالوش hover أصلًا)، وبيتقفل بالضغط تاني على نفس
  // الكائن. الـ hover العادي (group-hover) شغال زيادة على كده على أجهزة
  // الماوس - مفيش تعارض بين الاتنين، بس opacity بتتحسب من أي الاتنين true.
  // ملحوظة: التوولتيب دا بس لكائنات العالم "غير المعادية" (زخرفة/موارد/
  // معالم/محايدة) - كائن معادي (category: hostile) بيفتح قائمة السياق
  // (Attack/Scout/View) بدل التوولتيب، راجع onPointerUp تحت. ======
  // ====== FIX (Gather/Interact actions) - كائن gatherable (عقدة موارد) أو
  // interactable (قرية/مدينة محايدة) لازم يفتح نفس قائمة السياق (زي المعادي
  // بالظبط) عشان زرار "حصاد"/"تفاعل" يبان - قبل الفيكس دي كانت بتفضل تفتح
  // بس توولتيب مثبّت زي أي ديكور، يعني مفيش أي فعل ممكن عليها خالص. الديكور
  // البحت (decorative) لسه بياخد التوولتيب بس - مفيش أي قائمة سياق ليه. ======
  const [pinned, setPinned] = useState(false);
  const { Icon, ring, label } = getWorldObjectRenderer(object);
  const hostile = isHostileWorldObject(object);
  const gatherable = isGatherableWorldObject(object);
  const interactable = isInteractableWorldObject(object);
  const hasActionMenu = hostile || gatherable || interactable;

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.stopPropagation();
        downPos.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        const d = downPos.current;
        const moved = d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6;
        if (moved) return;
        // ====== NEW (Attackable World Objects) - كائن معادي/قابل للحصاد/تفاعلي
        // بيفتح نفس قائمة السياق (CastleContextMenu) اللي القلاع بتفتحها
        // بالظبط، بدل توولتيب مثبّت - عشان زرار "هجوم"/"حصاد"/"تفاعل" يبان
        // فورًا حسب نوع الكائن. ديكور بحت (decorative) لسه بياخد التوولتيب
        // بس - مفيش أي قائمة سياق ليه خالص. ======
        if (hasActionMenu) {
          onSelect?.(object);
        } else {
          setPinned((p) => !p);
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className="group absolute z-[9] flex -translate-x-1/2 -translate-y-full cursor-pointer flex-col items-center pointer-events-auto focus:outline-none"
      style={{ left: x, top: y }}
    >
      {/* ====== NEW (World Object Under Attack) - نفس UnderAttackEffect
          المستخدم مع القلاع بالظبط (سيوف/دخان/نبضة حمراء/عدّاد) - أي كائن
          عالم قابل للهجوم (معسكر برابرة/برج حراسة/أطلال/أي نوع جديد) وعنده
          shadow_castle_id بيبقى تحت هجوم فعلي بيتغطى هنا أوتوماتيك، من غير
          أي كود مخصص لنوع بعينه. بيختفي أوتوماتيك بمجرد ما liveBattles
          تبطّل تحتوي المعركة دي (نفس فلسفة battle:ended في BattleAlertContext). ====== */}
      {underAttack && <UnderAttackEffect width={32} height={32} battle={underAttackBattle} now={now} />}
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-lg transition-transform group-hover:scale-110 ${ring} ${
          object.depleted ? 'opacity-40 grayscale' : ''
        } ${selected ? 'ring-2 ring-white' : ''}`}
      >
        <Icon size={14} />
      </div>
      {/* ====== توولتيب - اسم النوع + المستوى، وحالة إضافية لو موجودة (حامية/
          منهوب) - بيبان بالـ hover دايمًا، وبيفضل ظاهر لو مثبّت (pinned). ====== */}
      <div
        className={`pointer-events-none absolute bottom-full z-20 mb-1 flex flex-col items-center gap-0.5 whitespace-nowrap rounded-lg border border-black/30 bg-stone-950/95 px-2 py-1 text-[10px] font-bold text-white/90 shadow-lg transition-opacity ${
          pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <span className="flex items-center gap-1">
          {label}
          <span className="rounded-full bg-black/40 px-1 text-amber-300">Lv.{object.level}</span>
        </span>
        {object.depleted ? (
          <span className="text-stone-400">منهوب - بينتظر التجدد</span>
        ) : (
          <>
            {object.has_garrison && <span className="text-red-300">فيه حامية</span>}
            {object.respawns && <span className="text-emerald-300">متجدد</span>}
          </>
        )}
      </div>
    </button>
  );
}


// بتتحرك عليه بسلاسة حسب النسبة بين departed_at وarrives_at. الإحداثيات
// بتتحول لنفس مكان القلعة المرسوم فعليًا على الخريطة (شوف endpointToGrid تحت)
// - مش أي تحويلة "شبه مشابهة"، نفس الدالة اللي بترسم بيها أيقونة القلعة نفسها
// (nearbyCastleToGrid) أو مركز العالم لو الطرف قلعة اللاعب - فبيترسم في نفس
// اللوحة الإيزومترية، ملتصق فعليًا بمركز القلعتين، وبيتحرك/يتكبّر تلقائيًا مع
// أي تحريك/زووم للكاميرا - من غير أي حساب إضافي هنا، لأن الطبقة كلها
// (IsoViewport) بتتحول بـ CSS transform واحد. ======
// ====== مفتاح "خط سير" ثابت لأي زوج قلعتين - من غير ما يهم مين المصدر ومين
// الهدف (نفس المفتاح لمسير هجوم ومسير عودته لو راجعين على نفس الخط). بنستخدم
// إحداثية map_slot الخام نفسها (نفس اللي بيوصف موقع القلعة بالظبط) بدل الـ id
// عشان أي عدد مسايرات ماشية على نفس الخط (تاريخيًا أو دفعات هجوم متتالية)
// تتجمع في نفس المجموعة وتتباعد عن بعضها بدل ما ترتسم فوق بعض بالظبط. ======
function slotKey(slot) {
  return `${Math.round(slot?.x ?? 0)},${Math.round(slot?.y ?? 0)}`;
}
function routeKey(march) {
  const a = slotKey(march.origin_map_slot);
  const b = slotKey(march.target_map_slot);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// ====== *** الجذر الحقيقي لمشكلة "الخط مش راكب على القلعة" *** ======
// القلاع القريبة (NearbyCastleMarker) بترتسم بـ nearbyCastleToGrid - تحويلة
// "مضغوطة" مقصودة (بتحط أي قلعة قريبة جوه نطاق ضباب الحرب المرئي بس، مش
// بمقياس المسافة الحقيقي - شوف NEARBY_CASTLE_MIN_UNITS/SLOT_GRID_UNITS في
// isoGrid.js). أما mapSlotToGrid فهي تحويلة "بمقياس حقيقي" غير مضغوطة، مستخدمة
// أصلًا لحاجة تانية خالص (تحريك الكاميرا لنتيجة بحث/"اذهب للقلعة"). كانت
// marchEndpoints بتستخدم mapSlotToGrid لحساب مكان القلعتين - فكان بيطلع مكان
// مختلف تمامًا عن مكان أيقونة القلعة الفعلي المرسوم على الشاشة (اللي طالع من
// nearbyCastleToGrid)، فالخط (وأيقونة الجيش اللي بتمشي عليه) يفضلوا "شايفين"
// قلعة في مكان، والقلعة الحقيقية مرسومة في مكان تاني تمامًا.
//
// الحل: أي طرف (بداية/نهاية) مسير بيتطابق مع قلعة موجودة فعليًا في
// nearbyCastles (نفس القايمة اللي NearbyCastleMarker بيرسم منها) لازم ياخد
// مكانه بنفس الدالة (nearbyCastleToGrid) بالظبط - مش بس دالة "مشابهة"، نفس
// الدالة حرفيًا. قلعة اللاعب نفسه (لما تبقى طرف المسير) مالهاش marker في
// nearbyCastles أصلًا لأنها هي مركز العالم دايمًا (gx=gy=0 - نفس الفرضية
// المستخدمة في كل حتة تانية بالكود، شوف IsoViewport.goToMyCastle). أي طرف
// مسير مش لاقي له قلعة حاليًا في nearbyCastles (مثلاً هدف برّه نطاق الرؤية
// دلوقتي) بيرجع لـ mapSlotToGrid كحل احتياطي بس - أفضل من عدم رسم الخط خالص.
function findNearbyCastle(nearbyCastles, slot) {
  const key = slotKey(slot);
  return nearbyCastles.find((c) => slotKey(c.map_slot) === key) || null;
}

function endpointToGrid(slot, myMapSlot, nearbyCastles) {
  // طرف المسير هو قلعة اللاعب نفسه - مركز العالم بالظبط (نفس مكان مباني
  // اللاعب المرسومة بـ gridPositionToOffset/gridToWorld).
  if (slotKey(slot) === slotKey(myMapSlot)) return { gx: 0, gy: 0 };

  // طرف المسير قلعة قريبة ظاهرة فعليًا على الخريطة - لازم نستخدم بالظبط نفس
  // التحويلة اللي NearbyCastleMarker استخدمها عشان يترسموا في نفس المكان
  // حرفيًا (مطلوب: "Verify that the coordinate conversion for castles and
  // marches is identical").
  const castle = findNearbyCastle(nearbyCastles, slot);
  if (castle) return nearbyCastleToGrid(castle, myMapSlot);

  // ====== فيكس Bug 2: طرف مسير (زي قلعة حليف بعيدة بتستقبل تعزيز) مش
  // موجود في nearbyCastles المحمّلة دلوقتي - قبل كان بيقع على mapSlotToGrid
  // (مقياس حقيقي غير مضغوط) فيرسم بعيد جدًا برّة لوحة العالم ويختفي بصريًا.
  // slotToNearbyGrid بتحسب نفس المعادلة المضغوطة اللي nearbyCastleToGrid
  // بتستخدمها (بس من الـ slot الخام مباشرة، من غير ما تحتاج مستند قلعة)،
  // فالخط دايمًا يفضل جوه حدود الخريطة المرسومة بنفس مقياس أي قلعة تانية
  // ظاهرة عليها. ======
  return slotToNearbyGrid(slot, myMapSlot);
}

function marchEndpoints(march, myMapSlot, nearbyCastles) {
  const origin = endpointToGrid(march.origin_map_slot, myMapSlot, nearbyCastles);
  const target = endpointToGrid(march.target_map_slot, myMapSlot, nearbyCastles);
  return { from: gridToWorld(origin.gx, origin.gy), to: gridToWorld(target.gx, target.gy) };
}

// المسافة (بالبكسل، في مساحة العالم) بين خط وخط مجاور له على نفس الطريق -
// بتتكبر/تصغر مع الزووم زي أي حاجة تانية في العالم (نفس فلسفة سمك الخط).
const MARCH_LANE_SPACING = 12;

// ====== بيحوّل قايمة المسايرات النشطة لشكل جاهز للرسم: مكان البداية/النهاية
// (بعد إزاحة بسيطة عمودية على الخط لو فيه أكتر من مسير على نفس الطريق)،
// زاوية اتجاه السير (لتدوير الأيقونة)، ووقتي البداية/النهاية بالميلي ثانية.
// كل ده بيتحسب مرة واحدة بس (useMemo) لما قايمة المسايرات تتغيّر - مش في كل
// فريم - عشان لوب الحركة (رندر الأيقونات) يفضل خفيف حتى مع مئات المسايرات. ======
function buildMarchGeometry(activeMarches, myMapSlot, nearbyCastles) {
  if (!myMapSlot || activeMarches.length === 0) return [];

  const groups = new Map();
  for (const m of activeMarches) {
    const key = routeKey(m);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }

  const result = [];
  for (const group of groups.values()) {
    // ترتيب ثابت (بالـ id) عشان نفس المسير ياخد نفس "الخط" (lane) طول عمره
    // ومايقفزش من خط لخط بين كل تحديث بيانات (polling).
    group.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const count = group.length;
    group.forEach((m, idx) => {
      const { from, to } = marchEndpoints(m, myMapSlot, nearbyCastles);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const perpX = -dy / len;
      const perpY = dx / len;
      const offset = (idx - (count - 1) / 2) * MARCH_LANE_SPACING;
      const shiftedFrom = { x: from.x + perpX * offset, y: from.y + perpY * offset };
      const shiftedTo = { x: to.x + perpX * offset, y: to.y + perpY * offset };
      // ====== حماية ضد تاريخ غير صالح (departed_at/arrives_at) - لو حصل
      // بأي شكل NaN هنا، الأيقونة كانت هتاخد transform غير صالح
      // (translate3d(NaNpx,...)) والمتصفح كان بيتجاهل الـ transform كله
      // ويسيبها واقفة في زاوية العالم (0,0) - بعيدة جدًا عن أي حاجة ظاهرة
      // على الشاشة، يعني "مختفية" فعليًا من وجهة نظر اللاعب. بنرجع لقيم
      // آمنة (تبدأ دلوقتي، توصل بعد ثانية) عشان الأيقونة تفضل دايمًا شغالة
      // على الخط الصح حتى لو التاريخ الجاي من الباك إند فيه مشكلة. ======
      const rawDeparted = new Date(m.departed_at).getTime();
      const rawArrives = new Date(m.arrives_at).getTime();
      const departedAt = Number.isFinite(rawDeparted) ? rawDeparted : Date.now();
      const arrivesAt = Number.isFinite(rawArrives) ? rawArrives : departedAt + 1000;
      result.push({
        id: m.id,
        from: shiftedFrom,
        to: shiftedTo,
        angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
        departedAt,
        totalMs: Math.max(1, arrivesAt - departedAt),
        // ====== مضافين عشان لون الخط/الأيقونة يختلف حسب نوع المسير (هجوم/
        // عودة/تعزيز/تجميع) وحسب مين صاحبه (أنا/حليف/عدو) - نفس المعلومة دي
        // بتتعرض بالظبط في بانل "العالم" (WorldPanel) بس هنا بشكل بصري على
        // الخريطة نفسها. is_mine بيبقى true افتراضيًا لو مش موجودة (مسايراتي
        // أنا بس، من /army/marches، مالهاش الحقل ده أصلًا). ======
        direction: m.direction,
        isMine: m.is_mine !== false,
        isSameAlliance: Boolean(m.is_same_alliance),
      });
    });
  }
  return result;
}

// ====== لون الخط/الأيقونة حسب نوع المسير ومين صاحبه - نفس منطق الألوان في
// WorldPanel (أحمر=هجوم، أخضر=عودة) بس بيضيف تفرقة "صديق/عدو" لمسايرات
// اللاعبين التانيين اللي بقت ظاهرة على الخريطة (شوف getVisibleMarches في
// الباك إند): مسير هجوم بتاعي أنا = كهرماني (نفس هوية اللعبة)، هجوم حليف =
// سماوي، هجوم عدو = أحمر، أي مسير عودة = أخضر بغض النظر عن صاحبه، تعزيز =
// سماوي أفتح، تجميع = أصفر. ======
function marchColor(m) {
  if (m.direction === 'return') return '#34d399';
  if (m.direction === 'reinforcement') return '#38bdf8';
  if (m.direction === 'gathering') return '#facc15';
  // attack
  if (m.isMine) return '#f59e0b';
  if (m.isSameAlliance) return '#38bdf8';
  return '#ef4444';
}

// ====== نفس منطق التصنيف بالظبط بس بيرجّع مسار سبرايت PNG حقيقي بدل كود لون
// - كل تصنيف ليه صورة سبرايت مرسومة مسبقًا (شوف الاستيرادات فوق). ======
function marchSprite(m) {
  if (m.direction === 'return') return spriteReturn;
  if (m.direction === 'reinforcement') return spriteReinforcement;
  if (m.direction === 'gathering') return spriteGathering;
  // attack
  if (m.isMine) return spriteAttackMine;
  if (m.isSameAlliance) return spriteAttackAlly;
  return spriteAttackEnemy;
}

// ====== كل أيقونات الجيوش الماشية سوا - لوب واحد بس (requestAnimationFrame)
// بيحدّث كل الأيقونات في نفس الفريم، بدل ما كل أيقونة تعمل اشتراك rAF منفصل
// ليها - ده اللي بيخلي الأداء يفضل كويس حتى مع مئات المسايرات النشطة في نفس
// الوقت. الأيقونات نفسها عناصر DOM ثابتة (ref واحد لكل مسير) وبنكتفي بتحديث
// transform بتاعها مباشرة - مفيش أي setState ولا إعادة رسم React كل فريم.
// الموضع بيتحسب دايمًا من الوقت الحقيقي الحالي (Date.now()) ناقص وقت
// الانطلاق - مش بتراكم أي دلتا بين الفريمات - فمفيش أي احتمال "انجراف"
// (drift/desync) حتى لو المسير طويل جدًا أو الفريمات اتأخرت لحظيًا. ======
// ====== مكان الأيقونة على الخط في أي لحظة (t من 0 لـ 1) - نفس الحساب
// بالظبط مستخدم هنا ووقت أول ما العنصر يتركّب (mount) عشان الأيقونة توصل
// بالفريم الأول بمكانها الصح على طول، من غير ما تستنى فريم رسم (rAF) جاي أو
// تفضل واقفة في زاوية العالم (0,0) - بعيدة عن أي حاجة ظاهرة - قبل أول تحديث. ======
function marchPositionAt(m, now) {
  const t = Math.min(1, Math.max(0, (now - m.departedAt) / m.totalMs));
  return {
    x: m.from.x + (m.to.x - m.from.x) * t,
    y: m.from.y + (m.to.y - m.from.y) * t,
  };
}

function MarchArmyLayer({ marches }) {
  const nodesRef = useRef(new Map());
  const marchesRef = useRef(marches);
  marchesRef.current = marches;

  useEffect(() => {
    let raf;
    const tick = () => {
      const now = Date.now();
      for (const m of marchesRef.current) {
        const node = nodesRef.current.get(m.id);
        if (!node) continue;
        const { x, y } = marchPositionAt(m, now);
        node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {marches.map((m) => {
        const color = marchColor(m);
        const sprite = marchSprite(m);
        return (
          <div
            key={m.id}
            ref={(node) => {
              if (node) {
                nodesRef.current.set(m.id, node);
                // ====== موضع فوري وقت التركيب - مش لازم نستنى أول تيك من
                // الـ rAF loop فوق (اللي ممكن ياخد لحظة قبل ما يشتغل، أو حتى
                // ما يشتغلش خالص لو حصل خطأ JS في مكان تاني وقف الـ loop) -
                // العنصر لازم يتولد على طول في مكانه الصح على الخط. ======
                node.style.transform = (() => {
                  const { x, y } = marchPositionAt(m, Date.now());
                  return `translate3d(${x}px, ${y}px, 0)`;
                })();
              } else {
                nodesRef.current.delete(m.id);
              }
            }}
            // ====== الـ div دي بس بتحمل الـ transform (مكان) - translate3d
            // بيحرّكها لمكانها الحقيقي في لوحة العالم (بره أي فيوبورت حاليًا
            // شغال IsoViewport بيحوّل اللوحة كلها بـ CSS transform واحد فوق
            // العنصر ده، فالسبرايت بيفضل "موجود" فعليًا في العالم حتى لو
            // خارج الجزء المعروض دلوقتي على الشاشة، وبيتكبّر/يصغّر تلقائيًا
            // مع أي زووم للكاميرا زي أي حاجة تانية في نفس الطبقة). ====== */}
            className="pointer-events-none absolute left-0 top-0 z-[16]"
            style={{ willChange: 'transform' }}
          >
            {/* ====== ظل خفيف تحت الجيش - بيدي إحساس إنه "واقف" على الأرض
                مش عايم فوقها. متمركز بـ left/top (مش transform) عشان يفضل
                ثابت الشكل حتى لو السبرايت اتلف لأي زاوية. ====== */}
            <div
              className="absolute rounded-full bg-black/50 blur-[2px]"
              style={{ left: -11, top: 8, width: 22, height: 8 }}
            />
            {/* ====== سبرايت الجيش الحقيقي (صورة PNG محفوظة في مجلد الأصول -
                شوف الاستيرادات فوق - مش شكل SVG/CSS بيترسم هنا). العنصر ده
                بس بيتلف بزاوية اتجاه السير - متمركز بـ left/top سالبة (نص
                العرض/الارتفاع) بدل translate عشان الـ rotate يفضل التحويل
                الوحيد على العنصر ده. ====== */}
            <img
              src={sprite}
              alt=""
              draggable={false}
              className="absolute select-none"
              style={{
                left: -23,
                top: -23,
                width: 46,
                height: 46,
                // ====== لازم نلغي Preflight بتاع Tailwind (img { max-width:
                // 100%; height: auto }) صراحةً هنا - الـ wrapper اللي فوق
                // مالوش عرض/ارتفاع فعلي (لأن ولاده كلهم absolute، فمش
                // بيكبر ليهم)، فبيترجم "100%" لـ 0px وبيقص عرض الصورة لصفر
                // - ده اللي كان بيخلي السبرايت "يختفي" بينما الظل (div عادي
                // مش متأثر بقاعدة img) فاضل ظاهر. ======
                maxWidth: 'none',
                maxHeight: 'none',
                transform: `rotate(${m.angleDeg}deg)`,
                filter: `drop-shadow(0 0 4px ${color}cc)`,
                imageRendering: 'auto',
              }}
            />
          </div>
        );
      })}
    </>
  );
}

// ====== خطوط كل المسايرات النشطة - عنصر SVG واحد بيغطي لوحة العالم كلها
// وفيه خط لكل مسير (بدل عنصر SVG منفصل لكل مسير) - أبسط وأكفأ في الرسم.
// الإحداثيات هنا بقت جاهزة (بعد إزاحة الخطوط المتراكبة) من buildMarchGeometry. ======
// ====== خطوط كل المسايرات النشطة - عنصر SVG واحد بيغطي لوحة العالم كلها
// (بحجم WORLD_W×WORLD_H ثابت - مش بحجم الفيوبورت الحالي)، وفيه <path> واحد
// متصل لكل مسير (مش أكتر من عنصر واحد ولا خط متقطّع لأجزاء - "M من, L لـ" بس)
// + طبقة توهّج (glow) تحته لكل خط عشان يبان بوضوح فوق أي أرضية. بما إن الـ
// SVG بيغطي لوحة العالم كلها دايمًا (مش بس الجزء المعروض حاليًا)، الخط بيفضل
// موجود بالكامل حتى لو جزء منه (أو الجيش الماشي عليه) خارج الفيوبورت
// المعروض دلوقتي - نفس الفلسفة المطلوبة في "الخط يفضل ظاهر حتى لو الأيقونة
// برّه الشاشة". ======
function MarchLines({ marches }) {
  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-[16]"
      width={WORLD_W}
      height={WORLD_H}
      viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
    >
      <defs>
        <filter id="march-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
          </feMerge>
        </filter>
      </defs>
      {marches.map((m) => {
        const color = marchColor(m);
        const d = `M ${m.from.x} ${m.from.y} L ${m.to.x} ${m.to.y}`;
        return (
          <g key={m.id}>
            {/* ====== طبقة التوهّج - نفس المسار بالظبط بس أعرض وضبابي وتحت
                الخط الأساسي، عشان تدي إحساس "glow" حقيقي بدل ما نعتمد على
                filter مباشر على الخط الحاد نفسه (بيخلي حوافه مش واضحة). ====== */}
            <path d={d} fill="none" stroke={color} strokeWidth={9} strokeOpacity={0.35} filter="url(#march-glow)" />
            {/* ====== الخط الأساسي - أسمك وأوضح بكتير من قبل (كان 2px بشفافية
                0.45)، ومسار واحد متصل مفيش فيه أي تقسيم لأجزاء. ====== */}
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={4}
              strokeOpacity={0.95}
              strokeDasharray="10 8"
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </svg>
  );
}


// ====== خانة "أرض مملوكة" (Owned Land Tile) - بتترسم دايمًا (مش بس وقت
// وضع البناء) لكل خانة موجودة فعليًا في city.unlocked_tiles الحقيقية الراجعة
// من الباك إند. خط رفيع باهت بس حوالين حدودها - نفس إحساس خطوط الشبكة
// القديمة، لكن بقت متبنية على شكل مدينتك الحقيقي (ممكن يكون أي شكل، مش
// مربع ثابت) بدل مربع GRID_SIZE ثابت. بتختفي وقت وضع البناء (buildMode)
// عشان PlacementTile تحت تاخد مكانها بلونها الأخضر/الأحمر بدل ما تتراكب فوق
// بعض. ======
function OwnedLandTile({ gx, gy }) {
  const { x, y } = gridToWorld(gx, gy);
  const w = TILE_W;
  const h = TILE_H;
  return (
    <div
      className="pointer-events-none absolute z-0"
      style={{ left: x - w / 2, top: y - h / 2, width: w, height: h }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <polygon
          points="50,4 96,50 50,96 4,50"
          fill="rgba(255,255,255,0.035)"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

// ====== خانة مكان بناء (Placement Tile) - بتتظهر بس وقت اختيار نوع مبنى من
// قائمة البناء، وبتتعرض لكل خانة موجودة فعليًا في city.unlocked_tiles
// الحقيقية (جايه من الباك إند - شوف placementTiles في WorldMapPage)، مش
// مربع GRID_SIZE ثابت زي الأول - يعني أي أرض جديدة اتفتحت (بترقية المبنى
// الرئيسي) بتبقى خانة بناء صالحة هنا فورًا. valid = خضراء قابلة للضغط (خانة
// فاضية - تقدر تبني فيها المبنى المختار)، invalid = حمراء (خانة متشغولة
// بمبنى موجود بالفعل - مش قابلة للضغط). ======
function PlacementTile({ gx, gy, status, onClick }) {
  const { x, y } = gridToWorld(gx, gy);
  const w = TILE_W * 0.86;
  const h = TILE_H * 0.86;
  const fill =
    status === 'valid' ? 'rgba(52,211,153,0.38)' : status === 'invalid' ? 'rgba(239,68,68,0.28)' : 'rgba(255,255,255,0.10)';
  const stroke = status === 'valid' ? '#34d399' : status === 'invalid' ? '#ef4444' : 'rgba(255,255,255,0.35)';
  const downPos = useRef(null);

  const clickable = status === 'valid';

  return (
    <div
      role={clickable ? 'button' : undefined}
      // نفس سبب stopPropagation في BuildingMarker: الحاوية (IsoViewport)
      // بتعمل setPointerCapture على نفسها في pointerdown، فلو الحدث وصلها
      // هتلقّف كل أحداث الـ pointer الجاية (بما فيها اللي محتاجينها عشان
      // click يتولّد على الخانة نفسها) - فلازم نمنعه يوصلها من هنا.
      onPointerDown={clickable ? (e) => { e.stopPropagation(); downPos.current = { x: e.clientX, y: e.clientY }; } : undefined}
      onPointerUp={
        clickable
          ? (e) => {
              e.stopPropagation();
              const d = downPos.current;
              const moved = d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6;
              if (!moved) onClick?.();
            }
          : undefined
      }
      onClick={clickable ? (e) => e.stopPropagation() : undefined}
      className={`absolute z-10 transition-transform ${clickable ? 'cursor-pointer pointer-events-auto hover:scale-[1.06]' : 'pointer-events-none'}`}
      style={{ left: x - w / 2, top: y - h / 2, width: w, height: h }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <polygon points="50,4 96,50 50,96 4,50" fill={fill} stroke={stroke} strokeWidth="3" />
      </svg>
    </div>
  );
}

const IsometricWorld = forwardRef(function IsometricWorld(
  {
    buildings = [],
    selectedId,
    onSelectBuilding,
    buildMode = false,
    placementTiles = [],
    onPlaceAt,
    unlockedTiles = [],
    now,
    myMapSlot,
    nearbyCastles = [],
    // ====== FIX (city_decor rendering) - مباني ديكور بصرية بس (اختيارية،
    // افتراضيًا مصفوفة فاضية عمدًا - نفس فلسفة worldObjects/defenseStructures
    // فوق، Backward compatible 100% لأي استخدام تاني لـ IsometricWorld) -
    // جايه من formatCastle().city_decor، بترسم بنفس بايبلاين
    // BuildingSprite/placedBuildings تحت بالظبط، بس بدون أي تفاعل (مش
    // قابلة للاختيار/الترقية - ديكور بس). ======
    cityDecor = [],
    // ====== NEW (World Manager fix) - كائنات العالم (معسكرات/أبراج/قرى/
    // مدن/حصون محايدة/أطلال/عقد موارد/ديكور) - افتراضيًا مصفوفة فاضية عمدًا
    // (نفس فلسفة defenseStructures تحت)، عشان أي مكان تاني بيستخدم
    // IsometricWorld ومبيبعتش الحقيقة دي (زي وضع "زيارة مملكة") يفضل شغال
    // بالظبط زي ما كان قبل الإضافة دي - Backward compatible 100%. ======
    worldObjects = [],
    marches = [],
    // ====== قطع الدفاع الحقيقية (أسوار/بوابات/أبراج/فخاخ/متاريس) - اختيارية
    // تمامًا وافتراضيًا مصفوفة فاضية عمدًا: القلعة العادية على World Map
    // مبتديش القيمة دي حاليًا (نظام بناء الدفاعات لسه مش متاح للاعب)، فسلوك
    // World Map القديم يفضل زي ما هو بالظبط. ======
    defenseStructures = [],
    selectedDefenseId,
    onSelectDefenseStructure,
    selectedCastleId,
    onSelectCastle,
    // ====== NEW (Castle Under Attack - task 1) - معارك اللاعب الحالي
    // الشغالة لايف دلوقتي (نفس liveBattles من useBattleAlerts() - راجع
    // WorldMapPage). اختياري تمامًا (افتراضيًا مصفوفة فاضية عمدًا)، عشان أي
    // استخدام تاني لـ IsometricWorld (زي وضع "زيارة مملكة") يفضل شغال زي ما
    // هو من غير أي تعديل - Backward compatible 100%. ======
    liveBattles = [],
    // ====== NEW (Attackable World Objects) - نفس فكرة onSelectCastle بالظبط
    // بس لكائنات العالم المعادية (Barbarian Camp/Military Camp/.../Guard
    // Tower) - بيتنادى بشكل الهدف المهوّى (worldObjectToAttackTarget) عشان
    // يفتح نفس قائمة السياق. اختياري تمامًا (undefined = مفيش تفاعل، زي
    // قبل الإضافة دي بالظبط) عشان أي استخدام تاني لـ IsometricWorld يفضل
    // شغال من غير تعديل. ======
    onSelectWorldObject,
    onScoutCastle,
    // ====== FIX (Gather/Interact actions) - نفس فكرة onScoutCastle بالظبط
    // بس لأفعال عقدة الموارد (حصاد) والزيارة السلمية (تفاعل) - اختياريين
    // تمامًا زي باقي الـ callbacks دي. ======
    onGatherWorldObject,
    onInteractWorldObject,
    contextMenuCastleId,
    onEnterKingdom,
    onAttackCastle,
    onCloseCastleMenu,
    hideFog = false,
    // ====== NEW (World exploration fix) - بيتنادى بكل تغيير في مكان/مقاس
    // الكاميرا (نفس فيوبورت TerrainChunks/FogChunks بالظبط) - الصفحة الأب
    // (WorldMapPage) بتستخدمه عشان تعرف اللاعب حاليًا باص فين على الخريطة
    // وتطلب قلاع/كائنات عالم حوالين مكان الكاميرا الفعلي، مش بس حوالين
    // قلعته. اختياري تمامًا - أي حد تاني بيستخدم IsometricWorld ومبيبعتهوش
    // يفضل شغال زي ما كان بالظبط. ======
    onCameraChange,
  },
  viewportRef
) {
  // نفس نسبة البكسل (dpr) اللي كانت بتتحسب لكل الكانفاسات قبل كده - دلوقتي
  // بتتحسب مرة واحدة وتتبعت لكل شنك أرض/ضباب بيتحمّل (TerrainChunks/FogChunks)
  // عشان يفضل نفس مستوى الوضوح.
  const dpr = useMemo(() => Math.min(2, window.devicePixelRatio || 1), []);
  // مكان الكاميرا الحالي (جاي من IsoViewport) - ده اللي بيحدد أي أجزاء من
  // الأرض (chunks) قريبة كفاية عشان تتحمّل دلوقتي، وأي أجزاء بعدت كفاية
  // عشان تتشال - وبرضه بيحدد مركز نطاق الرؤية الحالي لطبقة الضباب
  // (FogChunks)، عشان الاستكشاف يتبع مكان الكاميرا فعليًا. مفيش أي تأثير على
  // المباني نفسها أو شبكة البناء - دول بيفضلوا زي ما كانوا بالظبط.
  const [viewport, setViewport] = useState(null);

  // ====== `buildings`/`unlockedTiles` هي نفس الحقيقة المطلقة لشكل المدينة -
  // سواء قلعة اللاعب نفسه أو قلعة بيزورها (Visit Kingdom). IsometricWorld/
  // خريطة العالم متعرفش حاجة عن حالة أي معركة خالص. ======
  const cityOrigin = { gx: 0, gy: 0 };

  // بنحوّل مباني القلعة الحقيقية (جايه من الباك إند) لشكل فيه إحداثيات
  // ومقاس رسمة جاهزين للعرض على الخريطة - المكان بقى دايمًا من
  // building.position الحقيقي (شبكة حرة) محوّل بـ gridPositionToOffset،
  // والمقاس بس من VISUAL_LAYOUT حسب نوع المبنى.
  const placedBuildings = useMemo(
    () =>
      buildings.map((b) => {
        const layout = VISUAL_LAYOUT[b.key] || DEFAULT_LAYOUT;
        const { gx, gy } = gridPositionToOffset(b.position.x, b.position.y);
        return {
          ...b,
          gx: gx + cityOrigin.gx,
          gy: gy + cityOrigin.gy,
          w: VB_W * layout.scale,
          h: VB_H * layout.scale,
        };
      }),
    [buildings, cityOrigin.gx, cityOrigin.gy]
  );

  // ====== FIX (city_decor rendering) - نفس تحويلة placedBuildings بالظبط
  // (position -> gx/gy عن طريق gridPositionToOffset، مقاس من VISUAL_LAYOUT
  // أو DEFAULT_LAYOUT لو النوع مش معرّف فيها) - مباني الديكور دي مالهاش id
  // حقيقي من الباك إند (مش مستند فرعي بـ _id)، فبيتبنى مفتاح ثابت من
  // position نفسه عشان React key يفضل مستقر بين إعادة الرسم. ======
  const placedCityDecor = useMemo(
    () =>
      cityDecor.map((d, i) => {
        const layout = VISUAL_LAYOUT[d.key] || DEFAULT_LAYOUT;
        const { gx, gy } = gridPositionToOffset(d.position.x, d.position.y);
        return {
          ...d,
          _decorKey: `decor-${d.key}-${d.position.x}-${d.position.y}-${i}`,
          gx: gx + cityOrigin.gx,
          gy: gy + cityOrigin.gy,
          w: VB_W * layout.scale,
          h: VB_H * layout.scale,
        };
      }),
    [cityDecor, cityOrigin.gx, cityOrigin.gy]
  );

  // ====== خانات أرض القلعة الحقيقية (المفتوحة فعليًا) محوّلة لإحداثيات عرض
  // جاهزة - نفس فكرة placedBuildings بالظبط، بس على unlockedTiles الراجعة من
  // الباك إند بدل buildings. بتترسم دايمًا (مش بس وقت وضع البناء) عشان شكل
  // المدينة الحقيقي يبان على الخريطة من أول لحظة - شوف OwnedLandTile فوق.
  // مفيش أي أرض "مقفولة/مرشحة للشراء" هنا خالص - المساحة كلها بتفتح تلقائيًا
  // في الباك إند مع مستوى المبنى الرئيسي. ======
  const ownedLandOffsets = useMemo(
    () =>
      unlockedTiles.map(({ x, y }) => {
        const { gx, gy } = gridPositionToOffset(x, y);
        return { x, y, gx: gx + cityOrigin.gx, gy: gy + cityOrigin.gy };
      }),
    [unlockedTiles, cityOrigin.gx, cityOrigin.gy]
  );

  // ====== مسايرات الجيش النشطة بس (لسه "ماشية") - أي مسير "resolved"
  // (وصل واتحسم) بيختفي أوتوماتيك من الخريطة أول ما آخر تحديث للمسايرات
  // (polling) يوصل الحالة الجديدة دي، من غير أي منطق إضافي هنا. ======
  const activeMarches = useMemo(
    () => (myMapSlot ? marches.filter((m) => m.status === 'traveling') : []),
    [marches, myMapSlot]
  );

  // ====== NEW (Attackable World Objects) - نفس شكل "قلعة قريبة" لكل كائن
  // عالم يفتح قائمة سياق فعليًا (معادي/قابل للحصاد/تفاعلي - أي حاجة غير
  // decorative، راجع attackableWorldObject.js). القائمة دي مستخدمة بس عشان
  // CastleContextMenu تلاقي بيانات الهدف لما contextMenuCastleId يبقى
  // "wobj:<id>" (مش Castle ID عادي) - الرسم نفسه (WorldObjectMarker) لسه
  // شغال على `worldObjects` الخام زي ما هو بالظبط. ======
  const attackableWorldObjectTargets = useMemo(
    () =>
      worldObjects
        .filter((o) => isHostileWorldObject(o) || isGatherableWorldObject(o) || isInteractableWorldObject(o))
        .map(worldObjectToAttackTarget),
    [worldObjects]
  );

  // ====== هندسة الرسم الجاهزة (مكان الخط بعد إزاحة أي تراكب + زاوية الاتجاه
  // + توقيت الحركة) - بتتحسب مرة واحدة بس هنا لما القايمة تتغيّر، مش في كل
  // فريم رسم (شوف MarchArmyLayer). ======
  const marchGeometry = useMemo(
    () => buildMarchGeometry(activeMarches, myMapSlot, nearbyCastles),
    [activeMarches, myMapSlot, nearbyCastles]
  );

  // ====== NEW (Castle Under Attack - task 1) - قلعة اللاعب نفسه تحت هجوم
  // لو فيه أي معركة "شغالة لايف" دلوقتي بدور 'defender' (getIncomingAttacks/
  // listLiveBattles في الباك إند بيفلتروا بـ target_castle_id: myCastle._id
  // دايمًا - يعني أي معركة دفاع هي حرفيًا قلعتي أنا نفسها، مفيش أي قلعة
  // تانية ممكن تبقى "أنا مدافع فيها"). traveling (الجيش لسه في الطريق) أو
  // battling (المعركة شغالة فعليًا) الاتنين بيتحسبوا "تحت هجوم" - الفرق بس
  // في نص البانر (شوف CastleInfoModal). ======
  const myCastleUnderAttackBattle = useMemo(
    () => liveBattles.find((b) => b.role === 'defender' && ['traveling', 'battling'].includes(b.status)) || null,
    [liveBattles]
  );

  // ====== قلاع قريبة (هدف هجوم اللاعب الحالي نفسه) شغالة عليها معركة -
  // target_castle_id بييجي بس لمعارك role='attacker' (شوف march.service.js
  // listLiveBattles). Map من castle_id -> battle (مش مجرد Set) عشان
  // NearbyCastleMarker/WorldObjectMarker الاتنين يقدروا ياخدوا نفس المعركة
  // الحقيقية ويعرضوا منها عدّاد حي، مش بس boolean. ======
  // ====== NEW (World Object Under Attack) - نفس الـ Map دي بالظبط دلوقتي هي
  // المصدر الوحيد لـ "تحت هجوم" لأي هدف مش قلعة اللاعب نفسه - سواء قلعة
  // قريبة حقيقية (castle.id) أو كائن عالم معادي (object.shadow_castle_id،
  // شوف getNearbyWorldObjects في castle.service.js). الاتنين بيتفلتروا بنفس
  // target_castle_id، فمفيش أي منطق منفصل مطلوب لكائنات العالم - أي نوع
  // جديد ليه shadow_castle_id فعلي بيتغطى أوتوماتيك من غير أي تعديل هنا. ======
  const attackedCastleIdBattles = useMemo(() => {
    const map = new Map();
    liveBattles.forEach((b) => {
      if (b.role === 'attacker' && b.target_castle_id && ['traveling', 'battling'].includes(b.status)) {
        map.set(String(b.target_castle_id), b);
      }
    });
    return map;
  }, [liveBattles]);

  return (
    <>
      <IsoViewport
        ref={viewportRef}
        worldWidth={WORLD_W}
        worldHeight={WORLD_H}
        initialScale={0.55}
        bounded={false}
        className="h-full w-full"
        onViewportChange={(v) => {
          setViewport(v);
          onCameraChange?.(v);
        }}
      >
        {/* ====== أرضية العالم (تراب/عشب/شجر/صخور/نهر) - بتتحمّل بالـ chunk
            (جزء قريب من الكاميرا بيتحمّل، والبعيد بيتشال) بدل كانفاس واحد
            بحجم العالم كله من أول لحظة. ====== */}
        <TerrainChunks viewport={viewport} dpr={dpr} />
        {/* ====== أرض القلعة الحقيقية - كل خانة مفتوحة فعليًا من
            city.unlocked_tiles دايمًا ظاهرة (مش شكل ثابت، بتكبر تلقائيًا مع
            مستوى المبنى الرئيسي في الباك إند). مفيش أي "أرض مقفولة/مرشحة
            للشراء" هنا خالص - مفيش شراء أرض في اللعبة دي أصلًا. أرضك المفتوحة
            بتتخفي وقت وضع البناء عشان PlacementTile تحتها تاخد مكانها بلونها
            الأخضر/الأحمر بدل ما تتراكب فوق بعض. ====== */}
        {!buildMode &&
          ownedLandOffsets.map((t) => <OwnedLandTile key={`land-${t.x}-${t.y}`} gx={t.gx} gy={t.gy} />)}
        {placementTiles.map((t) => (
          <PlacementTile
            key={`${t.x}-${t.y}`}
            gx={t.gx}
            gy={t.gy}
            status={t.status}
            onClick={() => onPlaceAt?.({ x: t.x, y: t.y })}
          />
        ))}
        {placedBuildings.map((b) => (
          <BuildingMarker
            key={b.id}
            building={b}
            selected={selectedId === b.id}
            onSelect={(bld) => onSelectBuilding(bld)}
            now={now}
            underAttack={Boolean(myCastleUnderAttackBattle)}
            underAttackBattle={myCastleUnderAttackBattle}
          />
        ))}
        {/* ====== FIX (city_decor rendering) - مباني ديكور القلعة (إسطبل/ميدان
            رماية/ورشة حصار/مخزن/مستشفى/أكاديمية/دار تحالف) - فوق أرض القلعة
            وتحت المباني الحقيقية شوية (z-10 مقابل z-20)، عشان تبان جزء من
            المدينة من غير ما تتلخبط مع مباني حقيقية قابلة للاختيار. ====== */}
        {placedCityDecor.map((d) => (
          <CityDecorMarker key={d._decorKey} decor={d} />
        ))}
        {/* ====== قطع الدفاع الحقيقية (أسوار/بوابات/أبراج...) - لو موجودة
            فعليًا (defenseStructures مش فاضية)، فوق أرض القلعة ومباني القلعة
            نفسها، بنفس شبكة الإحداثيات بالظبط (شوف تعليق DefenseStructureLayer
            نفسه لتفاصيل ليه ده مكوّن جديد لكن مشترك/عام). ====== */}
        {defenseStructures.length > 0 && (
          <DefenseStructureLayer
            structures={defenseStructures}
            cityOrigin={cityOrigin}
            now={now}
            selectedId={selectedDefenseId}
            onSelect={onSelectDefenseStructure}
          />
        )}
        {/* ====== NEW (World Manager fix) - كائنات العالم القريبة (معسكرات
            بربر/أبراج حراسة/قرى/مدن/حصون محايدة/أطلال/عقد موارد/ديكور...إلخ)
            - نفس اللوحة، نفس الشبكة، نفس منطق الرؤية (worldObjects مبيوصلهاش
            غير اللي جوه نطاق الرؤية أصلًا، مفيش فلترة إضافية هنا). بترتسم
            قبل القلاع القريبة عشان القلاع تفضل فوقها بصريًا لو تراكبوا، وقبل
            طبقة الضباب عشان تتخبى صح لو برّه الفتحة المكشوفة زي أي حاجة تانية
            على الأرض. ====== */}
        {myMapSlot &&
          worldObjects.map((o) => (
            <WorldObjectMarker
              key={o.id}
              object={o}
              myMapSlot={myMapSlot}
              selected={contextMenuCastleId === encodeWorldObjectTargetId(o.id)}
              onSelect={onSelectWorldObject}
              now={now}
              underAttackBattle={
                o.shadow_castle_id ? attackedCastleIdBattles.get(String(o.shadow_castle_id)) || null : null
              }
            />
          ))}
        {/* ====== القلاع القريبة (لاعبين + NPC) - نفس اللوحة، نفس الشبكة.
            مفيش أي قلعة برّه نطاق الرؤية جوّه nearbyCastles أصلًا (الباك إند
            مبيرجعهاش)، وأي قلعة موجودة هنا هترتسم تحت طبقة الضباب فمش هتبان
            لو وقعت برّه الفتحة المكشوفة لأي سبب. ====== */}
        {myMapSlot &&
          nearbyCastles.map((c) => (
            <NearbyCastleMarker
              key={c.id}
              castle={c}
              myMapSlot={myMapSlot}
              selected={selectedCastleId === c.id}
              onSelect={onSelectCastle}
              now={now}
              underAttackBattle={attackedCastleIdBattles.get(String(c.id)) || null}
            />
          ))}
        {/* ====== طبقة ضباب الحرب - استكشاف حقيقي بيتبع الكاميرا: أي منطقة
            اتشافت قبل كده تفضل مكشوفة للأبد، وبس المنطقة حوالين مكان الكاميرا
            الحالي بتبقى مضيئة بالكامل. فوق الأرض والقلاع القريبة، وتحت مباني
            قلعة اللاعب نفسها (اللي دايمًا جوه نطاق رؤيته الأولي). ====== */}
        {!hideFog && <FogChunks viewport={viewport} dpr={dpr} />}
        {/* ====== مسايرات الجيوش الصديقة - فوق الضباب عشان تفضل ظاهرة دايمًا
            (زي ما مطلوب)، وتحت المباني/قائمة السياق. خط ثابت + أيقونة بتتحرك
            عليه بسلاسة حسب تقدّم الوقت - مفيش بوب أب ولا ألوان/تأثيرات إضافية
            في المرحلة الأساسية دي. ====== */}
        {myMapSlot && marchGeometry.length > 0 && <MarchLines marches={marchGeometry} />}
        {myMapSlot && marchGeometry.length > 0 && <MarchArmyLayer marches={marchGeometry} />}
        {/* ====== قائمة السياق (دخول المملكة/هجوم) - فوق كل حاجة (حتى الضباب)
            عشان تفضل واضحة ومقروءة مهما كان مكان القلعة. ====== */}
        {myMapSlot && contextMenuCastleId && (
          <CastleContextMenu
            castle={
              nearbyCastles.find((c) => c.id === contextMenuCastleId) ||
              attackableWorldObjectTargets.find((c) => c.id === contextMenuCastleId) ||
              null
            }
            myMapSlot={myMapSlot}
            onEnterKingdom={onEnterKingdom}
            onAttack={onAttackCastle}
            onScout={onScoutCastle}
            onGather={onGatherWorldObject}
            onInteract={onInteractWorldObject}
            onClose={onCloseCastleMenu}
          />
        )}
      </IsoViewport>
    </>
  );
});

export default IsometricWorld;
