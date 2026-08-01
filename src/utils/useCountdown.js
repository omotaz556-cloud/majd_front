import { useEffect, useState } from 'react';

// ====== عدّاد تنازلي حي بسيط - بياخد ثواني متبقية (جايه من الباك إند وقت
// آخر تحميل/رد) ويقلّلها محليًا كل ثانية بس للعرض (نبضة بصرية بين كل
// نداء API والتاني) - الرقم الحقيقي دايمًا من السيرفر (remaining_seconds/
// remaining_healing_seconds/...)، هنا بس تنعيم العرض بينهم. بيرجع لأقرب
// قيمة جديدة تلقائيًا لو seedSeconds اتغيّر (رد جديد من السيرفر). ======
export function useCountdown(seedSeconds) {
  const [seconds, setSeconds] = useState(Math.max(0, Math.floor(seedSeconds || 0)));

  useEffect(() => {
    setSeconds(Math.max(0, Math.floor(seedSeconds || 0)));
  }, [seedSeconds]);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const id = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [seconds > 0]);

  return seconds;
}

export function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
