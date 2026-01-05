import { useState, useEffect } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/productService';
import { useNavigate } from 'react-router-dom';

export default function ProductPage() {
    const navigate = useNavigate();

    // --- ESTADOS ---
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); 
    const [isEditing, setIsEditing] = useState(false); 
    const [currentId, setCurrentId] = useState(null); 
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const initialForm = {
        productId: '',      
        nombre: '',         
        categoria: '',      
        unidadDeMedida: 'UNIDAD',
        proveedorNombre: '',
        proveedorRut: '',   
        stockMinimo: 0,        
        stockMaximo: 0,        
        tiempoMaximoBodega: 0  
    };
    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        cargarProductos();
    }, []);

    const cargarProductos = async () => {
        try {
            const data = await getProducts();
            setProducts(data);
        } catch (error) {
            console.error("Error cargando productos", error);
        }
    };

    // --- LÓGICA DE AUTOCOMPLETADO (Normalizada a Mayúsculas) ---
    const categoriasExistentes = [
        ...new Set(products.map(p => p.category?.toUpperCase()).filter(Boolean))
    ].sort();

    const formatRut = (rut) => {
        let valor = rut.replace(/[^0-9kK]/g, '');
        if (valor.length <= 1) return valor;
        const cuerpo = valor.slice(0, -1);
        const dv = valor.slice(-1).toUpperCase();
        const cuerpoFormateado = cuerpo.split('').reverse().reduce((acc, cur, i) => {
            return cur + (i > 0 && i % 3 === 0 ? '.' : '') + acc;
        }, '');
        return `${cuerpoFormateado}-${dv}`;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'proveedorRut') {
            setForm({ ...form, [name]: formatRut(value) });
        } else if (name === 'productId' || name === 'categoria') {
            // Forzamos mayúsculas en tiempo real para SKU y Categoría
            setForm({ ...form, [name]: value.toUpperCase() });
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    // --- FLUJO DE GUARDADO CON LIMPIEZA ---
    const handlePreSave = (e) => {
        e.preventDefault();
        
        if (!isEditing) {
            const skuExiste = products.some(p => p.sku === form.productId.trim().toUpperCase());
            if (skuExiste) {
                alert(`⛔ ERROR: El SKU "${form.productId}" ya existe.`);
                return;
            }
        }
        setShowConfirmModal(true);
    };

    const confirmSave = async () => {
        // Limpiamos espacios y aseguramos formato antes de enviar al backend
        const cleanedForm = {
            ...form,
            productId: form.productId.trim().toUpperCase(),
            nombre: form.nombre.trim(),
            categoria: form.categoria.trim().toUpperCase(),
            proveedorNombre: form.proveedorNombre.trim(),
        };

        try {
            if (isEditing) {
                await updateProduct(currentId, cleanedForm);
                alert("✅ Producto actualizado correctamente");
            } else {
                await createProduct(cleanedForm);
                alert("✅ Producto creado correctamente");
            }
            handleCancel();
            cargarProductos();
        } catch (error) {
            console.error(error);
            alert("Error al guardar.");
        }
    };

    const handleEdit = (product) => {
        setForm({
            productId: product.sku,
            nombre: product.name,
            categoria: product.category || '',
            unidadDeMedida: product.unitOfMeasure || 'UNIDAD',
            proveedorNombre: product.supplierName || '',
            proveedorRut: product.supplierRut || '', 
            stockMinimo: product.minStock || 0,
            stockMaximo: product.maxStock || 0,
            tiempoMaximoBodega: product.maxStorageDays || 0
        });
        setIsEditing(true);
        setCurrentId(product.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Estás seguro de eliminar este producto?")) {
            try {
                await deleteProduct(id);
                cargarProductos(); 
            } catch (error) {
                alert("No se pudo eliminar. El producto puede tener stock.");
            }
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setForm(initialForm);
        setCurrentId(null);
        setShowConfirmModal(false);
    };

    // --- FILTRADO PARA EL BUSCADOR ---
    const productosFiltrados = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="inventory-container">
            <div className="page-header">
                <h2 className="page-title">🏷️ Maestro de Productos</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Menú</button>
            </div>

            {/* FORMULARIO */}
            <div className="form-card" style={{ borderLeft: isEditing ? '5px solid #d69e2e' : '5px solid #38a169', marginBottom: '30px' }}>
                <h3 style={{ marginTop: 0, color: '#2d3748' }}>
                    {isEditing ? '✏️ Editando Producto' : '➕ Registrar Nuevo Producto'}
                </h3>
                
                <form onSubmit={handlePreSave}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        <div>
                            <div className="form-group">
                                <label className="form-label">SKU (Código Único)</label>
                                <input 
                                    required name="productId" value={form.productId} onChange={handleChange} 
                                    disabled={isEditing}
                                    className="form-input" style={{ fontWeight:'bold', opacity: isEditing ? 0.7 : 1 }}
                                />
                            </div>
                            <div className="form-group" style={{marginTop:'10px'}}>
                                <label className="form-label">Nombre</label>
                                <input required name="nombre" value={form.nombre} onChange={handleChange} className="form-input" />
                            </div>
                            <div className="form-group" style={{marginTop:'10px'}}>
                                <label className="form-label">Categoría</label>
                                <input 
                                    list="categorias-list" 
                                    name="categoria" 
                                    value={form.categoria} 
                                    onChange={handleChange} 
                                    required 
                                    className="form-input"
                                    placeholder="Escriba o seleccione..."
                                />
                                <datalist id="categorias-list">
                                    {categoriasExistentes.map(cat => <option key={cat} value={cat} />)}
                                </datalist>
                            </div>
                        </div>

                        <div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                                <div className="form-group">
                                    <label className="form-label">Stock Mín.</label>
                                    <input type="number" name="stockMinimo" value={form.stockMinimo} onChange={handleChange} className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Stock Máx.</label>
                                    <input type="number" name="stockMaximo" value={form.stockMaximo} onChange={handleChange} className="form-input" />
                                </div>
                            </div>
                            <div className="form-group" style={{marginTop:'10px'}}>
                                <label className="form-label">Nombre Proveedor</label>
                                <input required name="proveedorNombre" value={form.proveedorNombre} onChange={handleChange} className="form-input" />
                            </div>
                            <div className="form-group" style={{marginTop:'10px'}}>
                                <label className="form-label">RUT Proveedor</label>
                                <input required name="proveedorRut" value={form.proveedorRut} onChange={handleChange} maxLength={12} className="form-input" />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions" style={{marginTop:'25px'}}>
                        <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                            {isEditing ? '🔍 Revisar y Guardar' : '✨ Revisar e Ingresar'}
                        </button>
                        {isEditing && <button type="button" onClick={handleCancel} className="btn-secondary">Cancelar</button>}
                    </div>
                </form>
            </div>

            {/* BARRA DE BÚSQUEDA */}
            <div className="search-box" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Buscar por SKU, Nombre o Categoría..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '35px', width: '100%', maxWidth: '500px' }}
                    />
                </div>
            </div>

            {/* MODAL DE CONFIRMACIÓN */}
            {showConfirmModal && (
                <div className="modal-overlay" style={{ display: 'flex', zIndex: 2000 }}>
                    <div className="modal-content" style={{ maxWidth: '450px' }}>
                        <h3 style={{ marginTop: 0 }}>Confirmar Registro</h3>
                        <p style={{ color: '#718096' }}>Verifique los datos (se guardarán en MAYÚSCULAS):</p>
                        
                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.6' }}>
                            <div><strong>SKU:</strong> {form.productId.trim().toUpperCase()}</div>
                            <div><strong>Nombre:</strong> {form.nombre.trim()}</div>
                            <div><strong>Categoría:</strong> {form.categoria.trim().toUpperCase()}</div>
                            <div><strong>Proveedor:</strong> {form.proveedorNombre}</div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button onClick={confirmSave} className="btn-primary" style={{ flex: 1 }}>Confirmar</button>
                            <button onClick={() => setShowConfirmModal(false)} className="btn-secondary" style={{ flex: 1 }}>Corregir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TABLA DE PRODUCTOS */}
            <div className="table-container">
                <table className="responsive-table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th style={{textAlign:'center'}}>Min/Max</th>
                            <th>Proveedor</th>
                            <th style={{textAlign:'center'}}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productosFiltrados.length > 0 ? (
                            productosFiltrados.map(p => (
                                <tr key={p.id}>
                                    <td style={{fontWeight:'bold'}}>{p.sku}</td>
                                    <td><strong>{p.name}</strong></td>
                                    <td><span className="badge-category">{p.category}</span></td>
                                    <td style={{textAlign:'center'}}>{p.minStock} / {p.maxStock}</td>
                                    <td>{p.supplierName}</td>
                                    <td style={{textAlign:'center'}}>
                                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                            <button onClick={() => handleEdit(p)} className="btn-secondary" style={{ padding: '5px 8px' }}>✏️</button>
                                            <button onClick={() => handleDelete(p.id)} className="btn-secondary" style={{ padding: '5px 8px', color: '#e53e3e' }}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#a0aec0' }}>
                                    No se encontraron productos que coincidan con la búsqueda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}