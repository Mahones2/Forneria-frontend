import { useEffect, useState, useMemo, useCallback } from "react";
import client from "../../api/client"; 
import './pos.css'; 
import { Decimal } from "decimal.js"; 

// Constantes
const IVA_RATE = new Decimal('0.19'); 
const METODOS_PAGO = [
    { code: 'EFE', label: 'Efectivo' },
    { code: 'DEB', label: 'Débito' },
    { code: 'CRE', label: 'Crédito' },
    { code: 'TRA', label: 'Transferencia' }
];

const formatCurrency = (value) => {
    const numericValue = parseFloat(value instanceof Decimal ? value.toFixed(0) : value);
    if (isNaN(numericValue)) return "Error";
    return numericValue.toLocaleString('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0, 
    });
};

function POS() {
    // --- Estado de datos ---
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    
    // --- Estado de la Venta actual ---
    const [cart, setCart] = useState([]); 
    const [rutCliente, setRutCliente] = useState(""); 
    const [metodoPago, setMetodoPago] = useState("EFE");
    const [montoPagaCliente, setMontoPagaCliente] = useState(""); // Nuevo: Cuanto dinero entrega el cliente
    const [pagosRealizados, setPagosRealizados] = useState([]); // Array de pagos registrados
    const [montoPagoActual, setMontoPagoActual] = useState(""); // Monto que se está intentando pagar ahora
    const [metodoPagoActual, setMetodoPagoActual] = useState("EFE"); // Método seleccionado para el pago actual

    // --- Estado de UI/Control ---
    const [buscar, setBuscar] = useState("");
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
    const [isLoading, setIsLoading] = useState(true); 
    const [isProcessing, setIsProcessing] = useState(false); 
    const [error, setError] = useState(null);
    const [authToken] = useState(() => localStorage.getItem("access") || null);
    
    // Recarga de datos inicial
    const fetchData = useCallback(async () => {
        const token = authToken || localStorage.getItem("access");
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // Cargar Productos
            const productosRes = await client.get("/pos/productos/", config);
            const productosConNumeros = productosRes.data.map(p => ({
                ...p,
                precio_venta: new Decimal(p.precio_venta || 0),
                stock_fisico: parseInt(p.stock_fisico || 0, 10),
            }));
            setProductos(productosConNumeros);

            // Cargar Categorías
            const categoriasRes = await client.get("/pos/categorias/", config);
            setCategorias(categoriasRes.data);
            
        } catch (err) {
            console.error("Error cargando datos:", err);
            setError("Error de conexión al cargar productos.");
        } finally {
            setIsLoading(false);
        }
    }, [authToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]); 

    // --- Lógica del Carrito ---
    const getProductStock = (id) => {
        const producto = productos.find(p => p.id === id);
        return producto ? producto.stock_fisico : 0;
    };

    const handleAddToCart = (producto) => {
        const stockActual = getProductStock(producto.id);
        if (stockActual <= 0) {
            alert("Sin stock");
            return;
        }

        setCart((prevCart) => {
            const itemExistente = prevCart.find(item => item.id === producto.id);
            if (itemExistente) {
                if (itemExistente.cantidad + 1 > stockActual) return prevCart;
                return prevCart.map(item =>
                    item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
                );
            } else {
                return [...prevCart, {
                    id: producto.id,
                    nombre: producto.nombre,
                    precio_unitario: producto.precio_venta, 
                    cantidad: 1,
                }];
            }
        });
    };
    
    const handleUpdateQuantity = (id, delta) => {
        setCart(prevCart => {
            const item = prevCart.find(i => i.id === id);
            if (!item) return prevCart;
            const nuevaCantidad = item.cantidad + delta;
            
            if (nuevaCantidad <= 0) return prevCart.filter(i => i.id !== id);
            if (nuevaCantidad > getProductStock(id)) return prevCart;
            
            return prevCart.map(i => i.id === id ? { ...i, cantidad: nuevaCantidad } : i);
        });
    };
    
    // --- Cálculos de Totales y Vuelto ---
    const cartTotal = useMemo(() => {
        return cart.reduce((acc, item) => 
            acc.plus(item.precio_unitario.times(item.cantidad)), new Decimal(0)
        );
    }, [cart]);

    const totalPagado = useMemo(() => {
        // Suma el monto aplicado de todos los pagos ya registrados
        return pagosRealizados.reduce((acc, pago) => acc.plus(pago.monto), new Decimal(0));
    }, [pagosRealizados]);

    const saldoPendiente = useMemo(() => {
        // Cuánto falta por pagar para llegar al total
        const pendiente = cartTotal.minus(totalPagado);
        return pendiente.isNegative() ? new Decimal(0) : pendiente;
    }, [cartTotal, totalPagado]);

    const vueltoCalculado = useMemo(() => {
        // El vuelto se calcula solo en Efectivo y se basa en el SALDO PENDIENTE
        if (metodoPagoActual !== 'EFE') return new Decimal(0); 

        const montoActualDec = new Decimal(montoPagoActual || 0);
        const diff = montoActualDec.minus(saldoPendiente);
        return diff.isNegative() ? new Decimal(0) : diff;
    }, [montoPagoActual, saldoPendiente, metodoPagoActual]);



    // ==========================================
    // FINALIZAR VENTA (CORREGIDO)
    // ==========================================
    async function handleFinalizarCompra() {
    if (cart.length === 0) return;

    // 1. Validación de Saldo Pendiente (Esta es la única validación de pago necesaria ahora)
    if (saldoPendiente.greaterThan(0)) {
        alert(`Aún falta por pagar: ${formatCurrency(saldoPendiente)}. Por favor, añada un pago.`);
        return;
    }
    // NOTA: Eliminar la validación antigua: if (metodoPago === 'EFE') { ... }

    setIsProcessing(true);
    setError(null);
    
    const token = authToken || localStorage.getItem("access");
    
    // 2. Determinar el vuelto total para el mensaje de éxito (Buscando en el array de pagos)
    let vueltoTotal = new Decimal(0);
    
    // Encuentra el último pago registrado para revisar el vuelto
    const ultimoPago = pagosRealizados[pagosRealizados.length - 1];

    if (ultimoPago && ultimoPago.metodo === 'EFE' && ultimoPago.monto_recibido.greaterThan(ultimoPago.monto)) {
        // Calcula el vuelto total si el último pago fue efectivo y cubrió el saldo
        vueltoTotal = ultimoPago.monto_recibido.minus(ultimoPago.monto);
    }
    
    // 3. Construir el Payload (Usando la lista de pagos)
    const ventaData = {
        rut_cliente_ref: rutCliente, 
        canal_venta: 'pos',
        
        // ITEMS
        items: cart.map(item => ({ 
            producto_id: item.id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario.toString()
        })),
        
        // PAGOS (Ahora enviamos el ARRAY de pagos)
        pagos: pagosRealizados.map(p => ({
            metodo: p.metodo,
            monto: p.monto.toString(), // Monto aplicado (ej: 8000)
            monto_recibido: p.monto_recibido.toString(), // Monto físico/electrónico (ej: 10000)
        })),
    };

    try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        await client.post("/pos/ventas/", ventaData, config);
        
        // Éxito
        let msgExito = `¡Venta Registrada!\nTotal: ${formatCurrency(cartTotal)}`;
        // Usar el vuelto calculado del array de pagos, no la variable obsoleta 'vuelto'
        if (vueltoTotal.greaterThan(0)) {
            msgExito += `\n\nVuelto a entregar: ${formatCurrency(vueltoTotal)}`;
        }
        alert(msgExito);
        
        // 4. Resetear todos los estados del nuevo sistema de pago
        setCart([]); 
        setRutCliente("");
        setPagosRealizados([]); // Importante: Resetear el array
        setMontoPagoActual(""); // Importante: Resetear el input
        setMetodoPagoActual("EFE"); // Resetear el método
        
        // Actualizar Stock visualmente
        await fetchData(); 

    } catch (err) {
        console.error("Error API:", err.response?.data);
        const errorData = err.response?.data || {};
        setError(`Error al procesar: ${JSON.stringify(errorData)}`);
    } finally {
        setIsProcessing(false);
    }
    }

    const handleAddPago = () => {
        const montoActualDec = new Decimal(montoPagoActual || 0);

        if (montoActualDec.isZero() || saldoPendiente.isZero()) return;

        let montoAplicado;
        let montoRecibido;
        
        // 1. Calcular lo que se APLICA a la venta (máximo el saldo pendiente)
        if (montoActualDec.greaterThan(saldoPendiente)) {
            montoAplicado = saldoPendiente;
        } else {
            montoAplicado = montoActualDec;
        }

        // 2. Determinar lo RECIBIDO (solo en efectivo puede ser diferente)
        if (metodoPagoActual === 'EFE') {
            // En efectivo, lo recibido es el billete completo que entregó (ej. 10.000)
            montoRecibido = montoActualDec;
            
            // Validación: Si intenta pagar menos del saldo en efectivo, no permitir.
            if (montoActualDec.lessThan(saldoPendiente)) {
                alert(`El monto en efectivo es menor al saldo. Faltan ${formatCurrency(saldoPendiente.minus(montoActualDec))}`);
                return;
            }
        } else {
            // En tarjetas/transferencias, lo recibido es igual a lo aplicado
            montoRecibido = montoAplicado;
        }

        // 3. Crear Objeto Pago para el estado local
        const nuevoPago = {
            metodo: metodoPagoActual,
            monto: montoAplicado, // Monto aplicado al total
            monto_recibido: montoRecibido, // Monto físico/electrónico total recibido
        };

        setPagosRealizados(prev => [...prev, nuevoPago]);
        
        // 4. Limpiar input y establecer un nuevo pago por defecto si hay saldo
        setMontoPagoActual("");
    };







    // Filtrado visual
    const productosFiltrados = useMemo(() => {
        const buscarLower = buscar.toLowerCase(); 
        return productos.filter((prod) => {
            const coincide = prod.nombre.toLowerCase().includes(buscarLower) ||
                             (prod.codigo_barra || "").toLowerCase().includes(buscarLower);
            const coincideCat = categoriaSeleccionada === "" || prod.categoria === parseInt(categoriaSeleccionada, 10); 
            return coincide && coincideCat;
        });
    }, [productos, buscar, categoriaSeleccionada]);

    if (!authToken) return <div className="alert alert-danger mt-5">Falta Token de Acceso.</div>;

    return (
        <div className="container-fluid bg-light ">
            <div className="row h-100 d-flex flex-nowrap">
                
                {/* --- COLUMNA IZQUIERDA: PRODUCTOS (Se mantiene igual) --- */}
                <div className="col-md-8 col-lg-9 p-4 me-lg-3">
                    {/* ... (Contenido de búsqueda y listado de productos) ... */}
                        <div className="d-flex justify-content-left align-items-center mb-3">
                            <h2 className="text-primary fw-bold">Punto de Venta</h2>
                            <div className="d-flex gap-2 ms-5">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Buscar (Nombre/Código)"
                                    value={buscar}
                                    onChange={(e) => setBuscar(e.target.value)}
                                />
                                <select
                                    className="form-select w-auto"
                                    value={categoriaSeleccionada}
                                    onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                                >
                                    <option value="">Categorías</option>
                                    {categorias.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {error && <div className="alert alert-danger shadow-sm">{error}</div>}

                        <div className="row g-3">
                            {productosFiltrados.map((prod) => (
                                <div key={prod.id} className="col-6 col-md-4 col-lg-3">
                                    <button 
                                        className={`card h-100 w-100 text-start shadow-sm border-0 btn btn-light position-relative ${prod.stock_fisico <= 0 ? 'opacity-50' : ''}`}
                                        onClick={() => handleAddToCart(prod)}
                                        disabled={prod.stock_fisico <= 0 || isProcessing}
                                    >
                                        {prod.imagen_referencial ? (
                                            <img 
                                                src={prod.imagen_referencial} 
                                                className="card-img-top object-fit-cover" 
                                                alt={prod.nombre} 
                                                style={{ height: '100px', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div className="text-center p-3 text-muted" style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9ecef' }}>
                                                [Sin Imagen]
                                            </div>
                                        )}
                                        <div className="card-body p-3">
                                            <div className="badge bg-secondary mb-2 position-absolute top-0 end-0 m-2">
                                                {prod.stock_fisico} u.
                                            </div>
                                            <h6 className="card-title text-truncate fw-bold mb-1" title={prod.nombre}>
                                                {prod.nombre}
                                            </h6>
                                            <p className="small text-muted mb-1 text-truncate">
                                                {prod.descripcion || 'S/M'}
                                            </p>
                                            <p className="small text-muted mb-1 text-truncate">
                                                Marca: {prod.marca || 'S/M'}
                                            </p>
                                            <p className="small text-muted mb-2 text-truncate">
                                                Formato {prod.presentacion}
                                            </p>
                                            <p className="small text-muted mb-2">SKU: {prod.codigo_barra}</p>
                                            <h5 className="text-primary fw-bold mb-0">
                                                {formatCurrency(prod.precio_venta)}
                                            </h5>
                                        </div>
                                    </button>
                                </div>
                            ))}
                        </div>
                </div>

                {/* --- COLUMNA DERECHA: CAJA / PAGO (Modificado) --- */}
                <div className="col-md-4 col-lg-3 bg-white border-start shadow d-flex flex-column pt-3">
                    
                    {/* 1. Header Carrito (Se mantiene igual) */}
                    <div className="px-3 pb-2 border-bottom">
                        <h4 className="fw-bold"><i className="bi bi-cart4"></i> Resumen Venta</h4>
                        <input 
                            type="text" 
                            className="form-control form-control-sm mt-2" 
                            placeholder="RUT Cliente (Opcional)"
                            value={rutCliente}
                            onChange={(e) => setRutCliente(e.target.value)}
                        />
                    </div>

                    {/* 2. Lista de Items (Scrollable, se mantiene igual) */}
                    <div className="flex-grow-1 overflow-auto px-3 py-2">
                        {cart.length === 0 ? (
                            <div className="text-center text-muted mt-5">
                                <p>Carrito Vacío</p>
                            </div>
                        ) : (
                            <ul className="list-group list-group-flush">
                                {cart.map((item) => (
                                    <li key={item.id} className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                                        <div style={{width: '50%'}}>
                                            <div className="fw-bold text-truncate">{item.nombre}</div>
                                            <div className="small text-muted">{formatCurrency(item.precio_unitario)} c/u</div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => handleUpdateQuantity(item.id, -1)}>-</button>
                                            <span className="fw-bold">{item.cantidad}</span>
                                            <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => handleUpdateQuantity(item.id, 1)} disabled={item.cantidad >= getProductStock(item.id)}>+</button>
                                        </div>
                                        <div className="fw-bold text-end" style={{minWidth: '60px'}}>
                                            {formatCurrency(item.precio_unitario.times(item.cantidad))}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* 3. Área de Pago (MODIFICADO para Pagos Múltiples) */}
                    <div className="bg-light p-3 border-top">
                        
                        {/* Totales y Saldo Pendiente */}
                        <div className="d-flex justify-content-between align-items-center border-bottom border-secondary pt-2 mb-2">
                            <span className="fs-5 fw-bold text-dark">TOTAL A PAGAR</span>
                            <span className="fs-4 fw-bolder text-primary">
                                {formatCurrency(cartTotal)}
                            </span>
                        </div>

                        {/* RESUMEN PAGADO Y PENDIENTE */}
                        <div className="d-flex justify-content-between mb-1 text-muted small">
                            <span>Pagado</span>
                            <span className="fw-bold">{formatCurrency(totalPagado)}</span>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="fs-5 fw-bold text-danger">SALDO PENDIENTE</span>
                            <span className="fs-4 fw-bolder text-danger">
                                {formatCurrency(saldoPendiente)}
                            </span>
                        </div>

                        {/* LISTA DE PAGOS REGISTRADOS */}
                        {pagosRealizados.length > 0 && (
                            <div className="mb-3 border p-2 rounded bg-white">
                                <h6 className="small fw-bold border-bottom pb-1">Pagos Registrados:</h6>
                                {pagosRealizados.map((p, index) => (
                                    <div key={index} className="d-flex justify-content-between small">
                                        <span className="text-muted">{p.metodo}</span>
                                        <span className="fw-bold">{formatCurrency(p.monto)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* FORMULARIO PARA AÑADIR PAGO (Solo si hay saldo pendiente) */}
                        {!saldoPendiente.isZero() && (
                            <>
                                {/* Selector Método Pago ACTUAL */}
                                <div className="mb-2">
                                    <label className="form-label small fw-bold text-muted mb-1">Método de Pago Actual</label>
                                    <select 
                                        className="form-select form-select-sm"
                                        value={metodoPagoActual}
                                        onChange={(e) => setMetodoPagoActual(e.target.value)}
                                    >
                                        {METODOS_PAGO.map(m => <option key={m.code} value={m.code}>{m.label}</option>)}
                                    </select>
                                </div>

                                {/* Input Monto a Pagar */}
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-primary mb-1">
                                        Monto a Entregar (Máx: {formatCurrency(saldoPendiente)})
                                    </label>
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text">$</span>
                                        <input 
                                            type="number" 
                                            className="form-control fw-bold" 
                                            placeholder={saldoPendiente.toString()}
                                            value={montoPagoActual}
                                            onChange={(e) => setMontoPagoActual(e.target.value)}
                                        />
                                    </div>
                                </div>
                                
                                {/* Vuelto temporal para la transacción actual */}
                                {metodoPagoActual === 'EFE' && vueltoCalculado.greaterThan(0) && (
                                    <div className="alert alert-info py-1 mb-2 text-center small">
                                        Vuelto a dar: **{formatCurrency(vueltoCalculado)}**
                                    </div>
                                )}

                                {/* Botón Añadir Pago */}
                                <button
                                    className="btn btn-warning w-100 mb-3"
                                    onClick={handleAddPago}
                                    disabled={new Decimal(montoPagoActual || 0).isZero() || isProcessing}
                                >
                                    AÑADIR PAGO: {formatCurrency(new Decimal(montoPagoActual || 0))}
                                </button>
                            </>
                        )}

                        {/* Botón Finalizar (Solo si NO hay saldo pendiente) */}
                        <button 
                            className="btn btn-success w-100 py-2 fw-bold shadow-sm"
                            disabled={saldoPendiente.greaterThan(0) || isProcessing || cart.length === 0}
                            onClick={handleFinalizarCompra}
                        >
                            {isProcessing ? 'Procesando...' : 'FINALIZAR Y REGISTRAR VENTA'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default POS;