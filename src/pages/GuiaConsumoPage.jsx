import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Importación de servicios
import { getAreas } from '../services/areaService';
import { buscarStockParaGuia, procesarGuiaConsumo } from '../services/salidaService';

export default function GuiaConsumoPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const formRef = useRef(null);

    const [areas, setAreas] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [encabezado, setEncabezado] = useState({
        fecha: new Date().toISOString().split('T')[0],
        areaOrigenId: '', 
        areaOrigenNombre: '', 
        tipoSalida: 'CONSUMO'
    });

    const [productoActual, setProductoActual] = useState({
        sku: '', nombre: '', cantidad: '', unidad: '', stockDisponible: 0, 
        areaOrigenId: null, areaOrigenNombre: '', areaDestinoId: ''
    });

    const [detalles, setDetalles] = useState([]);
    const [sugerencias, setSugerencias] = useState([]);
    const [busqueda, setBusqueda] = useState('');

    const esModoGeneral = encabezado.areaOrigenId === 'GENERAL';

    useEffect(() => {
        getAreas().then(setAreas).catch(console.error);
    }, []);

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

    const seleccionarProducto = (p) => {
        setProductoActual({
            ...productoActual,
            sku: p.sku,
            nombre: p.nombreProducto,
            unidad: p.unidadMedida,
            stockDisponible: p.cantidadTotal,
            areaOrigenId: p.areaId,       
            areaOrigenNombre: p.areaNombre,
            areaDestinoId: productoActual.areaDestinoId 
        });
        setBusqueda(`${p.nombreProducto} (${p.areaNombre})`);
        setSugerencias([]);
    };

    const agregarItem = () => {
        if (!productoActual.sku || !productoActual.cantidad) {
            return alert("⚠️ Por favor, complete el producto y la cantidad.");
        }
        if (esModoGeneral && !productoActual.areaDestinoId) {
            return alert("⚠️ En Modo General es obligatorio seleccionar un Destino.");
        }
        
        const cant = parseFloat(productoActual.cantidad);
        if (cant > productoActual.stockDisponible) {
            return alert(`❌ Stock insuficiente. Disponible: ${productoActual.stockDisponible}`);
        }

        let nombreDestino = "Consumo en Origen";
        if (esModoGeneral) {
            nombreDestino = areas.find(a => a.id.toString() === productoActual.areaDestinoId)?.nombre || 'Desconocido';
        }

        const nuevoItem = {
            ...productoActual, 
            fecha: encabezado.fecha,
            cantidad: cant,
            areaDestinoNombre: nombreDestino
        };

        setDetalles([...detalles, nuevoItem]);
        setProductoActual({ sku: '', nombre: '', cantidad: '', unidad: '', stockDisponible: 0, areaOrigenId: null, areaOrigenNombre: '', areaDestinoId: '' });
        setBusqueda('');
    };

    const editarItem = (index) => {
        const item = detalles[index];
        setProductoActual({ ...item, areaDestinoId: item.areaDestinoId || '' });
        setBusqueda(`${item.nombre} (${item.areaOrigenNombre})`);
        setDetalles(detalles.filter((_, i) => i !== index));
        if(formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
    };

    const finalizarGuia = async () => {
        if (detalles.length === 0) return alert("La guía está vacía.");
        setIsSubmitting(true);
        const payload = {
            areaOrigenId: esModoGeneral ? null : parseInt(encabezado.areaOrigenId),
            fecha: encabezado.fecha,
            responsable: user?.fullName || "Sistema Gestión",
            detalles: detalles.map(d => ({
                productSku: d.sku,
                cantidad: d.cantidad,
                tipoSalida: encabezado.tipoSalida,
                areaOrigenId: d.areaOrigenId,
                areaDestinoId: esModoGeneral ? parseInt(d.areaDestinoId) : null 
            }))
        };
        try {
            await procesarGuiaConsumo(payload);
            alert("✅ Guía procesada correctamente.");
            navigate('/menu');
        } catch (error) {
            alert("❌ " + error.message);
        } finally { setIsSubmitting(false); }
    };

    // Estilo común para los campos de la tabla
    const rowStyle = { padding: '15px', fontSize: '0.9rem', color: '#2d3748' };

    return (
        <div className="inventory-container" style={{padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'sans-serif'}}>
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
                <h2 style={{color: '#2d3748', margin: 0, fontSize: '1.7rem', textTransform: 'uppercase', fontWeight: 'bold'}}>Guía de Consumo</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Volver</button>
            </div>

            {/* FORMULARIO CABECERA */}
            <div className="form-card" style={{padding: '25px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '25px', borderTop: '5px solid #3182ce'}}>
                <div style={{display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '20px'}}>
                    <div>
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>1) Fecha</label>
                        <input type="date" className="form-input" style={{width: '100%'}} value={encabezado.fecha} onChange={e => setEncabezado({...encabezado, fecha: e.target.value})}/>
                    </div>
                    <div>
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>2) Origen General</label>
                        <select className="form-input" style={{width: '100%'}} value={encabezado.areaOrigenId} onChange={e => {
                            const area = areas.find(a => a.id.toString() === e.target.value);
                            setEncabezado({...encabezado, areaOrigenId: e.target.value, areaOrigenNombre: area ? area.nombre : 'GENERAL'});
                            setDetalles([]); 
                        }}>
                            <option value="">-- Seleccione Origen --</option>
                            <option value="GENERAL">Bodega Central / Multiarea</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>3) Motivo</label>
                        <select className="form-input" style={{width: '100%'}} value={encabezado.tipoSalida} onChange={e => setEncabezado({...encabezado, tipoSalida: e.target.value})}>
                            <option value="CONSUMO">Consumo Diario</option>
                            <option value="MERMA">Merma / Pérdida</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* SECCIÓN AÑADIR PRODUCTO */}
            <div ref={formRef} className="form-card" style={{
                padding: '25px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '25px', borderTop: '5px solid #38a169',
                opacity: encabezado.areaOrigenId ? 1 : 0.5, pointerEvents: encabezado.areaOrigenId ? 'auto' : 'none'
            }}>
                <div style={{display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr auto', gap: '20px', alignItems: 'end'}}>
                    <div style={{position:'relative'}}>
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>4) Producto</label>
                        <input type="text" className="form-input" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar producto..."/>
                        {sugerencias.length > 0 && (
                            <ul style={{position:'absolute', width:'100%', zIndex:100, background:'white', border:'1px solid #e2e8f0', borderRadius: '8px', boxShadow:'0 10px 15px rgba(0,0,0,0.1)', padding: '5px', listStyle: 'none', maxHeight: '200px', overflowY: 'auto'}}>
                                {sugerencias.map((p, i) => (
                                    <li key={i} onClick={() => seleccionarProducto(p)} style={{padding:'10px', cursor:'pointer', borderBottom:'1px solid #f1f5f9', fontSize: '0.9rem'}}>
                                        <strong>{p.nombreProducto}</strong> <small>({p.areaNombre})</small>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>5) Destino</label>
                        <select className="form-input" style={{width: '100%', backgroundColor: !esModoGeneral ? '#edf2f7' : 'white'}} value={esModoGeneral ? productoActual.areaDestinoId : ""} onChange={e => setProductoActual({...productoActual, areaDestinoId: e.target.value})} disabled={!esModoGeneral}>
                            <option value="">{esModoGeneral ? "-- Seleccione Destino --" : "Consumo en Origen"}</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>6) Cantidad</label>
                        <input type="number" className="form-input" style={{width: '100%'}} value={productoActual.cantidad} onChange={e => setProductoActual({...productoActual, cantidad: e.target.value})}/>
                    </div>
                    <button onClick={agregarItem} style={{padding: '12px 25px', backgroundColor: '#38a169', color: 'white', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer'}}>
                        Añadir
                    </button>
                </div>
            </div>

            {/* TABLA DE DETALLE (Solo 5 columnas) */}
            {detalles.length > 0 && (
                <div className="form-card" style={{padding: '25px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                    <h3 style={{marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', color: '#4a5568', textTransform: 'uppercase'}}>Items en la Guía Actual</h3>
                    
                    <table style={{width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed'}}>
                        <thead>
                            <tr style={{textAlign: 'left', borderBottom: '2px solid #edf2f7', color: '#718096', fontSize: '0.8rem', textTransform: 'uppercase'}}>
                                <th style={{padding: '12px', width: '15%'}}>Fecha</th>
                                <th style={{padding: '12px', width: '40%'}}>Producto</th>
                                <th style={{padding: '12px', width: '15%'}}>Cantidad</th>
                                <th style={{padding: '12px', width: '20%'}}>Destino</th>
                                <th style={{padding: '12px', width: '10%', textAlign: 'center'}}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detalles.map((item, idx) => (
                                <tr key={idx} style={{borderBottom: '1px solid #f7fafc'}}>
                                    <td style={rowStyle}>{item.fecha}</td>
                                    <td style={rowStyle}>
                                        <div style={{fontWeight: 'bold', textTransform: 'uppercase'}}>{item.nombre}</div>
                                        <div style={{fontSize: '0.7rem', color: '#718096'}}>Desde: {item.areaOrigenNombre}</div>
                                    </td>
                                    <td style={{...rowStyle, fontWeight: 'bold'}}>{item.cantidad} {item.unit || item.unidad}</td>
                                    <td style={rowStyle}>
                                        <span style={{
                                            padding: '5px 10px', 
                                            backgroundColor: '#ebf8ff', 
                                            color: '#2b6cb0', 
                                            borderRadius: '6px', 
                                            fontSize: '0.75rem', 
                                            fontWeight: 'bold',
                                            display: 'inline-block',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {item.areaDestinoNombre}
                                        </span>
                                    </td>
                                    <td style={{padding: '15px', textAlign: 'center'}}>
                                        <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
                                            <button onClick={() => editarItem(idx)} style={{background:'none', border:'none', cursor:'pointer', fontSize: '1.1rem'}}>✏️</button>
                                            <button onClick={() => setDetalles(detalles.filter((_, i) => i !== idx))} style={{background:'none', border:'none', cursor:'pointer', fontSize: '1.1rem'}}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{textAlign: 'center', marginTop: '40px', borderTop: '1px solid #edf2f7', paddingTop: '30px'}}>
                        <button 
                            onClick={finalizarGuia} 
                            disabled={isSubmitting} 
                            style={{padding: '15px 50px', backgroundColor: isSubmitting ? '#a0aec0' : '#2d3748', color: 'white', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer'}}
                        >
                            {isSubmitting ? "PROCESANDO..." : "✅ CONFIRMAR Y FINALIZAR GUÍA"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}