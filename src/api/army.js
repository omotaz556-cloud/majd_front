import client from './client';

// ====== إدارة الجيش ومخطط المعارك (Army Management & Battle Planner) -
// الفرونت إند هنا مجرد "renderer" برضه (نفس فلسفة api/battle.js): كل نداء
// هنا بيكلم /api/army الموجود بالفعل في الباك إند (army.routes.js) - مفيش
// أي منطق تشكيل/استراتيجية بيحصل هنا، بس نداءات HTTP خام + إرجاع الشكل اللي
// السيرفر رجّعه زي ما هو (no mock data). ======

// =============================================================================
// قوايم القيم الثابتة (Reference Data) - بتتجاب من السيرفر عشان أي إضافة
// مستقبلية لأنواع جديدة (قادة/أسلحة حصار/فخاخ/مباني) تظهر تلقائيًا في
// الواجهة من غير ما نحتاج نعدّل الفرونت إند.
// =============================================================================

export async function getFormationTypes() {
  const { data } = await client.get('/army/formation-types');
  return data; // { formation_types, march_types }
}

export async function getFormationLines() {
  const { data } = await client.get('/army/formation-lines');
  return data.formation_lines;
}

export async function getTargetPriorityTypes() {
  const { data } = await client.get('/army/target-priority-types');
  return data.target_priority_types;
}

export async function getStrategicRetreatRuleTypes() {
  const { data } = await client.get('/army/strategic-retreat-rule-types');
  return data.strategic_retreat_rule_types;
}

export async function getStrategicProtectionRuleTypes() {
  const { data } = await client.get('/army/strategic-protection-rule-types');
  return data.strategic_protection_rule_types;
}

export async function getCommanderPreferenceOptions() {
  const { data } = await client.get('/army/commander-preference-options');
  return data; // { assignment_modes, role_preferences }
}

export async function getPlanStatuses() {
  const { data } = await client.get('/army/plan-statuses');
  return data.statuses;
}

// =============================================================================
// إدارة الجيش (Army Management) - تشكيلات جيش اللاعب (Formation - قالب/جيش
// حقيقي بيتكوّن من troops + قادة). ======
// =============================================================================

export async function listFormations() {
  const { data } = await client.get('/army/formations');
  return data.formations;
}

export async function getFormationById(id) {
  const { data } = await client.get(`/army/formations/${id}`);
  return data.formation;
}

export async function createFormation(payload) {
  const { data } = await client.post('/army/formations', payload);
  return data.formation;
}

export async function updateFormation(id, payload) {
  const { data } = await client.put(`/army/formations/${id}`, payload);
  return data.formation;
}

export async function deleteFormation(id) {
  const { data } = await client.delete(`/army/formations/${id}`);
  return data;
}

// ====== اختيار تشكيلة كـ"التشكيلة النشطة" حاليًا (حصرية: وحدة واحدة بس في
// نفس الوقت - الباك إند بيلغي تحديد أي تشكيلة تانية كانت مختارة تلقائيًا). ======
export async function selectFormation(id) {
  const { data } = await client.post(`/army/formations/${id}/select`);
  return data.formation;
}

export async function unselectFormation(id) {
  const { data } = await client.post(`/army/formations/${id}/unselect`);
  return data.formation;
}

// ====== تعيين قادة التشكيلة بس (بدون لمس باقي حقولها) ======
export async function assignCommanders(id, { primary, secondary } = {}) {
  const { data } = await client.put(`/army/formations/${id}/commanders`, { primary, secondary });
  return data.formation;
}

// =============================================================================
// مخطط المعارك (Battle Planner 2.0) - CRUD كامل لخطط المعركة + Default.
// =============================================================================

export async function listBattlePlans() {
  const { data } = await client.get('/army/battle-plans');
  return data.battle_plans;
}

export async function getDefaultBattlePlan() {
  const { data } = await client.get('/army/battle-plans/default');
  return data.battle_plan;
}

export async function getBattlePlan(id) {
  const { data } = await client.get(`/army/battle-plans/${id}`);
  return data.battle_plan;
}

