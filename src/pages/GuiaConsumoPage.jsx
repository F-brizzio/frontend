import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAreas } from '../services/areaService';
import { buscarStockParaGuia, procesarGuiaConsumo } from '../services/salidaService';

export default function GuiaConsumoPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // ESTADOS
    const [areas, setAreas] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Pasos 1, 2 y 3: Cabecera
    const [encabezado, setEncabezado] = useState({
        fecha: new Date().toISOString().split('T')[0],
        areaOrigenId: '', 
        areaOrigenNombre: '',
        tipoSalida: 'CONSUMO'
    });

    // Pasos 4, 5 y 6: Selección de ítem
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

    // Búsqueda dinámica
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (busqueda.length > 1 && encabezado.areaOrigenId) {
                try {
                    const areaIdParam = esModoGeneral ? null : parseInt(encabezado.areaOrigenId);
                    const data = await buscarStockParaGuia(areaIdParam, busqueda);
                    setSugerencias(data);
                } catch (error) { console.error(error); }
            } else { setSugerencias([]); }
        }, 300);
        return () => clearTimeout(timer);
    }, [busqueda, encabezado.areaOrigenId, esModoGeneral]);

    // Paso 7: Añadir ítem a la lista (Paso 8 y 9 implícitos)
    const agregarItem = () => {
        if (!productoActual.sku || !productoActual.cantidad) return alert("Complete todos los campos.");
        
        const cant = parseFloat(productoActual.cantidad);
        if (cant > productoActual.stockDisponible) {
            return alert(`Stock insuficiente. Disponible: ${productoActual.stockDisponible}`);
        }

        const nuevoItem = {
            ...productoActual,
            fecha: encabezado.fecha,
            origen: encabezado.areaOrigenNombre,
            tipoSalida: encabezado.tipoSalida,
            areaDestinoNombre: areas.find(a => a.id.toString() === productoActual.areaDestinoId)?.nombre || 'Consumo Interno'
        };

        setDetalles([...detalles, nuevoItem]);
        // Limpiar para el siguiente producto (Paso 9)
        setProductoActual({ sku: '', nombre: '', cantidad: '', unidad: '', stockDisponible: 0, areaDestinoId: '' });
        setBusqueda('');
    };

    const finalizarGuia = async () => {
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
            alert("✅ Guía guardada con éxito.");
            navigate('/menu');
        } catch (error) {
            alert("❌ Error: " + error.message);
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="inventory-container" style={{padding: '20px'}}>
            <h2>📋 Nueva Guía de Consumo</h2>

            {/* PASOS 1, 2, 3: CABECERA */}
            <div className="form-card" style={{padding: '20px', backgroundColor: 'white', borderRadius: '8px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px'}}>
                <div>
                    <label>1) Fecha</label>
                    <input type="date" className="form-input" value={encabezado.fecha} onChange={e => setEncabezado({...encabezado, fecha: e.target.value})}/>
                </div>
                <div>
                    <label>2) Origen</label>
                    <select className="form-input" value={encabezado.areaOrigenId} onChange={e => {
                        const a = areas.find(x => x.id.toString() === e.target.value);
                        setEncabezado({...encabezado, areaOrigenId: e.target.value, areaOrigenNombre: a ? a.nombre : 'GENERAL'});
                    }}>
                        <option value="">-- Seleccione --</option>
                        <option value="GENERAL">GENERAL (Todo el Stock)</option>
                        {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label>3) Tipo de Salida</label>
                    <select className="form-input" value={encabezado.tipoSalida} onChange={e => setEncabezado({...encabezado, tipoSalida: e.target.value})}>
                        <option value="CONSUMO">Consumo Interno</option>
                        <option value="MERMA">Merma</option>
                    </select>
                </div>
            </div>

            {/* PASOS 4, 5, 6: SELECCIÓN */}
            <div className="form-card" style={{padding: '20px', backgroundColor: 'white', borderRadius: '8px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr auto', gap: '15px', alignItems: 'end', opacity: encabezado.areaOrigenId ? 1 : 0.5, pointerEvents: encabezado.areaOrigenId ? 'auto' : 'none'}}>
                <div style={{position: 'relative'}}>
                    <label>4) Nombre del Producto</label>
                    <input type="text" className="form-input" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Escriba para buscar..."/>
                    {sugerencias.length > 0 && (
                        <ul className="dropdown-list" style={{position: 'absolute', width: '100%', zIndex: 10, background: 'white', border: '1px solid #ddd'}}>
                            {sugerencias.map((p, i) => (
                                <li key={i} onClick={() => {
                                    setProductoActual({...productoActual, sku: p.sku, nombre: p.nombreProducto, unidad: p.unidadMedida, stockDisponible: p.cantidadTotal});
                                    setBusqueda(p.nombreProducto); setSugerencias([]);
                                }} style={{padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee'}}>
                                    {p.nombreProducto} ({p.cantidadTotal} disp.)
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div>
                    <label>5) Destino</label>
                    <select className="form-input" value={productoActual.areaDestinoId} onChange={e => setProductoActual({...productoActual, areaDestinoId: e.target.value})}>
                        <option value="">-- Seleccione Destino --</option>
                        {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label>6) Cantidad</label>
                    <input type="number" className="form-input" value={productoActual.cantidad} onChange={e => setProductoActual({...productoActual, cantidad: e.target.value})}/>
                </div>
                <button onClick={agregarItem} className="save-btn" style={{padding: '10px 20px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>
                    7) Añadir
                </button>
            </div>

            {/* PASOS 8 y 9: DETALLE Y TABLA */}
            {detalles.length > 0 && (
                <div className="form-card" style={{padding: '20px', backgroundColor: 'white', borderRadius: '8px'}}>
                    <h3>8) Detalle de la Guía</h3>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{textAlign: 'left', borderBottom: '2px solid #eee'}}>
                                <th style={{padding: '10px'}}>Fecha</th>
                                <th style={{padding: '10px'}}>Producto</th>
                                <th style={{padding: '10px'}}>Cantidad</th>
                                <th style={{padding: '10px'}}>Origen</th>
                                <th style={{padding: '10px'}}>Destino</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detalles.map((item, idx) => (
                                <tr key={idx} style={{borderBottom: '1px solid #eee'}}>
                                    <td style={{padding: '10px'}}>{item.fecha}</td>
                                    <td style={{padding: '10px'}}>{item.nombre}</td>
                                    <td style={{padding: '10px'}}>{item.cantidad} {item.unidad}</td>
                                    <td style={{padding: '10px'}}>{item.origen}</td>
                                    <td style={{padding: '10px'}}>{item.areaDestinoNombre}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{textAlign: 'center', marginTop: '20px'}}>
                        <button onClick={finalizarGuia} disabled={isSubmitting} style={{padding: '15px 40px', backgroundColor: '#2d3748', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'}}>
                            {isSubmitting ? "Procesando..." : "✅ FINALIZAR TODO"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}