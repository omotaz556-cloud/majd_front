import client from './client';

// ====== تجمّع التحالف (Alliance Rally) - كل نداء هنا بيكلم
// /api/alliances/rallies* الموجود بالفعل في الباك إند (rally.controller.js)
// - نداءات HTTP خام بس، مفيش أي حساب قتال أو دمج جيوش هنا. ======

export async function createRally({ targetCastleId, countdownSeconds, battlePlanId }) {
  const { data } = await client.post('/alliances/rallies', {
    target_castle_id: targetCastleId,
    countdown_seconds: countdownSeconds,
    battle_plan_id: battlePlanId,
  });
  return data.rally;
}

export async function listMyAllianceRallies() {
  const { data } = await client.get('/alliances/rallies');
  return data.rallies;
}

export async function getRallyStatus(rallyId) {
  const { data } = await client.get(`/alliances/rallies/${rallyId}`);
  return data.rally;
}

export async function joinRally(rallyId, troops, { heroes, research, buffs, battlePlanId } = {}) {
  const { data } = await client.post(`/alliances/rallies/${rallyId}/join`, {
    troops,
    heroes,
    research,
    buffs,
    battle_plan_id: battlePlanId,
  });
  return data.rally;
}

export async function leaveRally(rallyId) {
  const { data } = await client.post(`/alliances/rallies/${rallyId}/leave`);
  return data.rally;
}

export async function cancelRally(rallyId) {
  const { data } = await client.post(`/alliances/rallies/${rallyId}/cancel`);
  return data.rally;
}
