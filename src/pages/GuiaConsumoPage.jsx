import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAreas } from '../services/areaService';
import { buscarStockParaGuia } from '../services/inventoryService'; // Asegúrate de tener este servicio
import { procesarGuiaConsumo } from '../services/salidaService';
import { useAuth } from '../context/AuthContext';

export default function GuiaConsumoPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // --- 1. ESTADOS ---
    const [areas, setAreas] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [encabezado, setEncabezado] = useState({
        fecha: new Date().toISOString().split('T')[0],
        areaOrigenId: '',
        areaOrigenNombre: '',
        tipoSalida: 'CONSUMO'
    });

    const [productoActual, setProductoActual] = useState({
        sku: '', nombre: '', cantidad: '', unidad: '', stockDisponible: 0, areaDestinoId: ''
    });

    const [detalles, setDetalles] = useState([]);
    const [sugerencias, setSugerencias] = useState([]);
    const [busqueda, setBusqueda] = useState('');

    // Validación: ¿Sección 1 lista?
    const seccion1Lista = Boolean(encabezado.fecha && encabezado.areaOrigenId);
    // ¿Es modo transferencia (Origen General)?
    const esModoGeneral = encabezado.areaOrigenNombre?.toUpperCase() === 'GENERAL';

    // --- 2. CARGA DE DATOS ---
    useEffect(() => {
        getAreas().then(setAreas);
    }, []);

    // --- 3. LÓGICA DE BÚSQUEDA ---
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (busqueda.length > 1 && seccion1Lista) {
                // Si es General, el backend debería permitir buscar en ID de General (o pasar null para buscar todo)
                const data = await buscarStockParaGuia(encabezado.areaOrigenId, busqueda);
                setSugerencias(data);
            } else {
                setSugerencias([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [busqueda, encabezado.areaOrigenId, seccion1Lista]);

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

    // --- 4. ACCIONES ---
    const agregarItem = () => {
        if (!productoActual.sku || !productoActual.cantidad) return alert("Complete los datos del producto");
        if (parseFloat(productoActual.cantidad) > productoActual.stockDisponible) {
            return alert("No hay stock suficiente en esta ubicación");
        }
        if (esModoGeneral && !productoActual.areaDestinoId) {
            return alert("Debe seleccionar un área de destino para el modo General");
        }

        const nuevoItem = {
            ...productoActual,
            cantidad: parseFloat(productoActual.cantidad),
            tipoSalida: encabezado.tipoSalida,
            areaDestinoNombre: areas.find(a => a.id.toString() === productoActual.areaDestinoId)?.nombre || 'Consumo Interno'
        };

        setDetalles([...detalles, nuevoItem]);
        setProductoActual({ sku: '', nombre: '', cantidad: '', unidad: '', stockDisponible: 0, areaDestinoId: '' });
        setBusqueda('');
    };

    const finalizarGuia = async () => {
        if (detalles.length === 0) return;
        setIsSubmitting(true);
        
        const payload = {
            areaOrigenId: encabezado.areaOrigenId,
            fecha: encabezado.fecha,
            responsable: user?.fullName || "Sistema",
            detalles: detalles.map(d => ({
                productSku: d.sku,
                cantidad: d.cantidad,
                tipoSalida: d.tipoSalida,
                areaDestinoId: d.areaDestinoId || null
            }))
        };

        try {
            await procesarGuiaConsumo(payload);
            alert("✅ Guía registrada y stock actualizado (FIFO)");
            navigate('/menu');
        } catch (error) {
            alert("❌ Error: " + (error.response?.data || error.message));
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="inventory-container" style={{padding: '20px', backgroundColor: '#f4f7f6'}}>
            <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
                <h2 style={{color: '#2d3748'}}>📋 Registro Guía de Consumo / Merma</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Volver</button>
            </div>

            {/* SECCIÓN 1: CABECERA */}
            <div className="form-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px', borderTop: '4px solid #3182ce' }}>
                <h3 style={{marginTop: 0, color: '#3182ce', fontSize: '1rem'}}>1. Origen y Fecha</h3>
                <div className="form-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                    <div className="form-group">
                        <label>Fecha de Salida</label>
                        <input type="date" className="form-input" value={encabezado.fecha} onChange={e => setEncabezado({...encabezado, fecha: e.target.value})}/>
                    </div>
                    <div className="form-group">
                        <label>Área de Origen</label>
                        <select className="form-input" value={encabezado.areaOrigenId} onChange={e => {
                            const area = areas.find(a => a.id.toString() === e.target.value);
                            setEncabezado({...encabezado, areaOrigenId: e.target.value, areaOrigenNombre: area?.nombre});
                            setDetalles([]); // Limpiar tabla si cambia el origen
                        }}>
                            <option value="">Seleccione...</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Tipo de Movimiento</label>
                        <select className="form-input" value={encabezado.tipoSalida} onChange={e => setEncabezado({...encabezado, tipoSalida: e.target.value})}>
                            <option value="CONSUMO">Consumo</option>
                            <option value="MERMA">Merma</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: SELECCIÓN DE PRODUCTOS */}
            <div className="form-card" style={{ 
                background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px', borderTop: '4px solid #38a169',
                opacity: seccion1Lista ? 1 : 0.6, pointerEvents: seccion1Lista ? 'auto' : 'none'
            }}>
                <h3 style={{marginTop: 0, color: '#38a169', fontSize: '1rem'}}>2. Selección de Productos {!seccion1Lista && " (Bloqueado)"}</h3>
                <div className="form-grid" style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '15px', alignItems: 'end'}}>
                    <div className="form-group" style={{position:'relative'}}>
                        <label>Buscar Producto (Nombre)</label>
                        <input type="text" className="form-input" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Escriba el nombre..."/>
                        {sugerencias.length > 0 && (
                            <ul className="dropdown-list" style={{position:'absolute', width:'100%', zIndex:100, background:'white', border:'1px solid #ddd', listStyle:'none', padding:0, maxHeight:'200px', overflowY:'auto'}}>
                                {sugerencias.map((p, i) => (
                                    <li key={i} onClick={() => seleccionarProducto(p)} style={{padding:'8px', cursor:'pointer', borderBottom:'1px solid #eee'}}>
                                        {p.nombreProducto} <small>({p.cantidadTotal} disp.)</small>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {esModoGeneral && (
                        <div className="form-group">
                            <label>Área Destino</label>
                            <select className="form-input" value={productoActual.areaDestinoId} onChange={e => setProductoActual({...productoActual, areaDestinoId: e.target.value})}>
                                <option value="">Seleccione...</option>
                                {areas.filter(a => a.nombre !== 'General').map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="form-group">
                        <label>Cantidad</label>
                        <input type="number" className="form-input" value={productoActual.cantidad} onChange={e => setProductoActual({...productoActual, cantidad: e.target.value})} placeholder="0"/>
                    </div>
                    <div className="form-group" style={{fontSize: '0.8rem', color: '#666', paddingBottom: '10px'}}>
                        Unidad: {productoActual.unidad || '-'}
                    </div>
                    <button onClick={agregarItem} className="save-btn" style={{backgroundColor: '#38a169', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>
                        ➕ Añadir
                    </button>
                </div>
            </div>

            {/* TABLA DE DETALLE */}
            {detalles.length > 0 && (
                <div className="form-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{marginBottom: '15px', padding: '10px', background: '#edf2f7', borderRadius: '4px', fontSize: '0.9rem'}}>
                        <strong>Resumen Guía:</strong> {encabezado.fecha} | Origen: {encabezado.areaOrigenNombre}
                    </div>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{borderBottom: '2px solid #edf2f7', textAlign: 'left', fontSize: '0.9rem'}}>
                                <th style={{padding: '10px'}}>Producto</th>
                                <th style={{padding: '10px'}}>Origen</th>
                                {esModoGeneral && <th style={{padding: '10px'}}>Destino</th>}
                                <th style={{padding: '10px'}}>Cantidad</th>
                                <th style={{padding: '10px'}}>Valor Neto</th>
                                <th style={{padding: '10px'}}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detalles.map((item, idx) => (
                                <tr key={idx} style={{borderBottom: '1px solid #eee', fontSize: '0.9rem'}}>
                                    <td style={{padding: '10px'}}>{item.nombre} <br/><small>{item.sku}</small></td>
                                    <td style={{padding: '10px'}}>{encabezado.areaOrigenNombre}</td>
                                    {esModoGeneral && <td style={{padding: '10px'}}>{item.areaDestinoNombre}</td>}
                                    <td style={{padding: '10px'}}>{item.cantidad} {item.unidad}</td>
                                    <td style={{padding: '10px', color: '#718096'}}><em>FIFO (Calculado)</em></td>
                                    <td style={{padding: '10px'}}>
                                        <button onClick={() => setDetalles(detalles.filter((_, i) => i !== idx))} style={{background:'none', border:'none', color:'#e53e3e', cursor:'pointer'}}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{textAlign: 'center', marginTop: '30px'}}>
                        <button onClick={finalizarGuia} disabled={isSubmitting} className="save-btn" style={{padding: '15px 40px', backgroundColor: isSubmitting ? '#a0aec0' : '#2d3748', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'}}>
                            {isSubmitting ? "Procesando..." : "✅ CONFIRMAR Y DESCONTAR STOCK"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}