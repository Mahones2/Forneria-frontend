import React, { useState, useEffect, useCallback, useMemo } from 'react';
import client from '../../api/client'; 
import Swal from 'sweetalert2';

// --- HELPERS ---
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

// CAMBIO DE NOMBRE AQUÍ
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
                background: '#000', color: '#fff', iconColor: '#fff' 
            });
            fetchPedidos(true); 
        } catch (err) {
            Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
        }
    };

    // --- TARJETA ESTILO "HIGH CONTRAST" CON RUT Y DIRECCIÓN ---
    const PedidoCard = ({ venta, esPendiente }) => {
        const listaProductos = venta.items || venta.detalles || [];
        const esWeb = venta.canal === 'web'; 
        
        // Obtenemos la dirección disponible
        const direccionFinal = venta.direccion || venta.direccion_despacho;

        const cardClass = esPendiente 
            ? 'border-2 border-dark shadow' 
            : 'border-0 opacity-50 grayscale'; 

        const headerClass = esPendiente
            ? 'bg-dark text-white' 
            : 'bg-secondary text-white'; 

        return (
            <div className={`card mb-4 rounded-0 ${cardClass}`} style={{ transition: 'all 0.3s' }}>
                
                {/* CABECERA */}
                <div className={`card-header rounded-0 py-2 d-flex justify-content-between align-items-center ${headerClass}`}>
                    <div className="d-flex align-items-center gap-2">
                        <h4 className="fw-bold m-0 font-monospace">#{venta.folio_documento || venta.id}</h4>
                        <span className={`badge border ${esPendiente ? 'bg-white text-dark' : 'bg-dark text-white'} rounded-0`}>
                            {esWeb ? 'WEB' : 'POS'}
                        </span>
                    </div>
                    <div className="text-end lh-1">
                        <small className="d-block text-uppercase" style={{fontSize:'0.65rem', letterSpacing:'1px'}}>Hora</small>
                        <span className="fw-bold font-monospace">{formatHoraCreacion(venta.fecha)}</span>
                    </div>
                </div>

                <div className="card-body p-0">
                    
                    {/* --- INFO CLIENTE (RUT Y DIRECCIÓN AQUÍ) --- */}
                    <div className="bg-light border-bottom border-dark px-3 py-2">
                        <div className="d-flex justify-content-between align-items-start">
                            
                            {/* LADO IZQUIERDO: Nombre, RUT, Dirección */}
                            <div className="d-flex flex-column" style={{maxWidth: '65%'}}>
                                {/* Nombre */}
                                <div className="text-truncate">
                                    <i className="bi bi-person-fill me-1"></i>
                                    <strong className="text-uppercase font-monospace text-dark">
                                        {venta.cliente_nombre || 'CLIENTE'}
                                    </strong>
                                </div>
                                
                                {/* RUT (Nuevo) */}
                                {venta.cliente_rut && (
                                    <small className="text-muted font-monospace ms-4" style={{fontSize: '0.8rem'}}>
                                        RUT: {venta.cliente_rut}
                                    </small>
                                )}

                                {/* Dirección (Nuevo Ubicación) */}
                                {direccionFinal && (
                                    <div className="text-danger small mt-1 lh-sm fw-bold">
                                        <i className="bi bi-geo-alt-fill me-1"></i>
                                        {direccionFinal}
                                    </div>
                                )}
                            </div>

                            {/* LADO DERECHO: Fecha Entrega */}
                            <div className="text-end">
                                 <small className="text-muted text-uppercase me-1" style={{fontSize:'0.7rem'}}>Entrega:</small>
                                 <strong className="text-dark font-monospace d-block">{formatFecha(venta.fecha_entrega)}</strong>
                            </div>
                        </div>
                    </div>

                    {/* LISTA DE PRODUCTOS */}
                    <ul className="list-group list-group-flush">
                        {listaProductos.map((item, idx) => (
                            <li key={idx} className="list-group-item d-flex align-items-center border-bottom-0 py-2">
                                <span className="badge bg-dark rounded-0 me-3 fs-6 font-monospace" style={{minWidth:'40px'}}>
                                    {item.cantidad}
                                </span>
                                <div className="lh-sm">
                                    <span className="fw-bold text-dark text-uppercase d-block">
                                        {item.producto_nombre}
                                    </span>
                                </div>
                            </li>
                        ))}
                        {listaProductos.length === 0 && <li className="list-group-item text-muted fst-italic">Sin detalles</li>}
                    </ul>

                    {/* BOTÓN ACCIÓN */}
                    {esPendiente && (
                        <button 
                            className="btn btn-dark w-100 rounded-0 py-3 fw-bold text-uppercase" 
                            style={{letterSpacing: '2px', borderTop: '2px solid #000'}}
                            onClick={() => marcarListo(venta.id)}
                        >
                            <i className="bi bi-check-square-fill me-2"></i> Listo
                        </button>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <div className="d-flex justify-content-center align-items-center vh-100 bg-secondary"><div className="spinner-border text-white"></div></div>;
    if (error) return <div className="alert alert-dark m-5 text-center rounded-0">{error} <br/><button className="btn btn-light rounded-0 mt-2" onClick={() => fetchPedidos()}>Reintentar</button></div>;

    return (
        <div className="container-fluid vh-100 p-0 d-flex flex-column font-sans" style={{backgroundColor: '#e9ecef'}}>
            
            {/* HEADER */}
            <header className="bg-dark text-white px-4 py-2 d-flex justify-content-between align-items-center shadow-sm" style={{height: '60px'}}>
                <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-grid-3x3-gap-fill fs-4"></i>
                    <h5 className="m-0 fw-bold text-uppercase" style={{letterSpacing: '2px'}}>Pedidos Internos (Cocina)</h5>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <div className="d-none d-md-block text-end lh-1">
                         <small className="d-block text-muted" style={{fontSize: '0.7rem'}}>FECHA</small>
                         <span className="font-monospace">{new Date().toLocaleDateString()}</span>
                    </div>
                    <span className="badge bg-white text-dark rounded-0 animate__animated animate__pulse animate__infinite">
                        ● EN VIVO
                    </span>
                </div>
            </header>

            <div className="row g-0 flex-grow-1 overflow-hidden">
                {/* COLUMNA PENDIENTES */}
                <div className="col-md-7 col-lg-8 h-100 d-flex flex-column border-end border-secondary">
                    <div className="bg-white p-2 border-bottom border-dark d-flex justify-content-between align-items-center">
                        <h6 className="fw-bold text-dark m-0 ps-2 text-uppercase">
                            <i className="bi bi-hourglass-split me-2"></i> Pendientes ({pendientes.length})
                        </h6>
                    </div>
                    
                    <div className="flex-grow-1 overflow-auto p-3" style={{backgroundColor: '#dee2e6'}}>
                        {pendientes.length === 0 ? (
                            <div className="h-100 d-flex flex-column justify-content-center align-items-center text-muted">
                                <i className="bi bi-inbox fs-1 mb-2"></i>
                                <h4 className="fw-light">Sin pedidos pendientes</h4>
                            </div>
                        ) : (
                            <div className="row">
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
                <div className="col-md-5 col-lg-4 h-100 d-flex flex-column bg-light">
                    <div className="bg-secondary text-white p-2 border-bottom border-white d-flex justify-content-between align-items-center">
                        <h6 className="fw-bold m-0 ps-2 text-uppercase">
                            <i className="bi bi-check-circle me-2"></i> Listos
                        </h6>
                    </div>

                    <div className="flex-grow-1 overflow-auto p-3">
                         {terminados.map(p => <PedidoCard key={p.id} venta={p} esPendiente={false} />)}
                    </div>
                </div>
            </div>
        </div>
    );
}