export async function createBattlePlan(payload) {
  const { data } = await client.post('/army/battle-plans', payload);
  return data.battle_plan;
}

export async function updateBattlePlan(id, payload) {
  const { data } = await client.put(`/army/battle-plans/${id}`, payload);
  return data.battle_plan;
}

export async function deleteBattlePlan(id) {
  const { data } = await client.delete(`/army/battle-plans/${id}`);
  return data; // { deleted, plan_id }
}

export async function setDefaultBattlePlan(id) {
  const { data } = await client.post(`/army/battle-plans/${id}/set-default`);
  return data.battle_plan;
}

export async function validateBattlePlan(id) {
  const { data } = await client.post(`/army/battle-plans/${id}/validate`);
  return data; // { is_valid, errors }
}

// ====== نسخ خطة معركة (Duplicate) - مفيش endpoint مخصص لده في الباك إند،
// فبنبنيه هنا من غير ما نلمس أي منطق تحقق: بنجيب الخطة الأصلية كاملة (مصدر
// الحقيقة الوحيد) وبنبعت كل حقولها الفعلية تاني لـ createBattlePlan (الـ
// service بيعمل التحقق والتطبيع بنفسه زي أي إنشاء عادي - مفيش أي بيانات
// وهمية أو تخمين هنا). ======
export async function duplicateBattlePlan(planId, { name } = {}) {
  const original = await getBattlePlan(planId);
  const payload = {
    name: name || `${original.name} (نسخة)`,
    status: original.status,
    assigned_formation_id: original.assigned_formation_id || null,
    target_priorities: original.target_priorities,
    retreat_rules: original.retreat_rules,
    protection_rules: original.protection_rules,
    commander_preferences: original.commander_preferences,
    battle_formation: original.battle_formation,
    strategy_config: original.strategy_config,
    metadata: original.metadata,
    notes: original.notes,
  };
  return createBattlePlan(payload);
}

// =============================================================================
// نظام التشكيل التكتيكي للمعركة (Battle Formation System) - Front/Middle/
// Back Line - جزء من خطة معيّنة.
// =============================================================================

export async function getBattleFormation(planId) {
  const { data } = await client.get(`/army/battle-plans/${planId}/formation`);
  return data.battle_formation;
}

export async function setBattleFormation(planId, battle_formation) {
  const { data } = await client.put(`/army/battle-plans/${planId}/formation`, { battle_formation });
  return data.battle_formation;
}

export async function assignTroopToSlot(planId, { line, slot_index, troop_key }) {
  const { data } = await client.post(`/army/battle-plans/${planId}/formation/assign`, {
    line,
    slot_index,
    troop_key,
  });
  return data.battle_formation;
}

export async function clearFormationSlot(planId, { line, slot_index }) {
  const { data } = await client.post(`/army/battle-plans/${planId}/formation/clear`, { line, slot_index });
  return data.battle_formation;
}

// =============================================================================
// الإعداد الاستراتيجي (Battle Strategy - Strategic Configuration) - أولوية
// استهداف + قواعد انسحاب + قواعد حماية + تفضيل قائد عام، جوه خطة معيّنة.
// =============================================================================

export async function getStrategyConfig(planId) {
  const { data } = await client.get(`/army/battle-plans/${planId}/strategy`);
  return data.strategy_config;
}

// استبدال كامل - بيبعت كل حقول strategy_config الأربعة صراحة.
export async function setStrategyConfig(planId, strategy_config) {
  const { data } = await client.put(`/army/battle-plans/${planId}/strategy`, strategy_config);
  return data.strategy_config;
}

// تحديث جزئي - بيبعت بس الحقول اللي اتغيّرت فعليًا (الباقي بيفضل زي ما هو
// في السيرفر)، آمن لتحديث قسم واحد من الواجهة من غير ما يأثر على باقي
// الإعداد الاستراتيجي.
export async function updateStrategyConfig(planId, partialStrategyConfig) {
  const { data } = await client.patch(`/army/battle-plans/${planId}/strategy`, partialStrategyConfig);
  return data.strategy_config;
}
