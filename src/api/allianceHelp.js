import client from './client';

// ====== مساعدة التحالف (Alliance Help) - كل نداء هنا بيكلم
// /api/alliances/:id/help الموجود بالفعل في الباك إند
// (allianceHelp.controller.js) - نداءات HTTP خام بس، مفيش أي حساب هنا. ======

export async function requestHelp(allianceId, { helpType, castleId, targetId }) {
  const { data } = await client.post(`/alliances/${allianceId}/help`, {
    help_type: helpType,
    castle_id: castleId,
    target_id: targetId,
  });
  return data.help_request;
}

export async function listOpenHelpRequests(allianceId, { limit = 30, skip = 0 } = {}) {
  const { data } = await client.get(`/alliances/${allianceId}/help`, { params: { limit, skip } });
  return data.help_requests;
}

export async function getHelpRequest(allianceId, helpId) {
  const { data } = await client.get(`/alliances/${allianceId}/help/${helpId}`);
  return data.help_request;
}

export async function giveHelp(allianceId, helpId) {
  const { data } = await client.post(`/alliances/${allianceId}/help/${helpId}/press`);
  return data;
}

export async function cancelHelpRequest(allianceId, helpId) {
  const { data } = await client.delete(`/alliances/${allianceId}/help/${helpId}`);
  return data;
}
