import client from "./client"; // Asegúrate que la ruta a tu axios sea correcta

export async function login({ username, password }) {
  try {
    // -----------------------------------------------------------------------
    // PASO 1: PETICIÓN DE LOGIN
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
    // -----------------------------------------------------------------------
    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);
    
    // Establecemos el nuevo token directamente en los headers por defecto de la instancia
    // de Axios. Esto asegura que la Petición 2 (a /pos/me/) lo use INMEDIATAMENTE, 
    // sin depender de la lectura asíncrona del localStorage por el interceptor.
    client.defaults.headers.common['Authorization'] = `Bearer ${access}`;
    
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    // -----------------------------------------------------------------------
    // PASO 3: OBTENER DATOS DEL EMPLEADO (¡Esta petición ya no debería dar 401!)
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
  
  // Opcional: También es buena práctica limpiar el token de la instancia de Axios
  delete client.defaults.headers.common['Authorization'];
  
  // Opcional: Forzar recarga de la página para limpiar estados de memoria de React
  // window.location.href = "/"; 
}