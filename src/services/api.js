import axios from 'axios';

// Usar variable de entorno si está disponible, sino usar '/api' (proxy de Vite en desarrollo)
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Si es FormData, no establecer Content-Type (el navegador lo hace automáticamente con el boundary)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // No redirigir al login si es el endpoint de login (el componente maneja el error)
      // o si es el endpoint de verificación de contraseña
      // o si es una eliminación de admin (contraseña incorrecta, no sesión expirada)
      // o si la petición tiene la marca skipAuthRedirect
      const url = error.config?.url || '';
      const method = error.config?.method?.toLowerCase() || '';
      const skipAuthRedirect = error.config?.skipAuthRedirect;
      
      const isLoginEndpoint = url.includes('/auth/login');
      const isPasswordVerification = url.includes('/verify-password');
      const isAdminDelete = url.includes('/admin/admins/') && method === 'delete';
      
      if (!skipAuthRedirect && !isLoginEndpoint && !isPasswordVerification && !isAdminDelete) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

