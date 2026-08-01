import client from './client';

export async function register({ name, email, password }) {
  const { data } = await client.post('/auth/register', { name, email, password });
  return data; // { user, token }
}

export async function login({ email, password }) {
  const { data } = await client.post('/auth/login', { email, password });
  return data; // { user, token }
}

export async function forgotPassword({ email }) {
  const { data } = await client.post('/auth/forgot-password', { email });
  return data; // { message }
}

export async function resetPassword({ token, newPassword }) {
  const { data } = await client.post('/auth/reset-password', {
    token,
    new_password: newPassword,
  });
  return data; // { success, message }
}
