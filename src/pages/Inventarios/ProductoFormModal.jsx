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
    
    // NUEVOS ESTADOS PARA ETIQUETAS
    const [etiquetasDisponibles, setEtiquetasDisponibles] = useState([]);
    const [nuevaEtiquetaNombre, setNuevaEtiquetaNombre] = useState('');

    const isEditing = !!productToEdit;

    // useEffect para cargar las etiquetas disponibles al montar
    useEffect(() => {
        if (!show) return;

        async function fetchEtiquetas() {
            try {
                const response = await client.get("/pos/api/etiquetas/");
                setEtiquetasDisponibles(response.data);
            } catch (error) {
                console.error("Error al cargar etiquetas:", error);
                // Manejo de error si las etiquetas no cargan
            }
        }

        fetchEtiquetas();
    }, [show]); // Se ejecuta cada vez que el modal se muestra

    // Valores iniciales
    const initialValues = useMemo(() => {
        const nutri = productToEdit?.nutricional || {};
        
        // INCLUIR ETIQUETAS: Mapear las etiquetas existentes a un array de IDs
        // El serializer de Django espera un array de IDs: [1, 5, 10]
        const etiquetasIds = productToEdit?.etiquetas_data 
                            ? productToEdit.etiquetas_data.map(e => e.id)
                            : [];

        return {
            // --- PRODUCTO ---
            nombre: productToEdit?.nombre || "",
            codigo_barra: productToEdit?.codigo_barra || "",
            categoria: productToEdit?.categoria || "",
            // ... otros campos ...
            stock_minimo_global: productToEdit?.stock_minimo_global || 5,
            tipo: productToEdit?.tipo || "",
            presentacion: productToEdit?.presentacion || "",
            imagen_referencial: null, 
            
            //NUEVO CAMPO: Array de IDs de etiquetas seleccionadas
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

    //FUNCIÓN PARA CREAR NUEVA ETIQUETA
    const handleCrearEtiqueta = async (setFieldValue, values) => {
        const nombreLimpio = nuevaEtiquetaNombre.trim();
        if (!nombreLimpio) return;

        try {
            // 1. Crear la etiqueta en el backend
            const response = await client.post('/pos/api/etiquetas/', { nombre: nombreLimpio });
            const nuevaEtiqueta = response.data;

            // 2. Añadirla al estado de disponibles
            setEtiquetasDisponibles(prev => [...prev, nuevaEtiqueta]);

            // 3. Seleccionarla automáticamente en Formik
            const etiquetasActuales = values.etiquetas || [];
            setFieldValue('etiquetas', [...etiquetasActuales, nuevaEtiqueta.id]);

            // 4. Limpiar el input
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
                text: error.response?.data?.nombre?.[0] || 'No se pudo crear la etiqueta (quizás ya existe).',
            });
        }
    };


    const handleSubmit = async (values, { setSubmitting }) => {
        // ... (Tu configuración de headers y el try/catch se mantienen igual)
        
        const config = { 
            headers: { 
                Authorization: `Bearer ${authToken}`,
            } 
        };

        try {
            // 1. PREPARAR DATOS DEL PRODUCTO (FormData por la imagen)
            const productData = new FormData();
            
            // Campos de texto y números
            productData.append('nombre', values.nombre);
            productData.append('categoria', values.categoria);
            productData.append('precio_venta', values.precio_venta);
            productData.append('stock_minimo_global', values.stock_minimo_global);
            
            // ADJUNTAR ETIQUETAS (Es un array de IDs, se adjunta uno por uno)
            if (values.etiquetas && values.etiquetas.length > 0) {
                values.etiquetas.forEach(tagId => {
                    // El campo en el backend es 'etiquetas'
                    productData.append('etiquetas', tagId); 
                });
            } else {
                // Para asegurarnos de que la relación se vacíe al editar si no hay etiquetas
                productData.append('etiquetas', ''); 
            }
            
            // Campos opcionales:
            if (values.codigo_barra) productData.append('codigo_barra', values.codigo_barra);
            // ... (resto de campos opcionales) ...
            if (values.presentacion) productData.append('presentacion', values.presentacion);

            // Imagen: 
            if (values.imagen_referencial instanceof File) {
                productData.append('imagen_referencial', values.imagen_referencial);
            }

            let productId = null;
            let productResponse = null;

            // 2. GUARDAR PRODUCTO
            if (isEditing) {
                // ... (PATCH a producto)
                productId = productToEdit.id;
                productResponse = await client.patch(`/pos/api/productos/${productId}/`, productData, config);
            } else {
                // ... (POST a producto)
                productResponse = await client.post(`/pos/api/productos/`, productData, config);
                productId = productResponse.data.id;
            }

            // 3. PREPARAR DATOS NUTRICIONALES (Esta parte usa JSON, ¡sigue siendo correcta!)
            // ... (la lógica de Nutricional sigue aquí) ...

            // ... (Resto del manejo de éxito y error) ...

        } catch (err) {
            // ... (Manejo de errores) ...
        } finally {
            setSubmitting(false);
        }
    };

    // ... (handleImageChange, if (!show) return null, etc. se mantienen igual) ...


    if (!show) return null;

    return (
        // ... (Estructura del Modal) ...
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
            <div className="modal-dialog modal-xl"> 
                <div className="modal-content">
                    <div className="modal-header bg-light-theme">
                        {/* ... (Header) ... */}
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
                                    {/* --- TABS DE NAVEGACIÓN --- */}
                                    {/* ... (Tabs) ... */}

                                    {/* --- CONTENIDO TABS --- */}
                                    <div className="tab-content">
                                        
                                        {/* TAB 1: GENERAL */}
                                        <div className={`tab-pane fade ${activeTab === 'general' ? 'show active' : ''}`}>
                                            <div className="row g-3">
                                                {/* Columna Izquierda: Datos principales */}
                                                <div className="col-md-8">
                                                    <div className="row g-3">
                                                        {/* ... (Campos Nombre, Código, Categoría, Marca, Tipo) ... */}
                                                        
                                                        {/* NUEVO CAMPO: ETIQUETAS (Col-12, abajo de descripción) */}
                                                        <div className="col-12">
                                                            <label className="form-label fw-semibold">Etiquetas del Producto</label>
                                                            <div className="mb-3">
                                                                {/* Selector de Etiquetas Múltiple */}
                                                                <Field 
                                                                    as="select" 
                                                                    name="etiquetas" 
                                                                    multiple 
                                                                    className="form-select"
                                                                    style={{ height: '100px' }}
                                                                >
                                                                    {etiquetasDisponibles.map(e => (
                                                                        <option key={e.id} value={e.id}>
                                                                            {e.nombre}
                                                                        </option>
                                                                    ))}
                                                                </Field>
                                                                <small className="form-text text-muted">Mantén presionado `Ctrl` o `Cmd` para seleccionar múltiples.</small>
                                                            </div>
                                                        </div>

                                                        <div className="col-12">
                                                            <label className="form-label fw-semibold">Descripción</label>
                                                            <Field name="descripcion" as="textarea" rows="2" className="form-control" />
                                                        </div>
                                                        
                                                        {/* ... (Campos Precio, Costo, Stock) ... */}
                                                        
                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Precio Venta <span className="text-danger">*</span></label>
                                                            {/* ... (Field) ... */}
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Costo Unitario</label>
                                                            {/* ... (Field) ... */}
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Stock Mínimo</label>
                                                            {/* ... (Field) ... */}
                                                        </div>
                                                        

                                                    </div>
                                                </div>

                                                {/* Columna Derecha: Imagen y Presentación + CREAR ETIQUETA */}
                                                <div className="col-md-4 border-start">
                                                    {/* ... (Presentación, Imagen) ... */}

                                                    
                                                    <div className="mb-4 pt-3 border-top">
                                                        <label className="form-label fw-semibold">Crear Nueva Etiqueta</label>
                                                        <div className="input-group">
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="Ej: Vegano, Gluten Free"
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
                                                        <small className="form-text text-muted">Crea y selecciona la etiqueta al instante.</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* TAB 2: NUTRICIONAL */}
                                        {/* ... (Contenido Nutricional) ... */}

                                    </div>
                                </div>

                                <div className="modal-footer bg-light">
                                    {/* ... (Botones Cancelar y Guardar) ... */}
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>
        </div>
    );
}