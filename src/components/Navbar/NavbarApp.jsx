import "./Navbar.css";
import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useCallback } from "react";
import client from '../../api/client';
import logo from "../../assets/logo.png"; // Ajusta la ruta si es necesario

// URL del backend para enlaces externos
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// ====================================================================
// COMPONENTE: PedidoCounter (Maneja la lógica de API y carga)
// ====================================================================

const PedidoCounter = ({ authToken }) => {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const loadPedidoCount = useCallback(async () => {
        if (!authToken) return;

        setLoading(true);

        try {
            // RUTA CORREGIDA: Usa el endpoint /pedidos/
            const { data } = await client.get("/pedidos/", { 
                headers: { Authorization: `Bearer ${authToken}` }
            }); 
            
            // Filtra y cuenta solo los pedidos ACTVOS/PENDIENTES
            const activeCount = data.filter(p => p.estado !== 'Completado' && p.estado !== 'Cancelado').length;
            
            setCount(activeCount);
        } catch (err) {
            // Si falla, establece el conteo en 0 para no interrumpir el Navbar
            console.error("Fallo al obtener el conteo de pedidos:", err);
            setCount(0); 
        } finally {
            setLoading(false);
        }
    }, [authToken]);

    useEffect(() => {
        loadPedidoCount();
        
        // Refrescar cada 15 segundos para pedidos/delivery activos
        const interval = setInterval(loadPedidoCount, 15000); 

        return () => clearInterval(interval); // Limpieza al desmontar
    }, [loadPedidoCount]);

    if (loading) {
        return <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>;
    }
    
    // Solo muestra el badge si hay pedidos activos
    return count > 0 ? (
        <span className="badge rounded-pill bg-danger ms-2">
            {count}
        </span>
    ) : null;
};

// ====================================================================
// COMPONENTE PRINCIPAL: NavbarApp
// ====================================================================

function NavbarApp() {
    const navigate = useNavigate();
    const [empleado, setEmpleado] = useState(null);
    const [authToken, setAuthToken] = useState(null);

    useEffect(() => {
        const rawEmpleado = localStorage.getItem("empleado");
        const datosEmpleado = rawEmpleado ? JSON.parse(rawEmpleado) : null;
        setEmpleado(datosEmpleado);

        const token = localStorage.getItem("access");
        setAuthToken(token);
    }, []);

    const esAdministrador = empleado?.cargo === "Administrador";
    const esVendedor = empleado?.cargo === "Vendedor";

    function handleLogout() {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("empleado");
        setEmpleado(null);
        setAuthToken(null);
        navigate("/");
    }

    // Componente para los enlaces de navegación
    const NavLink = ({ to, label, showCounter = false }) => (
        <li className="nav-item w-100">
            <Link className="nav-link text-white ps-4 d-flex justify-content-between align-items-center" to={to}>
                {label}
                {/* INTEGRACIÓN DEL CONTADOR */}
                {showCounter && <PedidoCounter authToken={authToken} />} 
            </Link>
        </li>
    );

    // Componente para enlaces externos (como el admin)
    const ExternalNavLink = ({ href, label }) => (
        <li className="nav-item w-100">
            <a 
                className="nav-link text-white ps-4 d-flex justify-content-between align-items-center" 
                href={href}
                target="_blank"
                rel="noopener noreferrer"
            >
                {label}
                <i className="bi bi-box-arrow-up-right ms-2" style={{ fontSize: '0.8rem' }}></i>
            </a>
        </li>
    );

    // Componente para los títulos de sección del menú
    const MenuTitle = ({ title }) => (
        <h6 className="text-info mt-3 mb-1 px-3 fw-bold" style={{ fontSize: '0.8rem' }}>
            {title}
        </h6>
    );

    // Menú para Administrador
    const menuAdministrador = (
        <div className="w-100">
            <MenuTitle title="Dashboards" />
            <ul className="nav flex-column align-items-start px-0">
                <NavLink to="/dashboard/financiero" label="Financiero" />
                <NavLink to="/dashboard/inventario" label="Inventario" />
            </ul>

            <MenuTitle title="Operación" />
            <ul className="nav flex-column align-items-start px-0">
                <NavLink to="/pos" label="Punto de Venta" />
                <NavLink to="/ventas" label="Ventas Realizadas" />
                {/* Contador de pedidos añadido aquí */}
                <NavLink to="/pedidos" label="Pedidos/Delivery" showCounter={true} /> 
            </ul>

            <MenuTitle title="Gestión" />
            <ul className="nav flex-column align-items-start px-0">
                <NavLink to="/inventario" label="Inventario (Stock)" />
                <NavLink to="/clientes" label="Clientes" />
                <NavLink to="/reportes" label="Reportes" />
                <ExternalNavLink href={`${API_URL}/admin/`} label="Configuración" />
            </ul>
        </div>
    );

    // Menú para Vendedor
    const menuVendedor = (
        <div className="w-100">
            <MenuTitle title="Accesos" />
            <ul className="nav flex-column align-items-start px-0">
                <NavLink to="/pos" label="Punto de Venta" />
                {/* Contador de pedidos añadido aquí */}
                <NavLink to="/pedidos" label="Pedidos" showCounter={true} /> 
                <NavLink to="/inventario" label="Inventario (Consulta)" />
                <NavLink to="/ventas" label="Mis Ventas" />
            </ul>
        </div>
    );

    return (
        <nav className="bg-dark text-white d-flex flex-column min-vh-100" style={{ width: '250px', flexShrink: 0 }}>
            {/* Bloque superior: logo + info de usuario */}
            <div className="text-center py-4 border-bottom border-secondary">
                <img src={logo} alt="Logo" className="img-fluid" style={{ maxHeight: "40px" }} />
                
                {empleado && (
                    <div className="mt-3 text-center px-3">
                        <div className="mb-1 fw-bold text-warning" style={{ fontSize: '1rem' }}>
                            {empleado.nombre_completo}
                        </div>
                    </div>
                )}
            </div>

            {/* Bloque central: Menú de Navegación (ocupa el espacio restante) */}
            <div className="flex-grow-1 overflow-auto">
                {empleado ? (
                    <div className="w-100 pt-2 pb-4">
                        {esAdministrador ? menuAdministrador :
                         esVendedor ? menuVendedor :
                         <ul className="nav flex-column align-items-start px-0">
                            <MenuTitle title="Acceso Rápido" />
                            <NavLink to="/pos" label="Punto de Venta" />
                         </ul>
                         }
                    </div>
                ) : (
                    <div className="mt-4 px-3 w-100">
                        <button onClick={() => navigate("/login")} className="btn btn-warning w-100">
                            Iniciar sesión
                        </button>
                    </div>
                )}
            </div>

            {/* Bloque inferior: Logout y Footer */}
            <div className="mt-auto">
                {/* Botón de Logout */}
                {empleado && (
                    <div className="px-3 py-3 border-top border-secondary">
                        <button onClick={handleLogout} className="btn btn-danger w-100 btn-sm">
                            <i className="bi bi-box-arrow-right me-2"></i> 
                            Cerrar sesión
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center p-2" style={{backgroundColor: '#1f1f1f'}}> 
                    <h6 className="fw-normal mb-0 text-muted" style={{ fontSize: '0.7rem' }}>
                        Easy Design - 2025
                    </h6>
                </div>
            </div>
        </nav>
    );
}

export default NavbarApp;