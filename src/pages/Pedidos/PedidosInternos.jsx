import React, { useState, useEffect, useCallback, useMemo } from 'react';
import client from '../../api/publicClient'; // Asegúrate que esta ruta sea correcta según tu estructura
import Swal from 'sweetalert2';

// --- HELPERS MEJORADOS ---

/**
 * Fix de Fechas: 
 * Parsea manualmente el string YYYY-MM-DD para evitar el desfase de zona horaria 
 * que ocurre con new Date() directo (que lo toma como UTC y resta horas en Latam).
 */
const formatFecha = (fechaStr) => {
    // Si viene nulo, vacío o undefined, mostramos el texto default
    if (!fechaStr) return "Lo antes posible";

    let fechaObj;

    // Detectamos formato de fecha pura "YYYY-MM-DD" (longitud 10)
    if (typeof fechaStr === 'string' && fechaStr.length === 10 && fechaStr.includes('-')) {
        const [yyyy, mm, dd] = fechaStr.split('-').map(Number);
        // Creamos la fecha localmente (Mes en JS es índice 0, por eso mm-1)
        fechaObj = new Date(yyyy, mm - 1, dd);
    } else {
        // Si viene con hora (ISO string completo), usamos el constructor estándar
        fechaObj = new Date(fechaStr);
    }

    // Validar si la fecha es inválida
    if (isNaN(fechaObj.getTime())) return "Fecha inválida";

    // Lógica para mostrar "Hoy" o fecha formateada
    const hoy = new Date();
    const esHoy = fechaObj.getDate() === hoy.getDate() && 
                  fechaObj.getMonth() === hoy.getMonth() && 
                  fechaObj.getFullYear() === hoy.getFullYear();

    const opcionesHora = { hour: '2-digit', minute: '2-digit' };
    
    // Opciones para mostrar fecha: Lun, 20 oct.
    const opcionesFecha = { weekday: 'short', day: 'numeric', month: 'short' };
    
    // Si tiene hora y es hoy, mostramos la hora. Si es solo fecha, mostramos "Hoy" o la fecha
    if (esHoy) {
        return fechaStr.length > 10 
            ? `Hoy, ${fechaObj.toLocaleTimeString('es-CL', opcionesHora)}` 
            : "Entrega: Hoy";
    }
    
    return `Entrega: ${fechaObj.toLocaleDateString('es-CL', opcionesFecha)}`;
};

