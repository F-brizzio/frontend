import { useState, useEffect } from 'react';
import { getAreas } from '../services/areaService';
import { getStockByArea } from '../services/inventoryService';
import { procesarGuiaConsumo } from '../services/salidaService'; 
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

export default function GuiaConsumoPage() {
    const navigate = useNavigate();
    const { user } = useAuth(); 

    // --- ESTADOS ---
    const [areas, setAreas] = useState([]);
    const [areaOrigen, setAreaOrigen] = useState('');
    const [nombreAreaOrigen, setNombreAreaOrigen] = useState('');
    const [stockList, setStockList] = useState([]); 
    const [filtro, setFiltro] = useState('');
    const [fechaGuia, setFechaGuia] = useState(new Date().toISOString().split('T')[0]);

    // CARRITO
    const [seleccionados, setSeleccionados] = useState({});
    const [permiteMerma, setPermiteMerma] = useState(false);
    const [mostrarResumen, setMostrarResumen] = useState(false);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        getAreas().then(setAreas).catch(console.error);
    }, []);

    // --- CAMBIO DE ÁREA ---
    const handleAreaChange = async (e) => {
        const id = e.target.value;
        setAreaOrigen(id);
        setSeleccionados({});
        setStockList([]);

        if (id) {
            const area = areas.find(a => a.id === Number(id));
            const nombre = area ? area.nombre : '';
            setNombreAreaOrigen(nombre);
            
            const nombreMin = nombre.toLowerCase();
            const esAreaEspecial = nombreMin.includes('casino') || 
                                   nombreMin.includes('evento') || 
                                   nombreMin.includes('coffe') ||
                                   nombreMin.includes('cafe');
            
            setPermiteMerma(esAreaEspecial);

            try {
                const stock = await getStockByArea(id);
                setStockList(stock);
            } catch (error) { console.error("Error stock:", error); }
        } else {
            setNombreAreaOrigen('');
            setPermiteMerma(false);
        }
    };

    const ajustarCantidad = (key, delta) => {
        const item = seleccionados[key];
        if (!item) return;

        const productoOriginal = stockList.find(p => (p.sku || p.productSku) === item.sku);
        const stockMax = productoOriginal ? productoOriginal.cantidadTotal : 9999;

        const nuevaCantidad = item.cantidad + delta;

        if (nuevaCantidad <= 0) {
            if (window.confirm(`¿Eliminar ${item.tipo === 'MERMA' ? 'Merma' : 'Consumo'} de la lista?`)) {
                const copia = { ...seleccionados };
                delete copia[key];
                setSeleccionados(copia);
                if (Object.keys(copia).length === 0) setMostrarResumen(false);
            }
        } else if (nuevaCantidad > stockMax) {
            alert(`Cuidado: El stock físico es ${stockMax}`);
        } else {
            setSeleccionados(prev => ({
                ...prev,
                [key]: { ...prev[key], cantidad: nuevaCantidad }
            }));
        }
    };

    const toggleSeleccion = (producto, tipoAccion = 'CONSUMO') => {
        const sku = producto.sku || producto.productSku;
        const nombreReal = producto.productName || producto.nombreProducto || 'Producto';
        const keyUnica = `${sku}-${tipoAccion}`;

        if (!sku) { alert("Error SKU"); return; }

        if (seleccionados[keyUnica]) {
            const copia = { ...seleccionados };
            delete copia[keyUnica];
            setSeleccionados(copia);
        } else {
            const keyContraria = `${sku}-${tipoAccion === 'CONSUMO' ? 'MERMA' : 'CONSUMO'}`;
            const cantidadOcupada = seleccionados[keyContraria] ? seleccionados[keyContraria].cantidad : 0;
            const stockDisponible = producto.cantidadTotal - cantidadOcupada;

            if (stockDisponible <= 0) {
                alert("No queda stock disponible (asignado en otra categoría).");
                return;
            }

            const input = prompt(`[${tipoAccion}] Cantidad para ${nombreReal}:\n(Disponible real: ${stockDisponible})`);
            if (input === null) return; 
            
            const cantidad = parseFloat(input);
            if (isNaN(cantidad) || cantidad <= 0) {
                alert("Cantidad inválida"); return;
            }
            if (cantidad > stockDisponible) {
                alert(`Stock insuficiente. Solo quedan ${stockDisponible} disponibles.`);
                return;
            }

            let destinoId = null;
            let nombreDestino = null;
            const esBodegaCentral = nombreAreaOrigen.toLowerCase().includes('sin asignar') || 
                                    nombreAreaOrigen.toLowerCase().includes('bodega');

            if (esBodegaCentral && tipoAccion === 'CONSUMO') { 
                const areasPosibles = areas.filter(a => a.id !== Number(areaOrigen));
                const textoLista = areasPosibles.map(a => `ID ${a.id}: ${a.nombre}`).join('\n');
                const idDestinoInput = prompt(`📦 Destino:\n\n${textoLista}`);
                if (!idDestinoInput) return;
                const areaDestino = areasPosibles.find(a => a.id === Number(idDestinoInput));
                if (!areaDestino) { alert("ID incorrecto"); return; }
                destinoId = areaDestino.id;
                nombreDestino = areaDestino.nombre;
            }

            setSeleccionados(prev => ({
                ...prev,
                [keyUnica]: {
                    sku, 
                    nombre: nombreReal, 
                    cantidad, 
                    areaDestinoId: destinoId, 
                    nombreDestino,
                    tipo: tipoAccion,
                    key: keyUnica
                }
            }));
        }
    };

    const confirmarGuardado = async () => {
        if (!fechaGuia) { alert("Falta fecha"); return; }
        if (cargando) return;
        setCargando(true);
        try {
            const detalles = Object.values(seleccionados).map(item => ({
                productSku: item.sku,
                cantidad: item.cantidad,
                areaDestinoId: item.areaDestinoId,
                tipoSalida: item.tipo 
            }));

            const payload = {
                fecha: fechaGuia,
                areaOrigenId: Number(areaOrigen),
                detalles: detalles,
                responsable: user ? (user.fullName || user.username) : 'Desconocido'
            };

            await procesarGuiaConsumo(payload);
            alert("✅ Guía registrada correctamente.");
            navigate('/menu');
        } catch (error) {
            console.error(error);
            alert("Error: " + (error.response?.data || error.message));
        } finally { setCargando(false); }
    };

    const productosFiltrados = stockList.filter(p => {
        const busqueda = filtro.toLowerCase();
        const nombre = (p.productName || p.nombreProducto || '').toLowerCase();
        const sku = (p.sku || p.productSku || '').toLowerCase();
        const cat = (p.categoria || p.category || '').toLowerCase();
        return nombre.includes(busqueda) || sku.includes(busqueda) || cat.includes(busqueda);
    });

    return (
        <div className="inventory-container"> {/* Reutilizamos container */}
            
            {/* CABECERA ESTÁNDAR */}
            <div className="page-header">
                <div>
                    <h2 className="page-title">📋 Salida de Productos</h2>
                    <p style={{ margin: 0, color: '#718096', fontSize:'0.9em' }}>
                        Responsable: <strong>{user?.fullName || user?.username}</strong>
                    </p>
                </div>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Cancelar</button>
            </div>

            {/* PANEL DE CONTROL (Usando estilos de formulario) */}
            <div className="form-card" style={{ marginBottom: '25px' }}>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">1. Área de Origen (Desde donde sale)</label>
                        <select value={areaOrigen} onChange={handleAreaChange} className="form-select">
                            <option value="">-- Seleccione Área --</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">2. Fecha de Registro</label>
                        <input type="date" value={fechaGuia} onChange={e => setFechaGuia(e.target.value)} className="form-input" />
                    </div>
                </div>
                
                {permiteMerma && (
                    <div style={{ marginTop: '15px', padding: '12px', background: '#fffaf0', borderLeft: '4px solid #ed8936', borderRadius: '4px', color: '#c05621' }}>
                        ⚠️ <strong>Atención:</strong> Esta área permite registrar <strong>Mermas</strong>. Use el botón rojo en los productos para reportar pérdidas.
                    </div>
                )}
            </div>

            {areaOrigen && (
                <>
                    {/* BARRA DE BÚSQUEDA */}
                    <div style={{ marginBottom: '20px' }}>
                        <input 
                            type="text" 
                            placeholder="🔍 Buscar producto por nombre, SKU o categoría..." 
                            value={filtro} 
                            onChange={e => setFiltro(e.target.value)} 
                            className="form-input"
                            style={{ padding: '15px', fontSize: '1.1rem', borderColor: '#3182ce', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }} 
                        />
                    </div>

                    {/* GRILLA DE PRODUCTOS (NUEVO DISEÑO) */}
                    <div className="product-grid">
                        {productosFiltrados.map((p, index) => {
                            const sku = p.sku || p.productSku || `temp-${index}`;
                            const nombre = p.productName || p.nombreProducto || 'Sin Nombre';
                            const enConsumo = !!seleccionados[`${sku}-CONSUMO`];
                            const enMerma = !!seleccionados[`${sku}-MERMA`];

                            return (
                                <div key={sku} className="product-card" style={{ borderColor: (enConsumo || enMerma) ? '#3182ce' : '#e2e8f0', borderWidth: (enConsumo || enMerma) ? '2px' : '1px' }}>
                                    
                                    {/* Cabecera Tarjeta */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span className="badge badge-sku">{sku}</span>
                                        <span className="badge badge-cat">{p.categoria || 'Gral'}</span>
                                    </div>
                                    
                                    <h4 style={{ margin: '0 0 10px 0', color: '#2d3748', fontSize: '1rem' }}>{nombre}</h4>
                                    
                                    <div style={{ marginTop: 'auto' }}>
                                        <div style={{ marginBottom: '12px', color: '#718096', fontSize: '0.9rem' }}>
                                            Disponible: <strong style={{ color: '#2d3748' }}>{p.cantidadTotal}</strong>
                                        </div>
                                        
                                        {/* Acciones */}
                                        <div className="card-actions">
                                            <button 
                                                onClick={() => toggleSeleccion(p, 'CONSUMO')}
                                                className={`btn-action-card btn-consumo ${enConsumo ? 'active' : ''}`}
                                            >
                                                {enConsumo ? `Cant: ${seleccionados[`${sku}-CONSUMO`].cantidad}` : 'Consumo'}
                                            </button>

                                            {permiteMerma && (
                                                <button 
                                                    onClick={() => toggleSeleccion(p, 'MERMA')}
                                                    className={`btn-action-card btn-merma ${enMerma ? 'active' : ''}`}
                                                >
                                                    {enMerma ? `Cant: ${seleccionados[`${sku}-MERMA`].cantidad}` : 'Merma'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* BOTÓN FLOTANTE */}
                    <div className="floating-bar">
                        <button 
                            onClick={() => setMostrarResumen(true)} 
                            disabled={Object.keys(seleccionados).length === 0} 
                            className="btn-floating"
                        >
                            Ver Resumen ({Object.keys(seleccionados).length}) 🛒
                        </button>
                    </div>
                </>
            )}

            {/* MODAL DE RESUMEN MEJORADO */}
            {mostrarResumen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 style={{ marginTop: 0, color: '#2d3748' }}>🧐 Revisión Final</h3>
                        
                        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px', border: '1px solid #edf2f7', borderRadius: '8px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize:'0.9em' }}>
                                <thead style={{ background: '#f7fafc', position: 'sticky', top: 0 }}>
                                    <tr>
                                        <th style={{padding:'12px', textAlign:'left', color:'#4a5568'}}>Producto</th>
                                        <th style={{padding:'12px', textAlign:'center', color:'#4a5568'}}>Cant.</th>
                                        <th style={{padding:'12px', textAlign:'right'}}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.values(seleccionados).map(item => (
                                        <tr key={item.key} style={{ borderBottom: '1px solid #edf2f7' }}>
                                            <td style={{padding:'12px'}}>
                                                <div style={{fontWeight:'600'}}>{item.nombre}</div>
                                                <div style={{fontSize:'0.8em', marginTop:'2px'}}>
                                                    {item.tipo === 'MERMA' 
                                                        ? <span style={{color:'#e53e3e'}}>🗑️ Merma</span> 
                                                        : <span style={{color:'#38a169'}}>✅ Consumo</span>
                                                    }
                                                    {item.nombreDestino && <span style={{color:'#718096'}}> ➡ {item.nombreDestino}</span>}
                                                </div>
                                            </td>
                                            
                                            <td style={{padding:'12px', textAlign:'center'}}>
                                                <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
                                                    <button onClick={() => ajustarCantidad(item.key, -1)} style={{padding:'2px 8px', borderRadius:'4px', border:'1px solid #cbd5e0', background:'white'}}>➖</button>
                                                    <strong>{item.cantidad}</strong>
                                                    <button onClick={() => ajustarCantidad(item.key, 1)} style={{padding:'2px 8px', borderRadius:'4px', border:'1px solid #cbd5e0', background:'white'}}>➕</button>
                                                </div>
                                            </td>

                                            <td style={{padding:'12px', textAlign:'right'}}>
                                                <button 
                                                    onClick={() => {
                                                        const copia = { ...seleccionados };
                                                        delete copia[item.key];
                                                        setSeleccionados(copia);
                                                        if(Object.keys(copia).length===0) setMostrarResumen(false);
                                                    }} 
                                                    style={{border:'none', background:'none', cursor:'pointer', color:'#e53e3e', fontSize:'1.1rem'}}
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setMostrarResumen(false)} className="btn-secondary">
                                Seguir Editando
                            </button>
                            <button onClick={confirmarGuardado} disabled={cargando} className="btn-primary">
                                {cargando ? 'Procesando...' : '✅ Confirmar Todo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}