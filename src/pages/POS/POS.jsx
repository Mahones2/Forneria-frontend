import { useEffect, useState, useMemo, useCallback } from "react";
import client from "../../api/client"; 
import './pos.css'; 
import { Decimal } from "decimal.js"; 
import ClientCreationModal from './ClientCreationModal';
import Swal from 'sweetalert2'

// Constantes
const METODOS_PAGO = [
    { code: 'EFE', label: 'Efectivo' },
    { code: 'DEB', label: 'Débito' },
    { code: 'CRE', label: 'Crédito' },
    { code: 'TRA', label: 'Transferencia' }
];

const formatCurrency = (value) => {
    const numericValue = value instanceof Decimal ? value.round().toNumber() : new Decimal(value || 0).round().toNumber();
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
    // --- Estado para información nutricional ---
    const [nutricional, setNutricional] = useState(null);
    const [showNutricionalModal, setShowNutricionalModal] = useState(false);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);

    // --- Estado de la Venta actual ---
    const [cart, setCart] = useState([]); 
    
    // ESTADOS DE GESTIÓN DE CLIENTE (Nuevos)
    const [rutCliente, setRutCliente] = useState(""); 
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null); 
    const [isSearchingClient, setIsSearchingClient] = useState(false);
    const [clienteError, setClienteError] = useState(null); 
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- Estado de Pagos Múltiples ---
    const [pagosRealizados, setPagosRealizados] = useState([]); 
    const [montoPagoActual, setMontoPagoActual] = useState(""); 
    const [metodoPagoActual, setMetodoPagoActual] = useState("EFE"); 

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
            const productosRes = await client.get("/pos/api/productos/", config);
            const productosConNumeros = productosRes.data.map(p => ({
                ...p,
                precio_venta: new Decimal(p.precio_venta || 0),
                stock_fisico: parseInt(p.stock_fisico || 0, 10),
            }));
            setProductos(productosConNumeros);

            const categoriasRes = await client.get("/pos/api/categorias/", config);
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

    // --- Lógica de Búsqueda de Cliente (Nueva) ---
    const handleSearchClient = useCallback(async (rut) => {
        if (!rut || rut.trim() === "") {
            setClienteSeleccionado(null);
            setClienteError(null);
            return;
        }

        const token = authToken || localStorage.getItem("access");
        if (!token) return;

        setIsSearchingClient(true);
        setClienteError(null);
        setClienteSeleccionado(null); // Limpiar cliente anterior

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            // Usamos GET /pos/api/clientes/{rut}/
            const res = await client.get(`/pos/api/clientes/${rut}/`, config);
            
            setClienteSeleccionado(res.data);
            setRutCliente(res.data.rut); // Asegurar el formato correcto
            
        } catch (err) {
            if (err.response && err.response.status === 404) {
                setClienteError(`Cliente con RUT ${rut} no encontrado.`);
            } else {
                console.error("Error buscando cliente:", err);
                setClienteError("Error al conectar con el servicio de clientes.");
            }
        } finally {
            setIsSearchingClient(false);
        }
    }, [authToken]);
    

    const handleOpenNutricional = async (productoId) => {
        const token = authToken || localStorage.getItem("access");
        if (!token) return;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Tu API devuelve una lista, así que tomamos el primer elemento
            const res = await client.get(`/pos/api/nutricional/?producto=${productoId}`, config);

            setNutricional(res.data.length > 0 ? res.data[0] : null);
            setProductoSeleccionado(productoId);
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



    // --- Lógica del Carrito ---
    const getProductStock = (id) => {
        const producto = productos.find(p => p.id === id);
        return producto ? producto.stock_fisico : 0;
    };

    const handleAddToCart = (producto) => {
        const stockActual = getProductStock(producto.id);
        if (stockActual <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin stock',
                footer: 'Intenta más tarde',
                timer: 2000,
                showConfirmButton: false
                })
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
        ).round();
    }, [cart]);

    const totalPagado = useMemo(() => {
        return pagosRealizados.reduce((acc, pago) => acc.plus(pago.monto), new Decimal(0)).round();
    }, [pagosRealizados]);

    const saldoPendiente = useMemo(() => {
        const pendiente = cartTotal.minus(totalPagado);
        return pendiente.isNegative() ? new Decimal(0) : pendiente;
    }, [cartTotal, totalPagado]);

    const vueltoCalculado = useMemo(() => {
        const montoActualDec = new Decimal(montoPagoActual || 0);
        if (metodoPagoActual !== 'EFE') return new Decimal(0); 
        
        const diff = montoActualDec.minus(saldoPendiente);
        return diff.isNegative() ? new Decimal(0) : diff.round();
    }, [montoPagoActual, saldoPendiente, metodoPagoActual]);

    const vueltoTotalFinal = useMemo(() => {
        return pagosRealizados.reduce((acc, pago) => {
            if (pago.metodo === 'EFE' && pago.monto_recibido.greaterThan(pago.monto)) {
                return acc.plus(pago.monto_recibido.minus(pago.monto));
            }
            return acc;
        }, new Decimal(0)).round();
    }, [pagosRealizados]);

    // ==========================================
    // FINALIZAR VENTA (MODIFICADO para usar cliente_id)
    // ==========================================
    async function handleFinalizarCompra() {
        if (cart.length === 0) return;

        if (saldoPendiente.greaterThan(0)) {
            Swal.fire({
                title: 'Pago pendiente',
                text: `Aún falta por pagar: ${formatCurrency(saldoPendiente)}. Por favor, añada un pago.`,
                icon: 'warning',
                confirmButtonText: 'Entendido',
                background: '#1e1e1e',
                color: '#fff',
                confirmButtonColor: '#f8c102',
                width: '360px'
                })

            return;
        }

        setIsProcessing(true);
        setError(null);
        
        const token = authToken || localStorage.getItem("access");
        
        // --- MODIFICACIÓN CLAVE: Enviar cliente_id en lugar de rut_cliente_ref ---
        const ventaData = {
            // Usa el ID del cliente seleccionado. Si es null, será Consumidor Final.
            cliente_id: clienteSeleccionado ? clienteSeleccionado.id : null, 
            canal: 'pos',
            
            // ITEMS
            items: cart.map(item => ({ 
                producto_id: item.id,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario.toString()
            })),
            
            // PAGOS
            pagos: pagosRealizados.map(p => ({
                metodo: p.metodo,
                monto: p.monto.toString(), 
                monto_recibido: p.monto_recibido.toString(), 
            })),
        };

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await client.post("/pos/api/ventas/", ventaData, config); 
            
            let msgExito = `¡Venta Registrada!\nTotal: ${formatCurrency(cartTotal)}`;
            if (vueltoTotalFinal.greaterThan(0)) {
                msgExito += `\n\nVuelto a entregar: ${formatCurrency(vueltoTotalFinal)}`;
            }
            Swal.fire({
                title: 'Éxito',
                text: msgExito,
                icon: 'success',
                confirmButtonText: 'OK',
                background: '#1e1e1e',
                color: '#fff',
                confirmButtonColor: '#4caf50',
                width: '360px'
                })

            
            // Resetear todos los estados, incluyendo cliente
            setCart([]); 
            setRutCliente("");
            setClienteSeleccionado(null); // Resetear cliente
            setClienteError(null); 
            setPagosRealizados([]); 
            setMontoPagoActual(""); 
            setMetodoPagoActual("EFE"); 
            
            await fetchData(); 

        } catch (err) {
            console.error("Error API:", err.response?.data);
            const errorData = err.response?.data || {};
            const errorMessage = errorData.error || JSON.stringify(errorData);
            setError(`Error al procesar: ${errorMessage}`);
        } finally {
            setIsProcessing(false);
        }
    }



    const handleCreateClient = async (clientData) => {
    // clientData debe tener al menos: {rut, nombre, email, telefono, direccion}
    const token = authToken || localStorage.getItem("access");
    if (!token) return;

    try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        // Endpoint de creación de clientes
        const res = await client.post("/pos/api/clientes/", clientData, config); 
        
        // Cliente creado exitosamente (res.data contiene el nuevo cliente)

        Swal.fire({
            title: 'Cliente creado',
            text: `Cliente ${res.data.nombre} fue creado y seleccionado.`,
            icon: 'succes',
            confirmButtonText: 'Entendido',
            background: '#1e1e1e',
            color: '#fff',
            confirmButtonColor: '#4caf50',
            width: '360px'
            })


        setClienteSeleccionado(res.data); // Automáticamente seleccionar al cliente recién creado
        setClienteError(null); // Limpiar error de búsqueda
        setRutCliente(res.data.rut); // Asegurar que el input de RUT refleje el nuevo cliente
        
        return true; // Éxito
        
    } catch (err) {
        console.error("Error al crear cliente:", err.response?.data);
        Swal.fire({
            title: 'Fallo al crear al cliente',
            text: `Error al crear cliente: ${JSON.stringify(err.response?.data)}`,
            icon: 'warning',
            confirmButtonText: 'Entendido',
            background: '#1e1e1e',
            color: '#fff',
            confirmButtonColor: '#f8c102',
            width: '360px'
            })

        return false; // Falla
    }
};
    
    // ==========================================
    // LÓGICA DE PAGOS (Se mantiene igual)
    // ==========================================
    const handleAddPago = () => {
        const montoActualDec = new Decimal(montoPagoActual || 0);

        if (montoActualDec.isZero() || saldoPendiente.isZero()) return;

        let montoAplicado;
        let montoRecibido;
        
        if (montoActualDec.greaterThan(saldoPendiente)) {
            montoAplicado = saldoPendiente;
        } else {
            montoAplicado = montoActualDec;
        }

        if (metodoPagoActual === 'EFE') {
            montoRecibido = montoActualDec;
            if (montoActualDec.lessThan(saldoPendiente)) {
                Swal.fire({
                    title: 'Saldo Pendiente',
                    text: `En efectivo, el monto entregado debe ser igual o superior al saldo pendiente. Faltan ${formatCurrency(saldoPendiente.minus(montoActualDec))}`,
                    icon: 'warning',
                    confirmButtonText: 'Entendido',
                    background: '#1e1e1e',
                    color: '#fff',
                    confirmButtonColor: '#f8c102',
                    width: '360px'
                    })

                return;
            }
        } else {
            montoRecibido = montoAplicado;
            if (montoActualDec.greaterThan(saldoPendiente)) {
                 Swal.fire({
                    title: 'Saldo Pendiente',
                    text: `Para pagos con ${metodoPagoActual}, ingrese sólo el monto pendiente de ${formatCurrency(saldoPendiente)}.`,
                    icon: 'warning',
                    confirmButtonText: 'Entendido',
                    background: '#1e1e1e',
                    color: '#fff',
                    confirmButtonColor: '#f8c102',
                    width: '360px'
                    })
                
                return;
            }
        }

        const nuevoPago = {
            metodo: metodoPagoActual,
            monto: montoAplicado.round(), 
            monto_recibido: montoRecibido.round(), 
        };

        setPagosRealizados(prev => [...prev, nuevoPago]);
        setMontoPagoActual("");
        
    };

    // ... (rest of filtering logic)
    const productosFiltrados = useMemo(() => {
        const buscarLower = buscar.toLowerCase(); 
        return productos.filter((prod) => {
            const coincide = prod.nombre.toLowerCase().includes(buscarLower) ||
                             (prod.codigo_barra || "").toLowerCase().includes(buscarLower);
            // Asegura que la comparación sea con números, ya que 'categoria' en prod es un número, y categoriaSeleccionada es un string.
            const coincideCat = categoriaSeleccionada === "" || prod.categoria === parseInt(categoriaSeleccionada, 10); 
            return coincide && coincideCat;
        });
    }, [productos, buscar, categoriaSeleccionada]);

    if (!authToken) {
        Swal.fire({
            title: 'Acceso denegado',
            text: 'Falta Token de Acceso.',
            icon: 'error',
            confirmButtonText: 'Entendido',
            background: '#1e1e1e',
            color: '#fff',
            confirmButtonColor: '#d33',
            width: '360px'
        });

        return null; // o return <></>
        }


    return (
        <div className="container-fluid bg-light ">
            <div className="row h-100 d-flex flex-nowrap">
                
                {/* --- COLUMNA IZQUIERDA: PRODUCTOS --- */}
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
                        {productosFiltrados.map((prod) => {

                            console.log("IMAGEN:", prod.imagen_referencial);

                            return (
                                <div key={prod.id} className="col-6 col-md-4 col-lg-3">

                                    <div 
                                        className={`card h-100 w-100 shadow-sm border-0 position-relative 
                                            ${prod.stock_fisico <= 0 ? 'opacity-50' : ''}`}
                                        style={{ transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = "scale(1.03)";
                                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "scale(1)";
                                            e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
                                        }}
                                    >

                                        {/* Imagen */}
                                        <div className="p-2 text-center">
                                            <img
                                                src={prod.imagen_referencial}
                                                alt={prod.nombre}
                                                className="img-fluid rounded"
                                                style={{ maxHeight: "100px", objectFit: "contain" }}
                                            />
                                        </div>

                                        <div className="card-body p-3">

                                            <div className="badge bg-secondary position-absolute top-0 end-0 m-2">
                                                {prod.stock_fisico} u.
                                            </div>

                                            <h6 className="card-title text-truncate fw-bold mb-1" title={prod.nombre}>
                                                {prod.nombre}
                                            </h6>

                                            <p className="small text-muted mb-1 text-truncate">
                                                {prod.descripcion || "Sin descripción"}
                                            </p>

                                            <p className="small text-muted mb-1 text-truncate">
                                                Marca: {prod.marca || "S/M"}
                                            </p>

                                            <p className="small text-muted mb-2">
                                                SKU: {prod.codigo_barra}
                                            </p>

                                            <h5 className="text-primary fw-bold mb-3">
                                                {formatCurrency(prod.precio_venta)}
                                            </h5>

                                            <button
                                                className="btn btn-primary w-100 mb-2"
                                                onClick={() => handleAddToCart(prod)}
                                                disabled={prod.stock_fisico <= 0 || isProcessing}
                                            >
                                                Agregar
                                            </button>

                                            <button
                                                className="btn btn-outline-secondary w-100"
                                                onClick={() => handleOpenNutricional(prod.id)}
                                            >
                                                Información nutricional
                                            </button>

                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>



                </div>

                {/* --- COLUMNA DERECHA: CAJA / PAGO (MODIFICADO) --- */}
                <div className="col-md-4 col-lg-3 bg-white border-start shadow d-flex flex-column pt-3">
                    
                    {/* 1. Header Carrito (MODIFICADO con Búsqueda de Cliente) */}
                    <div className="px-3 pb-2 border-bottom">
                        <h4 className="fw-bold"><i className="bi bi-cart4"></i> Resumen Venta</h4>
                        
                        {/* Bloque de Búsqueda de Cliente */}
                        <div className="mt-2 mb-2">
                            <label className="form-label small fw-bold text-muted mb-1">Buscar Cliente por RUT</label>
                            <div className="input-group input-group-sm">
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="RUT (ej: 12345678-K)"
                                    value={rutCliente}
                                    onChange={(e) => setRutCliente(e.target.value)}
                                    onKeyDown={(e) => { 
                                        if (e.key === 'Enter') handleSearchClient(rutCliente);
                                    }}
                                    disabled={isSearchingClient || isProcessing}
                                />
                                <button 
                                    className="btn btn-primary" // Cambiado a primario para destacar
                                    type="button"
                                    onClick={() => handleSearchClient(rutCliente)}
                                    disabled={isSearchingClient || isProcessing || !rutCliente.trim()}
                                >
                                    {isSearchingClient ? <span className="spinner-border spinner-border-sm"></span> : 'Buscar'}
                                </button>
                                {clienteSeleccionado && (
                                    <button 
                                        className="btn btn-outline-danger" 
                                        type="button"
                                        onClick={() => { setClienteSeleccionado(null); setRutCliente(""); }}
                                    >
                                        X
                                    </button>
                                )}
                            </div>
                            
                            {/* Feedback de Búsqueda */}
                            {clienteSeleccionado && (
                                <div className="alert alert-success p-1 mt-2 mb-0 small">
                                    **Cliente:** {clienteSeleccionado.nombre} ({clienteSeleccionado.rut})
                                </div>
                            )}
                            {clienteError && (
                                <div className="alert alert-warning p-1 mt-2 mb-0 small d-flex justify-content-between align-items-center">
                                    <span>{clienteError}</span>
                                    <button 
                                        className="btn btn-sm btn-outline-secondary ms-2"
                                        // Aquí se abriría un modal de creación o un formulario en línea
                                        onClick={() => setIsModalOpen(true)}
                                    >
                                        Crear Cliente
                                    </button>
                                </div>
                            )}

                            {/* Aquí debes renderizar el modal */}
                            <ClientCreationModal 
                                isOpen={isModalOpen} 
                                onClose={() => setIsModalOpen(false)} 
                                initialRut={rutCliente}
                                onCreate={handleCreateClient}
                            />
                            
                        </div>
                    </div>

                    {/* 2. Lista de Items */}
                    <div className="flex-grow-1 overflow-auto px-3 py-2">
                        {cart.length === 0 ? (
                            <div className="text-center text-muted mt-5">
                                <p>Carrito Vacío</p>
                            </div>
                        ) : (
                           <ul className="list-group list-group-flush">
                               {cart.map((item) => (
                                    <li key={item.id} className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                                        <div style={{width: '45%'}}>
                                            <div className="fw-bold text-truncate">{item.nombre}</div>
                                            <div className="small text-muted">{formatCurrency(item.precio_unitario)} c/u</div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => handleUpdateQuantity(item.id, -1)}>-</button>
                                            <span className="fw-bold">{item.cantidad}</span>
                                            <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => handleUpdateQuantity(item.id, 1)} disabled={item.cantidad >= getProductStock(item.id)}>+</button>
                                        </div>
                                        <div className="fw-bold text-end" style={{minWidth: '70px'}}>
                                            {formatCurrency(item.precio_unitario.times(item.cantidad))}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* 3. Área de Pago */}
                    <div className="bg-light p-3 border-top">
                        
                        {/* Totales y Saldo Pendiente */}
                        <div className="d-flex justify-content-between align-items-center border-bottom border-secondary pt-2 mb-2">
                            <span className="fs-5 fw-bold text-dark">TOTAL A PAGAR</span>
                            <span className="fs-4 fw-bolder text-primary">
                                {formatCurrency(cartTotal)}
                            </span>
                        </div>

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
                                        <span className="text-muted">{METODOS_PAGO.find(m => m.code === p.metodo)?.label || p.metodo}</span>
                                        <span className="fw-bold">{formatCurrency(p.monto)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* FORMULARIO PARA AÑADIR PAGO (Solo si hay saldo pendiente) */}
                        {!saldoPendiente.isZero() && (
                            <>
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

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-primary mb-1">
                                        Monto a Entregar (Pendiente: {formatCurrency(saldoPendiente)})
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
                                
                                {metodoPagoActual === 'EFE' && vueltoCalculado.greaterThan(0) && (
                                    <div className="alert alert-info py-1 mb-2 text-center small">
                                        Vuelto a dar en este pago: **{formatCurrency(vueltoCalculado)}**
                                    </div>
                                )}

                                <button
                                    className="btn btn-warning w-100 mb-3"
                                    onClick={handleAddPago}
                                    disabled={new Decimal(montoPagoActual || 0).isZero() || isProcessing}
                                >
                                    AÑADIR PAGO: {formatCurrency(new Decimal(montoPagoActual || 0))}
                                </button>
                            </>
                        )}

                        {/* Botón Finalizar */}
                        <button 
                            className="btn btn-success w-100 py-2 fw-bold shadow-sm"
                            disabled={saldoPendiente.greaterThan(0) || isProcessing || cart.length === 0}
                            onClick={handleFinalizarCompra}
                        >
                            {isProcessing ? 'Procesando...' : (
                                vueltoTotalFinal.greaterThan(0) ? `FINALIZAR (Vuelto: ${formatCurrency(vueltoTotalFinal)})` : 'FINALIZAR Y REGISTRAR VENTA'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {showNutricionalModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">

                            <div className="modal-header">
                                <h5 className="modal-title">Información Nutricional</h5>
                                <button
                                    className="btn-close"
                                    onClick={() => setShowNutricionalModal(false)}
                                ></button>
                            </div>

                            <div className="modal-body">

                                {/* Sellos chilenos */}
                                {nutricional && (
                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                        {getSellosNutricionales(nutricional).map((sello, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    width: "90px",
                                                    height: "90px",
                                                    borderRadius: "50%",
                                                    background: "black",
                                                    color: "white",
                                                    display: "flex",
                                                    justifyContent: "center",
                                                    alignItems: "center",
                                                    textAlign: "center",
                                                    fontSize: "12px",
                                                    fontWeight: "bold",
                                                    padding: "10px"
                                                }}
                                            >
                                                {sello}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Tabla nutricional */}
                                {nutricional ? (
                                    <table className="table table-bordered">
                                        <tbody>
                                            <tr><th>Calorías</th><td>{nutricional.calorias}</td></tr>
                                            <tr><th>Proteínas</th><td>{nutricional.proteinas}</td></tr>
                                            <tr><th>Grasas</th><td>{nutricional.grasas}</td></tr>
                                            <tr><th>Hidratos de Carbono</th><td>{nutricional.carbohidratos}</td></tr>
                                            <tr><th>Azúcares</th><td>{nutricional.azucares}</td></tr>
                                            <tr><th>Sodio</th><td>{nutricional.sodio} mg</td></tr>
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-muted">No hay información nutricional disponible.</p>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowNutricionalModal(false)}
                                >
                                    Cerrar
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}



        </div>

        
    );
}

export default POS;