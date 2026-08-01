import client from './client';

// ====== المستشفى (Hospital & Recovery - Phase 7) - كل نداء هنا بيكلم
// /api/hospital الموجود بالفعل في الباك إند (hospital.controller.js) -
// نداءات HTTP خام بس، مفيش أي حساب علاج هنا. ======

export async function getHospitalOverview() {
  const { data } = await client.get('/hospital');
  return data;
}

// batchId اختياري - لو متبعتش، الباك إند بيعالج أقدم دفعة جاهزة (FIFO)
export async function healBatch(batchId = null) {
  const { data } = await client.post(batchId ? `/hospital/heal/${batchId}` : '/hospital/heal');
  return data;
}

export async function healAll() {
  const { data } = await client.post('/hospital/heal-all');
  return data;
}

export async function cancelHealing(batchId) {
  const { data } = await client.delete(`/hospital/queue/${batchId}`);
  return data;
}
