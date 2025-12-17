import { useEffect, useState, useMemo, useCallback } from "react";
import client from "../../api/client"; 
import './pos.css'; 
import { Decimal } from "decimal.js"; 
import ClientCreationModal from './ClientCreationModal';
import Swal from 'sweetalert2';

// Constantes
const METODOS_PAGO = [
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
    const [etiquetasDisponibles, setEtiquetasDisponibles] = useState([]);

    // --- Estado para información nutricional ---
    const [nutricional, setNutricional] = useState(null);
    const [showNutricionalModal, setShowNutricionalModal] = useState(false);
    
    // --- Estado de la Venta actual ---
    const [cart, setCart] = useState([]); 
    const [showMobileCart, setShowMobileCart] = useState(false);
    
    // --- ESTADOS DE PAGINACIÓN ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12); // Cantidad de productos por página

    // ESTADOS DE GESTIÓN DE CLIENTE 
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
    const [etiquetaSeleccionada, setEtiquetaSeleccionada] = useState(""); 
    const [isLoading, setIsLoading] = useState(true); 
    const [isProcessing, setIsProcessing] = useState(false); 
    const [error, setError] = useState(null);
    const [authToken] = useState(() => localStorage.getItem("access") || null);

    // --- ESTADOS PARA DESCUENTO ADMINISTRADOR ---
    const [isAdmin, setIsAdmin] = useState(false); 
    const [descuentoTipo, setDescuentoTipo] = useState('monto'); 
    const [descuentoValor, setDescuentoValor] = useState(0); 
    
    useEffect(() => {
        const empleadoData = localStorage.getItem("empleado");
        if (empleadoData) {
            try {
                const empleado = JSON.parse(empleadoData);
                if (empleado.cargo === "Administrador") {
                    setIsAdmin(true);
                }
            } catch (e) {
                console.error("Error al leer datos del empleado", e);
            }
        }
    }, []);
    
    const fetchData = useCallback(async () => {
        const token = authToken || localStorage.getItem("access");
        if (!token) return;
        setIsLoading(true);
        setError(null);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // 1. Productos
            const productosRes = await client.get("/pos/api/productos/", config);
            const productosConNumeros = productosRes.data.map(p => ({
                ...p,
                precio_venta: new Decimal(p.precio_venta || 0),
                stock_fisico: parseInt(p.stock_fisico || 0, 10),
                etiquetas_detalle: p.etiquetas_detalle || [] 
            }));
            setProductos(productosConNumeros);

            // 2. Extraer etiquetas únicas
            const todasEtiquetas = new Set();
            productosConNumeros.forEach(p => {
                p.etiquetas_detalle.forEach(tag => todasEtiquetas.add(tag.nombre));
            });
            setEtiquetasDisponibles(Array.from(todasEtiquetas).sort());

            // 3. Categorías
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

    // --- RESETEAR PÁGINA AL FILTRAR ---
    useEffect(() => {
        setCurrentPage(1);
    }, [buscar, categoriaSeleccionada, etiquetaSeleccionada]);

    // --- Lógica de Búsqueda de Cliente ---
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
        setClienteSeleccionado(null); 

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await client.get(`/pos/api/clientes/${rut}/`, config);
            setClienteSeleccionado(res.data);
            setRutCliente(res.data.rut); 
            
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
            const res = await client.get(`/pos/api/nutricional/?producto=${productoId}`, config);
            
            console.log("Respuesta Nutricional:", res.data); 

            let dataEncontrada = null;

            if (res.data.results && Array.isArray(res.data.results)) {
                dataEncontrada = res.data.results.length > 0 ? res.data.results[0] : null;
            } 
            else if (Array.isArray(res.data)) {
                dataEncontrada = res.data.length > 0 ? res.data[0] : null;
            }
            else if (res.data && typeof res.data === 'object') {
                dataEncontrada = res.data;
            }

            setNutricional(dataEncontrada);
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
    
    // --- Cálculos ---
    const cartSubtotal = useMemo(() => {
        return cart.reduce((acc, item) => 
            acc.plus(item.precio_unitario.times(item.cantidad)), new Decimal(0)
        ).round();
    }, [cart]);

    const descuentoAplicado = useMemo(() => {
        if (!descuentoValor || descuentoValor < 0) return new Decimal(0);

        if (descuentoTipo === 'porcentaje') {
            const porcentaje = Math.min(descuentoValor, 100);
            return cartSubtotal.times(porcentaje).dividedBy(100).round();
        } else {
            const monto = new Decimal(descuentoValor);
            return monto.greaterThan(cartSubtotal) ? cartSubtotal : monto;
        }
    }, [cartSubtotal, descuentoValor, descuentoTipo]);

    const cartTotal = useMemo(() => {
        return cartSubtotal.minus(descuentoAplicado);
    }, [cartSubtotal, descuentoAplicado]);


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

    // --- FINALIZAR ---
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
        
        let itemsProcesados = [];

        if (descuentoAplicado.greaterThan(0)) {
            const factor = new Decimal(1).minus(descuentoAplicado.dividedBy(cartSubtotal));
            itemsProcesados = cart.map(item => {
                const precioOriginal = item.precio_unitario; 
                const precioConDescuento = precioOriginal.times(factor); 
                const descuentoUnitario = precioOriginal.minus(precioConDescuento).round(); 
                const descuentoLineaTotal = descuentoUnitario.times(item.cantidad);

                return {
                    producto_id: item.id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario.toString(),
                    descuento: descuentoLineaTotal.toString() 
                };
            });
        } else {
            itemsProcesados = cart.map(item => ({ 
                producto_id: item.id,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario.toString(),
                descuento: "0"
            }));
        }

        const ventaData = {
            cliente_id: clienteSeleccionado ? clienteSeleccionado.id : null, 
            canal: 'pos',
            items: itemsProcesados,
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
            
            setCart([]); 
            setRutCliente("");
            setClienteSeleccionado(null); 
            setClienteError(null); 
            setPagosRealizados([]); 
            setMontoPagoActual(""); 
            setMetodoPagoActual("EFE"); 
            setDescuentoValor(0); 
            setShowMobileCart(false); 
            
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
         const token = authToken || localStorage.getItem("access");
        if (!token) return;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await client.post("/pos/api/clientes/", clientData, config); 
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
            setClienteSeleccionado(res.data); 
            setClienteError(null); 
            setRutCliente(res.data.rut); 
            return true; 
        } catch (err) {
            console.error("Error al crear cliente:", err.response?.data);
            Swal.fire({
                title: 'Fallo al crear',
                text: `Error: ${JSON.stringify(err.response?.data)}`,
                icon: 'warning',
                width: '360px'
                })
            return false;
        }
    };
    
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
                Swal.fire({ title: 'Monto insuficiente', icon: 'warning', width: '360px' })
                return;
            }
        } else {
            montoRecibido = montoAplicado;
            if (montoActualDec.greaterThan(saldoPendiente)) {
                 Swal.fire({ title: 'Monto excesivo', text: `Solo restan ${formatCurrency(saldoPendiente)}`, icon: 'warning', width: '360px' })
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

    // --- FILTRO COMBINADO Y PAGINADO ---
    const productosFiltrados = useMemo(() => {
        const buscarLower = buscar.toLowerCase(); 
        return productos.filter((prod) => {
            const coincideTexto = prod.nombre.toLowerCase().includes(buscarLower) ||
                                  (prod.codigo_barra || "").toLowerCase().includes(buscarLower);
            
            const coincideCat = categoriaSeleccionada === "" || prod.categoria === parseInt(categoriaSeleccionada, 10); 
            
            const coincideEtiqueta = etiquetaSeleccionada === "" || 
                                     prod.etiquetas_detalle.some(tag => tag.nombre === etiquetaSeleccionada);

            return coincideTexto && coincideCat && coincideEtiqueta;
        });
    }, [productos, buscar, categoriaSeleccionada, etiquetaSeleccionada]);

    // --- LÓGICA DE PAGINACIÓN ---
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = productosFiltrados.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(productosFiltrados.length / itemsPerPage);

    // Función para cambiar página
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (!authToken) return null; 

    // COMPONENTE RENDERIZADO COMO FUNCIÓN AUXILIAR
    // (Arregla el foco del input y se suavizaron los bordes)
    const renderCartContent = () => (
        <div className="d-flex flex-column h-100">
             {/* Se eliminó border-bottom duro, se usa border-light para suavizar */}
             <div className="px-3 pb-2 border-bottom pt-3">
                <h4 className="fw-bold"><i className="bi bi-cart4"></i> Venta</h4>
                
                <div className="mt-2 mb-2">
                     <label className="form-label small fw-bold text-muted mb-1">Buscar Cliente (RUT)</label>
                    <div className="input-group input-group-sm">
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Ej: 12345678-K"
                            value={rutCliente}
                            onChange={(e) => setRutCliente(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSearchClient(rutCliente); }}
                            disabled={isSearchingClient || isProcessing}
                        />
                        <button className="btn btn-primary" type="button" onClick={() => handleSearchClient(rutCliente)} disabled={isSearchingClient || isProcessing || !rutCliente.trim()}>Ok</button>
                        {clienteSeleccionado && (<button className="btn btn-outline-danger" type="button" onClick={() => { setClienteSeleccionado(null); setRutCliente(""); }}>X</button>)}
                    </div>
                    {clienteSeleccionado && (<div className="alert alert-success p-1 mt-2 mb-0 small">**Cliente:** {clienteSeleccionado.nombre}</div>)}
                    {clienteError && (
                        <div className="alert alert-warning p-1 mt-2 mb-0 small d-flex justify-content-between align-items-center">
                            <span>{clienteError}</span>
                            <button className="btn btn-sm btn-outline-secondary ms-2" onClick={() => setIsModalOpen(true)}>Crear</button>
                        </div>
                    )}
                    <ClientCreationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialRut={rutCliente} onCreate={handleCreateClient}/>
                </div>
            </div>

            <div className="flex-grow-1 overflow-auto px-3 py-2">
                {cart.length === 0 ? (
                    <div className="text-center text-muted mt-5"><p>Carrito Vacío</p></div>
                ) : (
                   <ul className="list-group list-group-flush">
                       {cart.map((item) => (
                            <li key={item.id} className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center border-bottom">
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

            <div className="bg-light p-3 border-top">
                {isAdmin && cart.length > 0 && (
                     <div className="mb-3 border-bottom pb-2">
                        <label className="form-label small fw-bold text-warning mb-1">
                            <i className="bi bi-shield-lock-fill me-1"></i>
                            Descuento (Admin)
                        </label>
                        <div className="input-group input-group-sm">
                            <select 
                                className="form-select" 
                                style={{maxWidth: '80px'}}
                                value={descuentoTipo}
                                onChange={(e) => setDescuentoTipo(e.target.value)}
                                disabled={pagosRealizados.length > 0} 
                            >
                                <option value="monto">$</option>
                                <option value="porcentaje">%</option>
                            </select>
                            <input 
                                type="number" 
                                className="form-control" 
                                placeholder="0"
                                value={descuentoValor}
                                onChange={(e) => setDescuentoValor(e.target.value)}
                                disabled={pagosRealizados.length > 0}
                            />
                        </div>
                        {descuentoAplicado.greaterThan(0) && (
                            <div className="text-end text-success small fw-bold mt-1">
                                - {formatCurrency(descuentoAplicado)}
                            </div>
                        )}
                     </div>
                )}

                {/* AQUÍ ESTABA EL PROBLEMA DE LA LÍNEA NEGRA: Se cambió border-secondary por border-bottom simple (gris claro) */}
                <div className="d-flex justify-content-between align-items-center border-bottom pt-2 mb-2">
                    <span className="fs-5 fw-bold text-dark">TOTAL</span>
                    <span className="fs-4 fw-bolder text-primary">
                        {formatCurrency(cartTotal)}
                    </span>
                </div>
                
                {descuentoAplicado.greaterThan(0) && (
                     <div className="d-flex justify-content-between mb-1 text-muted small">
                        <span>Subtotal original:</span>
                        <span>{formatCurrency(cartSubtotal)}</span>
                    </div>
                )}

                <div className="d-flex justify-content-between mb-1 text-muted small">
                    <span>Pagado</span>
                    <span className="fw-bold">{formatCurrency(totalPagado)}</span>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="fs-5 fw-bold text-danger">PENDIENTE</span>
                    <span className="fs-4 fw-bolder text-danger">
                        {formatCurrency(saldoPendiente)}
                    </span>
                </div>

                {pagosRealizados.length > 0 && (
                    <div className="mb-3 border p-2 rounded bg-white">
                        <h6 className="small fw-bold border-bottom pb-1">Pagos:</h6>
                        {pagosRealizados.map((p, index) => (
                            <div key={index} className="d-flex justify-content-between small">
                                <span className="text-muted">{METODOS_PAGO.find(m => m.code === p.metodo)?.label || p.metodo}</span>
                                <span className="fw-bold">{formatCurrency(p.monto)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {!saldoPendiente.isZero() && (
                    <>
                        <div className="mb-2">
                            <select 
                                className="form-select form-select-sm"
                                value={metodoPagoActual}
                                onChange={(e) => setMetodoPagoActual(e.target.value)}
                            >
                                {METODOS_PAGO.map(m => <option key={m.code} value={m.code}>{m.label}</option>)}
                            </select>
                        </div>

                        <div className="mb-3">
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
                                Vuelto: **{formatCurrency(vueltoCalculado)}**
                            </div>
                        )}

                        <button
                            className="btn btn-warning w-100 mb-3"
                            onClick={handleAddPago}
                            disabled={new Decimal(montoPagoActual || 0).isZero() || isProcessing}
                        >
                            PAGAR {formatCurrency(new Decimal(montoPagoActual || 0))}
                        </button>
                    </>
                )}

                <button 
                    className="btn btn-success w-100 py-2 fw-bold shadow-sm"
                    disabled={saldoPendiente.greaterThan(0) || isProcessing || cart.length === 0}
                    onClick={handleFinalizarCompra}
                >
                    {isProcessing ? '...' : (vueltoTotalFinal.greaterThan(0) ? `FINALIZAR (Vuelto: ${formatCurrency(vueltoTotalFinal)})` : 'FINALIZAR')}
                </button>
            </div>
        </div>
    );

    return (
        <div className="container-fluid bg-light h-100 overflow-hidden d-flex flex-column">
            <div className="row h-100 d-flex flex-nowrap">
                
                {/* --- COLUMNA IZQUIERDA: PRODUCTOS --- */}
                <div className="col-12 col-lg-9 p-3 h-100 overflow-hidden d-flex flex-column">
                    
                    {/* Header y Filtros */}
                    <div className="d-flex flex-column gap-2 mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <h2 className="text-primary fw-bold m-0">Punto de Venta</h2>
                        </div>

                        <div className="row g-2">
                            <div className="col-12 col-md-4">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="🔍 Buscar por Nombre o SKU"
                                    value={buscar}
                                    onChange={(e) => setBuscar(e.target.value)}
                                />
                            </div>
                            <div className="col-6 col-md-4">
                                <select
                                    className="form-select"
                                    value={categoriaSeleccionada}
                                    onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                                >
                                    <option value="">Todas las Categorías</option>
                                    {categorias.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-6 col-md-4">
                                <select
                                    className="form-select"
                                    value={etiquetaSeleccionada}
                                    onChange={(e) => setEtiquetaSeleccionada(e.target.value)}
                                >
                                    <option value="">Todas las Etiquetas</option>
                                    {etiquetasDisponibles.map(tag => (
                                        <option key={tag} value={tag}>{tag}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {error && <div className="alert alert-danger shadow-sm">{error}</div>}

                    {/* Grid Productos (Con Paginación) */}
                    <div className="flex-grow-1 overflow-auto pb-5"> 
                        <div className="row g-3">
                            {currentItems.map((prod) => {
                                return (
                                    <div key={prod.id} className="col-6 col-sm-4 col-md-3 col-lg-3">
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
                                            <div className="p-2 text-center">
                                                <img
                                                    src={prod.imagen_url || 'https://via.placeholder.com/100x100?text=Sin+Imagen'}
                                                    alt={prod.nombre}
                                                    className="img-fluid rounded"
                                                    style={{ maxHeight: "100px", objectFit: "contain" }}
                                                    onError={(e) => {
                                                        e.target.src = 'https://via.placeholder.com/100x100?text=Sin+Imagen';
                                                    }}
                                                />
                                            </div>

                                            <div className="card-body p-3">
                                                <div className="badge bg-secondary position-absolute top-0 end-0 m-2">
                                                    {prod.stock_fisico} u.
                                                </div>

                                                <h6 className="card-title text-truncate fw-bold mb-1" title={prod.nombre}>
                                                    {prod.nombre}
                                                </h6>

                                                {/* ETIQUETAS VISIBLES */}
                                                <div className="d-flex flex-wrap gap-1 mb-2">
                                                    {prod.etiquetas_detalle && prod.etiquetas_detalle.map(tag => (
                                                        <span key={tag.id} className="badge bg-info text-white fw-normal p-1" style={{fontSize: '0.65rem'}}>
                                                            {tag.nombre}
                                                        </span>
                                                    ))}
                                                </div>

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

                        {/* --- CONTROLES DE PAGINACIÓN --- */}
                        {totalPages > 1 && (
                            <div className="d-flex justify-content-center align-items-center mt-4 gap-2 pb-5">
                                <button 
                                    className="btn btn-outline-primary btn-sm" 
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <i className="bi bi-chevron-left"></i> Anterior
                                </button>
                                <span className="text-muted small">
                                    Página <b>{currentPage}</b> de <b>{totalPages}</b>
                                </span>
                                <button 
                                    className="btn btn-outline-primary btn-sm" 
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    Siguiente <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- COLUMNA DERECHA --- */}
                <div className="d-none d-lg-block col-lg-3 bg-white border-start shadow h-100 overflow-hidden">
                    {/* AQUÍ LLAMAMOS A LA FUNCIÓN DIRECTAMENTE */}
                    {renderCartContent()}
                </div>
            </div>

            {/* --- BOTÓN FLOTANTE --- */}
            <div className="d-lg-none position-fixed bottom-0 start-0 w-100 p-3" style={{zIndex: 1050}}>
                <button 
                    className="btn btn-primary w-100 py-3 shadow-lg rounded-pill d-flex justify-content-between px-4 fw-bold"
                    onClick={() => setShowMobileCart(true)}
                >
                    <span><i className="bi bi-cart-fill me-2"></i> {cart.length} Ítems</span>
                    <span>{formatCurrency(cartTotal)}</span>
                </button>
            </div>

            {/* --- OFFCANVAS --- */}
            <div className={`offcanvas offcanvas-end ${showMobileCart ? 'show' : ''}`} tabIndex="-1" style={{visibility: showMobileCart ? 'visible' : 'hidden'}}>
                <div className="offcanvas-header bg-primary text-white">
                    <h5 className="offcanvas-title">Carrito de Venta</h5>
                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowMobileCart(false)}></button>
                </div>
                <div className="offcanvas-body p-0">
                     {/* AQUÍ LLAMAMOS A LA FUNCIÓN DIRECTAMENTE */}
                    {renderCartContent()}
                </div>
            </div>
             {showMobileCart && <div className="offcanvas-backdrop fade show" onClick={() => setShowMobileCart(false)}></div>}


            {/* Modal Nutricional (Sin cambios) */}
            {showNutricionalModal && (
               <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)", zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Info Nutricional</h5>
                                <button className="btn-close" onClick={() => setShowNutricionalModal(false)}></button>
                            </div>
                            <div className="modal-body text-center">
                                {nutricional && (
                                    <div className="d-flex flex-wrap justify-content-center gap-2 mb-3">
                                        {getSellosNutricionales(nutricional).map((sello, i) => (
                                            /* NOTA: Estos sellos tienen 'outline' negro por estándar chileno. Si también te molesta eso, quita 'outline' en el estilo de abajo */
                                            <div key={i} className="bg-black text-white d-flex align-items-center justify-content-center text-center p-1 fw-bold" style={{width:"80px",height:"80px",borderRadius:"50%", fontSize: '0.65rem', border: '2px solid white', outline: '2px solid black'}}>{sello}</div>
                                        ))}
                                    </div>
                                )}
                                {nutricional ? (
                                    <table className="table table-bordered table-sm text-start">
                                        <tbody>
                                            <tr><th>Calorías</th><td>{nutricional.calorias} kcal</td></tr>
                                            <tr><th>Proteínas</th><td>{nutricional.proteinas} g</td></tr>
                                            <tr><th>Grasas</th><td>{nutricional.grasas} g</td></tr>
                                            <tr><th>Hidratos de carbono</th><td>{nutricional.carbohidratos} g</td></tr>
                                            <tr><th>Azúcares</th><td>{nutricional.azucares} g</td></tr>
                                            <tr><th>Sodio</th><td>{nutricional.sodio} mg</td></tr>
                                        </tbody>
                                    </table>
                                ) : <p>Sin información.</p>}
                            </div>
                            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowNutricionalModal(false)}>Cerrar</button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default POS;