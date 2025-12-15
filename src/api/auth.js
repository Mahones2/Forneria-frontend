import client from "./client"; // Asegúrate que la ruta a tu axios sea correcta

export async function login({ username, password }) {
  try {
    // -----------------------------------------------------------------------
    // PASO 1: PETICIÓN DE LOGIN
    // CORRECCIÓN VITAL: Agregamos el tercer parámetro con los headers.
    // 'Authorization: undefined' asegura que NO se envíe ningún token viejo/basura.
    // -----------------------------------------------------------------------
    const response = await client.post(
      "/pos/api/auth/login/", 
      { username, password },
      { headers: { Authorization: undefined } } 
    );
    
    const { access, refresh, user } = response.data;

    // -----------------------------------------------------------------------
    // PASO 2: GUARDAR EN LOCALSTORAGE
    // Guardamos el token 'access'. IMPORTANTE: Revisa que tu interceptor
    // en './client.js' esté buscando la clave "access" y no "token".
    // -----------------------------------------------------------------------
    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);
    
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    // -----------------------------------------------------------------------
    // PASO 3: OBTENER DATOS DEL EMPLEADO
    // Ahora hacemos la petición a /me/. Aquí NO sobreescribimos los headers,
    // permitiendo que tu interceptor inyecte el token 'access' que acabamos de guardar.
    // -----------------------------------------------------------------------
    const employeeResponse = await client.get("/pos/me/");
    const employeeData = employeeResponse.data;
    
    localStorage.setItem("empleado", JSON.stringify(employeeData)); 

    return { ...response.data, empleado: employeeData };

  } catch (error) {
    // Si algo falla, es buena práctica limpiar para no dejar estados corruptos
    console.error("Error en el servicio de login:", error);
    logout();
    throw error;
  }
}

export function logout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");
  localStorage.removeItem("empleado");
  
  // Opcional: Forzar recarga de la página para limpiar estados de memoria de React
  // window.location.href = "/"; 
}