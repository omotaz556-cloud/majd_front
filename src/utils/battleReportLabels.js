// ====== قواميس عرض (Display Labels) لصفحة تقرير المعركة - نفس فلسفة
// battlePlannerLabels.js: ترجمة نصوص بس لقيم جايه من الباك إند
// (battleResolution engine + battle snapshot)، مفيش أي بيانات أو حسابات
// من عندنا هنا. لو مفتاح جديد اتضاف بعدين ومفيش ليه ترجمة، بنعرض المفتاح
// الخام نفسه كـ fallback. ======

// خطة المعركة (snapshot.attacker.battle_plan.objective)
export const BATTLE_PLAN_OBJECTIVE_LABELS = {
  loot: 'نهب',
  raze: 'تدمير',
  conquer: 'احتلال',
  custom: 'مخصّصة',
};

// نوع الوحدة (troop key) - نفس مفاتيح TROOP_TYPES في castle.config.js
export const TROOP_TYPE_LABELS = {
  swordsman: 'مقاتل بالسيف',
  archer: 'رامي سهام',
  cavalry: 'فارس',
};

// نوع الحدث (key_battle_events[].type) - eventGenerator.js
export const BATTLE_EVENT_LABELS = {
  battle_started: 'بداية المعركة',
  wall_breached: 'اختراق الأسوار',
  towers_destroyed: 'تدمير أبراج',
  buildings_destroyed: 'تدمير مبانٍ',
  heavy_attacker_losses: 'خسائر فادحة للمهاجم',
  heavy_defender_losses: 'خسائر فادحة للمدافع',
  resources_looted: 'نهب موارد',
  loot_capped: 'سقف النهب',
  battle_ended_draw: 'نهاية المعركة (تعادل)',
  battle_ended: 'نهاية المعركة',
};

// نتيجة المعركة (winner)
export const WINNER_LABELS = {
  attacker: 'المهاجم',
  defender: 'المدافع',
  draw: 'تعادل',
};
