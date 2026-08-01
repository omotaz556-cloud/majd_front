import client from './client';

export async function listInbox({ limit = 30, skip = 0 } = {}) {
  const { data } = await client.get('/inbox', { params: { limit, skip } });
  return data; // { messages, total, limit, skip }
}

export async function getUnreadCount() {
  const { data } = await client.get('/inbox/unread-count');
  return data.unread_count;
}

export async function markMessageAsRead(messageId) {
  const { data } = await client.post(`/inbox/${messageId}/read`);
  return data;
}

export async function markAllAsRead() {
  const { data } = await client.post('/inbox/read-all');
  return data;
}

// ====== رسالة خاصة من لاعب لتاني (Message Player) - وقت زيارة مملكته ======
export async function sendPrivateMessage(recipientId, body) {
  const { data } = await client.post('/inbox/message', { recipient_id: recipientId, body });
  return data;
}
