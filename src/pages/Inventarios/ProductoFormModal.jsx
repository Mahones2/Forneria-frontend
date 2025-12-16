import { useState, useMemo, useEffect } from "react";
import { Formik, Form, Field } from "formik";
import client from "../../api/client"; 
import Swal from 'sweetalert2';
import { productoSchema } from "../../validations/schemas";
import FormError from "../../components/UI/FormError";

export default function ProductoFormModal({ show, onClose, productToEdit, categorias, onSuccess }) {
    const [authToken] = useState(() => localStorage.getItem("access"));
    const [activeTab, setActiveTab] = useState('general'); 
    const [previewImage, setPreviewImage] = useState(null); 
    
    // --- ESTADOS PARA ETIQUETAS Y CATEGORÍAS ---
    const [etiquetasDisponibles, setEtiquetasDisponibles] = useState([]);
    const [nuevaEtiquetaNombre, setNuevaEtiquetaNombre] = useState('');
    
    // Estado local para categorías (para poder agregar una nueva y verla al instante)
    const [listaCategorias, setListaCategorias] = useState([]); 
    const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('');

    const isEditing = !!productToEdit;

    // Sincronizar categorías de props al estado local
    useEffect(() => {
        if (categorias) {
            setListaCategorias(categorias);
        }
    }, [categorias]);

    // Cargar etiquetas disponibles al mostrar el modal
    useEffect(() => {
        if (!show) return;

        async function fetchEtiquetas() {
            try {
                const response = await client.get("/pos/api/etiquetas/");
                setEtiquetasDisponibles(response.data);
            } catch (error) {
                console.error("Error al cargar etiquetas:", error);
            }
        }

        fetchEtiquetas();
    }, [show]);

    // Valores iniciales
    const initialValues = useMemo(() => {
        const nutri = productToEdit?.nutricional || {};
        
        const etiquetasIds = productToEdit?.etiquetas_data 
                            ? productToEdit.etiquetas_data.map(e => e.id)
                            : [];

        return {
            // --- PRODUCTO ---
            nombre: productToEdit?.nombre || "",
            codigo_barra: productToEdit?.codigo_barra || "",
            categoria: productToEdit?.categoria || "",
            marca: productToEdit?.marca || "",
            descripcion: productToEdit?.descripcion || "",
            precio_venta: productToEdit?.precio_venta || "",
            costo_unitario: productToEdit?.costo_unitario || "",
            stock_minimo_global: productToEdit?.stock_minimo_global || 5,
            tipo: productToEdit?.tipo || "",
            presentacion: productToEdit?.presentacion || "",
            imagen_url: null, 
            etiquetas: etiquetasIds, 

            // --- NUTRICIONAL ---
            nutricional_id: nutri.id || null, 
            calorias: nutri.calorias || "",
            proteinas: nutri.proteinas || "",
            grasas: nutri.grasas || "",
            carbohidratos: nutri.carbohidratos || "",
            azucares: nutri.azucares || "",
            sodio: nutri.sodio || "",
        };
    }, [productToEdit]);

    // --- FUNCIÓN CREAR ETIQUETA ---
    const handleCrearEtiqueta = async (setFieldValue, values) => {
        const nombreLimpio = nuevaEtiquetaNombre.trim();
        if (!nombreLimpio) return;

        try {
            const response = await client.post('/pos/api/etiquetas/', { nombre: nombreLimpio });
            const nuevaEtiqueta = response.data;

            setEtiquetasDisponibles(prev => [...prev, nuevaEtiqueta]);

            const etiquetasActuales = values.etiquetas || [];
            setFieldValue('etiquetas', [...etiquetasActuales, nuevaEtiqueta.id]);

            setNuevaEtiquetaNombre('');

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `Etiqueta '${nuevaEtiqueta.nombre}' creada`,
                showConfirmButton: false,
                timer: 1500
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.nombre?.[0] || 'No se pudo crear la etiqueta.',
            });
        }
    };

    // --- NUEVA FUNCIÓN CREAR CATEGORÍA ---
    const handleCrearCategoria = async (setFieldValue) => {
        const nombreLimpio = nuevaCategoriaNombre.trim();
        if (!nombreLimpio) return;

        try {
            // Ajusta la URL si tu endpoint es diferente
            const response = await client.post('/pos/api/categorias/', { nombre: nombreLimpio });
            const nuevaCategoria = response.data;

            // Agregamos la nueva categoría a la lista local para que aparezca en el Select
            setListaCategorias(prev => [...prev, nuevaCategoria]);

            // Seleccionamos automáticamente la nueva categoría en el Formik
            setFieldValue('categoria', nuevaCategoria.id);

            setNuevaCategoriaNombre('');

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `Categoría '${nuevaCategoria.nombre}' creada`,
                showConfirmButton: false,
                timer: 1500
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.nombre?.[0] || 'No se pudo crear la categoría.',
            });
        }
    };

    const handleSubmit = async (values, { setSubmitting }) => {
        try {
            const productData = new FormData();
            productData.append('nombre', values.nombre);
            productData.append('categoria', values.categoria);
            productData.append('precio_venta', values.precio_venta);
            productData.append('stock_minimo_global', values.stock_minimo_global);
            
            const etiquetasArray = Array.isArray(values.etiquetas) ? values.etiquetas : (values.etiquetas ? [values.etiquetas] : []);
            if (etiquetasArray.length > 0) {
                etiquetasArray.forEach(tagId => {
                    productData.append('etiquetas', parseInt(tagId, 10));
                });
            }
            
            if (values.codigo_barra) productData.append('codigo_barra', values.codigo_barra);
            if (values.marca) productData.append('marca', values.marca);
            if (values.descripcion) productData.append('descripcion', values.descripcion);
            if (values.costo_unitario) productData.append('costo_unitario', values.costo_unitario);
            if (values.tipo) productData.append('tipo', values.tipo);
            if (values.presentacion) productData.append('presentacion', values.presentacion);

            if (values.imagen_url && values.imagen_url instanceof File && values.imagen_url.size > 0) {
                console.log('📤 Agregando imagen a FormData:', values.imagen_url.name);
                productData.append('imagen', values.imagen_url);
            }

            let productId = null;
            let productResponse = null;

            const formConfig = {
                headers: { Authorization: `Bearer ${authToken}` },
                transformRequest: [(data, headers) => {
                    if (data instanceof FormData) {
                        delete headers['Content-Type']; 
                    }
                    return data;
                }]
            };

            if (isEditing) {
                productId = productToEdit.id;
                productResponse = await client.patch(`/pos/api/productos/${productId}/`, productData, formConfig);
            } else {
                productResponse = await client.post(`/pos/api/productos/`, productData, formConfig);
                productId = productResponse.data.id;
            }

            const hasNutritionalData = values.calorias || values.proteinas || values.grasas;
            
            if (productId && hasNutritionalData) {
                const nutriPayload = {
                    calorias: values.calorias || 0,
                    proteinas: values.proteinas || 0,
                    grasas: values.grasas || 0,
                    carbohidratos: values.carbohidratos || 0,
                    azucares: values.azucares || 0,
                    sodio: values.sodio || 0,
                    producto: productId 
                };

                const jsonConfig = { 
                    headers: { 
                        Authorization: `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    } 
                };

                if (values.nutricional_id) {
                    await client.patch(`/pos/api/nutricional/${values.nutricional_id}/`, nutriPayload, jsonConfig);
                } else {
                    try {
                         await client.post(`/pos/api/nutricional/`, nutriPayload, jsonConfig);
                    } catch (nutriErr) {
                        console.warn("Posiblemente ya existe nutricional, intentando patch...", nutriErr);
                    }
                }
            }

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: isEditing ? 'Producto actualizado' : 'Producto creado',
                showConfirmButton: false,
                timer: 2000
            });
            onSuccess();
            onClose();

        } catch (err) {
            console.error('❌ Error completo:', err);
            let errorMessage = 'Error desconocido';
            if (err.response?.data) {
                errorMessage = JSON.stringify(err.response.data, null, 2);
            }
            Swal.fire({
                icon: 'error',
                title: 'Error al procesar',
                text: errorMessage,
                showConfirmButton: true
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleImageChange = (event, setFieldValue) => {
        const file = event.currentTarget.files[0];
        if (file) {
            setFieldValue("imagen_url", file);
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    if (!show) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
            <div className="modal-dialog modal-xl"> 
                <div className="modal-content">
                    <div className="modal-header bg-light-theme">
                        <h5 className="modal-title fw-bold" style={{ color: 'var(--primary-color)' }}>
                            {isEditing ? `Editar: ${productToEdit.nombre}` : "Nuevo Producto"}
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <Formik
                        initialValues={initialValues}
                        validationSchema={productoSchema} 
                        onSubmit={handleSubmit}
                        enableReinitialize
                    >
                        {({ isSubmitting, errors, touched, setFieldValue, values }) => (
                            <Form>
                                <div className="modal-body">
                                    <ul className="nav nav-tabs mb-4">
                                        <li className="nav-item">
                                            <button 
                                                type="button"
                                                className={`nav-link ${activeTab === 'general' ? 'active fw-bold' : ''}`}
                                                onClick={() => setActiveTab('general')}
                                            >
                                                📦 Información General
                                            </button>
                                        </li>
                                        <li className="nav-item">
                                            <button 
                                                type="button"
                                                className={`nav-link ${activeTab === 'nutricional' ? 'active fw-bold' : ''}`}
                                                onClick={() => setActiveTab('nutricional')}
                                            >
                                                🍎 Información Nutricional
                                            </button>
                                        </li>
                                    </ul>

                                    <div className="tab-content">
                                        
                                        {/* TAB 1: GENERAL */}
                                        <div className={`tab-pane fade ${activeTab === 'general' ? 'show active' : ''}`}>
                                            <div className="row g-3">
                                                {/* Columna Izquierda: Datos principales */}
                                                <div className="col-md-8">
                                                    <div className="row g-3">
                                                        <div className="col-md-6">
                                                            <label className="form-label fw-semibold">Nombre <span className="text-danger">*</span></label>
                                                            <Field name="nombre" type="text" className={`form-control ${errors.nombre && touched.nombre ? 'is-invalid' : ''}`} />
                                                            <FormError name="nombre" />
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="form-label fw-semibold">Código de Barras</label>
                                                            <Field name="codigo_barra" type="text" className="form-control" />
                                                        </div>

                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Categoría <span className="text-danger">*</span></label>
                                                            {/* Usamos listaCategorias (estado local) en lugar de la prop directa */}
                                                            <Field as="select" name="categoria" className={`form-select ${errors.categoria && touched.categoria ? 'is-invalid' : ''}`}>
                                                                <option value="">Seleccione...</option>
                                                                {listaCategorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                                            </Field>
                                                            <FormError name="categoria" />
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Marca</label>
                                                            <Field name="marca" type="text" className="form-control" />
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Tipo</label>
                                                            <Field name="tipo" type="text" className="form-control" placeholder="Ej: Congelado" />
                                                        </div>

                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Precio Venta <span className="text-danger">*</span></label>
                                                            <div className="input-group">
                                                                <span className="input-group-text">$</span>
                                                                <Field name="precio_venta" type="number" className={`form-control ${errors.precio_venta && touched.precio_venta ? 'is-invalid' : ''}`} />
                                                            </div>
                                                            <FormError name="precio_venta" />
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Costo Unitario</label>
                                                            <div className="input-group">
                                                                <span className="input-group-text">$</span>
                                                                <Field name="costo_unitario" type="number" className="form-control" />
                                                            </div>
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Stock Mínimo</label>
                                                            <Field name="stock_minimo_global" type="number" className="form-control" />
                                                        </div>

                                                        <div className="col-12">
                                                            <label className="form-label fw-semibold">Descripción</label>
                                                            <Field name="descripcion" as="textarea" rows="2" className="form-control" />
                                                        </div>

                                                        <div className="col-12">
                                                            <label className="form-label fw-semibold">🏷️ Etiquetas del Producto</label>
                                                            <select
                                                                name="etiquetas"
                                                                multiple
                                                                className="form-select"
                                                                style={{ height: '100px' }}
                                                                value={Array.isArray(values.etiquetas) ? values.etiquetas : []}
                                                                onChange={(e) => {
                                                                    const selectedOptions = Array.from(e.target.selectedOptions);
                                                                    const selectedValues = selectedOptions.map(option => parseInt(option.value, 10));
                                                                    setFieldValue('etiquetas', selectedValues);
                                                                }}
                                                            >
                                                                {etiquetasDisponibles.map(e => (
                                                                    <option key={e.id} value={e.id}>
                                                                        {e.nombre}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <small className="form-text text-muted">Mantén presionado Ctrl (o Cmd en Mac) para seleccionar múltiples etiquetas.</small>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Columna Derecha: Imagen, Presentación, Crear Tags y Categorías */}
                                                <div className="col-md-4 border-start">
                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold">Presentación</label>
                                                        <Field name="presentacion" type="text" className="form-control" placeholder="Ej: Pack 6 uds" />
                                                    </div>

                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold">Imagen del Producto</label>
                                                        <input 
                                                            type="file" 
                                                            className="form-control" 
                                                            accept="image/*"
                                                            onChange={(e) => handleImageChange(e, setFieldValue)}
                                                        />
                                                        <div className="mt-3 text-center p-2 border rounded bg-light">
                                                            {previewImage ? (
                                                                <img src={previewImage} alt="Preview" className="img-fluid" style={{ maxHeight: '150px' }} />
                                                            ) : (
                                                                productToEdit?.imagen_url ? (
                                                                    <img src={productToEdit.imagen_url} alt="Actual" className="img-fluid" style={{ maxHeight: '150px' }} />
                                                                ) : (
                                                                    <span className="text-muted small">Sin imagen seleccionada</span>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* SECCIÓN CREAR ETIQUETA */}
                                                    <div className="mb-3 pt-3 border-top">
                                                        <label className="form-label fw-semibold">➕ Crear Nueva Etiqueta</label>
                                                        <div className="input-group">
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="Ej: Vegano"
                                                                value={nuevaEtiquetaNombre}
                                                                onChange={(e) => setNuevaEtiquetaNombre(e.target.value)}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary"
                                                                onClick={() => handleCrearEtiqueta(setFieldValue, values)}
                                                                disabled={!nuevaEtiquetaNombre.trim()}
                                                            >
                                                                <i className="bi bi-plus-lg"></i>
                                                            </button>
                                                        </div>
                                                    </div>     

                                                    {/* SECCIÓN CREAR CATEGORÍA (NUEVA) */}
                                                    <div className="mb-3 pt-3 border-top">
                                                        <label className="form-label fw-semibold">📁 Crear Nueva Categoría</label>
                                                        <div className="input-group">
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="Ej: Bebidas"
                                                                value={nuevaCategoriaNombre}
                                                                onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="btn btn-success"
                                                                onClick={() => handleCrearCategoria(setFieldValue)}
                                                                disabled={!nuevaCategoriaNombre.trim()}
                                                            >
                                                                <i className="bi bi-plus-lg"></i>
                                                            </button>
                                                        </div>
                                                        <small className="form-text text-muted">Se seleccionará automáticamente.</small>
                                                    </div>                                           
                                                </div>
                                            </div>
                                        </div>

                                        {/* TAB 2: NUTRICIONAL */}
                                        <div className={`tab-pane fade ${activeTab === 'nutricional' ? 'show active' : ''}`}>
                                            <div className="alert alert-info py-2">
                                                <small><i className="bi bi-info-circle"></i> Ingrese los valores por cada 100g/ml o por porción.</small>
                                            </div>
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <label className="form-label">Calorías (kcal)</label>
                                                    <Field name="calorias" type="number" className="form-control" />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Proteínas (g)</label>
                                                    <Field name="proteinas" type="number" className="form-control" />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Grasas Totales (g)</label>
                                                    <Field name="grasas" type="number" className="form-control" />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Carbohidratos (g)</label>
                                                    <Field name="carbohidratos" type="number" className="form-control" />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Azúcares (g)</label>
                                                    <Field name="azucares" type="number" className="form-control" />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Sodio (mg)</label>
                                                    <Field name="sodio" type="number" className="form-control" />
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                <div className="modal-footer bg-light">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={onClose}
                                        disabled={isSubmitting}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary px-4"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Procesando...
                                            </>
                                        ) : 'Guardar Todo'}
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>
        </div>
    );
}