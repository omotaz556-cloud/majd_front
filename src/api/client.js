import axios from 'axios';

// عنوان الباك إند - عدّليه في ملف .env (VITE_API_URL) وقت النشر
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_URL,
  
});

// بيحقن التوكن تلقائياً في كل طلب لو موجود
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('majd_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ====== استثناء endpoints بترجع 401 لأسباب مالهاش علاقة بصلاحية التوكن -
// حاليًا بس /users/change-password: بترجع 401 لما "كلمة المرور الحالية"
// غلط (خطأ تحقق من صحة البيانات)، مش لأن التوكن نفسه منتهي أو غير صالح.
// من غير الاستثناء ده، أي محاولة غلط لكلمة المرور الحالية كانت بتطرد
// المستخدم بره وتعمل logout كامل بدل ما تورّيه رسالة "كلمة المرور غير
// صحيحة" بس. ======
const AUTH_EXPIRY_EXEMPT_PATHS = ['/users/change-password'];

function isAuthExpiryExempt(config) {
  const url = config?.url || '';
  return AUTH_EXPIRY_EXEMPT_PATHS.some((path) => url.includes(path));
}

// لو التوكن انتهى أو مرفوض، بنطرد المستخدم لصفحة الدخول
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !isAuthExpiryExempt(err.config)) {
      localStorage.removeItem('majd_token');
      localStorage.removeItem('majd_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default client;