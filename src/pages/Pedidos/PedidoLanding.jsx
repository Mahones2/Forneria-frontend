import { useEffect, useState, useMemo } from "react";
import client from "../../api/publicClient"; 
import Swal from 'sweetalert2';
import { Decimal } from "decimal.js";

// --- CONSTANTES ---
const METODOS_PAGO = [
    { code: 'DEB', label: 'Débito' },
    { code: 'CRE', label: 'Crédito' },
    { code: 'TRA', label: 'Transferencia' }
];

// --- HELPERS ---
const formatCurrency = (value) => {
    const numericValue = value instanceof Decimal ? value.round().toNumber() : new Decimal(value || 0).round().toNumber();
    if (isNaN(numericValue)) return "$0";
    return numericValue.toLocaleString('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0, 
    });
};

const getImageUrl = (url) => {
    if (!url) return "https://placehold.co/400x400?text=Sin+Imagen"; 
    if (url.startsWith('http')) return url;
    const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'; 
    return `${baseURL}${url}`;
};

// CAMBIO 1: Nombre de la función
function PedidoLanding() {
    // --- ESTADOS DE DATOS ---
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
    
    // --- ESTADO CARRITO ---
    const [cart, setCart] = useState([]); 

    // --- ESTADO CLIENTE ---
    const [rutCliente, setRutCliente] = useState(""); 
    const [clienteData, setClienteData] = useState(null); 
    const [isSearchingClient, setIsSearchingClient] = useState(false);

    // --- ESTADO MODAL REGISTRO ---
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [nuevoCliente, setNuevoCliente] = useState({ 
        nombre: "", 
        correo: "", 
        telefono: "", 
        es_empresa: false
    });

    // --- ESTADO PAGOS ---
    const [pagosRealizados, setPagosRealizados] = useState([]); 
    const [montoPagoActual, setMontoPagoActual] = useState(""); 
    const [metodoPagoActual, setMetodoPagoActual] = useState("DEB"); 
    const [fechaEntrega, setFechaEntrega] = useState(""); 

    const [isProcessing, setIsProcessing] = useState(false);

    // --- 1. CARGA DE CATÁLOGO ---
    // NOTA: La URL de la API se mantiene igual (/pos/api/kiosco/) porque el backend no ha cambiado
    useEffect(() => {
        const fetchCatalogo = async () => {
            try {
                const { data } = await client.get('/pos/api/kiosco/catalogo/'); 
                const prodsFormatted = data.productos.map(p => ({
                    ...p,
                    precio_venta: new Decimal(p.precio_venta),
                    stock_fisico: parseInt(p.stock_fisico || 0)
                }));
                setProductos(prodsFormatted);
                setCategorias(data.categorias);
            } catch (err) {
                console.error(err);
                Swal.fire({icon: "error", title: "Error", text: "No se pudo cargar el menú."});
            }
        };
        fetchCatalogo();
    }, []);

    // --- 2. LÓGICA CARRITO ---
    const getProductStock = (id) => {
        const prod = productos.find(p => p.id === id);
        return prod ? prod.stock_fisico : 0;
    };

    const handleAddToCart = (producto) => {
        const stockActual = getProductStock(producto.id);
        if (stockActual <= 0) return Swal.fire({icon: 'warning', title: 'Sin Stock', toast: true, position: 'top', showConfirmButton: false, timer: 1000});

        setCart(prev => {
            const existe = prev.find(i => i.id === producto.id);
            if (existe) {
                if (existe.cantidad + 1 > stockActual) {
                    Swal.fire({icon: 'warning', title: 'Stock Máximo', toast: true, position: 'top', timer: 1000, showConfirmButton: false});
                    return prev;
                }
                return prev.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
            }
            return [...prev, { 
                id: producto.id, 
                nombre: producto.nombre, 
                precio_unitario: producto.precio_venta, 
                cantidad: 1,
                imagen: producto.imagen_referencial 
            }];
        });
    };

    const handleUpdateQuantity = (id, delta) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.id === id) {
                    const nuevaCant = item.cantidad + delta;
                    const stockMax = getProductStock(id);
                    if (nuevaCant < 1) return null; 
                    if (nuevaCant > stockMax) return item; 
                    return { ...item, cantidad: nuevaCant };
                }
                return item;
            }).filter(Boolean);
        });
    };

    const vaciarCarrito = () => {
        if(cart.length === 0) return;
        setCart([]);
        setPagosRealizados([]);
    };

    // --- 3. CÁLCULOS ---
    const cartTotal = useMemo(() => cart.reduce((acc, item) => acc.plus(item.precio_unitario.times(item.cantidad)), new Decimal(0)).round(), [cart]);
    const totalPagado = useMemo(() => pagosRealizados.reduce((acc, pago) => acc.plus(pago.monto), new Decimal(0)).round(), [pagosRealizados]);
    const saldoPendiente = useMemo(() => {
        const pendiente = cartTotal.minus(totalPagado);
        return pendiente.isNegative() ? new Decimal(0) : pendiente;
    }, [cartTotal, totalPagado]);
    const vueltoTotalFinal = useMemo(() => {
        return pagosRealizados.reduce((acc, pago) => {
            if (pago.metodo === 'EFE' && pago.monto_recibido.greaterThan(pago.monto)) {
                return acc.plus(pago.monto_recibido.minus(pago.monto));
            }
            return acc;
        }, new Decimal(0)).round();
    }, [pagosRealizados]);

    // --- 4. CLIENTE Y MODAL ---
    const handleSearchClient = async (rut = rutCliente) => {
        if (!rut) return;
        setIsSearchingClient(true);
        try {
            const res = await client.get(`/pos/api/kiosco/validar_cliente/?rut=${rut}`);
            
            if (res.data.existe) {
                setClienteData(res.data);
                Swal.fire({icon: 'success', title: `Hola ${res.data.nombre}`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000});
            } else {
                setClienteData(null);
                // ABRIR MODAL
                setNuevoCliente({ nombre: "", correo: "", telefono: "", es_empresa: false });
                setShowRegisterModal(true);
            }
        } catch (err) { 
            console.error(err);
            Swal.fire("Error", "Error al buscar cliente", "error");
        } finally {
            setIsSearchingClient(false);
        }
    };

    const registrarClienteDesdeModal = async () => {
        if(!nuevoCliente.nombre || !rutCliente) return Swal.fire("Faltan datos", "Nombre y RUT obligatorios", "warning");
        
        // JSON EXACTO QUE PEDISTE
        const clientePayload = {
            rut: rutCliente,
            nombre: nuevoCliente.nombre,
            correo: nuevoCliente.correo || "sin_correo@kiosco.cl", 
            telefono: nuevoCliente.telefono || "",
            es_empresa: nuevoCliente.es_empresa // Boolean
        };

        try {
            const res = await client.post('/pos/api/kiosco/registrar_cliente/', clientePayload);
            setClienteData(res.data);
            setShowRegisterModal(false); // CERRAR MODAL
            Swal.fire("Registrado", "¡Cliente creado correctamente!", "success");
        } catch (err) { 
            console.error(err);
            Swal.fire('Error', 'No se pudo registrar. Verifica el RUT.', 'error'); 
        }
    };

    // --- 5. PAGOS ---
    const handleAddPago = () => {
        const montoActualDec = new Decimal(montoPagoActual || 0);
        if (montoActualDec.isZero() || saldoPendiente.isZero()) return;

        let montoAplicado = montoActualDec.greaterThan(saldoPendiente) ? saldoPendiente : montoActualDec;
        let montoRecibido = montoActualDec;

        if (metodoPagoActual !== 'EFE') montoRecibido = montoAplicado;

        setPagosRealizados(prev => [...prev, {
            metodo: metodoPagoActual,
            monto: montoAplicado,
            monto_recibido: montoRecibido 
        }]);
        setMontoPagoActual(""); 
    };

    // --- 6. FINALIZAR ---
    const handleFinalizarCompra = async () => {
        if (saldoPendiente.greaterThan(0)) return Swal.fire('Pago incompleto', `Falta: ${formatCurrency(saldoPendiente)}`, 'warning');
        if (!clienteData) return Swal.fire('Falta Cliente', 'Ingresa tu RUT', 'warning');
        if (!fechaEntrega) return Swal.fire('Falta Fecha', 'Selecciona fecha de retiro', 'warning');

        setIsProcessing(true);
        const ventaPayload = {
            cliente_id: clienteData.id,
            fecha_entrega: fechaEntrega,
            direccion_id: null, 
            items: cart.map(i => ({ producto_id: i.id, cantidad: i.cantidad, precio_unitario: i.precio_unitario.toString() })), 
            pagos: pagosRealizados.map(p => ({ metodo: p.metodo, monto: p.monto.toString(), monto_recibido: p.monto_recibido.toString() }))
        };

        try {
            await client.post('/pos/api/kiosco/crear_pedido/', ventaPayload);
            Swal.fire({title: '¡Pedido Enviado!', text: 'Gracias por tu compra', icon: 'success'}).then(() => {
                window.location.reload(); // Recarga simple para limpiar todo
            });
        } catch (err) {
            Swal.fire('Error', 'Error procesando pedido', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const productosFiltrados = productos.filter(p => categoriaSeleccionada === "" || p.categoria === categoriaSeleccionada);

    return (
        <div className="container-fluid vh-100 font-sans" style={{overflow: 'hidden'}}>
            <div className="row h-100">
                
                {/* COL 1: CATEGORÍAS */}
                <div className="col-md-2 bg-dark text-white p-0 d-flex flex-column">
                    <div className="p-3 bg-primary text-center fw-bold shadow">MENÚ</div>
                    <div className="overflow-auto flex-grow-1">
                        <button className={`btn w-100 rounded-0 py-3 text-start px-4 border-bottom border-secondary ${categoriaSeleccionada===""?'btn-secondary fw-bold':'btn-dark text-white-50'}`} 
                                onClick={() => setCategoriaSeleccionada("")}>Todo</button>
                        {categorias.map(cat => (
                            <button key={cat.id} className={`btn w-100 rounded-0 py-3 text-start px-4 border-bottom border-secondary ${categoriaSeleccionada===cat.id?'btn-secondary fw-bold':'btn-dark text-white-50'}`}
                                onClick={() => setCategoriaSeleccionada(cat.id)}>{cat.nombre}</button>
                        ))}
                    </div>
                </div>

                {/* COL 2: PRODUCTOS */}
                <div className="col-md-7 bg-light p-4 overflow-auto">
                    <div className="row g-3">
                        {productosFiltrados.map(prod => (
                             <div key={prod.id} className="col-6 col-lg-4">
                                <div className="card h-100 shadow-sm border-0" onClick={() => handleAddToCart(prod)} style={{cursor: 'pointer'}}>
                                    <div className="bg-white text-center p-3 rounded-top position-relative" style={{height: '160px'}}>
                                        <span className={`badge position-absolute top-0 end-0 m-2 ${prod.stock_fisico>0?'bg-success':'bg-danger'}`}>
                                            {prod.stock_fisico>0?`${prod.stock_fisico} u.`:'Agotado'}
                                        </span>
                                        <img src={getImageUrl(prod.imagen_referencial)} className="img-fluid h-100" alt={prod.nombre} style={{objectFit:'contain', filter: prod.stock_fisico<=0?'grayscale(1)':'none'}}/>
                                    </div>
                                    <div className="card-body">
                                        <h6 className="fw-bold text-dark text-truncate">{prod.nombre}</h6>
                                        <div className="d-flex justify-content-between align-items-center mt-2">
                                            <span className="fs-5 fw-bold text-primary">{formatCurrency(prod.precio_venta)}</span>
                                            <button className="btn btn-primary rounded-circle" disabled={prod.stock_fisico<=0} style={{width:'40px',height:'40px'}}>+</button>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        ))}
                    </div>
                </div>

                {/* COL 3: CHECKOUT */}
                <div className="col-md-3 bg-white shadow-lg p-0 d-flex flex-column border-start z-index-1000">
                    <div className="p-3 bg-white border-bottom shadow-sm d-flex justify-content-between align-items-center">
                        <h5 className="fw-bold m-0 text-primary">Tu Pedido</h5>
                        {cart.length > 0 && <button className="btn btn-sm btn-outline-danger" onClick={vaciarCarrito}>Vaciar</button>}
                    </div>
                    
                    {/* LISTA ITEMS - Botones grandes y claros */}
                    <div className="flex-grow-1 overflow-auto p-3" style={{minHeight: '200px'}}>
                        {cart.length === 0 ? <p className="text-center text-muted mt-5">Carrito vacío</p> : 
                            cart.map((item, idx) => (
                                <div key={idx} className="card mb-2 border-0 shadow-sm">
                                    <div className="card-body p-2 d-flex justify-content-between align-items-center">
                                        <div style={{width:'40%'}}>
                                            <div className="fw-bold text-truncate">{item.nombre}</div>
                                            <div className="small text-muted">{formatCurrency(item.precio_unitario)}</div>
                                        </div>
                                        {/* GRUPO DE BOTONES CLARO */}
                                        <div className="btn-group" role="group">
                                            <button type="button" className="btn btn-outline-danger btn-sm px-3 fw-bold" onClick={()=>handleUpdateQuantity(item.id, -1)}>-</button>
                                            <button type="button" className="btn btn-light btn-sm px-3 fw-bold border" disabled>{item.cantidad}</button>
                                            <button type="button" className="btn btn-outline-success btn-sm px-3 fw-bold" onClick={()=>handleUpdateQuantity(item.id, 1)}>+</button>
                                        </div>
                                    </div>
                                </div>
                        ))}
                    </div>

                    {/* FOOTER PAGOS */}
                    <div className="bg-light p-3 border-top shadow-lg" style={{maxHeight: '60vh', overflowY: 'auto'}}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="fs-5 fw-bold text-dark">TOTAL</span>
                            <span className="fs-3 fw-bold text-primary">{formatCurrency(cartTotal)}</span>
                        </div>
                        
                        {/* INPUT RUT */}
                        <div className="input-group mb-3">
                            <input className="form-control" placeholder="RUT Cliente (Ej: 11111111-1)" 
                                value={rutCliente} onChange={e => setRutCliente(e.target.value)}
                                disabled={clienteData !== null}
                                onKeyDown={e => e.key === 'Enter' && handleSearchClient()}
                            />
                            {clienteData ? (
                                <button className="btn btn-danger" onClick={()=>{setClienteData(null); setRutCliente("");}}>X</button>
                            ) : (
                                <button className="btn btn-primary" onClick={() => handleSearchClient()} disabled={!rutCliente}>Buscar</button>
                            )}
                        </div>

                        {clienteData && <div className="alert alert-success py-1 small text-center mb-2">Cliente: <b>{clienteData.nombre}</b></div>}

                        {/* FECHA ENTREGA - Label claro */}
                        <div className="mb-3">
                            <label className="form-label fw-bold text-muted small text-uppercase">📅 Fecha de Retiro / Entrega</label>
                            <input type="date" className="form-control" 
                                    min={new Date().toISOString().split('T')[0]}
                                    value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)}
                            />
                        </div>

                        {/* PAGOS */}
                        {clienteData && cart.length > 0 && (
                            <div className="animate__animated animate__fadeInUp">
                                <div className="d-flex justify-content-between text-muted small mb-2">
                                    <span>Pagado: <b className="text-success">{formatCurrency(totalPagado)}</b></span>
                                    <span>Falta: <b className="text-danger">{formatCurrency(saldoPendiente)}</b></span>
                                </div>
                                {pagosRealizados.map((p, i) => (
                                    <div key={i} className="d-flex justify-content-between small px-2 py-1 bg-white border rounded mb-1">
                                        <span>{METODOS_PAGO.find(m=>m.code===p.metodo)?.label}</span><b>{formatCurrency(p.monto)}</b>
                                    </div>
                                ))}
                                {!saldoPendiente.isZero() && (
                                    <div className="row g-1 mb-2">
                                        <div className="col-4">
                                            <select className="form-select" value={metodoPagoActual} onChange={e => setMetodoPagoActual(e.target.value)}>
                                                {METODOS_PAGO.map(m => <option key={m.code} value={m.code}>{m.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-5">
                                            <input type="number" className="form-control" placeholder={saldoPendiente.toNumber()} value={montoPagoActual} onChange={e => setMontoPagoActual(e.target.value)}/>
                                        </div>
                                        <div className="col-3"><button className="btn btn-warning w-100 fw-bold" onClick={handleAddPago}>Añadir</button></div>
                                    </div>
                                )}
                                <button className={`btn w-100 fw-bold py-3 mt-2 ${saldoPendiente.isZero() ? 'btn-success' : 'btn-secondary'}`}
                                    onClick={handleFinalizarCompra} disabled={saldoPendiente.greaterThan(0) || isProcessing}>
                                    {isProcessing ? '...' : (vueltoTotalFinal.greaterThan(0) ? `Finalizar (Vuelto: ${formatCurrency(vueltoTotalFinal)})` : 'CONFIRMAR PEDIDO')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- MODAL DE REGISTRO (Bootstrap Classico) --- */}
            {showRegisterModal && (
                <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.6)'}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">Registrar Nuevo Cliente</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowRegisterModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">RUT (Automático)</label>
                                    <input type="text" className="form-control bg-light" value={rutCliente} disabled />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Nombre Completo *</label>
                                    <input type="text" className="form-control" value={nuevoCliente.nombre} onChange={e => setNuevoCliente({...nuevoCliente, nombre: e.target.value})} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Correo Electrónico</label>
                                    <input type="email" className="form-control" value={nuevoCliente.correo} onChange={e => setNuevoCliente({...nuevoCliente, correo: e.target.value})} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Teléfono</label>
                                    <input type="text" className="form-control" value={nuevoCliente.telefono} onChange={e => setNuevoCliente({...nuevoCliente, telefono: e.target.value})} />
                                </div>
                                <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="checkEmpresa" 
                                        checked={nuevoCliente.es_empresa} 
                                        onChange={e => setNuevoCliente({...nuevoCliente, es_empresa: e.target.checked})} />
                                    <label className="form-check-label" htmlFor="checkEmpresa">¿Es Empresa?</label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowRegisterModal(false)}>Cancelar</button>
                                <button type="button" className="btn btn-primary" onClick={registrarClienteDesdeModal}>Registrar Cliente</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// CAMBIO 2: Exportar con el nuevo nombre
export default PedidoLanding;