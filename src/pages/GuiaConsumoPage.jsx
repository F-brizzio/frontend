import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Importación de servicios
import { getAreas } from '../services/areaService';
import { buscarStockParaGuia, procesarGuiaConsumo } from '../services/salidaService';

export default function GuiaConsumoPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // --- ESTADOS ---
    const [areas, setAreas] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Pasos 1, 2 y 3: Cabecera de la Guía
    const [encabezado, setEncabezado] = useState({
        fecha: new Date().toISOString().split('T')[0],
        areaOrigenId: '', // ID de la bodega o 'GENERAL'
        tipoSalida: 'CONSUMO'
    });

    // Pasos 4, 5 y 6: Datos del Producto a Añadir
    const [productoActual, setProductoActual] = useState({
        sku: '', 
        nombre: '', 
        cantidad: '', 
        unidad: '', 
        stockDisponible: 0, 
        areaOrigenId: null,      // Origen REAL detectado en la búsqueda
        areaOrigenNombre: '',    // Nombre REAL para mostrar en la tabla
        areaDestinoId: ''
    });

    const [detalles, setDetalles] = useState([]);
    const [sugerencias, setSugerencias] = useState([]);
    const [busqueda, setBusqueda] = useState('');

    const esModoGeneral = encabezado.areaOrigenId === 'GENERAL';

    // Carga inicial de áreas para selectores
    useEffect(() => {
        getAreas().then(setAreas).catch(console.error);
    }, []);

    // Paso 4: Búsqueda dinámica de productos (Debounce)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (busqueda.length > 1 && encabezado.areaOrigenId) {
                try {
                    // Si es GENERAL, enviamos null al backend para búsqueda global
                    const areaIdParam = esModoGeneral ? null : parseInt(encabezado.areaOrigenId);
                    const data = await buscarStockParaGuia(areaIdParam, busqueda);
                    setSugerencias(data);
                } catch (error) {
                    console.error("Error en búsqueda:", error);
                }
            } else {
                setSugerencias([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [busqueda, encabezado.areaOrigenId, esModoGeneral]);

    // Función para manejar la selección del producto desde el buscador
    const seleccionarProducto = (p) => {
        setProductoActual({
            ...productoActual,
            sku: p.sku,
            nombre: p.nombreProducto,
            unidad: p.unidadMedida,
            stockDisponible: p.cantidadTotal,
            areaOrigenId: p.areaId,       // Capturamos el origen FÍSICO
            areaOrigenNombre: p.areaNombre // Nombre del área para el detalle
        });
        setBusqueda(`${p.nombreProducto} (En ${p.areaNombre})`);
        setSugerencias([]);
    };

    // Paso 7: Añadir ítem a la lista (Visualización en Paso 8)
    const agregarItem = () => {
        if (!productoActual.sku || !productoActual.cantidad || !productoActual.areaDestinoId) {
            return alert("⚠️ Por favor, complete el producto, el destino y la cantidad.");
        }
        
        const cant = parseFloat(productoActual.cantidad);
        if (cant > productoActual.stockDisponible) {
            return alert(`❌ Stock insuficiente. Solo hay ${productoActual.stockDisponible} unidades en ${productoActual.areaOrigenNombre}.`);
        }

        const nuevoItem = {
            ...productoActual,
            fecha: encabezado.fecha,
            cantidad: cant,
            // Guardamos el nombre del destino para la tabla
            areaDestinoNombre: areas.find(a => a.id.toString() === productoActual.areaDestinoId)?.nombre || 'Consumo Interno'
        };

        setDetalles([...detalles, nuevoItem]);
        
        // Paso 9: Limpiar campos de selección para agregar más productos
        setProductoActual({ sku: '', nombre: '', cantidad: '', unidad: '', stockDisponible: 0, areaOrigenId: null, areaOrigenNombre: '', areaDestinoId: '' });
        setBusqueda('');
    };

    // Envío final de la Guía al Backend
    const finalizarGuia = async () => {
        if (detalles.length === 0) return alert("La guía no contiene productos.");
        
        setIsSubmitting(true);
        const payload = {
            areaOrigenId: esModoGeneral ? null : parseInt(encabezado.areaOrigenId),
            fecha: encabezado.fecha,
            responsable: user?.fullName || "Sistema Gestión",
            detalles: detalles.map(d => ({
                productSku: d.sku,
                cantidad: d.cantidad,
                tipoSalida: encabezado.tipoSalida,
                areaOrigenId: d.areaOrigenId, // Origen real de cada producto
                areaDestinoId: parseInt(d.areaDestinoId)
            }))
        };

        try {
            await procesarGuiaConsumo(payload);
            alert("✅ Guía registrada con éxito. Inventario actualizado.");
            navigate('/menu');
        } catch (error) {
            alert("❌ " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="inventory-container" style={{padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh'}}>
            <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
                <h2 style={{color: '#1a202c', margin: 0, fontSize: '1.5rem'}}>📋 Registro de Guía de Salida / Consumo</h2>
                <button onClick={() => navigate('/menu')} className="back-btn" style={{padding: '10px 20px'}}>⬅ Volver al Menú</button>
            </div>

            {/* SECCIÓN CABECERA: PASOS 1, 2, 3 */}
            <div className="form-card" style={{padding: '25px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '25px', borderTop: '5px solid #3182ce'}}>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px'}}>
                    <div className="form-group">
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>1) Fecha de Guía</label>
                        <input type="date" className="form-input" value={encabezado.fecha} onChange={e => setEncabezado({...encabezado, fecha: e.target.value})}/>
                    </div>
                    <div className="form-group">
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>2) Bodega de Origen</label>
                        <select className="form-input" value={encabezado.areaOrigenId} onChange={e => setEncabezado({...encabezado, areaOrigenId: e.target.value})}>
                            <option value="">-- Seleccione Origen --</option>
                            <option value="GENERAL">🌐 MODO GENERAL (Búsqueda Global)</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>3) Motivo de Salida</label>
                        <select className="form-input" value={encabezado.tipoSalida} onChange={e => setEncabezado({...encabezado, tipoSalida: e.target.value})}>
                            <option value="CONSUMO">Consumo Interno / Operativo</option>
                            <option value="MERMA">Merma / Desecho / Vencimiento</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* SECCIÓN PRODUCTO: PASOS 4, 5, 6, 7 */}
            <div className="form-card" style={{
                padding: '25px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '25px', borderTop: '5px solid #38a169',
                opacity: encabezado.areaOrigenId ? 1 : 0.5, pointerEvents: encabezado.areaOrigenId ? 'auto' : 'none'
            }}>
                <div style={{display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr auto', gap: '20px', alignItems: 'end'}}>
                    <div className="form-group" style={{position:'relative'}}>
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>4) Producto (Buscador Real)</label>
                        <input type="text" className="form-input" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Escriba el nombre del producto..."/>
                        {sugerencias.length > 0 && (
                            <ul className="dropdown-list" style={{position:'absolute', width:'100%', zIndex:100, background:'white', border:'1px solid #e2e8f0', borderRadius: '8px', boxShadow:'0 10px 15px rgba(0,0,0,0.1)', padding: '5px', listStyle: 'none', maxHeight: '250px', overflowY: 'auto'}}>
                                {sugerencias.map((p, i) => (
                                    <li key={i} onClick={() => seleccionarProducto(p)} style={{padding:'12px', cursor:'pointer', borderBottom:'1px solid #f1f5f9', fontSize: '0.9rem'}}>
                                        <div style={{fontWeight: 'bold'}}>{p.nombreProducto}</div>
                                        <div style={{color: '#64748b', fontSize: '0.8rem'}}>Área: {p.areaNombre} | Stock: {p.cantidadTotal} {p.unidadMedida}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="form-group">
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>5) Bodega de Destino</label>
                        <select className="form-input" value={productoActual.areaDestinoId} onChange={e => setProductoActual({...productoActual, areaDestinoId: e.target.value})}>
                            <option value="">-- Seleccione Destino --</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>6) Cantidad</label>
                        <input type="number" className="form-input" value={productoActual.cantidad} onChange={e => setProductoActual({...productoActual, cantidad: e.target.value})} placeholder="0.00"/>
                    </div>
                    <button onClick={agregarItem} className="save-btn" style={{padding: '12px 25px', backgroundColor: '#38a169', color: 'white', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer'}}>
                        7) Añadir a Lista
                    </button>
                </div>
            </div>

            {/* SECCIÓN DETALLE: PASO 8 */}
            {detalles.length > 0 && (
                <div className="form-card" style={{padding: '25px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                    <h3 style={{marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', color: '#2d3748'}}>8) Detalle de la Guía Actual</h3>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{textAlign: 'left', borderBottom: '2px solid #edf2f7', color: '#718096', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                                <th style={{padding: '12px'}}>Fecha</th>
                                <th style={{padding: '12px'}}>Producto / SKU</th>
                                <th style={{padding: '12px'}}>Cantidad</th>
                                <th style={{padding: '12px'}}>Origen Físico</th>
                                <th style={{padding: '12px'}}>Destino Final</th>
                                <th style={{padding: '12px', textAlign: 'right'}}>Valor Neto</th>
                                <th style={{padding: '12px', textAlign: 'center'}}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detalles.map((item, idx) => (
                                <tr key={idx} style={{borderBottom: '1px solid #f1f5f9'}}>
                                    <td style={{padding: '15px'}}>{item.fecha}</td>
                                    <td style={{padding: '15px'}}>
                                        <div style={{fontWeight: '600'}}>{item.nombre}</div>
                                        <div style={{fontSize: '0.75rem', color: '#94a3b8'}}>{item.sku}</div>
                                    </td>
                                    <td style={{padding: '15px'}}>{item.cantidad} {item.unidad}</td>
                                    <td style={{padding: '15px'}}>
                                        <span style={{padding: '4px 8px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold'}}>
                                            {item.areaOrigenNombre}
                                        </span>
                                    </td>
                                    <td style={{padding: '15px'}}>{item.areaDestinoNombre}</td>
                                    <td style={{padding: '15px', textAlign: 'right', color: '#64748b'}}><em>FIFO (Auto)</em></td>
                                    <td style={{padding: '15px', textAlign: 'center'}}>
                                        <button onClick={() => setDetalles(detalles.filter((_, i) => i !== idx))} style={{color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem'}}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{textAlign: 'center', marginTop: '40px', borderTop: '1px solid #edf2f7', paddingTop: '30px'}}>
                        <button 
                            onClick={finalizarGuia} 
                            disabled={isSubmitting} 
                            style={{padding: '18px 60px', backgroundColor: isSubmitting ? '#94a3b8' : '#1e293b', color: 'white', borderRadius: '10px', fontSize: '1rem', fontWeight: 'bold', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s'}}
                        >
                            {isSubmitting ? "⌛ PROCESANDO..." : "✅ FINALIZAR Y ACTUALIZAR INVENTARIO"}
                        </button>
                        <p style={{fontSize: '0.8rem', color: '#94a3b8', marginTop: '10px'}}>Paso 9: Puede seguir agregando productos antes de finalizar.</p>
                    </div>
                </div>
            )}
        </div>
    );
}