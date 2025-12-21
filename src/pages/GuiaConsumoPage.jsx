import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Servicios
import { getAreas } from '../services/areaService';
import { buscarStockParaGuia, procesarGuiaConsumo } from '../services/salidaService';

export default function GuiaConsumoPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [areas, setAreas] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [encabezado, setEncabezado] = useState({
        fecha: new Date().toISOString().split('T')[0],
        areaOrigenId: '', 
        tipoSalida: 'CONSUMO'
    });

    const [productoActual, setProductoActual] = useState({
        sku: '', nombre: '', cantidad: '', unidad: '', stockDisponible: 0, areaDestinoId: ''
    });

    const [detalles, setDetalles] = useState([]);
    const [sugerencias, setSugerencias] = useState([]);
    const [busqueda, setBusqueda] = useState('');

    const esModoGeneral = encabezado.areaOrigenId === 'GENERAL';

    useEffect(() => {
        getAreas().then(setAreas).catch(console.error);
    }, []);

    // --- BÚSQUEDA DINÁMICA CORREGIDA ---
    useEffect(() => {
        const timer = setTimeout(async () => {
            // Validamos que el origen sea seleccionado y no sea un placeholder
            const origenValido = encabezado.areaOrigenId && encabezado.areaOrigenId !== "";

            if (busqueda.length > 1 && origenValido) {
                try {
                    // 1. Preparamos el ID (null para global, número para área específica)
                    const areaIdFinal = esModoGeneral ? null : parseInt(encabezado.areaOrigenId);
                    
                    // 2. LLAMADA CORREGIDA: Primero areaId, luego la búsqueda (según tu salidaService.js)
                    const data = await buscarStockParaGuia(areaIdFinal, busqueda);
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

    const agregarItem = () => {
        if (!productoActual.sku || !productoActual.cantidad) return alert("Complete los datos");
        
        const cant = parseFloat(productoActual.cantidad);
        if (cant > productoActual.stockDisponible) {
            return alert(`Stock insuficiente. Máximo: ${productoActual.stockDisponible}`);
        }

        if (esModoGeneral && !productoActual.areaDestinoId) {
            return alert("Debe seleccionar un destino en Modo General");
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
            alert("✅ Guía registrada y stock actualizado");
            navigate('/menu');
        } catch (error) {
            alert("❌ " + error.message);
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="inventory-container" style={{padding: '20px'}}>
            <h2 style={{borderBottom: '2px solid #3182ce', paddingBottom: '10px'}}>📋 Guía de Consumo / Salida</h2>
            
            <div className="form-card" style={{padding: '20px', backgroundColor: 'white', borderRadius: '8px', marginBottom: '20px'}}>
                <div style={{display: 'flex', gap: '20px'}}>
                    <div>
                        <label>Bodega Origen</label>
                        <select className="form-input" value={encabezado.areaOrigenId} onChange={e => setEncabezado({...encabezado, areaOrigenId: e.target.value})}>
                            <option value="">-- Seleccione --</option>
                            <option value="GENERAL">🌐 MODO GENERAL (Búsqueda Global)</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>Tipo Salida</label>
                        <select className="form-input" value={encabezado.tipoSalida} onChange={e => setEncabezado({...encabezado, tipoSalida: e.target.value})}>
                            <option value="CONSUMO">Consumo</option>
                            <option value="MERMA">Merma</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="form-card" style={{opacity: encabezado.areaOrigenId ? 1 : 0.5, pointerEvents: encabezado.areaOrigenId ? 'auto' : 'none', backgroundColor: 'white', padding: '20px', borderRadius: '8px'}}>
                <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '15px', alignItems: 'end'}}>
                    <div style={{position: 'relative'}}>
                        <label>Producto</label>
                        <input type="text" className="form-input" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre..."/>
                        {sugerencias.length > 0 && (
                            <ul className="dropdown-list" style={{position: 'absolute', width: '100%', zIndex: 10, background: 'white', border: '1px solid #ddd'}}>
                                {sugerencias.map((p, i) => (
                                    <li key={i} onClick={() => seleccionarProducto(p)} style={{padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee'}}>
                                        {p.nombreProducto} ({p.cantidadTotal} {p.unidadMedida} disp.)
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {esModoGeneral && (
                        <div>
                            <label>Destino</label>
                            <select className="form-input" value={productoActual.areaDestinoId} onChange={e => setProductoActual({...productoActual, areaDestinoId: e.target.value})}>
                                <option value="">-- Destino --</option>
                                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label>Cantidad</label>
                        <input type="number" className="form-input" value={productoActual.cantidad} onChange={e => setProductoActual({...productoActual, cantidad: e.target.value})}/>
                    </div>
                    <button onClick={agregarItem} className="save-btn" style={{backgroundColor: '#38a169', color: 'white', padding: '10px 15px', borderRadius: '4px', border: 'none'}}>➕ Añadir</button>
                </div>
            </div>

            {detalles.length > 0 && (
                <div className="form-card" style={{marginTop: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{textAlign: 'left', borderBottom: '2px solid #edf2f7'}}>
                                <th style={{padding: '10px'}}>Producto</th>
                                <th style={{padding: '10px'}}>Cant.</th>
                                {esModoGeneral && <th style={{padding: '10px'}}>Destino</th>}
                                <th style={{padding: '10px'}}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detalles.map((item, idx) => (
                                <tr key={idx} style={{borderBottom: '1px solid #edf2f7'}}>
                                    <td style={{padding: '10px'}}>{item.nombre}</td>
                                    <td style={{padding: '10px'}}>{item.cantidad} {item.unidad}</td>
                                    {esModoGeneral && <td style={{padding: '10px'}}>{item.areaDestinoNombre}</td>}
                                    <td style={{padding: '10px'}}><button onClick={() => setDetalles(detalles.filter((_, i) => i !== idx))} style={{color: 'red', border: 'none', background: 'none', cursor: 'pointer'}}>🗑️</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{textAlign: 'center', marginTop: '20px'}}>
                        <button onClick={finalizarGuia} disabled={isSubmitting} style={{padding: '12px 40px', backgroundColor: '#2d3748', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>
                            {isSubmitting ? "⏳ Procesando..." : "✅ FINALIZAR Y DESCONTAR"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}