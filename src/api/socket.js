import { io } from 'socket.io-client';

// ====== Phase 1 (Reinforcement & Battle System) - نفس فلسفة client.js
// (axios) بالظبط بس للويب سوكيت: عنوان الباك إند بياخد من نفس VITE_API_URL
// بعد ما نشيل '/api' من آخره - السوكيت بيتصل بجذر السيرفر (نفس الـ port اللي
// http.createServer وsocket.io شغالين عليه في server.js) مش بمسار REST API. ======
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket = null;

// ====== اتصال واحد بس (singleton) طول ما التوكن نفسه - لو فيه اتصال شغال
// بالفعل بنفس التوكن منرجعش نفتح واحد جديد (مثلاً كذا كومبوننت نادى عليها
// في نفس اللحظة). بيتقفل ويترفتح تاني بس لو التوكن اتغيّر (تسجيل خروج ودخول
// بحساب مختلف). ======
export function connectSocket(token) {
  if (!token) return null;
  if (socket && socket.connected && socket.auth?.token === token) return socket;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
