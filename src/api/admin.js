import client from './client';
// عمر

export async function getOverviewStats() {
  const { data } = await client.get('/admin/stats/overview');
  return data;
}

// ====== إحصائيات الإيراد التفصيلية (إجمالي/ضريبة/صافي لكل نوع معاملة) ======
export async function getRevenueStats({ from, to } = {}) {
  const { data } = await client.get('/admin/stats/revenue', { params: { from, to } });
  console.log('Revenue stats77700:', data.real_revenue.deposits.transaction_count);  
  return data;
}

export async function listUsers({ limit = 50, skip = 0, search, role, is_active } = {}) {
  const { data } = await client.get('/admin/users', {
    params: { limit, skip, search, role, is_active },
  });
  return data; // { users, total, limit, skip }
}

export async function setUserStatus(userId, isActive) {
  const { data } = await client.patch(`/admin/users/${userId}/status`, { is_active: isActive });
  return data.user;
}

export async function getUserDetail(userId) {
  const { data } = await client.get(`/admin/users/${userId}`);
  return data; // { user, wallet, stats, recent_transactions }
}

export async function updateUserRole(userId, role) {
  const { data } = await client.patch(`/admin/users/${userId}/role`, { role });
  return data.user;
}

// ====== إيراد الإعلانات الحقيقي (مختلف عن مكافآت الكوين) ======
export async function getAdRevenueStats({ from, to } = {}) {
  const { data } = await client.get('/admin/ad-revenue/stats', { params: { from, to } });
  return data;
}

export async function listAdRevenueEvents({ limit = 50, skip = 0, source } = {}) {
  const { data } = await client.get('/admin/ad-revenue/events', { params: { limit, skip, source } });
  return data; // { events, total, limit, skip }
}

// ====== المعاملات (Transactions) ======
export async function listTransactions({
  limit = 50,
  skip = 0,
  user_id,
  type,
  status,
  from,
  to,
} = {}) {
  const { data } = await client.get('/admin/transactions', {
    params: { limit, skip, user_id, type, status, from, to },
  });
  return data; // { transactions, total, limit, skip }
}

export async function reverseTransaction(transactionId, reason) {
  const { data } = await client.post(`/admin/transactions/${transactionId}/reverse`, { reason });
  return data; // { original, reversal }
}

// ====== إدارة رصيد اللاعبين (Player Management) ======
export async function creditPlayerWallet(userId, { amount, reason, category } = {}) {
  const { data } = await client.post(`/admin/players/${userId}/wallet/credit`, {
    amount,
    reason,
    category,
  });
  return data; // { wallet, transaction }
}

export async function debitPlayerWallet(userId, { amount, reason, category } = {}) {
  const { data } = await client.post(`/admin/players/${userId}/wallet/debit`, {
    amount,
    reason,
    category,
  });
  return data; // { wallet, transaction }
}

export async function grantPlayerBonus(userId, { amount, reason } = {}) {
  const { data } = await client.post(`/admin/players/${userId}/wallet/bonus`, { amount, reason });
  return data; // { wallet, transaction }
}

export async function updatePlayerProfile(userId, { name, admin_notes, reason } = {}) {
  const { data } = await client.patch(`/admin/players/${userId}/profile`, {
    name,
    admin_notes,
    reason,
  });
  return data.user;
}

export async function getPlayerAuditLog(userId, { limit = 20, skip = 0 } = {}) {
  const { data } = await client.get(`/admin/players/${userId}/audit-log`, {
    params: { limit, skip },
  });
  return data; // { entries, total, limit, skip }
}

export async function listAdminAuditLog({ limit = 50, skip = 0, admin_id, action } = {}) {
  const { data } = await client.get('/admin/audit-log', {
    params: { limit, skip, admin_id, action },
  });
  return data; // { entries, total, limit, skip }
}

// ====== باقات وأسعار الـ Coins ======
export async function listCoinPackages() {
  const { data } = await client.get('/admin/coin-packages');
  return data.packages;
}

export async function createCoinPackage(payload) {
  const { data } = await client.post('/admin/coin-packages', payload);
  return data.package;
}

export async function updateCoinPackage(packageId, updates) {
  const { data } = await client.patch(`/admin/coin-packages/${packageId}`, updates);
  return data.package;
}

export async function deleteCoinPackage(packageId) {
  const { data } = await client.delete(`/admin/coin-packages/${packageId}`);
  return data;
}

// ====== صندوق الوارد (بث إعلانات لكل اللاعبين) ======
export async function sendBroadcast({ title, body } = {}) {
  const { data } = await client.post('/admin/inbox/broadcast', { title, body });
  return data.message;
}