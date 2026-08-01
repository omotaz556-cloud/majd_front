// ====== Attackable World Object adapter (frontend half of the shared
// AttackableTarget abstraction - see backend world/worldObjectCastleBridge.js
// for the server side) ======
//
// The problem: every existing interaction surface on the map - CastleContextMenu,
// AttackDialog, ScoutReportModal, the "enter kingdom" visit flow - is written
// against the shape returned by GET /castle/nearby (a "nearby castle"): { id,
// is_npc, name, owner_name, map_slot, town_hall_level, is_same_alliance,
// npc_tier, npc_faction, distance_slots, ... }. Hostile world objects (Barbarian
// Camp, Military Camp, Tribal Camp, Guard Tower, Rebel Outpost, Desert
// Settlement...) come back from GET /castle/nearby-world-objects in a
// completely different shape ({ id, type, category, level, map_slot,
// has_garrison, respawns, depleted, distance_slots }).
//
// Instead of building a second Attack button / Attack Dialog / Scout modal for
// world objects, this module adapts a world object into the exact same
// "nearby castle" shape the existing UI already knows how to render and act
// on. From that point on, CastleContextMenu/AttackDialog/ScoutReportModal/
// handleMapCastleClick/openAttackPanelFor/handleEnterKingdom in WorldMapPage.jsx
// run completely unmodified - the only thing that differs is the underlying
// data (garrison/reward/level), exactly like the backend shadow-castle bridge.
//
// The `id` field is set to the same "wobj:<worldObjectId>" prefixed string the
// backend bridge expects (world/worldObjectCastleBridge.js
// encodeWorldObjectTargetId) - every existing API call (getCastleView,
// scoutCastle, sendMarch) already just forwards `target.id`/`target_castle_id`
// straight to the backend, so no API call site needs to change either.

const WORLD_OBJECT_TARGET_PREFIX = 'wobj:';

export function encodeWorldObjectTargetId(worldObjectId) {
  return `${WORLD_OBJECT_TARGET_PREFIX}${worldObjectId}`;
}

export function isWorldObjectTargetId(targetId) {
  return typeof targetId === 'string' && targetId.startsWith(WORLD_OBJECT_TARGET_PREFIX);
}

// ====== أي كائن عالم interaction_type: 'attackable' قابل للهجوم - المصدر
// الوحيد للحقيقة دلوقتي هو interaction_type (راجع definitions/objects/*.def.js
// و castle.service.getNearbyWorldObjects) - fallback لـ category === 'hostile'
// بس لو interaction_type مش راجع من نسخة باك إند أقدم (توافق للخلف). ======
export function isHostileWorldObject(object) {
  if (object?.interaction_type) return object.interaction_type === 'attackable';
  return object?.category === 'hostile';
}

// ====== كائن "تفاعلي" بس (زيارة سلمية، مفيش قتال) - زي القرى/المدن
// المحايدة. ======
export function isInteractableWorldObject(object) {
  return object?.interaction_type === 'interactable';
}

// ====== كائن "قابل للحصاد" مباشرة من غير قتال - عقد الموارد. ======
export function isGatherableWorldObject(object) {
  return object?.interaction_type === 'gatherable';
}

// ====== كائن ديكوري بحت - مش هدف تفاعل خالص (مفيش زرار هجوم ولا قائمة
// سياق ولا حتى توولتيب تفاعلي). ======
export function isDecorativeWorldObject(object) {
  return object?.interaction_type === 'decorative';
}

// ====== ممكن تهاجمه دلوقتي فعليًا - معادي، وليه حامية، ومش "منهوب" حاليًا
// (بينتظر التجدد - نفس حالة resource_node بعد ما يتنهب بالظبط). ======
export function isAttackableNow(object) {
  return isHostileWorldObject(object) && object?.has_garrison && !object?.depleted;
}

// ====== يهوّي كائن عالم لشكل "قلعة قريبة" - نفس شكل formatNearbyCastle على
// الباك إند بالظبط، بس بيانات مشتقة من كائن العالم نفسه. is_world_object:true
// بس علم إضافي اختياري (مش مستخدم إجباريًا من أي مكوّن موجود) لأي كود مستقبلي
// يحتاج يميّز الحالة دي تحديدًا. ======
export function worldObjectToAttackTarget(object) {
  return {
    id: encodeWorldObjectTargetId(object.id),
    // ====== FIX (Gather action) - راوت الحصاد (/castle/world-objects/:id/gather)
    // بياخد الـ WorldObject id الخام مباشرة (مش شكل الهدف المهوّى wobj:<id> -
    // ده بس لـ endpoints الهجوم/الاستكشاف/الزيارة اللي بتمر على
    // resolveAttackableCastle). raw_id بيفضل متاح هنا عشان أي فعل تاني غير
    // الهجوم (زي الحصاد) يقدر يستخدم الـ id الحقيقي من غير أي فك تشفير إضافي. ======
    raw_id: object.id,
    is_npc: true,
    is_world_object: true,
    name: object.name || object.type,
    owner_name: null,
    owner_id: null,
    alliance_tag: null,
    is_same_alliance: false,
    npc_tier: null,
    npc_faction: null,
    town_hall_level: object.level,
    map_slot: object.map_slot,
    distance_slots: object.distance_slots,
    has_garrison: object.has_garrison,
    respawns: object.respawns,
    depleted: object.depleted,
    category: object.category,
    interaction_type: object.interaction_type,
    type: object.type,
  };
}
