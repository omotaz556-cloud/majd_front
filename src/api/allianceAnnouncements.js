import client from './client';

// ====== إعلانات التحالف (Alliance Announcements) - كل نداء هنا بيكلم
// /api/alliances/:id/announcements الموجود بالفعل في الباك إند
// (allianceMail.controller.js) - نداءات HTTP خام بس. ======

export async function publishAnnouncement(allianceId, { body }) {
  const { data } = await client.post(`/alliances/${allianceId}/announcements`, { body });
  return data.announcement;
}

export async function getCurrentAnnouncement(allianceId) {
  const { data } = await client.get(`/alliances/${allianceId}/announcements/current`);
  return data.announcement;
}

export async function listAnnouncementHistory(allianceId, { limit = 30, skip = 0 } = {}) {
  const { data } = await client.get(`/alliances/${allianceId}/announcements`, { params: { limit, skip } });
  return data.announcements;
}
