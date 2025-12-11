import axios from "axios";

// 1. Crear la instancia
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Debug: Verificar que la variable de entorno se cargue correctamente
console.log('====================================');
console.log('🔧 DEBUG: API Configuration');
console.log('====================================');
console.log('🔧 VITE_API_URL env:', import.meta.env.VITE_API_URL);
console.log('🔧 API URL configurada:', API_URL);
console.log('🔧 MODE:', import.meta.env.MODE);
console.log('🔧 DEV:', import.meta.env.DEV);
console.log('🔧 PROD:', import.meta.env.PROD);
console.log('🔧 Todas las env vars:', import.meta.env);
console.log('====================================');

const client = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. EL INTERCEPTOR MÁGICO (Request)
// Antes de que salga cualquier petición, ejecuta esto:
client.interceptors.request.use(
  (config) => {
    // Lee el token de localStorage cada vez que hay una petición
    const token = localStorage.getItem("access");
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. (Opcional) Interceptor de Respuesta para manejar errores 401 globales
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si el token venció, podrías cerrar sesión automáticamente aquí
      // localStorage.clear();
      // window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default client;