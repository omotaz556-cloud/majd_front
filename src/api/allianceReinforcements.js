import client from './client';

// ====== تعزيزات التحالف (Alliance Reinforcements) - كل نداء هنا بيكلم
// /api/alliances/reinforcements/* الموجود بالفعل في الباك إند
// (allianceReinforcement.controller.js) - نداءات HTTP خام بس. ======

export async function sendReinforcement(targetCastleId, troops) {
  const { data } = await client.post('/alliances/reinforcements/send', {
    target_castle_id: targetCastleId,
    troops,
  });
  return data; // { castle, march }
}

export async function recallReinforcement(reinforcementId) {
  const { data } = await client.post(`/alliances/reinforcements/${reinforcementId}/recall`);
  return data; // { reinforcement, march }
}

export async function listOutgoingReinforcements() {
  const { data } = await client.get('/alliances/reinforcements/outgoing');
  return data.reinforcements;
}

export async function listIncomingReinforcements() {
  const { data } = await client.get('/alliances/reinforcements/incoming');
  return data.reinforcements;
}
