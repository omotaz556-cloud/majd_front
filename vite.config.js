import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // بيسمح بأي رابط tunnel من trycloudflare.com (بيتغيّر كل مرة تشغّل tunnel جديد)
    // من غير ما تحتاج تعدّل الملف ده في كل مرة
    allowedHosts: ['.trycloudflare.com'],
  },
});