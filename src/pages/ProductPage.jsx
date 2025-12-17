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

    // ESTADO DEL FORMULARIO
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

    // --- CARGAR PRODUCTOS ---
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

    // --- HELPER: FORMATEAR RUT ---
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

    // --- MANEJO DE INPUTS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'proveedorRut') {
            setForm({ ...form, [name]: formatRut(value) });
        } else if (name === 'productId') {
            setForm({ ...form, [name]: value.toUpperCase() });
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    // --- CRUD ---
    const handleSave = async (e) => {
        e.preventDefault();

        // Validación SKU Duplicado (Solo al crear)
        if (!isEditing) {
            const skuExiste = products.some(p => p.sku === form.productId.trim());
            if (skuExiste) {
                alert(`⛔ ERROR: El SKU "${form.productId}" ya existe.`);
                return;
            }
        }

        try {
            if (isEditing) {
                await updateProduct(currentId, form);
                alert("✅ Producto actualizado correctamente");
            } else {
                await createProduct(form);
                alert("✅ Producto creado correctamente");
            }
            setForm(initialForm);
            setIsEditing(false);
            setCurrentId(null);
            cargarProductos();
        } catch (error) {
            console.error(error);
            alert("Error al guardar. Verifique los datos.");
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
                console.error(error);
                alert("No se pudo eliminar. Puede que tenga stock o movimientos asociados.");
            }
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setForm(initialForm);
        setCurrentId(null);
    };

    const productosFiltrados = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="inventory-container">
            {/* CABECERA */}
            <div className="page-header">
                <h2 className="page-title">🏷️ Maestro de Productos</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Menú</button>
            </div>

            {/* --- FORMULARIO DE EDICIÓN/CREACIÓN --- */}
            <div className="form-card" style={{ 
                borderLeft: isEditing ? '5px solid #d69e2e' : '5px solid #38a169',
                marginBottom: '30px'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                    {isEditing ? '✏️ Editando Producto' : '➕ Registrar Nuevo Producto'}
                </h3>
                
                <form onSubmit={handleSave}>
                    {/* USAMOS CSS GRID PARA ORGANIZAR EN 3 BLOQUES RESPONSIVOS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                        
                        {/* BLOQUE 1: DATOS BÁSICOS */}
                        <div style={{ background:'#fff', padding:'0' }}>
                            <h4 style={{margin:'0 0 15px 0', color:'#4a5568', fontSize:'0.95rem', textTransform:'uppercase', letterSpacing:'0.5px'}}>1. Información Básica</h4>
                            <div className="form-group">
                                <label className="form-label">SKU (Código Único)</label>
                                <input 
                                    required name="productId" value={form.productId} onChange={handleChange} disabled={isEditing} 
                                    placeholder="Ej: LEC-001" className="form-input" style={{ fontWeight:'bold', letterSpacing:'1px' }}
                                />
                            </div>
                            <div className="form-group" style={{marginTop:'15px'}}>
                                <label className="form-label">Nombre del Producto</label>
                                <input required name="nombre" value={form.nombre} onChange={handleChange} className="form-input" />
                            </div>
                            <div className="form-group" style={{marginTop:'15px'}}>
                                <label className="form-label">Categoría</label>
                                <select required name="categoria" value={form.categoria} onChange={handleChange} className="form-select">
                                    <option value="">-- Seleccione --</option>
                                    <option value="Abarrotes">Abarrotes</option>
                                    <option value="Lácteos">Lácteos</option>
                                    <option value="Carnes">Carnes</option>
                                    <option value="Verduras">Verduras</option>
                                    <option value="Bebidas">Bebidas</option>
                                    <option value="Limpieza">Limpieza</option>
                                    <option value="Insumos">Insumos</option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </div>
                        </div>

                        {/* BLOQUE 2: CONTROL DE STOCK */}
                        <div style={{ background:'#f0f9ff', padding:'15px', borderRadius:'8px', border:'1px solid #bae6fd' }}>
                            <h4 style={{margin:'0 0 15px 0', color:'#0284c7', fontSize:'0.95rem', textTransform:'uppercase', letterSpacing:'0.5px'}}>2. Parámetros de Stock</h4>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                                <div className="form-group">
                                    <label className="form-label" style={{color:'#c53030'}}>Stock Mínimo</label>
                                    <input type="number" name="stockMinimo" value={form.stockMinimo} onChange={handleChange} className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{color:'#2f855a'}}>Stock Máximo</label>
                                    <input type="number" name="stockMaximo" value={form.stockMaximo} onChange={handleChange} className="form-input" />
                                </div>
                            </div>
                            <div className="form-group" style={{marginTop:'15px'}}>
                                <label className="form-label">Días Máx. en Bodega</label>
                                <input type="number" name="tiempoMaximoBodega" value={form.tiempoMaximoBodega} onChange={handleChange} placeholder="0" className="form-input" />
                            </div>
                        </div>

                        {/* BLOQUE 3: PROVEEDOR */}
                        <div style={{ background:'#fff', padding:'0' }}>
                            <h4 style={{margin:'0 0 15px 0', color:'#4a5568', fontSize:'0.95rem', textTransform:'uppercase', letterSpacing:'0.5px'}}>3. Datos Proveedor</h4>
                            <div className="form-group">
                                <label className="form-label">Nombre Proveedor</label>
                                <input required name="proveedorNombre" value={form.proveedorNombre} onChange={handleChange} className="form-input" />
                            </div>
                            <div className="form-group" style={{marginTop:'15px'}}>
                                <label className="form-label">RUT Proveedor</label>
                                <input required name="proveedorRut" value={form.proveedorRut} onChange={handleChange} placeholder="Ej: 12.345.678-9" maxLength={12} className="form-input" />
                            </div>
                            <div className="form-group" style={{marginTop:'15px'}}>
                                <label className="form-label">Unidad de Medida</label>
                                <select name="unidadDeMedida" value={form.unidadDeMedida} onChange={handleChange} className="form-select">
                                    <option value="UNIDAD">Unidad</option>
                                    <option value="KG">Kilogramos</option>
                                    <option value="LITROS">Litros</option>
                                    <option value="CAJA">Caja</option>
                                    <option value="METRO">Metro</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions" style={{marginTop:'30px'}}>
                        <button type="submit" className="btn-primary" style={{ backgroundColor: isEditing ? '#d69e2e' : '#38a169', flex: 1 }}>
                            {isEditing ? '💾 Guardar Cambios' : '✨ Crear Producto'}
                        </button>
                        {isEditing && (
                            <button type="button" onClick={handleCancel} className="btn-secondary">
                                Cancelar Edición
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* --- LISTADO Y FILTROS --- */}
            <div className="filters-panel">
                <div className="filter-group" style={{ flex: 1 }}>
                    <label className="filter-label">🔍 Buscar Producto</label>
                    <input 
                        type="text" 
                        placeholder="Nombre, SKU o Categoría..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="filter-input"
                    />
                </div>
                <div style={{ alignSelf: 'flex-end', paddingBottom:'5px', color:'#718096', fontWeight:'600' }}>
                    Total: {productosFiltrados.length} productos
                </div>
            </div>

            <div className="table-container">
                <table className="responsive-table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th style={{textAlign:'center'}}>Min</th>
                            <th style={{textAlign:'center'}}>Max</th>
                            <th style={{textAlign:'center'}}>Días</th>
                            <th>Proveedor</th>
                            <th>RUT</th>
                            <th style={{textAlign:'center'}}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productosFiltrados.map(p => (
                            <tr key={p.id}>
                                <td data-label="SKU" style={{fontWeight:'bold', fontFamily:'monospace', fontSize:'1.1em'}}>{p.sku}</td>
                                <td data-label="Nombre"><strong>{p.name}</strong></td>
                                <td data-label="Categoría">
                                    <span className="badge-category">{p.category}</span>
                                </td>
                                <td data-label="Stock Mín" style={{textAlign:'center', color:'#c53030', fontWeight:'bold'}}>{p.minStock}</td>
                                <td data-label="Stock Máx" style={{textAlign:'center', color:'#2f855a', fontWeight:'bold'}}>{p.maxStock}</td>
                                <td data-label="Días Bodega" style={{textAlign:'center', color:'#3182ce'}}>{p.maxStorageDays}</td>
                                <td data-label="Proveedor">{p.supplierName}</td>
                                <td data-label="RUT Prov" style={{fontSize:'0.85em', color:'#666'}}>{p.supplierRut}</td>
                                <td data-label="Acciones" style={{textAlign:'center'}}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button onClick={() => handleEdit(p)} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '1.2em' }}>
                                            ✏️
                                        </button>
                                        <button onClick={() => handleDelete(p.id)} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '1.2em', color: '#e53e3e', background:'#fff5f5' }}>
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}