// ====== ثوابت الشبكة الإيزومترية للخريطة (Phase 1) ======
// كل حاجة في الخريطة (الأرضية، المباني، الديكور) بتتحسب إحداثياتها من نفس
// الدالة عشان تفضل متحاذية بالظبط مع خطوط الشبكة اللي مرسومة على الأرض.

export const TILE_W = 140; // عرض المعين الواحد بالبكسل
export const TILE_H = 70; // ارتفاع المعين الواحد بالبكسل

// معامل تكبير حجم العالم - العالم لازم يفضل أكبر بكتير من أي فيوبورت (شاشة
// موبايل أو ديسكتوب) عشان الكاميرا يبقى ليها مساحة تتحرك فيها جوه العالم
// (pan) بدل ما العالم كله يتحرك زي "خلفية" بسيطة. لو حبينا نكبّر/نصغّر
// العالم في المستقبل، القيمة دي هي المكان الوحيد اللي محتاجين نغيره فيه.
const WORLD_SCALE = 3.6;

// حجم "لوحة" العالم اللي بيترسم عليها كل حاجة مرة واحدة (canvas ثابت الحجم)
export const WORLD_W = Math.round(2600 * WORLD_SCALE);
export const WORLD_H = Math.round(1760 * WORLD_SCALE);
export const WORLD_CENTER_X = WORLD_W / 2;
export const WORLD_CENTER_Y = WORLD_H / 2 + 60;

// نصف قطر منطقة "البناء" (الجزء اللي فيه خطوط الشبكة الواضحة)، والباقي حواليها
// بيبقى "برّية" فيها شجر وصخور من غير خطوط. البناء نفسه (شبكة القلعة) بيفضل
// بنفس الحجم دايمًا - اللي بيكبر هو نطاق البرّية حوالين القلعة بس.
export const BUILD_RADIUS = 6;
export const WORLD_RADIUS = Math.round(12 * WORLD_SCALE); // نصف قطر العالم كله (بما فيه البرية) بوحدات الشبكة

// حجم شبكة القلعة "الابتدائية" (8x8 - أول أرض بتتحط في unlocked_tiles وقت
// إنشاء أي قلعة جديدة، زي ما بيرجعها generateInitialTiles في الباك إند).
// ده *مش* سقف/حد أقصى لمساحة المدينة - المدينة تكبر تلقائيًا (مفيش شراء أرض
// خالص) لأي شكل وأي حجم (حتى السقف الحالي المسموح بيه maxCityTilesForLevel
// في castle.config.js، اللي بيزيد مع مستوى المبنى الرئيسي) عن طريق
// unlocked_tiles الحقيقية الراجعة من الباك إند (castle.city.unlocked_tiles) -
// شوف WorldMapPage/IsometricWorld، مفيش أي مكان بيستخدم الرقم ده كحد أقصى
// للبناء أو للرسم. الاستخدام الوحيد له هنا هو تثبيت "نقطة المنتصف" اللي الأرض
// الابتدائية اتحطت حواليها (عشان تفضل قلعة اللاعب مركزية بصريًا على الخريطة
// مهما كبرت المدينة بعد كده) - لازم يفضل مطابق لـ GRID_SIZE في
// backend/src/modules/castle/castle.config.js عشان التمركز يفضل صحيح.
export const INITIAL_GRID_SIZE = 8;

// ====== ضباب الحرب (Fog of War) ======
// نصف قطر رؤية اللاعب بوحدة "خانة" (slot) على خريطة العالم - نفس القيمة
// الرسمية من الباك إند (castle.config.js -> VISION_RADIUS_SLOTS). القيمة
// هنا استخدامها بصري بحت (مكان حافة الضباب على الخريطة) - الفلترة الحقيقية
// الوحيدة لأي بيانات حصلت بالفعل في السيرفر: /castle/nearby أصلًا مبيرجّعش
// أي قلعة برّه نصف القطر ده، فمفيش أي داعي نعيد فلترتها تاني هنا.
export const VISION_RADIUS_SLOTS = 4;

