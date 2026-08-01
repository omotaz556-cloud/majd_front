// ====== تنسيق مدة زمنية (بالميلي ثانية) لشكل عداد mm:ss أو hh:mm:ss ======
export function formatDuration(ms) {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ====== نفس الفكرة بس ملقّاة كـ "مدة" مش عدّاد تنازلي (مثلاً مدة ترقية
// ثابتة زي "5 دقايق" أو "ساعة و10 دقايق") - مفيدة لعرض مدة الترقية الجاية
// قبل ما تبدأ (من غير عدّاد شغال).
export function formatDurationLabel(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '0 ثانية';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const parts = [];
  if (h > 0) parts.push(`${h} ساعة`);
  if (m > 0) parts.push(`${m} دقيقة`);
  if (h === 0 && s > 0) parts.push(`${s} ثانية`);
  return parts.join(' و') || '0 ثانية';
}
