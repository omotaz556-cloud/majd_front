import client from './client';

// ====== إصلاح المباني (Building Repair - Phase 8) - كل نداء هنا بيكلم
// /api/repair الموجود بالفعل في الباك إند (repair.controller.js) -
// نداءات HTTP خام بس، مفيش أي حساب إصلاح هنا. ======

export async function getRepairOverview() {
  const { data } = await client.get('/repair');
  return data;
}

export async function repairOne(structureId) {
  const { data } = await client.post(`/repair/${structureId}`);
  return data;
}

export async function repairAll() {
  const { data } = await client.post('/repair/all');
  return data;
}

export async function cancelRepair(repairId) {
  const { data } = await client.delete(`/repair/${repairId}`);
  return data;
}
