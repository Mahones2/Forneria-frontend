import { Routes, Route, Navigate } from "react-router-dom"; 

// 1. Componentes (Navbar)
import NavbarLanding from "../components/Navbar/NavbarLanding";
import NavbarApp from "../components/Navbar/NavbarApp";

import Landing from "../pages/Landing/Landing";
import Login from "../pages/Login/Login";
import POS from "../pages/POS/POS";
import ClientesList from "../pages/Clientes/ClientesList";
import ClienteDetail from "../pages/Clientes/ClienteDetail";
import Inventario from "../pages/Inventarios/Inventario";
import ProductoPage from "../pages/Inventarios/ProductoPage";
import LotesPage from "../pages/Lotes/LotesPage";
import Ventas from "../pages/Ventas/Ventas";
import OrdenesActivas from "../pages/Pedidos/OrdenesActivas"; 
import DetalleVenta from "../pages/Pedidos/DetalleVenta"; 
// ------------------------------------------

import DashboardFinanciero from "../pages/Dashboard/DashboardFinanciero";
import DashboardInventario from "../pages/Dashboard/DashboardInventario";


// Función de HOC para Rutas Privadas
function PrivateRoute({ children }) {
    // Verifica si existe el token 'access' en localStorage
    const isAuth = !!localStorage.getItem("access"); 
    return isAuth ? children : <Navigate to="/login" replace />;
}

// Componente Layout Privado (Menú de Navegación/Sidebar + Contenido)
function PrivateLayout({ children }) {
    return (
        <div className="d-flex">
            {/* NavbarApp actúa como Sidebar/Menú de Navegación */}
            <NavbarApp /> 
            <div className="flex-grow-1 p-4">{children}</div>
        </div>
    );
}

export default function AppRouter() {
    return (
        <Routes> 
            {/* ========================================================== */}
            {/* 1. Rutas Públicas */}
            {/* ========================================================== */}
            
            {/* Landing */}
            <Route
                path="/"
                element={
                    <>
                        <NavbarLanding />
                        <Landing />
                    </>
                }
            />
            
            {/* Login */}
            <Route
                path="/login"
                element={
                    <>
                        <NavbarLanding />
                        <Login />
                    </>
                }
            />

            {/* ========================================================== */}
            {/* 2. Rutas Privadas: (Usan PrivateLayout) */}
            {/* ========================================================== */}

            {/* POS */}
            <Route
                path="/pos"
                element={
                    <PrivateRoute>
                        <PrivateLayout>
                            <POS />
                        </PrivateLayout>
                    </PrivateRoute>
                }
            />

            {/* Clientes */}
            <Route
                path="/clientes"
                element={
                    <PrivateRoute>
                        <PrivateLayout>
                            <ClientesList />
                        </PrivateLayout>
                    </PrivateRoute>
                }
            />
            <Route
                path="/clientes/:rut"
                element={
                    <PrivateRoute>
                        <PrivateLayout>
                            <ClienteDetail />
                        </PrivateLayout>
                    </PrivateRoute>
                }
            />

            {/* Inventario */}
            <Route
                path="/inventario"
                element={
                    <PrivateRoute>
                        <PrivateLayout>
                            <Inventario />
                        </PrivateLayout>
                    </PrivateRoute>
                }
            />
            <Route
                path="/inventario/crear"
                element={
                    <PrivateRoute>
                        <PrivateLayout>
                            <ProductoPage mode="form" />
                        </PrivateLayout>
                    </PrivateRoute>
                }
            />
            <Route
                path="/inventario/editar/:productoId"
                element={
                    <PrivateRoute>
                        <PrivateLayout>
                            <ProductoPage mode="form" />
                        </PrivateLayout>
                    </PrivateRoute>
                }
            />
            <Route
                path="/inventario/eliminar/:productoId"
                element={
                    <PrivateRoute>
                        <PrivateLayout>
                            <ProductoPage mode="delete" />
                        </PrivateLayout>
                    </PrivateRoute>
                }
            />

            {/* Lotes */}
            <Route
                path="/productos/:productoId/lotes"
                element={
                    <PrivateRoute>
                        <PrivateLayout>
                            <LotesPage />
                        </PrivateLayout>
                    </PrivateRoute>
                }
            />

            {/* PEDIDOS/ÓRDENES ACTIVAS (LISTADO DE TARJETAS) */}
            <Route
                path="/pedidos"
                element={
                    <PrivateRoute>
                        <PrivateLayout>
                            <OrdenesActivas />
                        </PrivateLayout>
                    </PrivateRoute>
                }
            />

            {/*  RUTA DETALLE DE PEDIDO (FUNCIONALIDAD DE CAMBIO DE ESTADO) */}
            <Route 
                //  RUTA DE GESTIÓN DE PEDIDO
                path="/pedidos/gestion/:id" 
                element={
                    <PrivateRoute>
                        <PrivateLayout>
                            <DetalleVenta /> 
                        </PrivateLayout>
                    </PrivateRoute>
                } 
            />

            {/* Ventas (Histórico/Reporte) */}
            <Route
                path="/ventas"
                element={
                    <PrivateRoute>
                        <PrivateLayout>
                            <Ventas />
                        </PrivateLayout>
                    </PrivateRoute>
                }
            />

            {/* Dashboard Financiero */}
            <Route
                path="/dashboard"
                element={
                    <PrivateRoute>
                        <PrivateLayout>
                            <DashboardFinanciero />
                        </PrivateLayout>
                    </PrivateRoute>
                }
            />

            {/* Dashboard Inventario */}
            <Route
                path="/dashboard/inventario"
                element={
                    <PrivateRoute>
                        <PrivateLayout>
                            <DashboardInventario />
                        </PrivateLayout>
                    </PrivateRoute>
                }
            />
            
            {/* 404 */}
            <Route path="*" element={<h1>404 | No Encontrado</h1>} />
        </Routes>
    );
}