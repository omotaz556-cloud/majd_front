import client from './client';

// ====== نظام المعارك (Battle) - الفرونت إند هنا مجرد "renderer": كل نداء
// هنا بيكلم /api/battles الموجود بالفعل في الباك إند (Battle Foundation +
// Simulation/Rule/Combat Engines) - مفيش أي حساب قتال أو محاكاة بيحصل هنا،
// بس نداءات HTTP خام. راجع backend/src/modules/battle/README.md لتفاصيل
// الأنظمة اللي بتغذّي الـ endpoints دي.

// ====== إنشاء معركة مباشرة (مسار بديل لنظام المسايرات - مفيد لو حبينا
// نبدأ معركة من غير march، أو لاختبار مباشر). بيرجّع المعركة بحالة
// "preparing" - لسه محتاجة startBattle عشان تشتغل فعليًا. ======
export async function createBattle({ defenderCastleId, troops, commanders, formation, battlePlan, battleMode }) {
  const { data } = await client.post('/battles', {
    defenderCastleId,
    troops,
    commanders,
    formation,
    battlePlan,
    battleMode,
  });
  return data.battle;
}

// ====== استرجاع المعركة المرتبطة بمسير معيّن (march_id) من الباك إند
// مباشرة - ده مصدر الحقيقة الوحيد لربط march.id بـ battle_id (بدل أي
// mapping محلي في الفرونت إند كان ممكن يضيع لو الصفحة اترفريشت). بترجع
// null لو مفيش معركة اتسجّلت للمسير ده لسه (حالة طبيعية، مش خطأ). ======
export async function getBattleByMarchId(marchId) {
  const { data } = await client.get(`/battles/by-march/${marchId}`);
  return data.battle;
}

// ====== تحميل معركة واحدة - ده الـ endpoint اللي الفرونت إند بيعمله poll
// طول ما المعركة شغالة عشان يجيب current_state المحدّثة (وحدات/مبانِ/
// إحصائيات/أحداث حديثة) - كل القيم جايه من الباك إند مباشرة. ======
export async function getBattle(battleId) {
  const { data } = await client.get(`/battles/${battleId}`);
  return data.battle;
}

// ====== بدء تشغيل المعركة فعليًا - دي النداء اللي المفروض يتبعت أول ما
// المسير يوصل لهدفه (راجع WorldMapPage: overdueMarch effect). الباك إند هو
// اللي بيقرر هل المعركة جاهزة تتشغل ولا لأ (حالتها الحالية)، وهو اللي بيشغّل
// الـ Simulation/Rule/Combat Engines - مفيش أي حساب هنا. آمن يتنادى أكتر من
// مرة لنفس المعركة (idempotent من ناحية الباك إند). ======
export async function startBattle(battleId) {
  const { data } = await client.post(`/battles/${battleId}/start`);
  return data.battle;
}

// ====== كل معارك اللاعب الحالي - كمهاجم و/أو كمدافع ======
export async function listMyBattles({ role, status } = {}) {
  const { data } = await client.get('/battles', { params: { role, status } });
  return data.battles;
}

// ====== Battle Reports removal - getBattleHistory (GET /battles/history)
// اتشالت بالكامل. تقرير أي معركة منتهية بقى بيوصل كرسالة بريد كاملة (راجع
// api/inbox.js listInbox) بدل endpoint سجل منفصل. ======

// ====== إلغاء معركة لسه ما بدأتش ======
export async function cancelBattle(battleId) {
  const { data } = await client.post(`/battles/${battleId}/cancel`);
  return data.battle;
}

// ====== Phase 3: قناة الأوامر الحية - بتبعت أمر قتالي لحظي لوحدة بتاعتك
// (source) وقت ما المعركة شغالة. راجع backend battle.controller.js/
// issueBattleCommand + battle.runner.js/issueLiveCommand لتفاصيل التحقق
// والتنفيذ - هنا بس نداء HTTP خام، مفيش أي حساب قتال هنا. `target` اختياري
// (لو متبعتش، الباك إند بيستخدم استراتيجية اختيار هدف افتراضية). بترجع
// { order } - الأمر بعد ما اتطبّع/اتسجّل في CombatEngine. ======
export async function issueBattleCommand(battleId, { source, type, target } = {}) {
  const { data } = await client.post(`/battles/${battleId}/command`, { source, type, target });
  return data.order;
}
