import { toast } from 'sonner';

// طبقة رفيعة فوق sonner عشان كل التوست في المنصة يبقى بنفس الستايل والأيقونات
// من غير ما نكرر className في كل مكان. مفيش أي منطق أعمال هنا، عرض بس.

const BASE = {
  duration: 3200,
  className: 'majd-toast',
};

export function toastCoins(message, opts = {}) {
  toast(message, {
    ...BASE,
    icon: '🪙',
    ...opts,
  });
}

export function toastSuccess(message, opts = {}) {
  toast.success(message, { ...BASE, ...opts });
}

export function toastError(message, opts = {}) {
  toast.error(message, { ...BASE, duration: 4200, ...opts });
}

export function toastInfo(message, opts = {}) {
  toast(message, { ...BASE, ...opts });
}

export function toastTrophy(message, opts = {}) {
  toast(message, { ...BASE, icon: '🏆', ...opts });
}
