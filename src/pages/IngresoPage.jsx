import { useState, useEffect, useMemo } from 'react';
import { getProducts } from '../services/productService';
import { getAreas } from '../services/areaService';
import { registrarIngreso } from '../services/ingresoService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Constantes de negocio
const IVA_RATE = 0.19; 

export default function IngresoPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // --- 1. ESTADOS ---
    const [dbProducts, setDbProducts] = useState([]);
    const [areas, setAreas] = useState([]);
    const [proveedoresUnicos, setProveedoresUnicos] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [encabezado, setEncabezado] = useState({
        fecha: new Date().toISOString().split('T')[0],
        numeroDocumento: '',
        supplierRut: '',
        supplierName: ''
    });

    // Validación derivada: ¿Está completa la sección 1?
    const formularioListo = Boolean(
        encabezado.fecha && 
        encabezado.numeroDocumento && 
        encabezado.supplierRut && 
        encabezado.supplierName
    );

    const [productoActual, setProductoActual] = useState({
        sku: '', nombre: '', cantidad: '', precioUnitario: '', areaId: '',
        categoria: '', unidadMedida: 'UNIDAD', stockMin: '', stockMax: '', diasMax: ''
    });

    const [esNuevoProducto, setEsNuevoProducto] = useState(false);
    const [listaProductos, setListaProductos] = useState([]);
    const [indexEditando, setIndexEditando] = useState(null);
    
    // Autocompletado
    const [sugerenciasProvNombre, setSugerenciasProvNombre] = useState([]);
    const [sugerenciasProvRut, setSugerenciasProvRut] = useState([]);
    const [sugerenciasSku, setSugerenciasSku] = useState([]);

    // --- CARGA INICIAL ---
    useEffect(() => {
        async function load() {
            try {
                const [productosData, areasData] = await Promise.all([getProducts(), getAreas()]);
                setDbProducts(productosData);
                setAreas(areasData);

                // SOLUCIÓN DUPLICADOS: Filtrar por NOMBRE único
                const mapaProveedores = new Map();
                productosData.forEach(prod => {
                    if (prod.supplierName) {
                        const nombreLimpio = prod.supplierName.trim().toUpperCase().replace(/\s+/g, ' ');
                        if (!mapaProveedores.has(nombreLimpio)) {
                            mapaProveedores.set(nombreLimpio, { 
                                name: nombreLimpio,
                                rut: prod.supplierRut || '' 
                            });
                        }
                    }
                });
                // Ordenar alfabéticamente
                const listaOrdenada = Array.from(mapaProveedores.values()).sort((a, b) => a.name.localeCompare(b.name));
                setProveedoresUnicos(listaOrdenada);

            } catch (e) { 
                console.error("Error cargando datos:", e); 
            }
        }
        load();
    }, []);

    // --- CÁLCULOS ---
    const calculosActuales = useMemo(() => {
        const cant = parseFloat(productoActual.cantidad) || 0;
        const precio = parseFloat(productoActual.precioUnitario) || 0;
        const totalNeto = Math.round(cant * precio);
        const totalBruto = Math.round(totalNeto * (1 + IVA_RATE));
        return { neto: totalNeto, bruto: totalBruto };
    }, [productoActual.cantidad, productoActual.precioUnitario]);

    // --- HANDLERS ---
    const handleEncabezadoChange = (e) => {
        const { name, value } = e.target;
        setEncabezado(prev => ({ ...prev, [name]: value }));
        if (name === 'supplierName') filtrarPorNombre(value);
        else if (name === 'supplierRut') filtrarPorRut(value);
    };

    const handleProductoChange = (e) => {
        const { name, value } = e.target;
        setProductoActual(prev => ({ ...prev, [name]: value }));
        if (name === 'sku') filtrarSkuPorProveedor(value);
    };

    // --- FILTROS Y SELECCIÓN ---
    const filtrarPorNombre = (txt) => {
        if (!txt) { setSugerenciasProvNombre([]); return; }
        setSugerenciasProvNombre(proveedoresUnicos.filter(p => p.name.includes(txt.toUpperCase())));
    };

    const filtrarPorRut = (txt) => {
        if (!txt) { setSugerenciasProvRut([]); return; }
        const inputLimpio = txt.replace(/\./g, '').replace(/-/g, '').toUpperCase();
        setSugerenciasProvRut(proveedoresUnicos.filter(p => {
            const pRutLimpio = p.rut ? p.rut.replace(/\./g, '').replace(/-/g, '').toUpperCase() : '';
            return pRutLimpio.includes(inputLimpio);
        }));
    };

    const seleccionarProveedor = (p) => {
        setEncabezado(prev => ({ ...prev, supplierName: p.name, supplierRut: p.rut }));
        setSugerenciasProvNombre([]); 
        setSugerenciasProvRut([]);
        // Si hay productos en la lista, advertir al usuario
        if(listaProductos.length > 0) {
           // Aquí podrías limpiar la lista si fuera regla de negocio estricta
        }
    };

    const filtrarSkuPorProveedor = (txt) => {
        if (!txt || !encabezado.supplierRut) { setSugerenciasSku([]); return; }
        
        const rutEncabezadoLimpio = encabezado.supplierRut.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase();

        const coincidencias = dbProducts.filter(p => {
            if (!p.supplierRut) return false;
            const pRutLimpio = p.supplierRut.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase();
            // Compara RUT limpio y busca SKU parcial
            return pRutLimpio === rutEncabezadoLimpio && p.sku.toLowerCase().includes(txt.toLowerCase());
        });

        setSugerenciasSku(coincidencias);
        const existeExacto = coincidencias.find(p => p.sku.toLowerCase() === txt.toLowerCase());
        setEsNuevoProducto(!existeExacto);
    };

    const seleccionarSku = (p) => {
        setProductoActual(prev => ({
            ...prev, 
            sku: p.sku, 
            nombre: p.name, 
            categoria: p.category || '', 
            unidadMedida: p.unitOfMeasure || 'UNIDAD'
        }));
        setEsNuevoProducto(false); 
        setSugerenciasSku([]);
    };

    // --- AGREGAR ITEM ---
    const agregarOActualizarProducto = () => {
        if (!formularioListo) {
            alert("⚠️ Primero debe completar todos los datos del Documento y Proveedor.");
            return;
        }
        if (!productoActual.sku || !productoActual.nombre || !productoActual.cantidad || !productoActual.precioUnitario || !productoActual.areaId) {
            alert("⚠️ Faltan datos obligatorios del producto."); 
            return;
        }

        const areaSeleccionada = areas.find(a => a.id.toString() === productoActual.areaId.toString());
        
        const nuevoItem = {
            ...productoActual,
            cantidad: parseFloat(productoActual.cantidad),
            precioUnitario: parseFloat(productoActual.precioUnitario),
            totalNeto: calculosActuales.neto,
            totalBruto: calculosActuales.bruto,
            areaNombre: areaSeleccionada ? areaSeleccionada.nombre : 'General',
            esNuevo: esNuevoProducto
        };

        if (indexEditando !== null) {
            const copia = [...listaProductos];
            copia[indexEditando] = nuevoItem;
            setListaProductos(copia);
            setIndexEditando(null);
        } else {
            const existeEnTabla = listaProductos.findIndex(item => item.sku === nuevoItem.sku);
            if (existeEnTabla >= 0) {
                alert(`⚠️ El SKU ${nuevoItem.sku} ya está en la lista. Edite la línea existente.`);
                return;
            }
            setListaProductos([...listaProductos, nuevoItem]);
        }
        limpiarProductoActual();
    };

    const limpiarProductoActual = () => {
        setProductoActual({ sku: '', nombre: '', cantidad: '', precioUnitario: '', areaId: '', categoria: '', unidadMedida: 'UNIDAD', stockMin: '', stockMax: '', diasMax: '' });
        setIndexEditando(null);
        setEsNuevoProducto(false);
    };

    const editarItem = (index) => {
        setIndexEditando(index);
        setProductoActual(listaProductos[index]);
    };

    const eliminarItem = (index) => {
        if(window.confirm("¿Eliminar ítem?")) {
            setListaProductos(listaProductos.filter((_, i) => i !== index));
        }
    };

    const confirmarIngreso = async () => {
        if (!formularioListo || listaProductos.length === 0) {
            alert("⚠️ Faltan datos o productos."); 
            return;
        }
        if(!window.confirm("¿Confirmar ingreso de mercadería?")) return;

        setIsSubmitting(true);
        const payload = {
            ...encabezado,
            responsable: user?.fullName || "Usuario",
            items: listaProductos.map(item => ({
                productSku: item.sku, 
                productName: item.nombre, 
                areaId: item.areaId,
                cantidad: item.cantidad, 
                costoUnitario: item.precioUnitario,
                category: item.categoria, 
                unitOfMeasure: item.unidadMedida
            }))
        };

        try {
            await registrarIngreso(payload);
            alert("✅ Ingreso Exitoso!");
            setListaProductos([]);
            setEncabezado({ fecha: new Date().toISOString().split('T')[0], numeroDocumento: '', supplierRut: '', supplierName: '' });
            limpiarProductoActual();
        } catch (error) { 
            console.error(error);
            alert("❌ Error: " + (error.response?.data?.message || error.message)); 
        } finally {
            setIsSubmitting(false);
        }
    };

    // Totales
    const totalNetoGlobal = listaProductos.reduce((acc, item) => acc + item.totalNeto, 0);
    const totalBrutoGlobal = listaProductos.reduce((acc, item) => acc + item.totalBruto, 0);
    const totalIvaGlobal = totalBrutoGlobal - totalNetoGlobal;

    return (
        <div className="inventory-container" style={{padding: '20px', backgroundColor: '#f4f7f6'}}>
            <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
                <h2 style={{color: '#2d3748'}}>📥 Ingreso de Mercadería</h2>
                <button onClick={() => navigate('/menu')} className="back-btn" style={{padding: '8px 16px', cursor:'pointer'}}>⬅ Volver</button>
            </div>

            {/* SECCIÓN 1: DOCUMENTO */}
            <div className="form-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px', borderTop: '4px solid #3182ce' }}>
                <h3 style={{marginTop: 0, marginBottom: '15px', fontSize: '1.1rem', color: '#3182ce'}}>1. Información del Documento y Proveedor</h3>
                <div className="form-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                    <div className="form-group"><label>Fecha</label><input type="date" name="fecha" value={encabezado.fecha} onChange={handleEncabezadoChange} className="form-input"/></div>
                    <div className="form-group"><label>N° Factura / Documento</label><input type="text" name="numeroDocumento" value={encabezado.numeroDocumento} onChange={handleEncabezadoChange} className="form-input" placeholder="Ej: 10234"/></div>
                    
                    {/* Buscador Nombre */}
                    <div className="form-group" style={{position:'relative'}}>
                        <label>Nombre Proveedor</label>
                        <input type="text" name="supplierName" value={encabezado.supplierName} onChange={handleEncabezadoChange} className="form-input" placeholder="Buscar..." autoComplete="off"/>
                        {sugerenciasProvNombre.length > 0 && <ul className="dropdown-list" style={{position:'absolute', width:'100%', zIndex:100, background:'white', border:'1px solid #ddd', listStyle:'none', padding:0, maxHeight:'200px', overflowY:'auto', boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>{sugerenciasProvNombre.map((p,i)=><li key={i} onClick={()=>seleccionarProveedor(p)} style={{padding:'8px', cursor:'pointer', borderBottom:'1px solid #eee', fontSize:'0.9rem'}}>{p.name}</li>)}</ul>}
                    </div>
                    
                    {/* Buscador RUT */}
                    <div className="form-group" style={{position:'relative'}}>
                        <label>RUT Proveedor</label>
                        <input type="text" name="supplierRut" value={encabezado.supplierRut} onChange={handleEncabezadoChange} className="form-input" placeholder="Buscar RUT..." autoComplete="off"/>
                        {sugerenciasProvRut.length > 0 && <ul className="dropdown-list" style={{position:'absolute', width:'100%', zIndex:100, background:'white', border:'1px solid #ddd', listStyle:'none', padding:0, maxHeight:'200px', overflowY:'auto', boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>{sugerenciasProvRut.map((p,i)=><li key={i} onClick={()=>seleccionarProveedor(p)} style={{padding:'8px', cursor:'pointer', borderBottom:'1px solid #eee', fontSize:'0.9rem'}}>{p.rut} - {p.name}</li>)}</ul>}
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: PRODUCTO (CON BLOQUEO DE VALIDACIÓN) */}
            <div className="form-card" style={{ 
                background: 'white', 
                padding: '20px', 
                borderRadius: '8px', 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                marginBottom: '20px', 
                borderTop: '4px solid #38a169',
                opacity: formularioListo ? 1 : 0.6, // Efecto visual de deshabilitado
                pointerEvents: formularioListo ? 'auto' : 'none' // Bloqueo de clics
            }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '15px'}}>
                    <h3 style={{margin:0, fontSize: '1.1rem', color: '#38a169'}}>
                        {indexEditando !== null ? "✏️ Editando Item" : "2. Datos del Producto"}
                    </h3>
                    {/* Mensaje de alerta si está bloqueado */}
                    {!formularioListo && (
                        <span style={{color: '#e53e3e', fontWeight:'bold', fontSize:'0.9rem'}}>
                            🔒 Complete el Documento y Proveedor para desbloquear
                        </span>
                    )}
                </div>

                <div className="form-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px'}}>
                    <div className="form-group" style={{position:'relative'}}>
                        <label>SKU</label>
                        <input type="text" name="sku" value={productoActual.sku} onChange={handleProductoChange} className="form-input" disabled={!formularioListo} placeholder={formularioListo ? "Buscar SKU..." : "Bloqueado"} autoComplete="off"/>
                        {sugerenciasSku.length > 0 && formularioListo && <ul className="dropdown-list" style={{position:'absolute', width:'100%', zIndex:100, background:'white', border:'1px solid #ddd', listStyle:'none', padding:0, maxHeight:'200px', overflowY:'auto', boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>{sugerenciasSku.map((p,i)=><li key={i} onClick={()=>seleccionarSku(p)} style={{padding:'8px', cursor:'pointer', borderBottom:'1px solid #eee', fontSize:'0.9rem'}}>{p.sku} - {p.name}</li>)}</ul>}
                    </div>
                    <div className="form-group"><label>Nombre</label><input type="text" name="nombre" value={productoActual.nombre} onChange={handleProductoChange} className="form-input" readOnly={!esNuevoProducto} disabled={!formularioListo}/></div>
                    <div className="form-group"><label>Área Destino</label><select name="areaId" value={productoActual.areaId} onChange={handleProductoChange} className="form-input" disabled={!formularioListo}><option value="">Seleccione...</option>{areas.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}</select></div>
                    <div className="form-group"><label>Cantidad</label><input type="number" name="cantidad" value={productoActual.cantidad} onChange={handleProductoChange} className="form-input" min="0" disabled={!formularioListo}/></div>
                    <div className="form-group"><label>Precio Neto Unit.</label><input type="number" name="precioUnitario" value={productoActual.precioUnitario} onChange={handleProductoChange} className="form-input" min="0" disabled={!formularioListo}/></div>
                    
                    <div className="form-group" style={{display:'flex', alignItems:'flex-end', paddingBottom:'5px', color:'#718096', fontSize:'0.9rem'}}>
                       Subtotal Item: ${calculosActuales.neto.toLocaleString('es-CL')}
                    </div>
                </div>
                <div style={{marginTop: '15px', textAlign: 'right'}}>
                    {indexEditando !== null && <button onClick={limpiarProductoActual} className="btn-secondary" style={{marginRight: '10px', padding:'8px 16px', cursor:'pointer'}}>Cancelar</button>}
                    <button onClick={agregarOActualizarProducto} disabled={!formularioListo} className="save-btn" style={{backgroundColor: formularioListo ? '#2b6cb0' : '#a0aec0', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: formularioListo ? 'pointer' : 'not-allowed'}}>
                        {indexEditando !== null ? "💾 Actualizar Item" : "➕ Agregar Item"}
                    </button>
                </div>
            </div>

            {/* 3. DETALLE DE MERCADERÍA */}
            {listaProductos.length > 0 && (
                <div className="form-card" style={{ background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    {/* INFO HEADER RESUMEN */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div><strong>Fecha:</strong> {encabezado.fecha}</div>
                        <div style={{textAlign: 'right'}}><strong>N° Documento:</strong> {encabezado.numeroDocumento}</div>
                        <div><strong>Proveedor:</strong> {encabezado.supplierName}</div>
                        <div style={{textAlign: 'right'}}><strong>RUT:</strong> {encabezado.supplierRut}</div>
                    </div>

                    <div style={{overflowX: 'auto'}}>
                        <table style={{width: '100%', borderCollapse: 'collapse', minWidth:'600px'}}>
                            <thead>
                                <tr style={{borderBottom: '2px solid #edf2f7', textAlign: 'left', color: '#4a5568'}}>
                                    <th style={{padding: '12px'}}>SKU</th>
                                    <th style={{padding: '12px'}}>Producto</th>
                                    <th style={{padding: '12px'}}>Destino</th>
                                    <th style={{padding: '12px'}}>Cant.</th>
                                    <th style={{padding: '12px'}}>P. Neto</th>
                                    <th style={{padding: '12px'}}>Total Neto</th>
                                    <th style={{padding: '12px', textAlign: 'center'}}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listaProductos.map((item, idx) => (
                                    <tr key={idx} style={{borderBottom: '1px solid #edf2f7', backgroundColor: indexEditando === idx ? '#ebf8ff' : 'transparent'}}>
                                        <td style={{padding: '12px'}}>{item.sku}</td>
                                        <td style={{padding: '12px'}}>{item.nombre}</td>
                                        <td style={{padding: '12px'}}>{item.areaNombre}</td>
                                        <td style={{padding: '12px'}}>{item.cantidad}</td>
                                        <td style={{padding: '12px'}}>${item.precioUnitario.toLocaleString('es-CL')}</td>
                                        <td style={{padding: '12px'}}>${item.totalNeto.toLocaleString('es-CL')}</td>
                                        <td style={{padding: '12px', textAlign: 'center'}}>
                                            <button onClick={() => editarItem(idx)} style={{background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px'}} title="Editar">✏️</button>
                                            <button onClick={() => eliminarItem(idx)} style={{background: 'none', border: 'none', cursor: 'pointer', color:'#e53e3e'}} title="Eliminar">🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* TOTALES */}
                    <div style={{ marginTop: '20px', borderTop: '2px solid #eee', paddingTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ width: '250px', fontSize: '1.1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>Total Neto:</span> <strong>${totalNetoGlobal.toLocaleString('es-CL')}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>Total IVA (19%):</span> <strong>${totalIvaGlobal.toLocaleString('es-CL')}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', color: '#276749', borderTop: '1px solid #ddd', paddingTop: '5px' }}>
                                <span>Total Bruto:</span> <strong>${totalBrutoGlobal.toLocaleString('es-CL')}</strong>
                            </div>
                        </div>
                    </div>

                    <div style={{textAlign: 'center', marginTop: '30px'}}>
                        <button onClick={confirmarIngreso} disabled={isSubmitting} className="save-btn" style={{padding: '15px 50px', backgroundColor: isSubmitting ? '#a0aec0' : '#38a169', color: 'white', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(56, 161, 105, 0.3)'}}>
                            {isSubmitting ? "⏳ Procesando..." : "✅ CONFIRMAR INGRESO DE MERCADERÍA"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}