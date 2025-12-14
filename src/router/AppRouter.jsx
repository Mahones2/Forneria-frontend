import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom"; 

// 1. Componentes de Layout
import NavbarLanding from "../components/Navbar/NavbarLanding";
import NavbarApp from "../components/Navbar/NavbarApp";

// 2. Páginas Públicas y Auth
import Landing from "../pages/Landing/Landing";
import Login from "../pages/Login/Login";

// 3. Páginas Operativas
import POS from "../pages/POS/POS";
import PedidoLanding from "../pages/Pedidos/PedidoLanding"; 

// 4. Clientes
import ClientesList from "../pages/Clientes/ClientesList";
import ClienteDetail from "../pages/Clientes/ClienteDetail";

// 5. Inventario
import InventarioAdminPage from "../pages/Inventarios/InventarioPage"; 
import ProductoPage from "../pages/Inventarios/ProductoPage";
import LotesPage from "../pages/Lotes/LotesPage"; 

// 6. Ventas y Pedidos
import Ventas from "../pages/Ventas/Ventas";
import PedidosInternos from "../pages/Pedidos/PedidosInternos"; 

// 7. Dashboards
import DashboardFinanciero from "../pages/Dashboard/DashboardFinanciero";
import DashboardInventario from "../pages/Dashboard/DashboardInventario";

import Configuracion from "../pages/Configuracion/Configuracion";


// Función de HOC para Rutas Privadas
function PrivateRoute({ children }) {
    const isAuth = !!localStorage.getItem("access"); 
    return isAuth ? children : <Navigate to="/login" replace />;
}

// Componente Layout Privado
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
            
            {/* KIOSCO PÚBLICO (Cliente pide aquí) */}
            <Route path="/pedir" element={<PedidoLanding />} />

            {/* ========================================================== */}
            {/* 2. Rutas Privadas (Requieren Login) */}
            {/* ========================================================== */}

            {/* Dashboards */}
            <Route path="/dashboard/financiero" element={<PrivateRoute><PrivateLayout><DashboardFinanciero /></PrivateLayout></PrivateRoute>} />
            <Route path="/dashboard/inventario" element={<PrivateRoute><PrivateLayout><DashboardInventario /></PrivateLayout></PrivateRoute>} />

            {/* Operaciones POS (Caja) */}
            <Route path="/pos" element={<PrivateRoute><PrivateLayout><POS /></PrivateLayout></PrivateRoute>} />
            
            {/* Historial de Ventas */}
            <Route path="/ventas" element={<PrivateRoute><PrivateLayout><Ventas /></PrivateLayout></PrivateRoute>} />
            
            {/* Monitor de Cocina (Pedidos Internos) */}
            <Route path="/monitor" element={<PrivateRoute><PrivateLayout><PedidosInternos /></PrivateLayout></PrivateRoute>} /> 

            {/* Gestión de Inventario */}
            <Route path="/inventario" element={<PrivateRoute><PrivateLayout><InventarioAdminPage /></PrivateLayout></PrivateRoute>} />
            
            {/* CRUD Productos */}
            <Route path="/inventario/crear" element={<PrivateRoute><PrivateLayout><ProductoPage mode="form" /></PrivateLayout></PrivateRoute>} />
            <Route path="/inventario/editar/:productoId" element={<PrivateRoute><PrivateLayout><ProductoPage mode="form" /></PrivateLayout></PrivateRoute>} />
            <Route path="/inventario/eliminar/:productoId" element={<PrivateRoute><PrivateLayout><ProductoPage mode="delete" /></PrivateLayout></PrivateRoute>} />
            <Route path="/inventario/:productoId/lotes" element={<PrivateRoute><PrivateLayout><LotesPage /></PrivateLayout></PrivateRoute>} />

            {/* Clientes */}
            <Route path="/clientes" element={<PrivateRoute><PrivateLayout><ClientesList /></PrivateLayout></PrivateRoute>} />
            <Route path="/clientes/:rut" element={<PrivateRoute><PrivateLayout><ClienteDetail /></PrivateLayout></PrivateRoute>} />
            <Route path="/configuracion" element={<PrivateRoute><PrivateLayout><Configuracion /></PrivateLayout></PrivateRoute>} />
            
            {/* 404 */}
            <Route path="*" element={<h1 className="container p-5 text-center">404 | Página No Encontrada</h1>} />
        </Routes>
    );
}