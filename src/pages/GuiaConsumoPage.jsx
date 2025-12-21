import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Servicios corregidos
import { getAreas } from '../services/areaService';
import { buscarStockParaGuia, procesarGuiaConsumo } from '../services/salidaService';

export default function GuiaConsumoPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // --- 1. ESTADOS ---
    const [areas, setAreas] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Estado del Encabezado (Sección 1)
    const [encabezado, setEncabezado] = useState({
        fecha: new Date().toISOString().split('T')[0],
        areaOrigenId: '',
        areaOrigenNombre: '',
        tipoSalida: 'CONSUMO' // Por defecto Consumo
    });

    // Estado del Producto actual (Sección 2)
    const [productoActual, setProductoActual] = useState({
        sku: '', 
        nombre: '', 
        cantidad: '', 
        unidad: '', 
        stockDisponible: 0, 
        areaDestinoId: ''
    });

    const [detalles, setDetalles] = useState([]);
    const [sugerencias, setSugerencias] = useState([]);
    const [busqueda, setBusqueda] = useState('');

    // Validaciones derivadas
    const seccion1Lista = Boolean(encabezado.fecha && encabezado.areaOrigenId);
    // IMPORTANTE: El Modo General se activa si el usuario elige la opción manual "GENERAL"
    const esModoGeneral = encabezado.areaOrigenId === 'MODO_GENERAL';

    // --- 2. CARGA INICIAL ---
    useEffect(() => {
        getAreas().then(data => setAreas(Array.isArray(data) ? data : []));
    }, []);

    // --- 3. LÓGICA DE BÚSQUEDA DINÁMICA ---
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (busqueda.length > 1 && seccion1Lista) {
                try {
                    // Si es Modo General, enviamos null al areaId para activar búsqueda global en backend
                    const idParaBusqueda = esModoGeneral ? null : encabezado.areaOrigenId;
                    const data = await buscarStockParaGuia(busqueda, idParaBusqueda);
                    setSugerencias(data);
                } catch (error) {
                    console.error("Error buscando stock:", error);
                }
            } else {
                setSugerencias([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [busqueda, encabezado.areaOrigenId, seccion1Lista, esModoGeneral]);

    const seleccionarProducto = (p) => {
        setProductoActual({
            ...productoActual,
            sku: p.sku,
            nombre: p.nombreProducto,
            unidad: p.unidadMedida,
            stockDisponible: p.cantidadTotal
        });
        setBusqueda(p.nombreProducto);
        setSugerencias([]);
    };

    // --- 4. MANEJO DE ITEMS ---
    const agregarItem = () => {
        if (!productoActual.sku || !productoActual.cantidad) return alert("⚠️ Seleccione un producto e ingrese cantidad.");
        
        const cantNum = parseFloat(productoActual.cantidad);
        if (cantNum > productoActual.stockDisponible) {
            return alert(`❌ Stock insuficiente. Solo hay ${productoActual.stockDisponible} ${productoActual.unidad} disponibles.`);
        }

        if (esModoGeneral && !productoActual.areaDestinoId) {
            return alert("⚠️ En Modo General debe seleccionar un Área de Destino.");
        }

        const nuevoItem = {
            ...productoActual,
            cantidad: cantNum,
            tipoSalida: encabezado.tipoSalida,
            // Guardamos el nombre del destino para la tabla
            areaDestinoNombre: areas.find(a => a.id.toString() === productoActual.areaDestinoId)?.nombre || 'Consumo Interno'
        };

        setDetalles([...detalles, nuevoItem]);
        
        // Limpiar para el siguiente producto
        setProductoActual({ sku: '', nombre: '', cantidad: '', unidad: '', stockDisponible: 0, areaDestinoId: '' });
        setBusqueda('');
    };

    const eliminarItem = (index) => {
        setDetalles(detalles.filter((_, i) => i !== index));
    };

    // --- 5. ENVÍO FINAL ---
    const handleFinalizarGuia = async () => {
        if (detalles.length === 0) return alert("La guía no tiene productos.");
        if (!window.confirm("¿Confirmar salida de mercadería?")) return;

        setIsSubmitting(true);
        
        const payload = {
            // Si es general, el areaOrigenId de cabecera puede ser null (el backend usará el del detalle)
            areaOrigenId: esModoGeneral ? null : parseInt(encabezado.areaOrigenId),
            fecha: encabezado.fecha,
            responsable: user?.fullName || "Usuario Sistema",
            detalles: detalles.map(d => ({
                productSku: d.sku,
                cantidad: d.cantidad,
                tipoSalida: d.tipoSalida,
                areaDestinoId: d.areaDestinoId ? parseInt(d.areaDestinoId) : null
            }))
        };

        try {
            await procesarGuiaConsumo(payload);
            alert("✅ Guía procesada con éxito. El stock ha sido descontado (FIFO).");
            navigate('/menu');
        } catch (error) {
            alert("❌ " + (error.message || "Error al procesar la salida"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="inventory-container" style={{padding: '20px', backgroundColor: '#f4f7f6'}}>
            <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
                <h2 style={{color: '#2d3748'}}>📋 Registro Guía de Salida</h2>
                <button onClick={() => navigate('/menu')} className="back-btn" style={{padding: '8px 16px', cursor:'pointer'}}>⬅ Volver</button>
            </div>

            {/* SECCIÓN 1: CABECERA */}
            <div className="form-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px', borderTop: '4px solid #3182ce' }}>
                <h3 style={{marginTop: 0, color: '#3182ce', fontSize: '1rem'}}>1. Información de Origen</h3>
                <div className="form-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                    <div className="form-group">
                        <label>Fecha</label>
                        <input type="date" className="form-input" value={encabezado.fecha} onChange={e => setEncabezado({...encabezado, fecha: e.target.value})}/>
                    </div>
                    <div className="form-group">
                        <label>Bodega de Origen</label>
                        <select 
                            className="form-input" 
                            value={encabezado.areaOrigenId} 
                            onChange={e => {
                                const area = areas.find(a => a.id.toString() === e.target.value);
                                setEncabezado({
                                    ...encabezado, 
                                    areaOrigenId: e.target.value, 
                                    areaOrigenNombre: area ? area.nombre : 'Modo General'
                                });
                                setDetalles([]); // Limpiar tabla si cambia origen por seguridad
                            }}
                        >
                            <option value="">-- Seleccione Origen --</option>
                            <option value="MODO_GENERAL">🌐 MODO GENERAL (Búsqueda en todo el Stock)</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Tipo de Salida</label>
                        <select className="form-input" value={encabezado.tipoSalida} onChange={e => setEncabezado({...encabezado, tipoSalida: e.target.value})}>
                            <option value="CONSUMO">Consumo Interno</option>
                            <option value="MERMA">Merma / Desecho</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: BUSCADOR Y PRODUCTO */}
            <div className="form-card" style={{ 
                background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px', borderTop: '4px solid #38a169',
                opacity: seccion1Lista ? 1 : 0.6, pointerEvents: seccion1Lista ? 'auto' : 'none'
            }}>
                <h3 style={{marginTop: 0, color: '#38a169', fontSize: '1rem'}}>
                    2. Selección de Productos {!seccion1Lista && <small style={{color: '#e53e3e'}}> (Seleccione Origen primero)</small>}
                </h3>
                
                <div className="form-grid" style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '15px', alignItems: 'end'}}>
                    {/* Buscador por nombre */}
                    <div className="form-group" style={{position:'relative'}}>
                        <label>Buscar Producto (Stock en tiempo real)</label>
                        <input 
                            type="text" 
                            className="form-input" 
                            value={busqueda} 
                            onChange={e => {setBusqueda(e.target.value); setProductoActual({...productoActual, sku:''});}} 
                            placeholder="Escriba el nombre del producto..."
                            autoComplete="off"
                        />
                        {sugerencias.length > 0 && (
                            <ul className="dropdown-list" style={{position:'absolute', width:'100%', zIndex:100, background:'white', border:'1px solid #ddd', listStyle:'none', padding:0, maxHeight:'200px', overflowY:'auto', boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>
                                {sugerencias.map((p, i) => (
                                    <li key={i} onClick={() => seleccionarProducto(p)} style={{padding:'10px', cursor:'pointer', borderBottom:'1px solid #eee', fontSize:'0.9rem'}}>
                                        <strong>{p.nombreProducto}</strong> <br/>
                                        <small style={{color:'#666'}}>{p.sku} | Disponible: {p.cantidadTotal} {p.unidadMedida}</small>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Selector de Destino (Solo si es Modo General) */}
                    {esModoGeneral && (
                        <div className="form-group">
                            <label>Bodega Destino</label>
                            <select 
                                className="form-input" 
                                value={productoActual.areaDestinoId} 
                                onChange={e => setProductoActual({...productoActual, areaDestinoId: e.target.value})}
                            >
                                <option value="">-- Destino --</option>
                                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Cantidad a Sacar</label>
                        <input 
                            type="number" 
                            className="form-input" 
                            value={productoActual.cantidad} 
                            onChange={e => setProductoActual({...productoActual, cantidad: e.target.value})} 
                            placeholder={productoActual.sku ? `Máx: ${productoActual.stockDisponible}` : "0"}
                        />
                    </div>

                    <div className="form-group" style={{paddingBottom:'10px', fontSize:'0.85rem', color:'#718096'}}>
                        U. Medida: <strong>{productoActual.unidad || '-'}</strong>
                    </div>

                    <button onClick={agregarItem} className="save-btn" style={{backgroundColor: '#38a169', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold'}}>
                        ➕ Añadir
                    </button>
                </div>
            </div>

            {/* SECCIÓN 3: LISTA DE PRODUCTOS APROBADOS */}
            {detalles.length > 0 && (
                <div className="form-card" style={{ background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div><strong>Fecha Guía:</strong> {encabezado.fecha}</div>
                        <div style={{textAlign: 'right'}}><strong>Origen Principal:</strong> {encabezado.areaOrigenNombre}</div>
                    </div>

                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{borderBottom: '2px solid #edf2f7', textAlign: 'left', color: '#4a5568'}}>
                                <th style={{padding: '12px'}}>Producto / SKU</th>
                                <th style={{padding: '12px'}}>Motivo</th>
                                {esModoGeneral && <th style={{padding: '12px'}}>Destino</th>}
                                <th style={{padding: '12px', textAlign: 'right'}}>Cantidad</th>
                                <th style={{padding: '12px', textAlign: 'right'}}>Valor Neto</th>
                                <th style={{padding: '12px', textAlign: 'center'}}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detalles.map((item, idx) => (
                                <tr key={idx} style={{borderBottom: '1px solid #edf2f7'}}>
                                    <td style={{padding: '12px'}}>
                                        <strong>{item.nombre}</strong> <br/>
                                        <small style={{color: '#718096'}}>{item.sku}</small>
                                    </td>
                                    <td style={{padding: '12px'}}>
                                        <span className={`badge ${item.tipoSalida === 'MERMA' ? 'badge-merma' : 'badge-category'}`} style={{padding:'4px 8px', borderRadius:'4px', fontSize:'0.75rem', backgroundColor: item.tipoSalida === 'MERMA' ? '#fed7d7' : '#ebf8ff', color: item.tipoSalida === 'MERMA' ? '#c53030' : '#2b6cb0'}}>
                                            {item.tipoSalida}
                                        </span>
                                    </td>
                                    {esModoGeneral && <td style={{padding: '12px'}}>{item.areaDestinoNombre}</td>}
                                    <td style={{padding: '12px', textAlign: 'right'}}>{item.cantidad} {item.unidad}</td>
                                    <td style={{padding: '12px', textAlign: 'right', color: '#718096'}}>
                                        <em>FIFO (Backend)</em>
                                    </td>
                                    <td style={{padding: '12px', textAlign: 'center'}}>
                                        <button onClick={() => eliminarItem(idx)} style={{background: 'none', border: 'none', cursor: 'pointer', color:'#e53e3e'}} title="Eliminar">🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{textAlign: 'center', marginTop: '30px'}}>
                        <button 
                            onClick={handleFinalizarGuia} 
                            disabled={isSubmitting} 
                            style={{padding: '15px 50px', backgroundColor: isSubmitting ? '#a0aec0' : '#2d3748', color: 'white', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}}
                        >
                            {isSubmitting ? "⏳ Procesando..." : "✅ FINALIZAR Y DESCONTAR INVENTARIO"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}