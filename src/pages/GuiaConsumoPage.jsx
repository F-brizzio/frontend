import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Importación de servicios corregidos
import { getAreas } from '../services/areaService';
import { buscarStockParaGuia, procesarGuiaConsumo } from '../services/salidaService';

export default function GuiaConsumoPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // --- ESTADOS ---
    const [areas, setAreas] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Sección 1: Encabezado
    const [encabezado, setEncabezado] = useState({
        fecha: new Date().toISOString().split('T')[0],
        areaOrigenId: '', // ID numérico o vacío para Modo General
        tipoSalida: 'CONSUMO'
    });

    // Sección 2: Producto Actual
    const [productoActual, setProductoActual] = useState({
        sku: '', nombre: '', cantidad: '', unidad: '', stockDisponible: 0, areaDestinoId: ''
    });

    const [detalles, setDetalles] = useState([]);
    const [sugerencias, setSugerencias] = useState([]);
    const [busqueda, setBusqueda] = useState('');

    // Lógica de validación
    const seccion1Lista = Boolean(encabezado.fecha && (encabezado.areaOrigenId !== ''));
    const esModoGeneral = encabezado.areaOrigenId === 'GENERAL';

    // --- CARGA DE ÁREAS ---
    useEffect(() => {
        getAreas().then(setAreas).catch(console.error);
    }, []);

    // --- BÚSQUEDA DINÁMICA (Debounce) ---
    useEffect(() => {
        const timer = setTimeout(async () => {
            // Evitamos buscar si no hay texto o si el origen no es válido
            if (busqueda.length > 1 && encabezado.areaOrigenId) {
                try {
                    // PARCHE SEGURIDAD: Si es General enviamos null, sino el ID numérico
                    const areaIdFinal = esModoGeneral ? null : parseInt(encabezado.areaOrigenId);
                    
                    if (!esModoGeneral && isNaN(areaIdFinal)) return; // Evita enviar "so" o textos inválidos

                    const data = await buscarStockParaGuia(busqueda, areaIdFinal);
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

    // --- GESTIÓN DE LA LISTA ---
    const agregarItem = () => {
        if (!productoActual.sku || !productoActual.cantidad) return alert("Complete los datos del producto");
        
        const cant = parseFloat(productoActual.cantidad);
        if (cant > productoActual.stockDisponible) {
            return alert(`Stock insuficiente. Disponible: ${productoActual.stockDisponible}`);
        }

        if (esModoGeneral && !productoActual.areaDestinoId) {
            return alert("En Modo General debe seleccionar un destino");
        }

        const nuevoItem = {
            ...productoActual,
            cantidad: cant,
            tipoSalida: encabezado.tipoSalida,
            areaDestinoNombre: areas.find(a => a.id.toString() === productoActual.areaDestinoId)?.nombre || 'Consumo'
        };

        setDetalles([...detalles, nuevoItem]);
        setProductoActual({ sku: '', nombre: '', cantidad: '', unidad: '', stockDisponible: 0, areaDestinoId: '' });
        setBusqueda('');
    };

    const finalizarGuia = async () => {
        if (detalles.length === 0) return;
        setIsSubmitting(true);
        
        const payload = {
            areaOrigenId: esModoGeneral ? null : parseInt(encabezado.areaOrigenId),
            fecha: encabezado.fecha,
            responsable: user?.fullName || "Sistema",
            detalles: detalles.map(d => ({
                productSku: d.sku,
                cantidad: d.cantidad,
                tipoSalida: d.tipoSalida,
                areaDestinoId: d.areaDestinoId ? parseInt(d.areaDestinoId) : null
            }))
        };

        try {
            await procesarGuiaConsumo(payload);
            alert("✅ Guía procesada correctamente");
            navigate('/menu');
        } catch (error) {
            alert("❌ Error: " + error.message);
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="inventory-container" style={{padding: '20px'}}>
            <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
                <h2>📋 Nueva Guía de Salida</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Volver</button>
            </div>

            {/* SECCIÓN 1 */}
            <div className="form-card" style={{padding: '20px', marginBottom: '20px', borderTop: '4px solid #3182ce', backgroundColor: 'white', borderRadius: '8px'}}>
                <div className="form-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                    <div className="form-group">
                        <label>Fecha</label>
                        <input type="date" className="form-input" value={encabezado.fecha} onChange={e => setEncabezado({...encabezado, fecha: e.target.value})}/>
                    </div>
                    <div className="form-group">
                        <label>Origen</label>
                        <select className="form-input" value={encabezado.areaOrigenId} onChange={e => setEncabezado({...encabezado, areaOrigenId: e.target.value})}>
                            <option value="">-- Seleccione --</option>
                            <option value="GENERAL">🌐 MODO GENERAL (Todo el Stock)</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Tipo</label>
                        <select className="form-input" value={encabezado.tipoSalida} onChange={e => setEncabezado({...encabezado, tipoSalida: e.target.value})}>
                            <option value="CONSUMO">Consumo</option>
                            <option value="MERMA">Merma</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2 */}
            <div className="form-card" style={{
                padding: '20px', borderRadius: '8px', backgroundColor: 'white', borderTop: '4px solid #38a169',
                opacity: encabezado.areaOrigenId ? 1 : 0.5, pointerEvents: encabezado.areaOrigenId ? 'auto' : 'none'
            }}>
                <div className="form-grid" style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '15px', alignItems: 'end'}}>
                    <div className="form-group" style={{position:'relative'}}>
                        <label>Producto</label>
                        <input type="text" className="form-input" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Escriba nombre..."/>
                        {sugerencias.length > 0 && (
                            <ul className="dropdown-list" style={{position:'absolute', width:'100%', zIndex:100, background:'white', border:'1px solid #ddd', listStyle:'none', padding:0}}>
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
                            <label>Destino</label>
                            <select className="form-input" value={productoActual.areaDestinoId} onChange={e => setProductoActual({...productoActual, areaDestinoId: e.target.value})}>
                                <option value="">-- Seleccione --</option>
                                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="form-group">
                        <label>Cantidad</label>
                        <input type="number" className="form-input" value={productoActual.cantidad} onChange={e => setProductoActual({...productoActual, cantidad: e.target.value})}/>
                    </div>
                    <button onClick={agregarItem} className="save-btn" style={{padding: '10px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>➕</button>
                </div>
            </div>

            {/* TABLA DETALLE */}
            {detalles.length > 0 && (
                <div className="form-card" style={{marginTop: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{textAlign: 'left', borderBottom: '2px solid #eee'}}>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                {esModoGeneral && <th>Destino</th>}
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detalles.map((item, idx) => (
                                <tr key={idx} style={{borderBottom: '1px solid #eee'}}>
                                    <td>{item.nombre}</td>
                                    <td>{item.cantidad} {item.unidad}</td>
                                    {esModoGeneral && <td>{item.areaDestinoNombre}</td>}
                                    <td><button onClick={() => setDetalles(detalles.filter((_, i) => i !== idx))} style={{color: 'red', border: 'none', background: 'none', cursor: 'pointer'}}>🗑️</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{textAlign: 'center', marginTop: '20px'}}>
                        <button onClick={finalizarGuia} disabled={isSubmitting} className="save-btn" style={{padding: '15px 30px', backgroundColor: '#2d3748', color: 'white', borderRadius: '8px', cursor: 'pointer'}}>
                            {isSubmitting ? "Procesando..." : "✅ FINALIZAR GUÍA"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}