// كل "خانة" (slot) من نصف قطر الرؤية بتتحول لعدد وحدات شبكة إيزومترية (نفس
// وحدات gridToWorld) عشان نعرف مكان أي قلعة قريبة على نفس خريطة العالم اللي
// فيها قلعة اللاعب - بنسيب هامش برّية حوالين حافة الرؤية وجوه WORLD_RADIUS
// عشان الضباب والقلاع كلهم يفضلوا جوه حدود اللوحة المرسومة أصلًا.
export const SLOT_GRID_UNITS = (WORLD_RADIUS - BUILD_RADIUS - 2) / VISION_RADIUS_SLOTS;

// أقرب مسافة (بوحدات الشبكة) ممكن تتحط فيها قلعة تانية - بره حدود بناء
// قلعة اللاعب نفسها (BUILD_RADIUS) عشان محدّش يتراكب مع مبانيه.
export const NEARBY_CASTLE_MIN_UNITS = BUILD_RADIUS + 1.5;

// ====== تحميل أجزاء العالم (Chunk Loading) ======
// العالم مفتوح من غير حافة عملية: بدل كانفاس واحد بحجم ثابت، بنقسم الأرض
// (الديكور: عشب/تراب/شجر/صخور/جبال/نهر) لمربعات (chunks) بحجم ثابت، وكل
// إحداثية chunk (cx, cy) ممكن تكون أي رقم صحيح (موجب أو سالب) - مفيش أعمدة
// ولا صفوف قصوى. كل chunk بيتولّد إجرائيًا من بذرته هو بس (شوف chunkSeed في
// terrain.js) وبيتباك في الكانفاس الخاص بيه أول ما يقرب من الكاميرا، وبيتشال
// (يتفك تحميله) لما يبعد كفاية - بالظبط زي أي لعبة إستراتيجية فيها خريطة
// مفتوحة. القيمة دي حجم الـ chunk الواحد بالبكسل على لوحة العالم - رقم
// تحكيمي بيوازن بين عدد الـ chunks (مش كتير أوي) وحجم كل واحد فيهم (مش كبير
// أوي يرجعنا لمشكلة الكانفاس الضخم الأصلية).
export const CHUNK_SIZE = 1200;


// تحويل إحداثية شبكة القلعة الحقيقية (x,y زي ما بيرجعها الباك إند في
// building.position أو unlocked_tiles - ممكن تبقى أي عدد صحيح، موجب أو
// سالب، مش بس 0..7، لأن مساحة المدينة بتتوسع تلقائيًا برّه حدود الشبكة
// الابتدائية مع مستوى المبنى الرئيسي) لإحداثية شبكة "متمركزة" حوالين (0,0) -
// عشان تتبعت لـ gridToWorld زي أي إحداثية عرض تانية على الخريطة. بنطرح دايمًا
// نفس ثابت التمركز الأصلي (INITIAL_GRID_SIZE) عشان الأرض الابتدائية تفضل في
// نص الخريطة بصريًا مهما كبرت المدينة بعد كده - مفيش أي اعتماد على حجم المدينة
// الحالي هنا.
export function gridPositionToOffset(x, y) {
  const c = (INITIAL_GRID_SIZE - 1) / 2;
  return { gx: x - c, gy: y - c };
}

// عكس التحويل السابق: بياخد إحداثية "متمركزة" (اللي بنعرضها على الخريطة)
// ويرجعها لإحداثية شبكة القلعة الحقيقية (رقم صحيح، من غير أي سقف أقصى) عشان
// نبعتها للباك إند وقت البناء في مكان جديد.
export function offsetToGridPosition(gx, gy) {
  const c = (INITIAL_GRID_SIZE - 1) / 2;
  return { x: Math.round(gx + c), y: Math.round(gy + c) };
}


// تحويل إحداثية شبكة (gx, gy) - حوالين المركز (0,0) - لإحداثية بكسل حقيقية
// جوه لوحة العالم. نفس المعادلة الكلاسيكية لأي لعبة إستراتيجية إيزومترية.
export function gridToWorld(gx, gy) {
  return {
    x: WORLD_CENTER_X + (gx - gy) * (TILE_W / 2),
    y: WORLD_CENTER_Y + (gx + gy) * (TILE_H / 2),
  };
}

