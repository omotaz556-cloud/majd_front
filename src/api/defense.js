import client from './client';

// =============================================================================
// Defense API (read-only cross-castle view)
// =============================================================================
// ====== عرض القطع الدفاعية الحقيقية (أسوار/بوابات/أبراج/فخاخ/متاريس) بتاعة
// أي قلعة - نفس فكرة getCastleView في api/castle.js بالظبط، بس للدفاع بدل
// المباني. بترجّع مصفوفة فاضية لو القلعة دي لسه معملتش أي مستند دفاع خالص
// (نظام بناء الدفاعات لسه مش مفعّل من ناحية اللاعب) - وضع طبيعي جدًا حاليًا،
// مش خطأ. مفيش أي endpoint بناء/ترقية/هدم هنا عمدًا - القراءة بس. ======
export async function getDefenseView(castleId) {
  const { data } = await client.get(`/defense/view/${castleId}`);
  // ====== NEW: بيرجّع الشكل كامل دلوقتي (structures + commander + ai_posture)
  // بدل structures بس - القائد الدفاعي بقى مطلوب يتعرض في وضع الزيارة (شوف
  // WorldMapPage.handleEnterKingdom/VisitKingdomBar). المستدعي القديم اللي
  // كان بياخد data.structures بس اتحدّث هو نفسه في نفس التعديل ده. ======
  return { structures: data.structures, commander: data.commander || null, aiPosture: data.ai_posture || null };
}

// =============================================================================
// Defense build (player's own castle)
// =============================================================================
// ====== نظرة عامة كاملة على دفاع قلعتك انت (مش قلعة تانية زي getDefenseView
// فوق) - بترجع القطع الدفاعية الحقيقية بتاعتك عشان تتعرض على الخريطة وتتحسب
// منها الخانات المشغولة وقت وضع البناء، نفس فكرة getMyCastle بالظبط بس
// للدفاع. ======
export async function getMyDefense() {
  const { data } = await client.get('/defense');
  return data;
}

// ====== قايمة كل أنواع المباني الدفاعية المتاحة (سور/بوابة/أبراج/فخ/متراس)
// - نفس فكرة getBuildingTypes بتاعة المباني العادية بالظبط. ======
export async function getDefenseStructureTypes() {
  const { data } = await client.get('/defense/structure-types');
  return data.structure_types;
}

// ====== بناء قطعة دفاعية جديدة في مكان معيّن على شبكة مدينتك ======
export async function buildDefenseStructure(type, position, rotation = 0) {
  const { data } = await client.post('/defense/structures', { type, position, rotation });
  return data.structure;
}

// ====== بدء ترقية قطعة دفاعية موجودة بالفعل (مستوى + 1) ======
export async function upgradeDefenseStructure(structureId) {
  const { data } = await client.post(`/defense/structures/${structureId}/upgrade`);
  return data.structure;
}

// ====== تسريع فوري بالجواهر لترقية قطعة دفاعية شغالة بالفعل - نفس فكرة
// speedupBuilding بتاعة المباني العادية بالظبط، بس للقطع الدفاعية (سور/
// بوابة/برج/فخ/متراس). التكلفة بتتحدد سيرفر-سايد (speedup_gem_cost) بناءً
// على الثواني المتبقية فعليًا وقت الطلب. ======
export async function speedupDefenseStructure(structureId) {
  const { data } = await client.post(`/defense/structures/${structureId}/upgrade/speedup`);
  return data.structure;
}

// ====== نقل قطعة دفاعية موجودة بالفعل لمكان تاني فاضي على نفس الشبكة -
// نقل مجاني وفوري (زي نقل المباني العادية) ======
export async function moveDefenseStructure(structureId, position) {
  const { data } = await client.post(`/defense/structures/${structureId}/move`, { position });
  return data.structure;
}

// ====== حذف قطعة دفاعية موجودة بالفعل ======
export async function removeDefenseStructure(structureId) {
  const { data } = await client.delete(`/defense/structures/${structureId}`);
  return data;
}