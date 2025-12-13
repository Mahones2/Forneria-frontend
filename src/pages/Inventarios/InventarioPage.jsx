import { useEffect, useState, useMemo, useCallback } from "react";
import client from "../../api/client"; 
import LoteManager from "./LoteManager";
import ProductoFormModal from "./ProductoFormModal";
import Swal from 'sweetalert2'

export default function InventarioPage() {
    const [authToken] = useState(() => localStorage.getItem("access") || null);
    
    // Datos
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [selectedProducto, setSelectedProducto] = useState(null);
    
    // UI
    const [buscar, setBuscar] = useState("");
    const [categoriaFilter, setCategoriaFilter] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Modal Productos
    const [showProductModal, setShowProductModal] = useState(false);
    const [productToEdit, setProductToEdit] = useState(null);

    const fetchData = useCallback(async () => {
        if (!authToken) return;
        setIsLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${authToken}` } };
            const [prodRes, catRes] = await Promise.all([
                client.get("/pos/api/productos/", config),
                client.get("/pos/api/categorias/", config)
            ]);
            setProductos(prodRes.data);
            setCategorias(catRes.data);
        } catch (err) {
            console.error(err);
            setError("Error cargando inventario.");
        } finally {
            setIsLoading(false);
        }
    }, [authToken]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- ACCIONES DE PRODUCTO ---

    const handleDeleteProduct = async (e, id) => {
        e.stopPropagation(); // Evita que se seleccione el producto al borrarlo
        if(!window.confirm("¿Seguro que deseas eliminar este producto y todo su historial?")) return;

        try {
            const config = { headers: { Authorization: `Bearer ${authToken}` } };
            await client.delete(`/pos/api/productos/${id}/`, config);
            
            // Si el producto borrado estaba seleccionado, lo deseleccionamos
            if (selectedProducto?.id === id) setSelectedProducto(null);
            
            fetchData(); // Recargar lista
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al eliminar producto',
                confirmButtonColor: '#d33'
            });

        }
    };

    const handleEditProduct = (e, prod) => {
        e.stopPropagation(); // Evita que se seleccione al editar
        setProductToEdit(prod);
        setShowProductModal(true);
    };

    const handleCreateProduct = () => {
        setProductToEdit(null);
        setShowProductModal(true);
    };

    // --- FILTRADO ---
    const filteredProductos = useMemo(() => {
        const buscarLower = buscar.toLowerCase();
        return productos.filter(p => {
            const matchTexto = p.nombre.toLowerCase().includes(buscarLower) || 
                               (p.codigo_barra || "").toLowerCase().includes(buscarLower);
            const matchCat = categoriaFilter === "" || p.categoria_nombre === categoriaFilter;
            return matchTexto && matchCat;
        });
    }, [productos, buscar, categoriaFilter]);

    return (
        <div className="container-fluid py-4 h-100">
            <div className="row h-100">
                
                {/* COLUMNA IZQUIERDA */}
                <div className="col-md-4 border-end d-flex flex-column" style={{ maxHeight: '90vh' }}>
                    <div className="mb-3">
                        <h3 className="text-primary fw-bold">Inventario</h3>
                        <div className="d-flex gap-2 mb-2">
                            <input 
                                className="form-control" placeholder="Buscar..." 
                                value={buscar} onChange={e => setBuscar(e.target.value)}
                            />
                            <select 
                                className="form-select w-auto"
                                value={categoriaFilter} onChange={e => setCategoriaFilter(e.target.value)}
                            >
                                <option value="">Todas</option>
                                {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                            </select>
                        </div>
                        <button className="btn btn-success w-100" onClick={handleCreateProduct}>
                            + Nuevo Producto
                        </button>
                    </div>

                    <div className="overflow-auto flex-grow-1">
                        {isLoading ? <div className="text-center p-3">Cargando...</div> : (
                            <div className="list-group">
                                {filteredProductos.map(prod => (
                                    <div
                                        key={prod.id}
                                        className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedProducto?.id === prod.id ? 'active' : ''}`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setSelectedProducto(prod)}
                                    >
                                        <div className="text-truncate me-2">
                                            <div className="fw-bold">{prod.nombre}</div>
                                            <small className={selectedProducto?.id === prod.id ? 'text-light' : 'text-muted'}>
                                                SKU: {prod.codigo_barra || 'N/A'}
                                            </small>
                                        </div>
                                        
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={`badge rounded-pill ${prod.stock_fisico > 0 ? 'bg-primary' : 'bg-danger'} ${selectedProducto?.id === prod.id ? 'border border-light' : ''}`}>
                                                {prod.stock_fisico}
                                            </span>
                                            
                                            {/* Botones de Acción (Pequeños) */}
                                            <div className="btn-group">
                                                <button 
                                                    className="btn btn-sm btn-light border"
                                                    onClick={(e) => handleEditProduct(e, prod)}
                                                    title="Editar"
                                                >
                                                    ✏️
                                                </button>
                                                <button 
                                                    className="btn btn-sm btn-light border text-danger"
                                                    onClick={(e) => handleDeleteProduct(e, prod.id)}
                                                    title="Eliminar"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="col-md-8 bg-light py-3">
                    {selectedProducto ? (
                        <LoteManager 
                            producto={selectedProducto} 
                            authToken={authToken} 
                            onUpdateStock={fetchData}
                        />
                    ) : (
                        <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                            <h4>Seleccione un producto para ver sus lotes</h4>
                        </div>
                    )}
                </div>
            </div>
            
            <ProductoFormModal 
                show={showProductModal}
                onClose={() => setShowProductModal(false)}
                productToEdit={productToEdit}
                categorias={categorias}
                onSuccess={() => { setShowProductModal(false); fetchData(); }}
            />
        </div>
    );
}