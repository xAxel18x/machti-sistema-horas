import { supabase } from './supabaseClient';

const API_URL = 'http://localhost:4000/api';

export async function apiFetch(ruta, opciones = {}) {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error('No se pudo obtener la sesión.');
  }

  const token = data.session?.access_token;

  if (!token) {
    throw new Error('Debes iniciar sesión nuevamente.');
  }

  const headers = new Headers(opciones.headers);

  headers.set('Authorization', `Bearer ${token}`);

  return fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers,
  });
}