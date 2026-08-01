// ====== NEW - سجل رسم "كائنات العالم" (World Object Renderer Registry) ======
// كل كائن راجع من /castle/nearby-world-objects (شوف getNearbyWorldObjects في
// castle.service.js على الباك إند) بييجي بحقل `type` مطابق تمامًا لـ
// `key` تعريفه في backend/src/modules/world/definitions/objects/*.def.js
// (نفس الـ npcRegistry اللي الباك إند نفسه بيقرا منه - مفيش أي قايمة أنواع
// منفصلة هنا، بس خريطة "نوع -> شكل بصري").
//
// ليه Registry مش if/switch: أي نوع كائن عالم جديد يتضاف في المستقبل (بس
// بإضافة *.def.js جديد في الباك إند - زي ما موضّح في تعليق worldObject.config.js)
// المفروض يبان على الخريطة فورًا من غير ما حد يحتاج يرجع يعدّل IsometricWorld.jsx
// تاني. الحل: WORLD_OBJECT_RENDERERS Map بس، وأي `type` مش موجود فيها بيرجع
// DEFAULT_RENDERER (أيقونة عامة محايدة) تلقائيًا - يعني حتى نوع "معرفناش
// شكله لسه" بيترسم صح من أول لحظة (ماركر + توولتيب فيهم اسم النوع الخام)،
// بدل ما يختفي من الخريطة أو يكسر الرندر. registerWorldObjectRenderer
// مصدّرة كمان لو حبينا نضيف شكل مخصص لنوع جديد بدري بدل ما نستنى الافتراضي.

import {
  Skull,
  TowerControl,
  Home,
  Building2,
  Landmark,
  Columns3,
  Sparkles,
  Gem,
  TreePine,
  Mountain,
  Flag,
  Boxes,
  Droplet,
  MapPin,
  Swords,
  Flame,
  Sun,
} from 'lucide-react';

// ====== شكل افتراضي - بيتطبّق تلقائيًا على أي `type` مش مسجّل صراحةً تحت.
// اسم العرض بيرجع نفس الـ type الخام (أحسن من اسم فاضي) لحد ما حد يسجّل
// له شكل مخصص عن طريق registerWorldObjectRenderer. ======
const DEFAULT_RENDERER = {
  icon: MapPin,
  ring: 'border-stone-400/70 bg-stone-900/90 text-stone-200',
  label: (obj) => obj.type,
};

// ====== ديكورات (decoration) بس - subtype بيحدد الأيقونة (شجر/صخر/علم/
// عربة مكسورة/بئر)، بس لسه كلهم نفس اللون/الفئة البصرية (ديكور، مش هدف
// تفاعلي حقيقي). أي subtype جديد مش موجود هنا بيرجع لـ TreePine الافتراضي. ======
const DECORATION_SUBTYPE_ICONS = {
  tree_cluster: TreePine,
  rock_formation: Mountain,
  banner: Flag,
  ruined_cart: Boxes,
  well: Droplet,
};

// ====== المفتاح هنا لازم يطابق `key` كل تعريف في definitions/objects/*.def.js
// بالظبط (barbarian_camp, guard_tower, neutral_village, neutral_city,
// neutral_fortress, ruins, ancient_temple, resource_node, decoration). ======
const WORLD_OBJECT_RENDERERS = new Map([
  [
    'barbarian_camp',
    { icon: Skull, ring: 'border-red-400/70 bg-red-950/90 text-red-300', label: () => 'معسكر برابرة' },
  ],
  [
    'guard_tower',
    { icon: TowerControl, ring: 'border-orange-400/70 bg-orange-950/90 text-orange-300', label: () => 'برج حراسة' },
  ],
  // ====== NEW (Attackable World Objects) - أنواع معادية إضافية مطلوبة
  // (Military Camp/Tribal Camp/Rebel Outpost/Desert Settlement) - نفس فئة
  // 'hostile' زي barbarian_camp/guard_tower، فبتاخد زرار "هجوم" أوتوماتيك
  // من WorldObjectMarker (شوف attackableWorldObject.js) من غير أي كود إضافي. ======
  [
    'military_camp',
    { icon: Swords, ring: 'border-rose-400/70 bg-rose-950/90 text-rose-300', label: () => 'معسكر عسكري' },
  ],
  [
    'tribal_camp',
    { icon: Flame, ring: 'border-orange-400/70 bg-orange-950/90 text-orange-300', label: () => 'معسكر قبلي' },
  ],
  [
    'rebel_outpost',
    { icon: Flag, ring: 'border-red-400/70 bg-red-950/90 text-red-300', label: () => 'معقل متمردين' },
  ],
  [
    'desert_settlement',
    { icon: Sun, ring: 'border-yellow-400/70 bg-yellow-950/90 text-yellow-300', label: () => 'مستوطنة صحراوية' },
  ],
  [
    'neutral_village',
    { icon: Home, ring: 'border-lime-400/70 bg-lime-950/90 text-lime-300', label: () => 'قرية محايدة' },
  ],
  [
    'neutral_city',
    { icon: Building2, ring: 'border-teal-400/70 bg-teal-950/90 text-teal-300', label: () => 'مدينة محايدة' },
  ],
  [
    'neutral_fortress',
    { icon: Landmark, ring: 'border-cyan-400/70 bg-cyan-950/90 text-cyan-300', label: () => 'حصن محايد' },
  ],
  ['ruins', { icon: Columns3, ring: 'border-violet-400/70 bg-violet-950/90 text-violet-300', label: () => 'أطلال' }],
  [
    'ancient_temple',
    { icon: Sparkles, ring: 'border-fuchsia-400/70 bg-fuchsia-950/90 text-fuchsia-300', label: () => 'معبد قديم' },
  ],
  [
    'resource_node',
    { icon: Gem, ring: 'border-amber-400/70 bg-amber-950/90 text-amber-300', label: () => 'عقدة موارد' },
  ],
  [
    'decoration',
    {
      icon: TreePine,
      ring: 'border-emerald-400/40 bg-emerald-950/70 text-emerald-300',
      label: () => 'زخرفة',
      // ====== تفرّع اختياري داخل نفس النوع - مش if/switch جوه مكوّن الرسم،
      // بس دالة بترجع الأيقونة المناسبة من جدول subtype ثابت هنا. ======
      icon_for: (obj) => DECORATION_SUBTYPE_ICONS[obj.subtype] || TreePine,
    },
  ],
]);

// ====== تسجيل شكل مخصص لنوع كائن عالم - مش مستخدمة حاليًا من أي مكان تاني
// في الكود، موجودة عشان أي نوع جديد يتضاف على الباك إند يقدر ياخد شكل مخصص
// فورًا (بدل الشكل الافتراضي العام) من غير أي تعديل في IsometricWorld.jsx. ======
export function registerWorldObjectRenderer(type, renderer) {
  WORLD_OBJECT_RENDERERS.set(type, renderer);
}

// ====== نقطة الدخول الوحيدة المستخدمة وقت الرسم - بترجع { Icon, ring, label }
// جاهزين لأي كائن عالم، سواء نوعه متسجّل صراحةً أو لأ (DEFAULT_RENDERER). ======
export function getWorldObjectRenderer(obj) {
  const renderer = WORLD_OBJECT_RENDERERS.get(obj.type) || DEFAULT_RENDERER;
  const Icon = renderer.icon_for ? renderer.icon_for(obj) : renderer.icon;
  return { Icon, ring: renderer.ring, label: renderer.label(obj) };
}
