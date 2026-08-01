import client from './client';

export async function getMyAlliance() {
  const { data } = await client.get('/alliances/me');
  return data.alliance;
}

export async function createAlliance({ name, tag, description }) {
  const { data } = await client.post('/alliances', { name, tag, description });
  return data.alliance;
}

export async function updateAlliance(id, { name, description }) {
  const { data } = await client.patch(`/alliances/${id}`, { name, description });
  return data.alliance;
}

export async function disbandAlliance(id) {
  await client.delete(`/alliances/${id}`);
}

export async function listAlliances(search = '') {
  const { data } = await client.get('/alliances', { params: search ? { search } : {} });
  return data.alliances;
}

export async function getAllianceDetail(id) {
  const { data } = await client.get(`/alliances/${id}`);
  return data.alliance;
}

export async function invitePlayer(allianceId, userId) {
  const { data } = await client.post(`/alliances/${allianceId}/invites`, { user_id: userId });
  return data.invite;
}

export async function cancelInvite(allianceId, inviteId) {
  await client.delete(`/alliances/${allianceId}/invites/${inviteId}`);
}

export async function requestToJoin(allianceId) {
  const { data } = await client.post(`/alliances/${allianceId}/join-requests`);
  return data.request;
}

export async function cancelJoinRequest(allianceId) {
  await client.delete(`/alliances/${allianceId}/join-requests/mine`);
}

export async function getMyInvites() {
  const { data } = await client.get('/alliances/invites/mine');
  return data.invites;
}

export async function respondToInvite(inviteId, accept) {
  const { data } = await client.post(`/alliances/invites/${inviteId}/respond`, { accept });
  return data;
}

export async function getPendingRequests(allianceId) {
  const { data } = await client.get(`/alliances/${allianceId}/join-requests`);
  return data.requests;
}

export async function respondToRequest(allianceId, requestId, accept) {
  const { data } = await client.post(`/alliances/${allianceId}/join-requests/${requestId}/respond`, { accept });
  return data;
}

export async function kickMember(allianceId, userId) {
  const { data } = await client.delete(`/alliances/${allianceId}/members/${userId}`);
  return data.alliance;
}

export async function leaveAlliance(allianceId) {
  await client.post(`/alliances/${allianceId}/leave`);
}

export async function setMemberRole(allianceId, userId, role) {
  const { data } = await client.patch(`/alliances/${allianceId}/members/${userId}/role`, { role });
  return data.alliance;
}

export async function transferLeadership(allianceId, userId) {
  const { data } = await client.post(`/alliances/${allianceId}/members/${userId}/transfer-leadership`);
  return data.alliance;
}
