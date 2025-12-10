import client from "./client";

export async function login({ username, password }) {
    
    // 1. POST para obtener tokens - dj-rest-auth
    const tokenResponse = await client.post("/api/auth/login/", { username, password });
    
    const { access, refresh, user } = tokenResponse.data;
    
    // Guardar tokens inmediatamente
    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);

    // 2. Guardar datos del usuario
    localStorage.setItem("user", JSON.stringify(user));

    // 3. Configurar el header de autorización para futuras llamadas
    client.defaults.headers.common['Authorization'] = `Bearer ${access}`;

    // Nota: Si necesitas datos adicionales del empleado, deberías crear un endpoint en el backend
    // Por ahora, trabajamos solo con los datos del user que vienen del login
    
    return tokenResponse.data;
}

export function logout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    localStorage.removeItem("empleado");
    delete client.defaults.headers.common['Authorization'];
}