// ====== عكس gridToWorld - بتاخد إحداثية بكسل حقيقية جوه لوحة العالم (زي
// مركز الكاميرا الحالي) وترجعها لإحداثية شبكة (gx, gy) متمركزة حوالين
// (0,0). مستخدمة عشان نعرف اللاعب حاليًا واقف/باص فين على الخريطة (شوف
// worldToGridCenter/gridToMapSlot تحت) - مفيدة وقت الاستكشاف البعيد عن
// قلعة اللاعب، عشان نطلب من الباك إند يولّد ويرجّع القلاع حوالين مكان
// الكاميرا الفعلي مش بس حوالين قلعته. ======
export function worldToGrid(x, y) {
  const a = (x - WORLD_CENTER_X) / (TILE_W / 2);
  const b = (y - WORLD_CENTER_Y) / (TILE_H / 2);
  return { gx: (a + b) / 2, gy: (b - a) / 2 };
}

// عكس slotToGrid/mapSlotToGrid - بتاخد إحداثية شبكة متمركزة (gx, gy) وترجعها
// لإحداثية map_slot الخام (نفس وحدة castle.map_slot) - محسوبة بالنسبة لمكان
// قلعة اللاعب myMapSlot، بالظبط عكس التحويلة اللي بترسم بيها القلاع القريبة.
export function gridToMapSlot(gx, gy, myMapSlot) {
  const mySlotX = myMapSlot.x / SLOT_SPACING;
  const mySlotY = myMapSlot.y / SLOT_SPACING;
  const slotX = gx / SLOT_GRID_UNITS + mySlotX;
  const slotY = gy / SLOT_GRID_UNITS + mySlotY;
  return { x: Math.round(slotX * SLOT_SPACING), y: Math.round(slotY * SLOT_SPACING) };
}

// نقطة ركن (diamond) الشبكة عشان نرسم خطوطها
export function tileCorners(gx, gy) {
  const { x, y } = gridToWorld(gx, gy);
  return {
    top: [x, y - TILE_H / 2],
    right: [x + TILE_W / 2, y],
    bottom: [x, y + TILE_H / 2],
    left: [x - TILE_W / 2, y],
  };
}

// ====== تحويل قلعة قريبة (راجعة من /castle/nearby) لإحداثية شبكة (gx, gy)
// على نفس خريطة العالم اللي فيها قلعة اللاعب - عشان ترتسم في نفس اللوحة
// الإيزومترية زي أي مبنى تاني، بدل ما تتعرض في خريطة أو مكوّن منفصل.
//
// الاتجاه بيتحسب من فرق map_slot الحقيقي بتاع الباك إند (اتجاه صحيح 100%)،
// والمسافة بتتحسب من distance_slots (نفس القيمة اللي حسبها الباك إند
// بالظبط - مفيش أي حساب مسافة مستقل بيحصل هنا) مضروبة في SLOT_GRID_UNITS.
// مفيش أي فلترة إضافية - أي قلعة بتوصلنا من الـ API أصلًا جوه نطاق الرؤية،
// فبترتسم زي ما هي دايمًا.
export function nearbyCastleToGrid(castle, myMapSlot) {
  const rawDx = castle.map_slot.x - myMapSlot.x;
  const rawDy = castle.map_slot.y - myMapSlot.y;
  const angleLen = Math.hypot(rawDx, rawDy) || 1;
  const units = NEARBY_CASTLE_MIN_UNITS + (castle.distance_slots || 0) * SLOT_GRID_UNITS;
  return {
    gx: (rawDx / angleLen) * units,
    gy: (rawDy / angleLen) * units,
  };
}

