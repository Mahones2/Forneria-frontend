import { useEffect, useState, useMemo, useCallback } from "react";
import client from "../../api/publicClient"; 
import Swal from 'sweetalert2';
import { Decimal } from "decimal.js";
import { Link } from "react-router-dom";

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

function PedidoLanding() {
    // --- ESTADOS DE DATOS ---
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [etiquetasDisponibles, setEtiquetasDisponibles] = useState([]);

    // --- ESTADOS FILTROS ---
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [etiquetaSeleccionada, setEtiquetaSeleccionada] = useState("");
    
    // --- ESTADO CARRITO ---
    const [cart, setCart] = useState([]); 
    const [showMobileCart, setShowMobileCart] = useState(false); 

    // --- ESTADO CLIENTE ---
    const [rutCliente, setRutCliente] = useState(""); 
    const [clienteData, setClienteData] = useState(null); 
    const [isSearchingClient, setIsSearchingClient] = useState(false);

    // --- ESTADO MODAL REGISTRO ---
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [nuevoCliente, setNuevoCliente] = useState({ 
        nombre: "", correo: "", telefono: "", es_empresa: false
    });

    // --- ESTADO NUTRICIONAL (COPIADO DEL POS) ---
    const [nutricional, setNutricional] = useState(null); // Renombrado para coincidir con POS
    const [showNutricionalModal, setShowNutricionalModal] = useState(false); // Renombrado

    // --- ESTADO PAGOS ---
    const [pagosRealizados, setPagosRealizados] = useState([]); 
    const [montoPagoActual, setMontoPagoActual] = useState(""); 
    const [metodoPagoActual, setMetodoPagoActual] = useState("DEB"); 
    const [fechaEntrega, setFechaEntrega] = useState(""); 

    const [isProcessing, setIsProcessing] = useState(false);

    // --- PAGINACIÓN ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12);

    // --- 1. CARGA DE CATÁLOGO ---
    useEffect(() => {
        const fetchCatalogo = async () => {
            try {
                const { data } = await client.get('/pos/api/kiosco/catalogo/'); 
                
                const prodsFormatted = data.productos.map(p => ({
                    ...p,
                    precio_venta: new Decimal(p.precio_venta),
                    stock_fisico: parseInt(p.stock_fisico || 0),
                    etiquetas_detalle: p.etiquetas_detalle || [] 
                }));
                
                setProductos(prodsFormatted);
                setCategorias(data.categorias);

                const todasEtiquetas = new Set();
                prodsFormatted.forEach(p => {
                    p.etiquetas_detalle.forEach(tag => todasEtiquetas.add(tag.nombre));
                });
                setEtiquetasDisponibles(Array.from(todasEtiquetas).sort());

            } catch (err) {
                console.error(err);
                Swal.fire({icon: "error", title: "Error", text: "No se pudo cargar el menú."});
            }
        };
        fetchCatalogo();
    }, []);

    // --- 2. LÓGICA NUTRICIONAL (EXACTA DEL POS) ---
    const handleOpenNutricional = async (productoId) => {
        try {
            // Nota: Aquí usamos publicClient porque estamos en el Landing, pero la URL es la misma
            const res = await client.get(`/pos/api/nutricional/?producto=${productoId}`);
            
            // Lógica exacta del POS: toma el primer elemento del array
            setNutricional(res.data.length > 0 ? res.data[0] : null);
            setShowNutricionalModal(true);

        } catch (err) {
            console.error("Error cargando información nutricional:", err);
            setNutricional(null);
            setShowNutricionalModal(true);
        }
    };

    const getSellosNutricionales = (nut) => {
        if (!nut) return [];
        const sellos = [];
        const calorias = parseFloat(nut.calorias) || 0;
        const grasas = parseFloat(nut.grasas) || 0;
        const azucares = parseFloat(nut.azucares) || 0;
        const sodio = parseFloat(nut.sodio) || 0;

        if (calorias >= 275) sellos.push("ALTO EN CALORÍAS");
        if (grasas >= 3) sellos.push("ALTO EN GRASAS SATURADAS");
        if (azucares >= 10) sellos.push("ALTO EN AZÚCARES");
        if (sodio >= 400) sellos.push("ALTO EN SODIO");
        return sellos;
    };

    // --- 3. LÓGICA CARRITO ---
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
                imagen: producto.imagen_url 
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

    // --- 4. CÁLCULOS ---
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

    // --- 5. CLIENTE (INPUT CORREGIDO) ---
    const handleRutChange = (e) => {
        let valor = e.target.value;
        valor = valor.replace(/[^0-9kK-]/g, '');
        if (valor.length > 12) return;
        setRutCliente(valor.toUpperCase());
    };

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
        const clientePayload = {
            rut: rutCliente,
            nombre: nuevoCliente.nombre,
            correo: nuevoCliente.correo || "sin_correo@kiosco.cl", 
            telefono: nuevoCliente.telefono || "",
            es_empresa: nuevoCliente.es_empresa 
        };
        try {
            const res = await client.post('/pos/api/kiosco/registrar_cliente/', clientePayload);
            setClienteData(res.data);
            setShowRegisterModal(false); 
            Swal.fire("Registrado", "¡Cliente creado correctamente!", "success");
        } catch (err) { 
            console.error(err);
            Swal.fire('Error', 'No se pudo registrar. Verifica el RUT.', 'error'); 
        }
    };

    // --- 6. PAGOS ---
    const handleAddPago = () => {
        if (saldoPendiente.isZero()) return;

        // Si el input está vacío o es 0, asumimos que quiere pagar TODO el saldo pendiente
        let montoIngresado = new Decimal(montoPagoActual || 0);
        if (montoIngresado.leq(0)) {
            montoIngresado = saldoPendiente;
        }

        // Lógica para no pagar más de lo necesario (a menos que sea efectivo para vuelto)
        let montoAplicado = montoIngresado.greaterThan(saldoPendiente) ? saldoPendiente : montoIngresado;
        
        // Si es efectivo, guardamos lo que realmente entregó el cliente (para calcular vuelto)
        // Si es tarjeta, el monto recibido es igual al aplicado
        let montoRecibido = montoIngresado; 
        if (metodoPagoActual !== 'EFE') {
            montoRecibido = montoAplicado;
        }

        setPagosRealizados(prev => [...prev, {
            metodo: metodoPagoActual,
            monto: montoAplicado,       // Lo que se descuenta de la deuda
            monto_recibido: montoRecibido // Lo que entregó el cliente (billete)
        }]);
        
        setMontoPagoActual(""); // Limpiar input
    };

    // --- 7. FINALIZAR ---
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
        console.log('Enviando pedido:', ventaPayload);
        try {
            const response = await client.post('/pos/api/kiosco/crear_pedido/', ventaPayload);
            console.log('Pedido creado:', response.data);
            Swal.fire({
                title: '¡Pedido Enviado!', 
                text: 'Gracias por tu compra', 
                icon: 'success'
            }).then(() => {
                // Limpiar el estado en vez de recargar la página
                setCart([]);
                setPagosRealizados([]);
                setClienteData(null);
                setRutCliente("");
                setFechaEntrega("");
                setMontoPagoActual("");
            });
        } catch (err) {
            console.error('Error creando pedido:', err);
            console.error('Detalles:', err.response?.data);
            
            let errorMsg = 'Error procesando pedido';
            if (err.code === 'ECONNABORTED') {
                errorMsg = 'La petición tardó demasiado. Intenta nuevamente.';
            } else if (err.response?.data?.detail) {
                errorMsg = err.response.data.detail;
            } else if (err.response?.data) {
                errorMsg = JSON.stringify(err.response.data);
            } else if (err.message) {
                errorMsg = err.message;
            }
            
            Swal.fire('Error', errorMsg, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // --- FILTROS Y PAGINACIÓN ---
    const productosFiltrados = useMemo(() => {
        const buscarLower = busqueda.toLowerCase(); 
        return productos.filter(p => {
            const matchCategoria = categoriaSeleccionada === "" || p.categoria === categoriaSeleccionada;
            const matchBusqueda = p.nombre.toLowerCase().includes(buscarLower) || 
                                  (p.codigo_barra && p.codigo_barra.toLowerCase().includes(buscarLower));
            const matchEtiqueta = etiquetaSeleccionada === "" || 
                                  p.etiquetas_detalle.some(tag => tag.nombre === etiquetaSeleccionada);
            return matchCategoria && matchBusqueda && matchEtiqueta;
        });
    }, [productos, categoriaSeleccionada, busqueda, etiquetaSeleccionada]);

    useEffect(() => { setCurrentPage(1); }, [busqueda, categoriaSeleccionada, etiquetaSeleccionada]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = productosFiltrados.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(productosFiltrados.length / itemsPerPage);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // ==========================================
    // RENDER HELPER (CART SIDEBAR)
    // ==========================================
    const renderCartContent = () => (
        <div className="d-flex flex-column h-100">
            <div className="p-3 border-bottom bg-white d-flex justify-content-between align-items-center">
                <div>
                    <h5 className="fw-bold m-0" style={{color: 'var(--primary-color)'}}>Tu Pedido</h5>
                    {cart.length > 0 && <small className="text-muted">{cart.length} items</small>}
                </div>
                {cart.length > 0 && <button className="btn btn-sm btn-outline-danger" onClick={vaciarCarrito}>Vaciar</button>}
            </div>
            
            <div className="flex-grow-1 overflow-auto p-3" style={{minHeight: '200px'}}>
                {cart.length === 0 ? <p className="text-center text-muted mt-5">Carrito vacío</p> : 
                    cart.map((item, idx) => (
                        <div key={idx} className="card mb-2 border-0 shadow-sm bg-light">
                            <div className="card-body p-2 d-flex justify-content-between align-items-center">
                                <div style={{width:'40%'}}>
                                    <div className="fw-bold text-truncate small">{item.nombre}</div>
                                    <div className="small text-muted" style={{color: 'var(--primary-color)'}}>{formatCurrency(item.precio_unitario)}</div>
                                </div>
                                <div className="btn-group btn-group-sm bg-white rounded shadow-sm">
                                    <button className="btn btn-link text-danger text-decoration-none px-2" onClick={()=>handleUpdateQuantity(item.id, -1)}>-</button>
                                    <span className="btn btn-link text-dark text-decoration-none px-2 fw-bold disabled" style={{cursor: 'default'}}>{item.cantidad}</span>
                                    <button className="btn btn-link text-success text-decoration-none px-2" onClick={()=>handleUpdateQuantity(item.id, 1)}>+</button>
                                </div>
                            </div>
                        </div>
                ))}
            </div>

            <div className="bg-white p-3 border-top shadow-lg">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold text-dark">TOTAL</span>
                    <span className="fs-4 fw-bold" style={{color: 'var(--primary-color)'}}>{formatCurrency(cartTotal)}</span>
                </div>
                
                <div className="input-group mb-2">
                    <input className="form-control" placeholder="RUT (Ej: 11111111-1)" 
                        value={rutCliente} onChange={handleRutChange}
                        disabled={clienteData !== null}
                        onKeyDown={e => e.key === 'Enter' && handleSearchClient()}
                    />
                    {clienteData ? (
                        <button className="btn btn-danger" onClick={()=>{setClienteData(null); setRutCliente("");}}>X</button>
                    ) : (
                        <button className="btn text-white" style={{backgroundColor: 'var(--primary-color)'}} onClick={() => handleSearchClient()} disabled={!rutCliente}>OK</button>
                    )}
                </div>

                {clienteData && <div className="alert alert-success py-1 small text-center mb-2">Hola <b>{clienteData.nombre.split(' ')[0]}</b></div>}

                <div className="mb-2">
                    <label className="form-label fw-bold text-muted small text-uppercase mb-1">Retiro</label>
                    <input type="date" className="form-control form-control-sm" 
                            min={new Date().toISOString().split('T')[0]}
                            value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)}
                    />
                </div>

                {clienteData && cart.length > 0 && (
                    <div className="animate__animated animate__fadeInUp">
                        {!saldoPendiente.isZero() && (
                            <div className="input-group input-group-sm mb-2">
                                <select className="form-select" style={{maxWidth:'80px'}} value={metodoPagoActual} onChange={e => setMetodoPagoActual(e.target.value)}>
                                    {METODOS_PAGO.map(m => <option key={m.code} value={m.code}>{m.label}</option>)}
                                </select>
                                <button className="btn btn-warning w-100" onClick={handleAddPago}>Pagar Total</button>
                            </div>
                        )}
                        <button 
                            className={`btn w-100 fw-bold py-2 ${saldoPendiente.isZero() ? 'text-white' : 'btn-secondary'}`}
                            style={saldoPendiente.isZero() ? { backgroundColor: 'var(--success-color, #28a745)' } : {}}
                            onClick={handleFinalizarCompra} disabled={saldoPendiente.greaterThan(0) || isProcessing}>
                            {isProcessing ? '...' : (vueltoTotalFinal.greaterThan(0) ? `Finalizar (Vuelto: ${formatCurrency(vueltoTotalFinal)})` : 'CONFIRMAR')}
                        </button>
                    </div>
                )}
                
                <div className="text-center mt-2">
                    <Link to="/" className="text-decoration-none small" style={{color: 'var(--secondary-color)'}}>← Volver al inicio</Link>
                </div>
            </div>
        </div>
    );

    return (
        <div className="container-fluid vh-100 font-sans bg-light d-flex flex-column overflow-hidden">
            {/* NAVBAR MÓVIL */}
            <nav className="navbar navbar-light bg-white border-bottom shadow-sm px-3 py-2 d-md-none flex-shrink-0" style={{height: '60px'}}>
                <span className="navbar-brand fw-bold m-0" style={{color: 'var(--primary-color)'}}>Pedidos</span>
                <div className="d-flex align-items-center gap-2">
                    {clienteData && <span className="badge bg-light text-dark border">Hola, {clienteData.nombre.split(' ')[0]}</span>}
                </div>
            </nav>

            <div className="row g-0 flex-grow-1 overflow-hidden h-100">
                
                {/* COL 1: MENÚ + PRODUCTOS */}
                <div className="col-md-8 col-lg-9 h-100 d-flex flex-column">
                    {/* BARRA FILTROS */}
                    <div className="bg-white border-bottom p-3 d-flex flex-column flex-md-row gap-2 align-items-center shadow-sm z-1">
                        <div className="d-flex gap-2 w-100 overflow-auto pb-1" style={{scrollbarWidth: 'none'}}>
                            <button 
                                className={`btn rounded-pill px-3 fw-bold text-nowrap btn-sm ${categoriaSeleccionada===""?'text-white':'btn-outline-secondary border-0 bg-light text-dark'}`} 
                                style={categoriaSeleccionada==="" ? {backgroundColor: 'var(--primary-color)'} : {}}
                                onClick={() => setCategoriaSeleccionada("")}
                            >
                                Todo
                            </button>
                            {categorias.map(cat => (
                                <button key={cat.id} 
                                    className={`btn rounded-pill px-3 fw-bold text-nowrap btn-sm ${categoriaSeleccionada===cat.id?'text-white shadow':'btn-outline-secondary border-0 bg-light text-dark'}`}
                                    style={categoriaSeleccionada===cat.id ? {backgroundColor: 'var(--primary-color)'} : {}}
                                    onClick={() => setCategoriaSeleccionada(cat.id)}
                                >
                                    {cat.nombre}
                                </button>
                            ))}
                        </div>
                        <div className="d-flex gap-2 w-100 w-md-auto">
                            <input type="text" className="form-control form-control-sm rounded-pill" placeholder="🔍 Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                            <select className="form-select form-select-sm rounded-pill w-auto" value={etiquetaSeleccionada} onChange={e => setEtiquetaSeleccionada(e.target.value)}>
                                <option value="">Etiquetas</option>
                                {etiquetasDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* GRID PRODUCTOS (CARTA MODIFICADA) */}
                    <div className="flex-grow-1 overflow-auto p-3 pb-5" style={{backgroundColor: '#f8f9fa'}}>
                        <div className="row g-3">
                            {currentItems.map(prod => (
                                 <div key={prod.id} className="col-12 col-sm-6 col-md-4 col-xl-3">
                                    <div 
                                        className={`card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative ${prod.stock_fisico <= 0 ? 'opacity-75' : ''}`}
                                        style={{cursor: 'pointer', transition: 'transform 0.1s'}}
                                        onClick={() => handleAddToCart(prod)}
                                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'} 
                                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <div style={{height: '160px', overflow: 'hidden'}} className="bg-white d-flex align-items-center justify-content-center position-relative">
                                            {prod.stock_fisico <= 0 && (
                                                <div className="position-absolute w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center text-white fw-bold fs-4 z-2">
                                                    AGOTADO
                                                </div>
                                            )}
                                            <img 
                                                src={getImageUrl(prod.imagen_url)} 
                                                alt={prod.nombre} 
                                                className="w-100 h-100" 
                                                style={{objectFit: 'cover'}}
                                            />
                                        </div>
                                        
                                        <div className="card-body p-3 d-flex flex-column">
                                            {/* HEADER CARTA */}
                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                <h6 className="fw-bold m-0 text-truncate" style={{fontSize: '1rem', color: 'var(--primary-color)'}} title={prod.nombre}>{prod.nombre}</h6>
                                                <span className="badge bg-light text-dark border">{prod.stock_fisico} u.</span>
                                            </div>
                                            
                                            {/* SKU */}
                                            <small className="text-muted mb-2 d-block" style={{fontSize: '0.75rem'}}>SKU: {prod.codigo_barra || 'N/A'}</small>

                                            {/* DESCRIPCIÓN */}
                                            <p className="text-muted small mb-2 text-truncate" style={{fontSize: '0.85rem'}}>
                                                {prod.descripcion || "Sin descripción disponible."}
                                            </p>

                                            {/* ETIQUETAS */}
                                            <div className="d-flex flex-wrap gap-1 mb-2" style={{minHeight: '20px'}}>
                                                {prod.etiquetas_detalle && prod.etiquetas_detalle.slice(0, 3).map(tag => (
                                                    <span key={tag.id} className="badge fw-normal" style={{backgroundColor: 'var(--secondary-color)', color: 'var(--primary-color)', fontSize: '0.65rem'}}>
                                                        {tag.nombre}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* BOTÓN NUTRICIONAL EXPLICITO */}
                                            <button 
                                                className="btn btn-sm w-100 mb-3 bg-light text-muted border"
                                                style={{fontSize: '0.75rem'}}
                                                onClick={(e) => {
                                                    e.stopPropagation(); 
                                                    handleOpenNutricional(prod.id);
                                                }}
                                            >
                                                <i className="bi bi-info-circle me-1"></i> Ver info nutricional
                                            </button>

                                            {/* FOOTER CARTA */}
                                            <div className="mt-auto d-flex justify-content-between align-items-center border-top pt-2">
                                                <span className="fw-bold fs-5" style={{color: 'var(--primary-color)'}}>{formatCurrency(prod.precio_venta)}</span>
                                                <button 
                                                    className="btn btn-sm rounded-circle shadow-sm text-white d-flex align-items-center justify-content-center" 
                                                    style={{width:'32px', height:'32px', backgroundColor: 'var(--primary-color)'}} 
                                                    disabled={prod.stock_fisico<=0}
                                                >
                                                    <i className="bi bi-plus fs-5"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                 </div>
                            ))}
                        </div>

                        {/* PAGINACIÓN */}
                        {totalPages > 1 && (
                            <div className="d-flex justify-content-center align-items-center mt-4 gap-2 pb-5">
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}> Anterior </button>
                                <span className="small text-muted">Página {currentPage} de {totalPages}</span>
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}> Siguiente </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* COL 2: CHECKOUT (Desktop) */}
                <div className="d-none d-md-block col-md-4 col-lg-3 bg-white shadow-lg border-start z-3 h-100">
                    {renderCartContent()}
                </div>
            </div>

            {/* BOTÓN FLOTANTE MÓVIL */}
            <div className="d-md-none fixed-bottom p-3 z-3">
                <button className="btn w-100 py-3 rounded-pill shadow-lg d-flex justify-content-between px-4 align-items-center text-white" 
                        style={{backgroundColor: 'var(--primary-color)'}}
                        onClick={() => setShowMobileCart(true)}>
                    <span className="badge bg-white rounded-pill" style={{color: 'var(--primary-color)'}}>{cart.length}</span>
                    <span className="fw-bold">Ver Pedido</span>
                    <span className="fw-bold">{formatCurrency(cartTotal)}</span>
                </button>
            </div>

            {/* OFFCANVAS MÓVIL */}
            <div className={`offcanvas offcanvas-end ${showMobileCart ? 'show' : ''}`} tabIndex="-1" style={{visibility: showMobileCart ? 'visible' : 'hidden'}}>
                <div className="offcanvas-header border-bottom">
                    <h5 className="offcanvas-title fw-bold" style={{color: 'var(--primary-color)'}}>Tu Pedido</h5>
                    <button type="button" className="btn-close" onClick={() => setShowMobileCart(false)}></button>
                </div>
                <div className="offcanvas-body p-0">
                    {renderCartContent()}
                </div>
            </div>
            {showMobileCart && <div className="offcanvas-backdrop fade show" onClick={() => setShowMobileCart(false)}></div>}

            {/* MODALES */}
            {showRegisterModal && (
                <div className="modal show d-block fade" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content rounded-4 border-0 shadow-lg">
                            <div className="modal-header border-0 pb-0"><h5 className="modal-title fw-bold" style={{color: 'var(--primary-color)'}}>Registro Rápido</h5><button className="btn-close" onClick={() => setShowRegisterModal(false)}></button></div>
                            <div className="modal-body p-4">
                                <p className="small text-muted mb-3">RUT <b>{rutCliente}</b> no existe.</p>
                                <input className="form-control mb-2" placeholder="Nombre" value={nuevoCliente.nombre} onChange={e => setNuevoCliente({...nuevoCliente, nombre: e.target.value})} />
                                <input className="form-control mb-2" placeholder="Correo" value={nuevoCliente.correo} onChange={e => setNuevoCliente({...nuevoCliente, correo: e.target.value})} />
                                <input className="form-control mb-2" placeholder="Teléfono" value={nuevoCliente.telefono} onChange={e => setNuevoCliente({...nuevoCliente, telefono: e.target.value})} />
                                <div className="form-check"><input className="form-check-input" type="checkbox" checked={nuevoCliente.es_empresa} onChange={e => setNuevoCliente({...nuevoCliente, es_empresa: e.target.checked})} /><label className="form-check-label small">Empresa</label></div>
                            </div>
                            <div className="modal-footer border-0 px-4 pb-4"><button className="btn btn-light" onClick={() => setShowRegisterModal(false)}>Cancelar</button><button className="btn px-4 rounded-pill text-white" style={{backgroundColor: 'var(--primary-color)'}} onClick={registrarClienteDesdeModal}>Guardar</button></div>
                        </div>
                    </div>
                </div>
            )}

            {showNutricionalModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)", zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Información Nutricional</h5>
                                <button className="btn-close" onClick={() => setShowNutricionalModal(false)}></button>
                            </div>
                            <div className="modal-body text-center">
                                {/* SELLOS (Círculos Negros) */}
                                {nutricional && (
                                    <div className="d-flex flex-wrap justify-content-center gap-2 mb-3">
                                        {getSellosNutricionales(nutricional).map((sello, i) => (
                                            <div key={i} style={{width:"90px",height:"90px",borderRadius:"50%",background:"black",color:"white",display:"flex",justifyContent:"center",alignItems:"center",textAlign:"center",fontSize:"12px",fontWeight:"bold",padding:"10px"}}>
                                                {sello}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* TABLA DATOS */}
                                {nutricional ? (
                                    <table className="table table-bordered table-sm text-start">
                                        <tbody>
                                            <tr><th>Calorías</th><td>{nutricional.calorias} kcal</td></tr>
                                            <tr><th>Proteínas</th><td>{nutricional.proteinas} g</td></tr>
                                            <tr><th>Grasas</th><td>{nutricional.grasas} g</td></tr>
                                            <tr><th>Carbos</th><td>{nutricional.carbohidratos} g</td></tr>
                                            <tr><th>Azúcares</th><td>{nutricional.azucares} g</td></tr>
                                            <tr><th>Sodio</th><td>{nutricional.sodio} mg</td></tr>
                                        </tbody>
                                    </table>
                                ) : <p className="text-muted">No hay información nutricional disponible.</p>}
                            </div>
                            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowNutricionalModal(false)}>Cerrar</button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PedidoLanding;