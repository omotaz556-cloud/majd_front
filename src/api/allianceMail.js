import client from './client';

// ====== بريد التحالف (Alliance Mail) - كل نداء هنا بيكلم
// /api/alliances/:id/mail الموجود بالفعل في الباك إند (allianceMail.controller.js)
// - مفيش أي منطق هنا غير نداءات HTTP خام، نفس فلسفة api/battle.js. ======

export async function sendMail(allianceId, { title, body }) {
  const { data } = await client.post(`/alliances/${allianceId}/mail`, { title, body });
  return data.mail;
}

export async function listMail(allianceId, { limit = 30, skip = 0 } = {}) {
  const { data } = await client.get(`/alliances/${allianceId}/mail`, { params: { limit, skip } });
  return data.mail;
}

export async function getUnreadMailCount(allianceId) {
  const { data } = await client.get(`/alliances/${allianceId}/mail/unread-count`);
  return data.unread_count;
}

export async function markMailRead(allianceId, mailId) {
  const { data } = await client.post(`/alliances/${allianceId}/mail/${mailId}/read`);
  return data;
}

export async function markAllMailRead(allianceId) {
  const { data } = await client.post(`/alliances/${allianceId}/mail/read-all`);
  return data;
}