// ====== *** فيكس Bug 2 (Reinforcement marches disappear from the world map
// for other players) *** السبب الحقيقي: endpointToGrid (IsometricWorld.jsx)
// كان يحتاج طرف المسير يكون موجود بالفعل في قايمة nearbyCastles المحمّلة
// عشان يستخدم nearbyCastleToGrid (التحويلة "المضغوطة" جوه حدود ضباب الحرب)
// - لو مش موجود (زي قلعة حليف بعيدة بيتبعتلها تعزيز، مش بالضرورة "قريبة"
// بالتعريف المستخدم لقايمة nearbyCastles) كان بيقع على mapSlotToGrid، وهي
// تحويلة "بمقياس حقيقي" غير مضغوطة (مستخدمة أصلًا لحاجة تانية خالص - نتيجة
// بحث العالم). لأي مسافة حقيقية كبيرة، ده بيرسم طرف الخط في مكان برّة لوحة
// العالم المرسومة (WORLD_RADIUS) بالكامل - يعني الخط (والمسير كله بصريًا)
// "بيختفي" فعليًا من وجهة نظر اللاعب. الحل: نفس معادلة الضغط اللي
// nearbyCastleToGrid بتستخدمها بالظبط، بس بنحسب distance_slots بنفسنا من
// الـ slot الخام (نفس معادلة الباك إند Math.round(...)) - أي طرف مسير
// بيوصلنا أصلًا من getVisibleMarches (يعني هو جوه نطاق رؤية حد ما بالتعريف)
// بيترسم دايمًا بنفس المقياس المضغوط زي أي قلعة تانية ظاهرة على الخريطة،
// من غير ما يحتاج يكون موجود في nearbyCastles تحديدًا. ======
export function slotToNearbyGrid(slot, myMapSlot) {
  const rawDx = slot.x - myMapSlot.x;
  const rawDy = slot.y - myMapSlot.y;
  const angleLen = Math.hypot(rawDx, rawDy) || 1;
  const distanceSlots = Math.round(Math.max(Math.abs(rawDx), Math.abs(rawDy)) / SLOT_SPACING);
  const units = NEARBY_CASTLE_MIN_UNITS + distanceSlots * SLOT_GRID_UNITS;
  return {
    gx: (rawDx / angleLen) * units,
    gy: (rawDy / angleLen) * units,
  };
}

// ====== وحدة تباعد "الخانة" (slot) على خريطة العالم - نفس SLOT_SPACING في
// backend/src/modules/castle/worldMap.service.js بالظبط، لازم تتطابق معاه
// (نفس فكرة GRID_SIZE فوق) عشان نقدر نحوّل castle.map_slot الخام (جاي من
// الباك إند) لإحداثية "خانة" مقروءة (زي ما بيرجّعها /castle/search في
// "coordinates") والعكس. ======
export const SLOT_SPACING = 40;

// ====== تحويل إحداثية "خانة" مطلقة (slot x,y - نفس وحدة "coordinates" اللي
// بيرجّعها /castle/search، أو اللي اللاعب بيكتبها بنفسه في "اذهب
// للإحداثيات") لمكان شبكة (gx, gy) على نفس خريطة العالم اللي فيها قلعة
// اللاعب - نفس فكرة nearbyCastleToGrid تمامًا، بس بمقياس حقيقي متناسب (مش
// مضغوط بحدود ضباب الحرب) عشان تشتغل صح لأي مسافة كانت، حتى لو برّه نطاق
// الرؤية تمامًا (زي أي نتيجة من بحث العالم World Search اللي بيتخطى ضباب
// الحرب أصلًا). الكاميرا نفسها من غير حدود (bounded=false في IsoViewport)
// فتقدر تتحرك لأي مكان من غير مشكلة - العالم بيتولّد إجرائيًا (chunks) في
// أي اتجاه بتتحرك له. ======
export function slotToGrid(slotX, slotY, myMapSlot) {
  const mySlotX = myMapSlot.x / SLOT_SPACING;
  const mySlotY = myMapSlot.y / SLOT_SPACING;
  return {
    gx: (slotX - mySlotX) * SLOT_GRID_UNITS,
    gy: (slotY - mySlotY) * SLOT_GRID_UNITS,
  };
}

// نفس فكرة slotToGrid فوق بالظبط، بس ماخدة map_slot خام (وحدة الباك إند
// الداخلية، زي castle.map_slot أو نتيجة بحث castle.map_slot) بدل إحداثية
// "خانة" مقسومة بالفعل - مفيدة وقت "اذهب للقلعة" (Go To Castle) من نتيجة
// بحث، عشان الفرونت إند يقدر يحرّك الكاميرا بدقة كاملة من غير أي تقريب.
export function mapSlotToGrid(targetMapSlot, myMapSlot) {
  return slotToGrid(targetMapSlot.x / SLOT_SPACING, targetMapSlot.y / SLOT_SPACING, myMapSlot);
}

// مولّد أرقام عشوائية "بذرة ثابتة" - نفس البذرة دايمًا بترجع نفس التسلسل، عشان
// شكل العشب/الصخور/الشجر يفضل ثابت بين كل إعادة رسم (resize مثلًا) بدل ما
// يهزّ عشوائي كل مرة.
export function mulberry32(seed) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

