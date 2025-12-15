import "./Navbar.css";
import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useCallback } from "react";
import client from '../../api/client';
import logo from "../../assets/logo.png"; 

// ====================================================================
// COMPONENTE: PedidoCounter (Sin cambios lógicos)
// ====================================================================
const PedidoCounter = ({ authToken, collapsed }) => {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const loadPedidoCount = useCallback(async () => {
        if (!authToken) return;
        setLoading(true);
        try {
            const { data } = await client.get("/pos/api/ventas/tablero_pedidos/", { 
                headers: { Authorization: `Bearer ${authToken}` }
            }); 
            // Asumiendo que el endpoint devuelve { pendientes: [...], ... }
            const activeCount = data.pendientes ? data.pendientes.length : 0;
            setCount(activeCount);
        } catch (err) {
            console.error("Fallo al obtener pedidos:", err);
            setCount(0); 
        } finally {
            setLoading(false);
        }
    }, [authToken]);

    useEffect(() => {
        loadPedidoCount();
        const interval = setInterval(loadPedidoCount, 30000); // Cambio: 30s en vez de 15s
        return () => clearInterval(interval); 
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Dependencias vacías para evitar recrear interval

    if (loading) return null;
    
    if (count > 0) {
        return collapsed ? (
            <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                <span className="visually-hidden">Alertas</span>
            </span>
        ) : (
            <span className="badge rounded-pill bg-danger ms-2">{count}</span>
        );
    }
    return null;
};

// ====================================================================
// COMPONENTE PRINCIPAL: NavbarApp
// ====================================================================

function NavbarApp() {
    const navigate = useNavigate();
    const [empleado, setEmpleado] = useState(null);
    const [authToken, setAuthToken] = useState(null);
    
    // Estado colapsado (Escritorio)
    const [collapsed, setCollapsed] = useState(false);
    // Estado Offcanvas (Móvil)
    const [showMobileMenu, setShowMobileMenu] = useState(false);

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

    const toggleSidebar = () => setCollapsed(!collapsed);
    const closeMobileMenu = () => setShowMobileMenu(false);

    // Componente NavLink (Adaptado para cerrar menú móvil al hacer click)
    const NavLink = ({ to, label, icon, showCounter = false }) => (
        <li className="nav-item w-100" title={collapsed ? label : ""}>
            <Link 
                className={`nav-link text-white d-flex align-items-center ${collapsed ? 'justify-content-center px-0 py-3' : 'ps-4 py-2 justify-content-between'}`} 
                to={to}
                onClick={closeMobileMenu} // Cerrar menú en móvil al navegar
            >
                <div className="d-flex align-items-center position-relative">
                    <i className={`bi ${icon} fs-5`}></i>
                    {!collapsed && <span className="ms-3">{label}</span>}
                    {showCounter && <PedidoCounter authToken={authToken} collapsed={collapsed} />} 
                </div>
            </Link>
        </li>
    );

    const MenuTitle = ({ title }) => (
        !collapsed ? (
            <h6 className="mt-3 mb-1 px-3 fw-bold text-uppercase opacity-50" style={{ fontSize: '0.8rem', color: 'var(--accent-color)' }}>
                {title}
            </h6>
        ) : <div className="border-top border-secondary my-2 mx-3"></div>
    );

    // --- CONTENIDO DEL MENÚ (Reutilizable) ---
    const MenuContent = () => (
        <>
            {/* HEADER INTERNO: Logo + Usuario */}
            <div className={`text-center py-4 border-bottom ${collapsed ? 'px-2' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <img 
                    src={logo} 
                    alt="Logo" 
                    className="img-fluid transition-all" 
                    style={{ maxHeight: collapsed ? "30px" : "40px" }} 
                />
                 {empleado && !collapsed && (
                    <div className="mt-3 fade-in">
                        <div className="fw-bold text-truncate px-3" style={{fontSize: '0.95rem'}}>
                            {empleado.nombre_completo || empleado.nombre}
                        </div>
                        <div className="badge bg-white text-dark mt-1">
                            {empleado.cargo}
                        </div>
                    </div>
                )}
            </div>

            {/* BODY: Listas de Enlaces */}
            <div className="flex-grow-1 overflow-auto custom-scrollbar">
                {empleado ? (
                    <div className="w-100 pt-2 pb-4">
                        {esAdministrador ? (
                            <div className="w-100">
                                <MenuTitle title="Operación" />
                                <ul className="nav flex-column align-items-start px-0">
                                    <NavLink to="/pos" label="Punto de Venta" icon="bi-shop" />
                                    <NavLink to="/ventas" label="Ventas Realizadas" icon="bi-receipt" />
                                    <NavLink to="/monitor" label="Pedidos" icon="bi-bell" showCounter={true} /> 
                                </ul>
                                <MenuTitle title="Gestión" />
                                <ul className="nav flex-column align-items-start px-0">
                                    <NavLink to="/inventario" label="Inventario" icon="bi-box-seam" />
                                    <NavLink to="/clientes" label="Clientes" icon="bi-people" />
                                    <NavLink to="/configuracion" label="Empleados" icon="bi-person-badge" />
                                </ul>
                                <MenuTitle title="Dashboards" />
                                <ul className="nav flex-column align-items-start px-0">
                                    <NavLink to="/dashboard/financiero" label="Financiero" icon="bi-graph-up-arrow" />
                                    <NavLink to="/dashboard/inventario" label="Inventario" icon="bi-pie-chart" />
                                </ul>
                            </div>
                        ) : esVendedor ? (
                            <div className="w-100">
                                <MenuTitle title="Accesos" />
                                <ul className="nav flex-column align-items-start px-0">
                                    <NavLink to="/pos" label="Punto de Venta" icon="bi-shop" />
                                    <NavLink to="/monitor" label="Pedidos" icon="bi-bell" showCounter={true} /> 
                                    <NavLink to="/inventario" label="Inventario" icon="bi-box-seam" />
                                    <NavLink to="/ventas" label="Mis Ventas" icon="bi-receipt" />
                                </ul>
                            </div>
                        ) : (
                            <ul className="nav flex-column align-items-start px-0">
                                <MenuTitle title="Acceso" />
                                <NavLink to="/pos" label="Punto de Venta" icon="bi-shop" />
                            </ul>
                        )}
                    </div>
                ) : (
                    <div className="mt-4 px-2 w-100 text-center">
                        <button onClick={() => navigate("/login")} className={`btn btn-warning ${collapsed ? 'btn-sm rounded-circle' : 'w-75'}`}>
                            {collapsed ? <i className="bi bi-box-arrow-in-right"></i> : "Login"}
                        </button>
                    </div>
                )}
            </div>

            {/* FOOTER: Logout */}
            <div className="mt-auto border-top" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                {empleado && (
                    <div className={`py-3 ${collapsed ? 'text-center' : 'px-3'}`}>
                        <button 
                            onClick={handleLogout} 
                            className={`btn btn-danger btn-sm ${collapsed ? 'rounded-circle p-2' : 'w-100'}`}
                            title="Cerrar Sesión"
                        >
                            <i className="bi bi-box-arrow-right"></i>
                            {!collapsed && <span className="ms-2">Salir</span>}
                        </button>
                    </div>
                )}
            </div>
        </>
    );

    return (
        <>
            {/* ==============================================
                1. NAVBAR MÓVIL (VISIBLE SOLO EN < md)
               ============================================== */}
            <div className="d-md-none bg-primary text-white p-3 d-flex justify-content-between align-items-center w-100 shadow-sm" style={{height: '60px', flexShrink: 0}}>
                <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-link text-white p-0 border-0" onClick={() => setShowMobileMenu(true)}>
                        <i className="bi bi-list fs-1"></i>
                    </button>
                    <span className="fw-bold fs-5">Punto de venta APP</span>
                </div>
                {/* Logo pequeño a la derecha */}
                <img src={logo} alt="Logo" style={{ maxHeight: '30px' }} />
            </div>

            {/* ==============================================
                2. OFFCANVAS MÓVIL (EL MENÚ DESLIZANTE)
               ============================================== */}
            <div className={`offcanvas offcanvas-start bg-dark ${showMobileMenu ? 'show' : ''}`} 
                 tabIndex="-1" 
                 style={{ 
                     visibility: showMobileMenu ? 'visible' : 'hidden', 
                     backgroundColor: 'var(--primary-color)', // Usar tu color primario
                     color: 'white',
                     width: '280px'
                 }}>
                
                {/* Botón cerrar del offcanvas */}
                <button 
                    type="button" 
                    className="btn-close btn-close-white position-absolute top-0 end-0 m-3" 
                    onClick={() => setShowMobileMenu(false)}
                    style={{zIndex: 10}}
                ></button>

                {/* Renderizamos el contenido del menú aquí */}
                <div className="d-flex flex-column h-100">
                    <MenuContent />
                </div>
            </div>
            
            {/* Backdrop para móvil */}
            {showMobileMenu && <div className="offcanvas-backdrop fade show" onClick={() => setShowMobileMenu(false)}></div>}


            {/* ==============================================
                3. SIDEBAR ESCRITORIO (VISIBLE SOLO EN >= md)
               ============================================== */}
            <nav 
                className="d-none d-md-flex flex-column min-vh-100 shadow-lg position-relative" 
                style={{
                    width: collapsed ? '80px' : '260px',
                    transition: 'width 0.3s ease',
                    flexShrink: 0,
                    backgroundColor: 'var(--primary-color)',
                    color: 'var(--text-white)',
                    overflowX: 'hidden',
                    whiteSpace: 'nowrap'
                }}
            >
                {/* Botón Desktop Colapsar */}
                <button 
                    onClick={toggleSidebar}
                    className="btn btn-sm btn-dark position-absolute top-0 end-0 m-2 rounded-circle d-flex align-items-center justify-content-center shadow"
                    style={{ width: '24px', height: '24px', zIndex: 100 }}
                >
                    <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'} small`}></i>
                </button>

                <MenuContent />
            </nav>
        </>
    );
}

export default NavbarApp;