import client from './client';

export async function getMyCastle() {
  const { data } = await client.get('/castle/me');
  return data;
}

// ====== قائمة الأبطال المتاحين للاختيار قبل بداية اللعب - بترجّع بيانات
// عرض كل بطل جاهزة + chosen_hero_key الحالي (null لحد ما اللاعب يختار). ======
export async function getHeroes() {
  const { data } = await client.get('/castle/heroes');
  return data;
}

// ====== اختيار بطل - مرة واحدة بس، اختيار نهائي (شوف hero.config.js في
// الباك إند). بترجّع القلعة كاملة بنفس شكل getMyCastle. ======
export async function chooseHero(heroKey) {
  const { data } = await client.post('/castle/choose-hero', { hero_key: heroKey });
  return data;
}

export async function getBuildingTypes() {
  const { data } = await client.get('/castle/building-types');
  return data.building_types;
}

export async function upgradeBuilding(key) {
  const { data } = await client.post(`/castle/buildings/${key}/upgrade`);
  return data;
}

// ====== تسريع فوري بالجواهر - ترقية/إنشاء مبنى شغال بالفعل - نفس شكل
// upgradeBuilding بالظبط، بترجع القلعة كاملة بعد ما التسريع يتطبّق. ======
export async function speedupBuilding(key) {
  const { data } = await client.post(`/castle/buildings/${key}/speedup`);
  return data;
}

export async function buildNewBuilding(key, position) {
  const { data } = await client.post(`/castle/buildings/${key}/build`, position);
  return data;
}

export async function moveBuilding(id, position) {
  const { data } = await client.post(`/castle/buildings/${id}/move`, position);
  return data;
}

// ====== `exploreCenter` اختياري - { x, y } بوحدة map_slot الخام (نفس وحدة
// castle.map_slot). لو اتبعت، الباك إند بيولّد ويرجّع القلاع حوالين النقطة
// دي بدل قلعة اللاعب (شوف WorldMapPage.jsx - بيبعتها من مكان الكاميرا وقت
// الاستكشاف). من غيرها، السلوك القديم بالظبط (حوالين قلعتك). ======
export async function getNearbyCastles(exploreCenter = null) {
  const { data } = await client.get('/castle/nearby', {
    params: exploreCenter ? { center_x: exploreCenter.x, center_y: exploreCenter.y } : undefined,
  });
  return data.castles;
}

// ====== NEW (World Manager fix) - كائنات العالم القريبة (معسكرات بربر/أبراج
// حراسة/آثار/قرى ومدن وحصون محايدة/عقد موارد/ديكور...إلخ) جوه نفس نطاق رؤية
// اللاعب المستخدم في getNearbyCastles - نفس فلسفة الفلترة بالظبط: الباك إند
// مبيرجّعش أي كائن برّه نصف قطر الرؤية أصلًا، فالفرونت إند هنا مش بيعمل أي
// فلترة إضافية، بيعرض بس اللي وصله. نفس `exploreCenter` الاختياري فوق. ======
export async function getNearbyWorldObjects(exploreCenter = null) {
  const { data } = await client.get('/castle/nearby-world-objects', {
    params: exploreCenter ? { center_x: exploreCenter.x, center_y: exploreCenter.y } : undefined,
  });
  return data.objects;
}

// ====== "دخول مملكة" لاعب/معسكر تاني - بيرجّع القلعة الحقيقية كاملة (نفس
// شكل getMyCastle بالظبط + بيانات صاحبها) عشان تتعرض بنفس مشهد القلعة
// (IsometricWorld) المستخدم لقلعة اللاعب نفسه، مش بوب أب معاينة مصغّر. ======
export async function getCastleView(castleId) {
  const { data } = await client.get(`/castle/${castleId}/view`);
  return data;
}

// ====== استكشاف (Scout) قلعة تانية من جوه وضع الزيارة - تقرير فوري (موارد/
// جيش/قوة دفاع مقابل قوة هجومك) من غير أي جيش بيتحرك. ======
export async function scoutCastle(castleId) {
  const { data } = await client.post(`/castle/${castleId}/scout`);
  return data;
}

// ====== إرسال موارد فورية لقلعة حليف - resources شكلها { gold, wood, stone } ======
export async function sendResourcesToCastle(castleId, resources) {
  const { data } = await client.post(`/castle/${castleId}/send-resources`, { resources });
  return data;
}

