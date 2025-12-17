import { useState, useEffect } from 'react';
import { getProducts } from '../services/productService';
import { getAreas } from '../services/areaService';
import { registrarIngreso } from '../services/ingresoService'; // <--- Importamos el servicio
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function IngresoPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // --- 1. ESTADOS ---
    const [dbProducts, setDbProducts] = useState([]);
    const [areas, setAreas] = useState([]);
    const [proveedoresUnicos, setProveedoresUnicos] = useState([]);

    const [encabezado, setEncabezado] = useState({
        fecha: new Date().toISOString().split('T')[0],
        numeroDocumento: '',
        supplierRut: '',
        supplierName: ''
    });

    const [productoActual, setProductoActual] = useState({
        sku: '', nombre: '', cantidad: '', precioUnitario: '', areaId: '',
        categoria: '', unidadMedida: 'UNIDAD', stockMin: '', stockMax: '', diasMax: ''
    });

    const [esNuevoProducto, setEsNuevoProducto] = useState(false);
    const [listaProductos, setListaProductos] = useState([]);
    
    // Sugerencias y Cálculos
    const [sugerenciasProvNombre, setSugerenciasProvNombre] = useState([]);
    const [sugerenciasProvRut, setSugerenciasProvRut] = useState([]);
    const [sugerenciasSku, setSugerenciasSku] = useState([]);
    const [calculos, setCalculos] = useState({ neto: 0, bruto: 0 });

    // --- CARGA INICIAL ---
    useEffect(() => {
        async function load() {
            try {
                const p = await getProducts();
                const a = await getAreas();
                setDbProducts(p);
                setAreas(a);

                const mapaProveedores = new Map();
                p.forEach(prod => {
                    if (prod.supplierRut && prod.supplierName) {
                        mapaProveedores.set(prod.supplierRut, { rut: prod.supplierRut, name: prod.supplierName });
                    }
                });
                setProveedoresUnicos(Array.from(mapaProveedores.values()));
            } catch (e) { console.error(e); }
        }
        load();
    }, []);

    // --- CÁLCULOS EN TIEMPO REAL (Formulario) ---
    useEffect(() => {
        const cant = parseFloat(productoActual.cantidad) || 0;
        const precio = parseFloat(productoActual.precioUnitario) || 0;
        const totalNeto = Math.round(cant * precio);
        const totalBruto = Math.round(totalNeto * 1.19);
        setCalculos({ neto: totalNeto, bruto: totalBruto });
    }, [productoActual.cantidad, productoActual.precioUnitario]);

    // --- MANEJADORES DE INPUTS ---
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

    // --- FILTROS Y AUTOCOMPLETADO ---
    const filtrarPorNombre = (txt) => {
        if (!txt) { setSugerenciasProvNombre([]); return; }
        setSugerenciasProvNombre(proveedoresUnicos.filter(p => p.name.toLowerCase().includes(txt.toLowerCase())));
        setSugerenciasProvRut([]);
    };

    const filtrarPorRut = (txt) => {
        if (!txt) { setSugerenciasProvRut([]); return; }
        setSugerenciasProvRut(proveedoresUnicos.filter(p => p.rut.toLowerCase().includes(txt.toLowerCase())));
        setSugerenciasProvNombre([]);
    };

    const seleccionarProveedor = (p) => {
        setEncabezado(prev => ({ ...prev, supplierName: p.name, supplierRut: p.rut }));
        setSugerenciasProvNombre([]); setSugerenciasProvRut([]);
        limpiarProductoActual();
    };

    const filtrarSkuPorProveedor = (txt) => {
        if (!txt || !encabezado.supplierRut) { setSugerenciasSku([]); return; }
        const prodsProv = dbProducts.filter(p => p.supplierRut === encabezado.supplierRut);
        const coincidencias = prodsProv.filter(p => p.sku.toLowerCase().includes(txt.toLowerCase()));
        setSugerenciasSku(coincidencias);
        
        const exact = coincidencias.find(p => p.sku.toLowerCase() === txt.toLowerCase());
        setEsNuevoProducto(!exact);
    };

    const seleccionarSku = (p) => {
        setProductoActual(prev => ({
            ...prev, sku: p.sku, nombre: p.name, categoria: p.category || '', unidadMedida: p.unitOfMeasure || 'UNIDAD'
        }));
        setEsNuevoProducto(false); setSugerenciasSku([]);
    };

    // --- AGREGAR A LA TABLA ---
    const agregarProducto = () => {
        if (!productoActual.sku || !productoActual.nombre || !productoActual.cantidad || !productoActual.precioUnitario || !productoActual.areaId) {
            alert("⚠️ Faltan datos obligatorios del producto.");
            return;
        }

        const areaSeleccionada = areas.find(a => a.id.toString() === productoActual.areaId.toString());
        const nuevoItem = {
            ...productoActual,
            totalNeto: calculos.neto,
            totalBruto: calculos.bruto,
            areaNombre: areaSeleccionada ? areaSeleccionada.nombre : 'General',
            esNuevo: esNuevoProducto
        };

        setListaProductos([...listaProductos, nuevoItem]);
        limpiarProductoActual();
    };

    const limpiarProductoActual = () => {
        setProductoActual({ sku: '', nombre: '', cantidad: '', precioUnitario: '', areaId: '', categoria: '', unidadMedida: 'UNIDAD', stockMin: '', stockMax: '', diasMax: '' });
        setCalculos({ neto: 0, bruto: 0 });
        setEsNuevoProducto(false);
    };

    const eliminarItem = (index) => {
        const nuevaLista = [...listaProductos];
        nuevaLista.splice(index, 1);
        setListaProductos(nuevaLista);
    };

    // --- ENVIAR AL BACKEND ---
    const confirmarIngreso = async () => {
        if (!encabezado.numeroDocumento || !encabezado.supplierRut || listaProductos.length === 0) {
            alert("⚠️ Debes completar los datos de la factura y agregar al menos un producto.");
            return;
        }

        const payload = {
            fecha: encabezado.fecha,
            numeroDocumento: encabezado.numeroDocumento,
            supplierRut: encabezado.supplierRut,
            supplierName: encabezado.supplierName,
            responsable: user?.fullName || "Usuario",
            items: listaProductos.map(item => ({
                productSku: item.sku,
                productName: item.nombre,
                areaId: item.areaId,
                cantidad: parseFloat(item.cantidad),
                costoUnitario: parseFloat(item.precioUnitario),
                // Campos opcionales (solo se usan en backend si el producto es nuevo)
                category: item.categoria,
                unitOfMeasure: item.unidadMedida,
                minStock: item.stockMin ? parseFloat(item.stockMin) : null,
                maxStock: item.stockMax ? parseFloat(item.stockMax) : null,
                maxStorageDays: item.diasMax ? parseInt(item.diasMax) : null
            }))
        };

        try {
            await registrarIngreso(payload);
            alert("✅ Ingreso Exitoso! El stock ha sido actualizado.");
            
            // REINICIAR TODO EL FORMULARIO
            setListaProductos([]);
            setEncabezado(prev => ({ ...prev, numeroDocumento: '', supplierRut: '', supplierName: '' }));
            limpiarProductoActual();
            
        } catch (error) {
            alert("❌ Error: " + error.message);
        }
    };

    // --- CÁLCULOS TOTALES DE LA FACTURA ---
    const totalNetoGlobal = listaProductos.reduce((acc, item) => acc + item.totalNeto, 0);
    const totalBrutoGlobal = listaProductos.reduce((acc, item) => acc + item.totalBruto, 0);
    const totalIvaGlobal = totalBrutoGlobal - totalNetoGlobal;

    // ESTILOS
    const dropdownStyle = { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ccc', zIndex: 1000, maxHeight: '150px', overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0 };
    const thStyle = { backgroundColor: '#2d3748', color: 'white', padding: '10px', textAlign: 'left' };
    const tdStyle = { padding: '10px', borderBottom: '1px solid #eee' };

    return (
        <div className="inventory-container">
            <div className="page-header">
                <h2>📥 Ingreso Masivo (Factura)</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Volver</button>
            </div>

            {/* 1. ENCABEZADO */}
            <div className="form-card" style={{ borderLeft: '5px solid #3182ce', marginBottom: '20px' }}>
                <h3 style={{marginTop:0, color:'#2c5282'}}>1. Datos del Documento</h3>
                <div className="form-grid">
                    <div className="form-group"><label>Fecha</label><input type="date" name="fecha" value={encabezado.fecha} onChange={handleEncabezadoChange} className="form-input"/></div>
                    <div className="form-group"><label>N° Documento</label><input type="text" name="numeroDocumento" value={encabezado.numeroDocumento} onChange={handleEncabezadoChange} className="form-input"/></div>
                    
                    <div className="form-group" style={{position:'relative'}}>
                        <label>RUT Proveedor</label>
                        <input type="text" name="supplierRut" value={encabezado.supplierRut} onChange={handleEncabezadoChange} className="form-input" placeholder="Buscar RUT..."/>
                        {sugerenciasProvRut.length > 0 && <ul style={dropdownStyle}>{sugerenciasProvRut.map((p,i)=><li key={i} onClick={()=>seleccionarProveedor(p)} style={{padding:'8px', cursor:'pointer'}}>{p.rut} - {p.name}</li>)}</ul>}
                    </div>
                    <div className="form-group" style={{position:'relative'}}>
                        <label>Nombre Proveedor</label>
                        <input type="text" name="supplierName" value={encabezado.supplierName} onChange={handleEncabezadoChange} className="form-input" placeholder="Buscar Nombre..."/>
                        {sugerenciasProvNombre.length > 0 && <ul style={dropdownStyle}>{sugerenciasProvNombre.map((p,i)=><li key={i} onClick={()=>seleccionarProveedor(p)} style={{padding:'8px', cursor:'pointer'}}>{p.name}</li>)}</ul>}
                    </div>
                </div>
            </div>

            {/* 2. FORMULARIO PRODUCTO */}
            <div className="form-card" style={{ borderLeft: '5px solid #38a169', marginBottom: '20px' }}>
                <h3 style={{marginTop:0, color:'#276749'}}>2. Agregar Item</h3>
                {!encabezado.supplierRut ? <div style={{color:'red'}}>⚠️ Selecciona un proveedor primero.</div> : (
                    <>
                        <div className="form-grid">
                            <div className="form-group" style={{position:'relative'}}>
                                <label>SKU</label>
                                <input type="text" name="sku" value={productoActual.sku} onChange={handleProductoChange} className="form-input" autoComplete="off"/>
                                {sugerenciasSku.length > 0 && <ul style={dropdownStyle}>{sugerenciasSku.map((p,i)=><li key={i} onClick={()=>seleccionarSku(p)} style={{padding:'8px', cursor:'pointer'}}>{p.sku} - {p.name}</li>)}</ul>}
                            </div>
                            <div className="form-group"><label>Nombre</label><input type="text" name="nombre" value={productoActual.nombre} onChange={handleProductoChange} className="form-input" readOnly={!esNuevoProducto} style={{background: !esNuevoProducto?'#f7fafc':'white'}}/></div>
                            <div className="form-group"><label>Destino</label><select name="areaId" value={productoActual.areaId} onChange={handleProductoChange} className="form-input"><option value="">-- Seleccionar --</option>{areas.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}</select></div>
                            <div className="form-group"><label>Cantidad</label><input type="number" name="cantidad" value={productoActual.cantidad} onChange={handleProductoChange} className="form-input"/></div>
                            <div className="form-group"><label>Precio Neto Unit.</label><input type="number" name="precioUnitario" value={productoActual.precioUnitario} onChange={handleProductoChange} className="form-input"/></div>
                            <div className="form-group"><label>Total Neto</label><input type="text" value={calculos.neto.toLocaleString('es-CL')} readOnly className="form-input" style={{background:'#edf2f7', fontWeight:'bold'}}/></div>
                        </div>

                        {esNuevoProducto && (
                            <div style={{marginTop:'10px', padding:'10px', background:'#fffaf0', border:'1px dashed #ed8936'}}>
                                <strong>✨ Nuevo Producto:</strong>
                                <div className="form-grid">
                                    <div className="form-group"><label>Categoría</label><input type="text" name="categoria" value={productoActual.categoria} onChange={handleProductoChange} className="form-input"/></div>
                                    <div className="form-group"><label>Unidad</label><select name="unidadMedida" value={productoActual.unidadMedida} onChange={handleProductoChange} className="form-input"><option>UNIDAD</option><option>KG</option><option>LITRO</option></select></div>
                                </div>
                            </div>
                        )}
                        <div style={{textAlign:'right', marginTop:'10px'}}>
                            <button onClick={agregarProducto} className="save-btn" style={{backgroundColor:'#2b6cb0'}}>➕ Agregar Item</button>
                        </div>
                    </>
                )}
            </div>

            {/* 3. VER FACTURA (TABLA DETALLE) */}
            {listaProductos.length > 0 && (
                <div className="form-card" style={{ borderTop: '5px solid #805ad5' }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h3 style={{marginTop:0, color:'#553c9a'}}>3. Detalle de Factura</h3>
                        <span style={{background:'#ebf4ff', padding:'5px 10px', borderRadius:'15px', color:'#2c5282', fontWeight:'bold'}}>
                            Items: {listaProductos.length}
                        </span>
                    </div>

                    <table style={{width:'100%', borderCollapse:'collapse', marginTop:'15px'}}>
                        <thead>
                            <tr>
                                <th style={thStyle}>SKU</th>
                                <th style={thStyle}>Producto</th>
                                <th style={thStyle}>Destino</th>
                                <th style={thStyle}>Cant.</th>
                                <th style={thStyle}>P. Unit (Neto)</th>
                                <th style={thStyle}>Total Neto</th>
                                <th style={thStyle}>Total Bruto</th>
                                <th style={thStyle}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {listaProductos.map((item, index) => (
                                <tr key={index} style={{backgroundColor: index % 2 === 0 ? 'white' : '#f7fafc'}}>
                                    <td style={tdStyle}>{item.sku}</td>
                                    <td style={tdStyle}>
                                        {item.nombre}
                                        {item.esNuevo && <span style={{fontSize:'0.7em', color:'orange', marginLeft:'5px'}}>(NUEVO)</span>}
                                    </td>
                                    <td style={tdStyle}>{item.areaNombre}</td>
                                    <td style={tdStyle}>{item.cantidad}</td>
                                    <td style={tdStyle}>${parseFloat(item.precioUnitario).toLocaleString('es-CL')}</td>
                                    <td style={tdStyle}>${item.totalNeto.toLocaleString('es-CL')}</td>
                                    <td style={tdStyle}>${item.totalBruto.toLocaleString('es-CL')}</td>
                                    <td style={tdStyle}>
                                        <button onClick={() => eliminarItem(index)} style={{color:'red', border:'none', background:'transparent', cursor:'pointer', fontSize:'1.2em'}}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {/* FOOTER CON TOTALES */}
                        <tfoot>
                            <tr style={{backgroundColor:'#edf2f7', fontWeight:'bold'}}>
                                <td colSpan="5" style={{padding:'10px', textAlign:'right'}}>TOTALES FACTURA:</td>
                                <td style={{padding:'10px', color:'#2c5282'}}>${totalNetoGlobal.toLocaleString('es-CL')}</td>
                                <td style={{padding:'10px', color:'#276749'}}>${totalBrutoGlobal.toLocaleString('es-CL')}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td colSpan="8" style={{textAlign:'right', padding:'5px', fontSize:'0.9em', color:'#718096'}}>
                                    (IVA Calculado: ${totalIvaGlobal.toLocaleString('es-CL')})
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style={{marginTop:'30px', textAlign:'center'}}>
                        <button 
                            onClick={confirmarIngreso} 
                            className="save-btn" 
                            style={{padding:'15px 40px', fontSize:'1.2em', backgroundColor:'#38a169', boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>
                            ✅ CONFIRMAR INGRESO
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}