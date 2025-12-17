import { useState, useEffect } from 'react';
import { getSalidas } from '../services/salidaService';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

export default function HistorialSalidaPage() {
    const navigate = useNavigate();

    // --- ESTADOS ---
    const [loading, setLoading] = useState(true);
    const [historialAgrupado, setHistorialAgrupado] = useState([]); 
    
    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    // Modal Detalle
    const [mostrarModal, setMostrarModal] = useState(false);
    const [guiaSeleccionada, setGuiaSeleccionada] = useState(null);

    // --- CARGAR DATOS ---
    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            const dataFlat = await getSalidas(); 

            // Agrupación Cliente
            const grupos = {};
            dataFlat.forEach(item => {
                const key = item.folio || `S/F-${item.fecha}-${item.id}`;

                if (!grupos[key]) {
                    grupos[key] = {
                        folio: item.folio || 'S/F',
                        fecha: item.fecha,
                        areaOrigen: item.areaOrigen,
                        responsable: item.usuarioResponsable || 'Sistema',
                        cantidadItems: 0, 
                        totalUnidades: 0,
                        tieneMermas: false,
                        detalles: []
                    };
                }

                grupos[key].cantidadItems += 1;
                grupos[key].totalUnidades += item.cantidad;
                if (item.tipoSalida === 'MERMA') grupos[key].tieneMermas = true;
                
                grupos[key].detalles.push(item);
            });

            const listaOrdenada = Object.values(grupos).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            setHistorialAgrupado(listaOrdenada);

        } catch (error) {
            console.error("Error cargando historial salidas", error);
        } finally {
            setLoading(false);
        }
    };

    // --- FILTRADO ---
    const datosFiltrados = historialAgrupado.filter(grupo => {
        const texto = busqueda.toLowerCase();
        
        const matchEncabezado = 
            (grupo.folio || '').toLowerCase().includes(texto) ||
            (grupo.responsable || '').toLowerCase().includes(texto) ||
            (grupo.areaOrigen || '').toLowerCase().includes(texto);

        const matchDetalle = grupo.detalles.some(d => 
            (d.productName || '').toLowerCase().includes(texto) ||
            (d.productSku || '').toLowerCase().includes(texto)
        );

        let matchFecha = true;
        if (fechaInicio) matchFecha = matchFecha && new Date(grupo.fecha) >= new Date(fechaInicio);
        if (fechaFin) matchFecha = matchFecha && new Date(grupo.fecha) <= new Date(fechaFin);

        return (matchEncabezado || matchDetalle) && matchFecha;
    });

    const verDetalle = (grupo) => {
        setGuiaSeleccionada(grupo);
        setMostrarModal(true);
    };

    const exportarExcel = () => {
        const listaPlana = datosFiltrados.flatMap(g => g.detalles);
        const ws = XLSX.utils.json_to_sheet(listaPlana.map(m => ({
            Fecha: m.fecha,
            Folio: m.folio,
            Tipo: m.tipoSalida || 'CONSUMO',
            SKU: m.productSku,
            Producto: m.productName,
            Cantidad: m.cantidad,
            "Área Destino": m.areaDestino,
            Responsable: m.usuarioResponsable
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Salidas_Detalle");
        XLSX.writeFile(wb, "Historial_Salidas.xlsx");
    };

    return (
        <div className="inventory-container">
            {/* CABECERA */}
            <div className="page-header">
                <h2 className="page-title">📤 Historial de Salidas</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Volver</button>
            </div>

            {/* FILTROS RESPONSIVOS */}
            <div className="filters-panel">
                <div className="filter-group" style={{ flex: 2 }}>
                    <label className="filter-label">🔍 Buscar (Guía, Prod, Resp)</label>
                    <input 
                        type="text" 
                        placeholder="Ej: GC-123, Coca Cola..." 
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        className="filter-input"
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label">Desde</label>
                    <input 
                        type="date" 
                        value={fechaInicio} 
                        onChange={e => setFechaInicio(e.target.value)} 
                        className="filter-input"
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label">Hasta</label>
                    <input 
                        type="date" 
                        value={fechaFin} 
                        onChange={e => setFechaFin(e.target.value)} 
                        className="filter-input"
                    />
                </div>
                
                <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
                    <button 
                        onClick={exportarExcel} 
                        disabled={datosFiltrados.length === 0}
                        className="btn-primary"
                        style={{ height: '42px', padding: '0 20px', backgroundColor: '#28a745' }}
                    >
                        📊 Excel
                    </button>
                </div>
            </div>

            {/* TABLA PRINCIPAL (RESUMEN) */}
            <div className="table-container">
                <table className="responsive-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Folio Guía</th>
                            <th>Origen</th>
                            <th>Responsable</th>
                            <th style={{textAlign: 'center'}}>Items</th>
                            <th style={{textAlign: 'center'}}>Total Unid.</th>
                            <th style={{textAlign: 'center'}}>Estado</th>
                            <th style={{textAlign: 'center'}}>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8" style={{ padding: '20px', textAlign: 'center' }}>Cargando...</td></tr>
                        ) : datosFiltrados.length === 0 ? (
                            <tr><td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No se encontraron guías.</td></tr>
                        ) : (
                            datosFiltrados.map((g, i) => (
                                <tr key={i}>
                                    <td data-label="Fecha">{g.fecha}</td>
                                    <td data-label="Folio" style={{ fontWeight: 'bold' }}>{g.folio}</td>
                                    <td data-label="Origen">{g.areaOrigen}</td>
                                    <td data-label="Responsable">
                                        <span className="badge-category">{g.responsable}</span>
                                    </td>
                                    <td data-label="Items" style={{ textAlign:'center' }}>{g.cantidadItems}</td>
                                    <td data-label="Total Unid." style={{ textAlign:'center', fontWeight:'bold' }}>{g.totalUnidades}</td>
                                    
                                    <td data-label="Estado" style={{ textAlign:'center' }}>
                                        {g.tieneMermas ? (
                                            <span style={{background:'#fff3cd', color:'#c05621', padding:'3px 8px', borderRadius:'6px', fontSize:'0.85em', fontWeight:'bold', border:'1px solid #fbd38d'}}>
                                                ⚠️ Mermas
                                            </span>
                                        ) : (
                                            <span style={{color:'#2f855a', fontWeight:'bold', fontSize:'0.9em'}}>
                                                ✅ OK
                                            </span>
                                        )}
                                    </td>
                                    
                                    <td data-label="Acción" style={{ textAlign:'center' }}>
                                        <button 
                                            onClick={() => verDetalle(g)}
                                            className="btn-primary"
                                            style={{ padding: '6px 12px', fontSize: '0.9em', margin: '0 auto' }}
                                        >
                                            Ver
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL DETALLE */}
            {mostrarModal && guiaSeleccionada && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '900px', padding: 0 }}>
                        
                        {/* HEADER MODAL */}
                        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f7fafc', borderRadius: '12px 12px 0 0' }}>
                            <div>
                                <h3 style={{ margin: 0, color:'#2d3748' }}>📋 Guía: {guiaSeleccionada.folio}</h3>
                                <p style={{ margin: 0, color:'#718096', fontSize:'0.9em' }}>
                                    {guiaSeleccionada.fecha} - Resp: {guiaSeleccionada.responsable}
                                </p>
                            </div>
                            <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '2em', cursor: 'pointer', color:'#a0aec0' }}>&times;</button>
                        </div>

                        {/* BODY SCROLLABLE */}
                        <div style={{ padding: '20px', overflowY: 'auto', maxHeight: '70vh' }}>
                            <table className="responsive-table">
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Producto</th>
                                        <th>SKU</th>
                                        <th>Destino</th>
                                        <th style={{textAlign:'right'}}>Cantidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {guiaSeleccionada.detalles.map((d, i) => (
                                        <tr key={i} style={{ background: d.tipoSalida === 'MERMA' ? '#fff5f5' : 'transparent' }}>
                                            <td data-label="Tipo">
                                                {d.tipoSalida === 'MERMA' ? (
                                                    <span style={{color:'#e53e3e', fontWeight:'bold'}}>🗑️ MERMA</span>
                                                ) : d.tipoSalida === 'VENTA' ? (
                                                    <span style={{color:'#0dcaf0', fontWeight:'bold'}}>💰 VENTA</span>
                                                ) : (
                                                    <span style={{color:'#38a169', fontWeight:'bold'}}>✅ CONSUMO</span>
                                                )}
                                            </td>
                                            <td data-label="Producto"><strong>{d.productName}</strong></td>
                                            <td data-label="SKU" style={{ color:'#718096', fontSize:'0.9em' }}>{d.productSku}</td>
                                            <td data-label="Destino">{d.areaDestino || d.areaOrigen}</td>
                                            <td data-label="Cantidad" style={{ textAlign: 'right', fontWeight:'bold' }}>{d.cantidad}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* FOOTER MODAL */}
                        <div style={{ padding: '15px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right', background: '#f7fafc', borderRadius: '0 0 12px 12px' }}>
                            <button onClick={() => setMostrarModal(false)} className="btn-secondary">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}