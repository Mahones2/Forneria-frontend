import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom"; 

// 1. Componentes de Layout y Navegación
import NavbarLanding from "../components/Navbar/NavbarLanding";
import NavbarApp from "../components/Navbar/NavbarApp";

// 2. Páginas
import Landing from "../pages/Landing/Landing";
import Login from "../pages/Login/Login";
import POS from "../pages/POS/POS";
import ClientesList from "../pages/Clientes/ClientesList";
import ClienteDetail from "../pages/Clientes/ClienteDetail";

// 3. Inventario y Productos
import InventarioAdminPage from "../pages/Inventarios/InventarioPage"; 
import ProductoPage from "../pages/Inventarios/ProductoPage";
import LotesPage from "../pages/Lotes/LotesPage"; 

// 4. Ventas y Pedidos
import Ventas from "../pages/Ventas/Ventas";
import OrdenesActivas from "../pages/Pedidos/OrdenesActivas"; 
import DetalleVenta from "../pages/Pedidos/DetalleVenta"; 
import Configuracion from "../pages/Configuracion/Configuracion";

// 5. Dashboards
import DashboardFinanciero from "../pages/Dashboard/DashboardFinanciero";
import DashboardInventario from "../pages/Dashboard/DashboardInventario";


// Función de HOC para Rutas Privadas
function PrivateRoute({ children }) {
    const isAuth = !!localStorage.getItem("access"); 
    return isAuth ? children : <Navigate to="/login" replace />;
}

// Componente Layout Privado (Menú de Navegación/Sidebar + Contenido)
function PrivateLayout({ children }) {
    return (
        <div className="d-flex min-vh-100">
            <NavbarApp /> 
            <div className="flex-grow-1 p-4 overflow-auto">
                {children}
            </div>
        </div>
    );
}

export default function AppRouter() {
    return (
        <Routes> 
            {/* ========================================================== */}
            {/* 1. Rutas Públicas */}
            {/* ========================================================== */}
            <Route path="/" element={<><NavbarLanding /><Landing /></>} />
            <Route path="/login" element={<Login />} />

            {/* ========================================================== */}
            {/* 2. Rutas Privadas (Usan PrivateLayout) */}
            {/* ========================================================== */}

            {/* Dashboards */}
            <Route path="/dashboard/financiero" element={<PrivateRoute><PrivateLayout><DashboardFinanciero /></PrivateLayout></PrivateRoute>} />
            <Route path="/dashboard/inventario" element={<PrivateRoute><PrivateLayout><DashboardInventario /></PrivateLayout></PrivateRoute>} />

            {/* Operaciones POS y Ventas */}
            <Route path="/pos" element={<PrivateRoute><PrivateLayout><POS /></PrivateLayout></PrivateRoute>} />
            <Route path="/ventas" element={<PrivateRoute><PrivateLayout><Ventas /></PrivateLayout></PrivateRoute>} />
            
            {/* Pedidos */}
            <Route path="/pedidos" element={<PrivateRoute><PrivateLayout><OrdenesActivas /></PrivateLayout></PrivateRoute>} /> 
            <Route path="/pedidos/:id" element={<PrivateRoute><PrivateLayout><DetalleVenta /></PrivateLayout></PrivateRoute>} /> 

            {/* Gestión de Inventario */}
            <Route path="/inventario" element={<PrivateRoute><PrivateLayout><InventarioAdminPage /></PrivateLayout></PrivateRoute>} />
            
            {/* Gestión de Producto (CRUD) */}
            <Route path="/inventario/crear" element={<PrivateRoute><PrivateLayout><ProductoPage mode="form" /></PrivateLayout></PrivateRoute>} />
            <Route path="/inventario/editar/:productoId" element={<PrivateRoute><PrivateLayout><ProductoPage mode="form" /></PrivateLayout></PrivateRoute>} />
            <Route path="/inventario/eliminar/:productoId" element={<PrivateRoute><PrivateLayout><ProductoPage mode="delete" /></PrivateLayout></PrivateRoute>} />
            
            {/* Gestión de Lotes por Producto */}
            <Route path="/inventario/:productoId/lotes" element={<PrivateRoute><PrivateLayout><LotesPage /></PrivateLayout></PrivateRoute>} />

            {/* Gestión de Clientes */}
            <Route path="/clientes" element={<PrivateRoute><PrivateLayout><ClientesList /></PrivateLayout></PrivateRoute>} />
            <Route path="/clientes/:rut" element={<PrivateRoute><PrivateLayout><ClienteDetail /></PrivateLayout></PrivateRoute>} />
            {/* Configuración */}
            <Route path="/configuracion" element={<PrivateRoute><PrivateLayout><Configuracion /></PrivateLayout></PrivateRoute>} />
            
            {/* 404 - Página no encontrada */}
            <Route path="*" element={<h1 className="container p-5 text-center">404 | Página No Encontrada</h1>} />
        </Routes>
    );
}