const formatHoraCreacion = (fechaIso) => {
    if (!fechaIso) return "";
    return new Date(fechaIso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
};

export default function PedidosInternos() {
    const [pendientes, setPendientes] = useState([]);
    const [terminados, setTerminados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Nota: Ajusta la autenticación según tu sistema real (localStorage, Context, etc.)
    const [authToken] = useState(() => localStorage.getItem("access") || null);

    const config = useMemo(() => ({
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    }), [authToken]);

    const fetchPedidos = useCallback(async (isAutoRefresh = false) => {
        if (!isAutoRefresh) setLoading(true); 
        
        try {
            // Verifica que esta URL sea la correcta en tu backend
            const { data } = await client.get("/pos/api/ventas/tablero_pedidos/", config);
            
            // DEBUG: Descomenta esto para ver en consola qué está llegando del backend
            // console.log("Datos recibidos:", data); 

            setPendientes(data.pendientes || []);
            setTerminados(data.terminados || []);
            setError(null);
        } catch (err) {
            console.error("Error cargando tablero:", err);
            if (!isAutoRefresh) setError("Error de conexión al servidor.");
        } finally {
            if (!isAutoRefresh) setLoading(false);
        }
    }, [config]);

    useEffect(() => {
        fetchPedidos(); 
        const intervalo = setInterval(() => { fetchPedidos(true); }, 15000); // Refresco cada 15 seg
        return () => clearInterval(intervalo); 
    }, [fetchPedidos]);

    const marcarListo = async (idVenta) => {
        try {
            await client.post(`/pos/api/ventas/${idVenta}/marcar_entregado/`, {}, config);
            
            // Optimistic UI Update: Movemos el pedido visualmente sin recargar todo
            const ventaMovida = pendientes.find(p => p.id === idVenta);
            if (ventaMovida) {
                setPendientes(prev => prev.filter(p => p.id !== idVenta));
                setTerminados(prev => [ventaMovida, ...prev]);
            }
            
            Swal.fire({
                icon: 'success', title: 'PEDIDO LISTO',
                toast: true, position: 'top-end', showConfirmButton: false, timer: 1500,
            });
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
        }
    };

    // --- COMPONENTE TARJETA ---
    const PedidoCard = ({ venta, esPendiente }) => {
        // Aseguramos que existan items
        const listaProductos = venta.items || venta.detalles || [];
        const esWeb = venta.canal === 'web'; 
        const direccionFinal = venta.direccion || venta.direccion_despacho;
        
        // Aquí usamos la función corregida
        const textoFechaEntrega = formatFecha(venta.fecha_entrega);

        const headerClass = esPendiente ? 'bg-primary text-white' : 'bg-success text-white';
        const cardOpacity = esPendiente ? 'opacity-100' : 'opacity-75';

        return (
            <div className={`card mb-3 border-0 shadow-sm rounded-4 overflow-hidden ${cardOpacity}`} style={{ transition: 'transform 0.2s' }}>
                
                {/* CABECERA */}
                <div className={`card-header py-2 px-3 d-flex justify-content-between align-items-center ${headerClass}`}>
                    <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold fs-5">#{venta.folio_documento || venta.id}</span>
                        {/* Badge Condicional */}
                        <span className={`badge ${esPendiente ? 'bg-white text-primary' : 'bg-white text-success'} rounded-pill px-2 small`}>
                            {esWeb ? 'WEB' : 'POS'}
                        </span>
                    </div>
                    <div className="text-end lh-1">
                        <small className="d-block opacity-75" style={{fontSize:'0.7rem'}}>Hora Pedido</small>
                        <span className="fw-bold">{formatHoraCreacion(venta.fecha || venta.created_at)}</span>
                    </div>
                </div>

                <div className="card-body p-0">
                    
                    {/* --- INFO CLIENTE --- */}
                    <div className="bg-light p-3 border-bottom">
                        <div className="d-flex justify-content-between align-items-start">
                            <div className="d-flex flex-column" style={{maxWidth: '65%'}}>
                                <div className="fw-bold text-dark text-truncate" style={{fontSize: '1.1rem'}}>
                                    <i className="bi bi-person-circle me-2 text-secondary"></i>
                                    {venta.cliente_nombre || 'Cliente General'}
                                </div>
                                
                                {venta.cliente_rut && (
                                    <small className="text-muted ms-4" style={{fontSize: '0.8rem'}}>
                                        {venta.cliente_rut}
                                    </small>
                                )}

                                {direccionFinal && (
                                    <div className="text-primary small mt-1 fw-semibold text-truncate">
                                        <i className="bi bi-geo-alt-fill me-1"></i>
                                        {direccionFinal}
                                    </div>
                                )}
                            </div>

                            {/* CAJA DE FECHA DE ENTREGA */}
                            <div className="text-end">
                                 <span className={`badge border fw-normal py-2 ${textoFechaEntrega.includes('Hoy') ? 'bg-warning text-dark' : 'bg-white text-dark'}`} style={{fontSize: '0.85rem'}}>
                                    <i className="bi bi-calendar-event me-1"></i> {textoFechaEntrega}
                                 </span>
                            </div>
                        </div>
                    </div>

                    {/* LISTA DE PRODUCTOS */}
                    <ul className="list-group list-group-flush">
                        {listaProductos.map((item, idx) => (
                            <li key={idx} className="list-group-item d-flex align-items-center py-2 px-3 border-light">
                                <span className="badge bg-secondary rounded-pill me-3 fs-6" style={{minWidth:'35px'}}>
                                    {item.cantidad}
                                </span>
                                <div className="lh-sm">
                                    <span className="fw-semibold text-dark">
                                        {item.producto_nombre || item.nombre_producto}
                                    </span>
                                    {item.observaciones && <small className="d-block text-muted fst-italic">{item.observaciones}</small>}
                                </div>
                            </li>
                        ))}
                        {listaProductos.length === 0 && <li className="list-group-item text-muted small fst-italic p-3">Sin detalles de productos</li>}
                    </ul>

                    {/* BOTÓN ACCIÓN (Solo pendientes) */}
                    {esPendiente && (
                        <div className="p-3 bg-white border-top">
                            <button 
                                className="btn btn-primary w-100 rounded-pill py-2 fw-bold shadow-sm" 
                                onClick={() => marcarListo(venta.id)}
                            >
                                <i className="bi bi-check-lg me-2"></i> Marcar como Listo
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
            <div className="spinner-border text-primary" role="status"></div>
            <span className="ms-2 fw-bold text-primary">Cargando pedidos...</span>
        </div>
    );
    
    if (error) return (
        <div className="container mt-5">
            <div className="alert alert-danger shadow-sm text-center p-5">
                <i className="bi bi-wifi-off fs-1 d-block mb-3"></i>
                <h4>Ups, algo salió mal</h4>
                <p>{error}</p>
                <button className="btn btn-outline-danger mt-2" onClick={() => fetchPedidos()}>Reintentar</button>
            </div>
        </div>
    );

    return (
        <div className="container-fluid vh-100 p-0 d-flex flex-column font-sans bg-light">
            
            {/* HEADER SUPERIOR */}
            <header className="bg-white px-4 py-3 border-bottom shadow-sm d-flex justify-content-between align-items-center" style={{height: '70px', zIndex: 10}}>
                <div className="d-flex align-items-center gap-2">
                    <h4 className="m-0 fw-bold text-primary">Monitor de Cocina</h4>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <div className="d-none d-md-block text-end lh-1">
                         <small className="d-block text-muted" style={{fontSize: '0.75rem'}}>FECHA ACTUAL</small>
                         <span className="fw-semibold text-dark text-capitalize">
                            {new Date().toLocaleDateString('es-CL', {weekday: 'long', day: 'numeric', month: 'long'})}
                         </span>
                    </div>
                    <span className="badge bg-dark text-success border border-success rounded-pill px-3 py-2 animate__animated animate__pulse animate__infinite">
                        ● En Vivo
                    </span>
                </div>
            </header>

            <div className="row g-0 flex-grow-1 overflow-hidden">
                
                {/* COLUMNA PENDIENTES */}
                <div className="col-md-7 col-lg-8 h-100 d-flex flex-column border-end bg-light">
                    <div className="p-3 d-flex justify-content-between align-items-center sticky-top bg-light z-1">
                        <h5 className="fw-bold text-dark m-0 d-flex align-items-center">
                            <span className="badge bg-primary rounded-circle me-2 shadow-sm">{pendientes.length}</span>
                            Pendientes
                        </h5>
                    </div>
                    
                    <div className="flex-grow-1 overflow-auto px-3 pb-4">
                        {pendientes.length === 0 ? (
                            <div className="h-100 d-flex flex-column justify-content-center align-items-center text-muted opacity-50">
                                <i className="bi bi-cup-hot fs-1 mb-3"></i>
                                <h5 className="fw-normal">No hay pedidos pendientes</h5>
                            </div>
                        ) : (
                            <div className="row g-3">
                                {pendientes.map(p => (
                                    <div key={p.id} className="col-12 col-xl-6">
                                        <PedidoCard venta={p} esPendiente={true} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUMNA TERMINADOS */}
                <div className="col-md-5 col-lg-4 h-100 d-flex flex-column bg-white">
                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light">
                        <h6 className="fw-bold text-success m-0 ps-2 text-uppercase">
                            <i className="bi bi-check-circle-fill me-2"></i> Listos / Entregados
                        </h6>
                    </div>

                    <div className="flex-grow-1 overflow-auto p-3 bg-white">
                         {terminados.length === 0 ? (
                             <p className="text-center text-muted mt-5 small">No hay pedidos completados recientes.</p>
                         ) : (
                             terminados.map(p => <PedidoCard key={p.id} venta={p} esPendiente={false} />)
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
}