// ====== تقدير "جاهزية الخطة" (Plan Readiness Estimate) ======
// الغرض: عرض تقديري في واجهة الهجوم (AttackDialog) يوضح للاعب إن اختيار
// خطة مختلفة بيدّي رقم "قوة متوقعة" مختلف - مبني على نفس فلسفة البونص
// الحقيقي المسجّل فعليًا وقت المعركة (راجع backend/src/modules/army/
// battlePlanBonusCompiler.js + battlePlanBonus.config.js): تشكيل تكتيكي
// مليان، قواعد انسحاب/حماية محددة، تفضيل قائد مُعيّن - كل عنصر منهم بيضيف
// بونص هجوم/دفاع حقيقي جوه Combat Engine (عن طريق ATTACK_BONUS/
// DEFENSE_BONUS modifiers - راجع modifierSystem.js/damageEngine.js).
//
// ده لسه *تقريب عرض* بس، مش نفس الحساب بالظبط: الرقم هنا نسبة واحدة مبسّطة
// على قوة الهجوم الخام، بينما البونص الحقيقي بيتفرّق per-troop-type حسب
// خط التشكيل بالظبط (front/middle/back) ومحدود بسقف MAX_TOTAL_BONUS_PERCENT.
// النتيجة الفعلية للمعركة لسه بتتحدد لحظة الاشتباك ضربة بضربة (damageEngine.js)
// مش برقم واحد مجمّع زي ده - مفيش هنا أي import من الباك إند ولا نداء API
// إضافي، الملف ده بيقرب بس من غير ما يدّعي إنه نفس الرقم 100%.

const MAX_SLOTS_CONSIDERED = 9; // 3 خطوط × 3 خانات ممثلة تقريبًا كفاية للتقدير

const WEIGHTS = {
  formation_fill: 0.12, // لغاية +12% لو التشكيل التكتيكي مليان بالكامل
  retreat_rules: 0.03, // +3% لو فيه قاعدة انسحاب واحدة على الأقل
  protection_rules: 0.03, // +3% لو فيه قاعدة حماية واحدة على الأقل
  target_priority: 0.02, // +2% لو فيه أولوية استهداف محددة
  commander_preference: 0.02, // +2% لو فيه تفضيل قائد محدد (دور أو مفتاح)
};

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * @param {object|null} plan - كائن خطة المعركة زي ما راجع من /api/army/battle-plans/:id
 * @returns {{ multiplier: number, filledSlots: number, totalConsideredSlots: number, factors: string[] }}
 */
export function estimatePlanReadiness(plan) {
  if (!plan) {
    return { multiplier: 1, filledSlots: 0, totalConsideredSlots: MAX_SLOTS_CONSIDERED, factors: [] };
  }

  const slots = Array.isArray(plan.battle_formation) ? plan.battle_formation : [];
  const filledSlots = slots.filter((s) => s?.troop_key).length;
  const fillRatio = clamp01(filledSlots / MAX_SLOTS_CONSIDERED);

  const strategy = plan.strategy_config || {};
  const hasRetreatRules = Array.isArray(strategy.retreat_rules) && strategy.retreat_rules.length > 0;
  const hasProtectionRules = Array.isArray(strategy.protection_rules) && strategy.protection_rules.length > 0;
  const hasTargetPriority = Array.isArray(strategy.target_priority) && strategy.target_priority.length > 0;

  const commanderPrefs = plan.commander_preferences || {};
  const hasCommanderPreference = Boolean(
    commanderPrefs.preferred_commander_key || commanderPrefs.role_preference
  );

  const factors = [];
  let bonus = fillRatio * WEIGHTS.formation_fill;
  if (fillRatio > 0) factors.push('التشكيل التكتيكي');

  if (hasRetreatRules) {
    bonus += WEIGHTS.retreat_rules;
    factors.push('قواعد الانسحاب');
  }
  if (hasProtectionRules) {
    bonus += WEIGHTS.protection_rules;
    factors.push('قواعد الحماية');
  }
  if (hasTargetPriority) {
    bonus += WEIGHTS.target_priority;
    factors.push('أولوية الاستهداف');
  }
  if (hasCommanderPreference) {
    bonus += WEIGHTS.commander_preference;
    factors.push('تفضيل القائد');
  }

  return {
    multiplier: 1 + bonus,
    filledSlots,
    totalConsideredSlots: MAX_SLOTS_CONSIDERED,
    factors,
  };
}
