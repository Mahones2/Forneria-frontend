import axios from "axios";

// Instancia LIMPIA sin interceptores de token
const publicClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  timeout: 30000, // 30 segundos timeout
  headers: {
    "Content-Type": "application/json",
  },
});

export default publicClient;