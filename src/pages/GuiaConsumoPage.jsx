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

    // --- ESTADOS ---
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
            return alert(`❌ Stock insuficiente en ${productoActual.areaOrigenNombre}. Disponible: ${productoActual.stockDisponible}`);
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
        setProductoActual({
            sku: item.sku,
            nombre: item.nombre,
            cantidad: item.cantidad,
            unidad: item.unidad,
            stockDisponible: item.stockDisponible, 
            areaOrigenId: item.areaOrigenId,
            areaOrigenNombre: item.areaOrigenNombre,
            areaDestinoId: item.areaDestinoId || '' 
        });
        setBusqueda(`${item.nombre} (${item.areaOrigenNombre})`);
        const nuevaLista = detalles.filter((_, i) => i !== index);
        setDetalles(nuevaLista);
        if(formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth' });
        }
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

    // --- ESTILO PARA LOS TEXTOS DEL DETALLE (Unificado con el Origen) ---
    const detailBadgeStyle = {
        padding: '4px 10px',
        backgroundColor: '#ebf8ff', // Azul clarito
        color: '#2b6cb0',       // Azul oscuro
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        display: 'inline-block',
        whiteSpace: 'nowrap'    // Evita que el texto se rompa en dos líneas
    };

    return (
        <div className="inventory-container" style={{padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh'}}>
            <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
                <h2 style={{color: '#2d3748', margin: 0, fontSize: '1.7rem', textTransform: 'uppercase', fontWeight: 'bold'}}>Guía de Consumo</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Volver</button>
            </div>

            {/* CABECERA */}
            <div className="form-card" style={{padding: '25px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '25px', borderTop: '5px solid #3182ce'}}>
                <div style={{display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '20px'}}>
                    <div className="form-group">
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>1) Fecha</label>
                        <input type="date" className="form-input" style={{width: '100%'}} value={encabezado.fecha} onChange={e => setEncabezado({...encabezado, fecha: e.target.value})}/>
                    </div>
                    <div className="form-group">
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>2) Origen</label>
                        <select 
                            className="form-input" 
                            value={encabezado.areaOrigenId} 
                            onChange={e => {
                                const area = areas.find(a => a.id.toString() === e.target.value);
                                setEncabezado({
                                    ...encabezado, 
                                    areaOrigenId: e.target.value,
                                    areaOrigenNombre: area ? area.nombre : 'GENERAL'
                                });
                                setDetalles([]); 
                            }}
                        >
                            <option value="">-- Seleccione --</option>
                            <option value="GENERAL">General</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>3) Motivo de Salida</label>
                        <select className="form-input" value={encabezado.tipoSalida} onChange={e => setEncabezado({...encabezado, tipoSalida: e.target.value})}>
                            <option value="CONSUMO">Consumo</option>
                            <option value="MERMA">Merma</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* SECCIÓN PRODUCTO */}
            <div ref={formRef} className="form-card" style={{
                padding: '25px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '25px', borderTop: '5px solid #38a169',
                opacity: encabezado.areaOrigenId ? 1 : 0.5, pointerEvents: encabezado.areaOrigenId ? 'auto' : 'none'
            }}>
                <div style={{display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr auto', gap: '20px', alignItems: 'end'}}>
                    <div className="form-group" style={{position:'relative'}}>
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>4) Producto</label>
                        <input type="text" className="form-input" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Escriba nombre..."/>
                        {sugerencias.length > 0 && (
                            <ul className="dropdown-list" style={{position:'absolute', width:'100%', zIndex:100, background:'white', border:'1px solid #e2e8f0', borderRadius: '8px', boxShadow:'0 10px 15px rgba(0,0,0,0.1)', padding: '5px', listStyle: 'none', maxHeight: '250px', overflowY: 'auto'}}>
                                {sugerencias.map((p, i) => (
                                    <li key={i} onClick={() => seleccionarProducto(p)} style={{padding:'12px', cursor:'pointer', borderBottom:'1px solid #f1f5f9'}}>
                                        <strong>{p.nombreProducto}</strong> <small style={{color: '#718096'}}>({p.areaNombre} - {p.cantidadTotal} disp.)</small>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    
                    <div className="form-group">
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px', color: !esModoGeneral ? '#a0aec0' : 'inherit'}}>
                            5) Destino {!esModoGeneral && <small>(Automático)</small>}
                        </label>
                        <select 
                            className="form-input" 
                            value={esModoGeneral ? productoActual.areaDestinoId : ""} 
                            onChange={e => setProductoActual({...productoActual, areaDestinoId: e.target.value})}
                            disabled={!esModoGeneral} 
                            style={{
                                backgroundColor: !esModoGeneral ? '#e2e8f0' : 'white', 
                                cursor: !esModoGeneral ? 'not-allowed' : 'pointer',
                                borderColor: !esModoGeneral ? '#cbd5e0' : '#e2e8f0'
                            }}
                        >
                            <option value="">
                                {esModoGeneral ? "-- Seleccione --" : "Consumo en Origen"}
                            </option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>6) Cantidad</label>
                        <input type="number" className="form-input" value={productoActual.cantidad} onChange={e => setProductoActual({...productoActual, cantidad: e.target.value})}/>
                    </div>
                    <button onClick={agregarItem} className="save-btn" style={{padding: '12px 20px', backgroundColor: '#38a169', color: 'white', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer'}}>
                        7) Añadir
                    </button>
                </div>
            </div>

            {/* DETALLE ACTUALIZADO (Sin Neto y con estilos unificados) */}
            {detalles.length > 0 && (
                <div className="form-card" style={{padding: '25px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                    <h3 style={{marginTop: 0, marginBottom: '20px', fontSize: '1.2rem', color: '#2d3748', textTransform: 'uppercase', fontWeight: 'bold'}}>8) Detalle de Consumos</h3>
                    <table style={{width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed'}}> {/* tableLayout fixed ayuda a controlar anchos */}
                        <thead>
                            <tr style={{textAlign: 'left', borderBottom: '2px solid #edf2f7', color: '#718096', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                                <th style={{padding: '12px', width: '12%'}}>Fecha</th>
                                <th style={{padding: '12px', width: '25%'}}>Producto</th>
                                <th style={{padding: '12px', width: '12%'}}>Cantidad</th>
                                <th style={{padding: '12px', width: '15%'}}>Origen</th>
                                <th style={{padding: '12px', width: '20%'}}>Destino</th>
                                <th style={{padding: '12px', width: '10%', textAlign: 'center'}}>Método</th>
                                <th style={{padding: '12px', width: '6%', textAlign: 'center'}}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detalles.map((item, idx) => (
                                <tr key={idx} style={{borderBottom: '1px solid #f1f5f9'}}>
                                    <td style={{padding: '15px', fontSize: '0.9rem'}}>{item.fecha}</td>
                                    <td style={{padding: '15px'}}>
                                        <strong style={{textTransform: 'uppercase', color: '#1a202c'}}>{item.nombre}</strong>
                                    </td>
                                    <td style={{padding: '15px', fontWeight: 'bold', color: '#2d3748'}}>{item.cantidad} {item.unidad}</td>
                                    
                                    {/* ORIGEN (Azul) */}
                                    <td style={{padding: '15px'}}>
                                        <span style={detailBadgeStyle}>
                                            {item.areaOrigenNombre}
                                        </span>
                                    </td>

                                    {/* DESTINO (Ahora con el mismo estilo que origen para unificar) */}
                                    <td style={{padding: '15px'}}>
                                        <span style={{...detailBadgeStyle, backgroundColor: '#f7fafc', color: '#4a5568', border: '1px solid #e2e8f0'}}>
                                            {item.areaDestinoNombre}
                                        </span>
                                    </td>

                                    {/* MÉTODO (Sin cursiva, estilo limpio) */}
                                    <td style={{padding: '15px', textAlign: 'center'}}>
                                        <span style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#a0aec0'}}>
                                            FIFO (Auto)
                                        </span>
                                    </td>

                                    <td style={{padding: '15px', textAlign: 'center'}}>
                                        <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
                                            <button onClick={() => editarItem(idx)} title="Editar" style={{color: '#ecc94b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem'}}>✏️</button>
                                            <button onClick={() => setDetalles(detalles.filter((_, i) => i !== idx))} title="Eliminar" style={{color: '#f56565', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem'}}>🗑️</button>
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
                            style={{padding: '18px 60px', backgroundColor: isSubmitting ? '#a0aec0' : '#2d3748', color: 'white', borderRadius: '10px', fontSize: '1rem', fontWeight: 'bold', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                        >
                            {isSubmitting ? "⌛ PROCESANDO..." : "✅ FINALIZAR Y ACTUALIZAR STOCK"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}