// ====== FIX (Gather action for gatherable world objects) - حصاد فوري لعقدة
// موارد (resource_node) - `worldObjectId` هنا الـ id الخام (راجع
// attackableWorldObject.js: raw_id)، مش شكل الهدف المهوّى wobj:<id>. بيرجّع
// { castle, gained } - قلعة اللاعب المحدّثة والكمية اللي اتحصدت فعليًا. ======
export async function gatherWorldObject(worldObjectId) {
  const { data } = await client.post(`/castle/world-objects/${worldObjectId}/gather`);
  return data;
}

export async function getTroopTypes() {
  const { data } = await client.get('/castle/troop-types');
  return data;
}

export async function trainTroops(key, quantity) {
  const { data } = await client.post(`/castle/army/train/${key}`, { quantity });
  return data;
}

// ====== تدريب وحدة مميّزة (بالجواهر/رصيد المحفظة) - نفس شكل trainTroops
// بالظبط، بترجع القلعة كاملة بعد ما الوحدات تتضاف فورًا للجيش الواقف. ======
export async function trainPremiumTroops(key, quantity) {
  const { data } = await client.post(`/castle/army/train-premium/${key}`, { quantity });
  return data;
}

export async function cancelTraining(id) {
  const { data } = await client.post(`/castle/army/training/${id}/cancel`);
  return data;
}

// ====== تسريع فوري بالجواهر - أمر تدريب واقف في طابور الثكنة - نفس شكل
// cancelTraining بالظبط، بترجع القلعة كاملة بعد ما الوحدات تتضاف للجيش
// فورًا وباقي الطابور يتزحزح لقدام. ======
export async function speedupTraining(id) {
  const { data } = await client.post(`/castle/army/training/${id}/speedup`);
  return data;
}

export async function getMarches() {
  const { data } = await client.get('/castle/army/marches');
  return data.marches;
}

// ====== مسايرات ظاهرة على خريطة العالم - بتاعتك + بتاعة لاعبين تانيين جوه
// نطاق رؤيتك (نفس فلسفة getNearbyCastles). دي المفروض تتغذّى بيها الخريطة
// (IsometricWorld) مش getMarches (اللي بترجع مسايراتك انت بس - مستخدمة في
// بانل "جيوشي" وأزرار السحب/الإلغاء). ======
export async function getNearbyMarches() {
  const { data } = await client.get('/castle/army/marches/nearby');
  return data.marches;
}

// ====== battlePlanId اختياري - الخطة اللي اللاعب اختارها جوه Attack Dialog
// (شوف AttackDialog.jsx). لو null، الغارة بتتبعت من غير خطة محددة (نفس
// السلوك القديم - لسه مدعوم بالكامل). ======
export async function sendMarch(targetCastleId, troops, battlePlanId = null) {
  const { data } = await client.post('/castle/army/march', {
    target_castle_id: targetCastleId,
    troops,
    battle_plan_id: battlePlanId,
  });
  return data;
}

export async function recallMarch(id) {
  const { data } = await client.post(`/castle/army/marches/${id}/recall`);
  return data;
}

// ====== هجمات معادية جارية على قلعتك دلوقتي (لسه ماشية أو المعركة شغالة
// فعليًا) - أساس تنبيه "أنت تحت هجوم" (راجع BattleAlertContext.jsx). ======
export async function getIncomingAttacks() {
  const { data } = await client.get('/castle/army/marches/incoming-attacks');
  return data.attacks;
}

// ====== كل معاركك الشغالة لايف دلوقتي (مهاجم أو مدافع) - مصدر بيانات
// widget عداد المعركة العايم (راجع BattleAlertContext.jsx وLiveBattleHud.jsx). ======
export async function getLiveBattles() {
  const { data } = await client.get('/castle/army/marches/live');
  return data.battles;
}

// ====== *** إضافة: مشاهدة معركة معيّنة لايف بمعرفة march_id بس - متاحة لأي
// مستخدم مسجّل دخول، مش بس صاحب القلعة أو حليفه أو المهاجم نفسه (راجع
// getPublicBattleView في march.service.js/march.controller.js). ======
export async function getPublicBattleView(marchId) {
  const { data } = await client.get(`/castle/battles/${marchId}/live`);
  return data.battle;
}

// ====== بحث العالم (World Search) - باسم اللاعب/رقم اللاعب (Player ID)/رقم
// المملكة (Kingdom ID) مع بعض في نص واحد (auto)، أو type محدد صراحة لو
// محتاجينه. بيرجّع نتائج محدودة العدد (اسم/أرقام/تحالف/قوة/إحداثيات) - شوف
// backend worldSearch.service للتفاصيل. ======
export async function searchWorld(query, type = 'auto') {
  const { data } = await client.get('/castle/search', { params: { q: query, type } });
  return data.results;
}
