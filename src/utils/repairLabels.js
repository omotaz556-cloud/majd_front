// ====== قواميس عرض (Display Labels) لصفحة الإصلاح - نفس فلسفة
// battleReportLabels.js: ترجمة نصوص بس لقيم جايه من الباك إند (repair
// overview -> structure.type/repair_state)، نفس مفاتيح
// DEFENSE_STRUCTURE_TYPES في backend/src/modules/defense/defense.config.js
// - مفيش أي بيانات أو حسابات من عندنا هنا. لو مفتاح جديد اتضاف بعدين
// ومفيش ليه ترجمة، بنعرض المفتاح الخام نفسه كـ fallback. ======

export const STRUCTURE_TYPE_LABELS = {
  wall: 'سور',
  gate: 'بوابة',
  archer_tower: 'برج رماة',
  ballista_tower: 'برج بالستا',
  catapult_tower: 'برج منجنيق',
  watch_tower: 'برج مراقبة',
  trap: 'فخ',
  barricade: 'متراس',
};

// حالة الإصلاح (structure.repair_state) - REPAIR_STATES في defense.config.js
export const REPAIR_STATE_LABELS = {
  intact: 'سليم',
  damaged: 'متضرر',
  destroyed: 'مدمّر',
};
