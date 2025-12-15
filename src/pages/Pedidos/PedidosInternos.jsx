import React, { useState, useEffect, useCallback, useMemo } from 'react';
import client from '../../api/client'; 
import Swal from 'sweetalert2';

// --- HELPERS (Sin cambios lógicos, solo quitamos estilos visuales innecesarios) ---
const formatFecha = (fechaStr) => {
    if (!fechaStr) return "Lo antes posible";
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    const esHoy = fecha.getDate() === hoy.getDate() && fecha.getMonth() === hoy.getMonth();
    const opcionesHora = { hour: '2-digit', minute: '2-digit' };
    const opcionesFecha = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' };
    return esHoy ? `Hoy, ${fecha.toLocaleTimeString('es-CL', opcionesHora)}` : fecha.toLocaleDateString('es-CL', opcionesFecha);
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
    const [authToken] = useState(() => localStorage.getItem("access") || null);

    const config = useMemo(() => ({
        headers: { Authorization: `Bearer ${authToken}` }
    }), [authToken]);

    const fetchPedidos = useCallback(async (isAutoRefresh = false) => {
        if (!authToken) return;
        if (!isAutoRefresh) setLoading(true); 
        
        try {
            const { data } = await client.get("/pos/api/ventas/tablero_pedidos/", config);
            setPendientes(data.pendientes);
            setTerminados(data.terminados);
            setError(null);
        } catch (err) {
            console.error("Error cargando tablero:", err);
            if (!isAutoRefresh) setError("Error de conexión al servidor.");
        } finally {
            if (!isAutoRefresh) setLoading(false);
        }
    }, [authToken, config]);

    useEffect(() => {
        fetchPedidos(); 
        const intervalo = setInterval(() => { fetchPedidos(true); }, 15000);
        return () => clearInterval(intervalo); 
    }, [fetchPedidos]);

    const marcarListo = async (idVenta) => {
        try {
            await client.post(`/pos/api/ventas/${idVenta}/marcar_entregado/`, {}, config);
            const ventaMovida = pendientes.find(p => p.id === idVenta);
            setPendientes(prev => prev.filter(p => p.id !== idVenta));
            if (ventaMovida) setTerminados(prev => [ventaMovida, ...prev]);
            
            Swal.fire({
                icon: 'success', title: 'PEDIDO LISTO',
                toast: true, position: 'top-end', showConfirmButton: false, timer: 1500,
            });
            fetchPedidos(true); 
        } catch (err) {
            Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
        }
    };

    // --- TARJETA RE-DISEÑADA (ESTILO MODERNO) ---
    const PedidoCard = ({ venta, esPendiente }) => {
        const listaProductos = venta.items || venta.detalles || [];
        const esWeb = venta.canal === 'web'; 
        const direccionFinal = venta.direccion || venta.direccion_despacho;

        // Estilos dinámicos modernos
        const headerClass = esPendiente ? 'bg-primary text-white' : 'bg-success text-white';
        const cardOpacity = esPendiente ? 'opacity-100' : 'opacity-75';

        return (
            <div className={`card mb-3 border-0 shadow-sm rounded-4 overflow-hidden ${cardOpacity}`} style={{ transition: 'transform 0.2s' }}>
                
                {/* CABECERA */}
                <div className={`card-header py-2 px-3 d-flex justify-content-between align-items-center ${headerClass}`}>
                    <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold fs-5">#{venta.folio_documento || venta.id}</span>
                        <span className={`badge ${esPendiente ? 'bg-white text-primary' : 'bg-white text-success'} rounded-pill px-2 small`}>
                            {esWeb ? 'WEB' : 'POS'}
                        </span>
                    </div>
                    <div className="text-end lh-1">
                        <small className="d-block opacity-75" style={{fontSize:'0.7rem'}}>Hora</small>
                        <span className="fw-bold">{formatHoraCreacion(venta.fecha)}</span>
                    </div>
                </div>

                <div className="card-body p-0">
                    
                    {/* --- INFO CLIENTE --- */}
                    <div className="bg-light p-3 border-bottom">
                        <div className="d-flex justify-content-between align-items-start">
                            <div className="d-flex flex-column" style={{maxWidth: '70%'}}>
                                <div className="fw-bold text-dark text-truncate">
                                    <i className="bi bi-person-circle me-2 text-secondary"></i>
                                    {venta.cliente_nombre || 'Consumidor Final'}
                                </div>
                                
                                {venta.cliente_rut && (
                                    <small className="text-muted ms-4" style={{fontSize: '0.8rem'}}>
                                        {venta.cliente_rut}
                                    </small>
                                )}

                                {direccionFinal && (
                                    <div className="text-primary small mt-1 fw-semibold">
                                        <i className="bi bi-geo-alt-fill me-1"></i>
                                        {direccionFinal}
                                    </div>
                                )}
                            </div>

                            <div className="text-end">
                                 <small className="text-muted d-block" style={{fontSize:'0.7rem'}}>Entrega:</small>
                                 <span className="badge bg-white text-dark border fw-normal">{formatFecha(venta.fecha_entrega)}</span>
                            </div>
                        </div>
                    </div>

                    {/* LISTA DE PRODUCTOS */}
                    <ul className="list-group list-group-flush">
                        {listaProductos.map((item, idx) => (
                            <li key={idx} className="list-group-item d-flex align-items-center py-2 px-3 border-light">
                                <span className="badge bg-secondary rounded-pill me-3" style={{minWidth:'30px'}}>
                                    {item.cantidad}
                                </span>
                                <div className="lh-sm">
                                    <span className="fw-semibold text-dark">
                                        {item.producto_nombre}
                                    </span>
                                </div>
                            </li>
                        ))}
                        {listaProductos.length === 0 && <li className="list-group-item text-muted small fst-italic p-3">Sin detalles</li>}
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
        </div>
    );
    
    if (error) return (
        <div className="container mt-5">
            <div className="alert alert-danger shadow-sm text-center">
                <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
                <div className="mt-3">
                    <button className="btn btn-outline-danger" onClick={() => fetchPedidos()}>Reintentar</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="container-fluid vh-100 p-0 d-flex flex-column font-sans bg-light">
            
            {/* HEADER */}
            <header className="bg-white px-4 py-3 border-bottom shadow-sm d-flex justify-content-between align-items-center" style={{height: '70px'}}>
                <div className="d-flex align-items-center gap-2">
                    <h4 className="m-0 fw-bold text-primary">Pedidos</h4>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <div className="d-none d-md-block text-end lh-1">
                         <small className="d-block text-muted" style={{fontSize: '0.75rem'}}>FECHA</small>
                         <span className="fw-semibold text-dark">{new Date().toLocaleDateString()}</span>
                    </div>
                    <span className="badge bg-dark text-warning border border-success rounded-pill px-3 py-2 animate__animated animate__pulse animate__infinite">
                        ● En Vivo
                    </span>
                </div>
            </header>

            <div className="row g-0 flex-grow-1 overflow-hidden">
                
                {/* COLUMNA PENDIENTES */}
                <div className="col-md-7 col-lg-8 h-100 d-flex flex-column border-end bg-light">
                    <div className="p-3 d-flex justify-content-between align-items-center">
                        <h5 className="fw-bold text-dark m-0 d-flex align-items-center">
                            <span className="badge bg-primary rounded-circle me-2">{pendientes.length}</span>
                            Pendientes
                        </h5>
                    </div>
                    
                    <div className="flex-grow-1 overflow-auto px-3 pb-4">
                        {pendientes.length === 0 ? (
                            <div className="h-100 d-flex flex-column justify-content-center align-items-center text-muted opacity-50">
                                <i className="bi bi-cup-hot fs-1 mb-3"></i>
                                <h5 className="fw-normal">Todo listo por aquí</h5>
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
                            <i className="bi bi-check-circle-fill me-2"></i> Listos
                        </h6>
                    </div>

                    <div className="flex-grow-1 overflow-auto p-3">
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