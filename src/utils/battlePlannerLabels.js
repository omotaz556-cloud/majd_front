// ====== قواميس عرض (Display Labels) لخطة المعركة - الملف ده بس ترجمة
// نصوص للـ enums اللي بتيجي من الباك إند (/api/army/*-types) - مفيش أي
// بيانات أو قيم من عندنا هنا، القيم الحقيقية (المفاتيح) لسه بتيجي من
// السيرفر. لو نوع جديد اتضاف في army.config.js ومفيش ليه ترجمة هنا، بنعرض
// المفتاح الخام نفسه كـ fallback (عشان الميزات المستقبلية - قادة/أسلحة
// حصار/فخاخ/مباني - تفضل شغالة من غير ما تكسر الواجهة). ======

export const PLAN_STATUS_LABELS = {
  draft: 'مسودة',
  ready: 'جاهزة',
  archived: 'مؤرشفة',
};

export const FORMATION_TYPE_LABELS = {
  balanced: 'متوازنة',
  offensive: 'هجومية',
  defensive: 'دفاعية',
  archer_focus: 'تركيز رماة',
  cavalry_focus: 'تركيز فرسان',
  infantry_focus: 'تركيز مشاة',
  custom: 'مخصّصة',
};

export const MARCH_TYPE_LABELS = {
  normal: 'عادي',
  vanguard: 'طليعة',
  rally: 'تجمّع',
  reinforcement: 'تعزيز',
  scout: 'استكشاف',
};

export const FORMATION_LINE_LABELS = {
  front_line: 'الصف الأمامي',
  middle_line: 'الصف الأوسط',
  back_line: 'الصف الخلفي',
};

export const TARGET_PRIORITY_LABELS = {
  nearest: 'الأقرب',
  weakest: 'الأضعف',
  strongest: 'الأقوى',
  commander: 'القائد',
  archers: 'الرماة',
  cavalry: 'الفرسان',
  infantry: 'المشاة',
  siege: 'أسلحة الحصار',
  walls: 'الأسوار',
  gates: 'البوابات',
  towers: 'الأبراج',
  buildings: 'المباني',
};

export const STRATEGIC_RETREAT_RULE_LABELS = {
  hp_threshold: 'نسبة الجنود المتبقية أقل من',
  morale_threshold: 'المعنويات أقل من',
  commander_death: 'وفاة القائد',
  never_retreat: 'عدم الانسحاب أبدًا',
};

export const STRATEGIC_PROTECTION_RULE_LABELS = {
  protect_commander: 'حماية القائد',
  protect_siege: 'حماية أسلحة الحصار',
  protect_ranged: 'حماية وحدات الرماية',
  protect_weakest: 'حماية الأضعف',
};

export const COMMANDER_ROLE_PREFERENCE_LABELS = {
  offensive: 'هجومي',
  defensive: 'دفاعي',
  support: 'مساند',
  balanced: 'متوازن',
};

export const COMMANDER_PREFERENCE_MODE_LABELS = {
  manual: 'يدوي',
  auto: 'تلقائي',
};

export function labelOf(dict, key) {
  if (!key) return '—';
  return dict[key] || key;
}
