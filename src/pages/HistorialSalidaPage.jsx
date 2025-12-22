import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSalidas } from '../services/salidaService'; // Asegúrate que apunte a /api/salidas
import * as XLSX from 'xlsx';

export default function HistorialSalidaPage() {
    const navigate = useNavigate();

    // --- ESTADOS ---
    const [loading, setLoading] = useState(true);
    const [historialAgrupado, setHistorialAgrupado] = useState([]); 
    
    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

    // Modal Detalle
    const [mostrarModal, setMostrarModal] = useState(false);
    const [guiaSeleccionada, setGuiaSeleccionada] = useState(null);

    // --- CARGAR DATOS ---
    useEffect(() => {
        cargarDatos();
    }, [fechaFiltro]); // Recargar cuando cambie la fecha

    const cargarDatos = async () => {
        setLoading(true);
        try {
            // El backend retorna SalidaHistorial con valorNeto calculado por FIFO
            const dataFlat = await getSalidas(); 
            
            const grupos = {};
            dataFlat.forEach(item => {
                const key = item.folio || `S/F-${item.fecha}`;

                if (!grupos[key]) {
                    grupos[key] = {
                        folio: item.folio,
                        fecha: item.fecha,
                        areaOrigen: item.areaOrigen,
                        responsable: item.usuarioResponsable || 'Sistema',
                        cantidadItems: 0,
                        totalUnidades: 0,
                        valorTotalGuia: 0, // Nuevo campo para reporte valorizado
                        detalles: []
                    };
                }

                grupos[key].cantidadItems += 1;
                grupos[key].totalUnidades += item.cantidad;
                grupos[key].valorTotalGuia += (item.valorNeto || 0); // Sumamos el neto del backend
                grupos[key].detalles.push(item);
            });

            const lista = Object.values(grupos).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            setHistorialAgrupado(lista);

        } catch (error) {
            console.error("Error cargando historial", error);
        } finally {
            setLoading(false);
        }
    };

    // --- FILTRADO POR FECHA Y TEXTO ---
    const datosFiltrados = historialAgrupado.filter(grupo => {
        const coincideFecha = grupo.fecha === fechaFiltro;
        const coincideBusqueda = 
            grupo.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
            grupo.responsable.toLowerCase().includes(busqueda.toLowerCase());
        
        return coincideFecha && coincideBusqueda;
    });

    const exportarExcel = () => {
        const listaPlana = datosFiltrados.flatMap(g => g.detalles);
        const ws = XLSX.utils.json_to_sheet(listaPlana.map(m => ({
            Fecha: m.fecha,
            Folio: m.folio,
            Producto: m.productoNombre,
            Cantidad: m.cantidad,
            Origen: m.areaOrigen,
            Destino: m.areaDestino,
            "Valor Neto ($)": m.valorNeto, // Reporte valorizado real
            Responsable: m.usuarioResponsable
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Consumo_Día");
        XLSX.writeFile(wb, `Reporte_Consumo_${fechaFiltro}.xlsx`);
    };

    return (
        <div style={{padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'sans-serif'}}>
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
                <div>
                    <h2 style={{margin: 0, color: '#2d3748', fontSize: '1.7rem', fontWeight: 'bold'}}>HISTORIAL DE CONSUMO</h2>
                    <p style={{margin: 0, color: '#718096'}}>Consulta y valorización de salidas de stock</p>
                </div>
                <button onClick={() => navigate('/menu')} style={{padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e0', cursor: 'pointer'}}>⬅ Volver</button>
            </div>

            {/* PANEL DE CONTROL / FILTROS */}
            <div style={{backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '25px', display: 'flex', gap: '20px', alignItems: 'flex-end'}}>
                <div style={{flex: 1}}>
                    <label style={{display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.85rem'}}>1. SELECCIONAR FECHA</label>
                    <input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0'}} />
                </div>
                <div style={{flex: 2}}>
                    <label style={{display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.85rem'}}>2. BUSCAR POR FOLIO O RESPONSABLE</label>
                    <input type="text" placeholder="Ej: GC-1734..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0'}} />
                </div>
                <button onClick={exportarExcel} style={{backgroundColor: '#38a169', color: 'white', padding: '12px 25px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer'}}>
                    📊 Exportar Día
                </button>
            </div>

            {/* TABLA DE RESUMEN */}
            <div style={{backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden'}}>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead style={{backgroundColor: '#f8fafc', borderBottom: '2px solid #edf2f7'}}>
                        <tr style={{textAlign: 'left', color: '#718096', fontSize: '0.75rem', textTransform: 'uppercase'}}>
                            <th style={{padding: '15px'}}>Folio Guía</th>
                            <th style={{padding: '15px'}}>Responsable</th>
                            <th style={{padding: '15px'}}>Origen</th>
                            <th style={{padding: '15px', textAlign: 'center'}}>Items</th>
                            <th style={{padding: '15px', textAlign: 'right'}}>Valor Total</th>
                            <th style={{padding: '15px', textAlign: 'center'}}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{padding: '40px', textAlign: 'center'}}>Cargando historial...</td></tr>
                        ) : datosFiltrados.length === 0 ? (
                            <tr><td colSpan="6" style={{padding: '40px', textAlign: 'center', color: '#a0aec0'}}>No hay guías para la fecha seleccionada.</td></tr>
                        ) : (
                            datosFiltrados.map((g, i) => (
                                <tr key={i} style={{borderBottom: '1px solid #f1f5f9'}}>
                                    <td style={{padding: '15px', fontWeight: 'bold', color: '#3182ce'}}>{g.folio}</td>
                                    <td style={{padding: '15px'}}>{g.responsable}</td>
                                    <td style={{padding: '15px'}}>
                                        <span style={{padding: '4px 8px', backgroundColor: '#ebf8ff', color: '#2b6cb0', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold'}}>
                                            {g.areaOrigen}
                                        </span>
                                    </td>
                                    <td style={{padding: '15px', textAlign: 'center'}}>{g.cantidadItems}</td>
                                    <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#2d3748'}}>
                                        ${g.valorTotalGuia.toLocaleString('es-CL')}
                                    </td>
                                    <td style={{padding: '15px', textAlign: 'center'}}>
                                        <button onClick={() => { setGuiaSeleccionada(g); setMostrarModal(true); }} style={{background: '#edf2f7', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}}>Ver Detalle</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL DE DETALLES (Se mantiene igual pero con el estilo limpio) */}
            {mostrarModal && guiaSeleccionada && (
                <div style={{position: 'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000}}>
                    <div style={{backgroundColor:'white', width:'90%', maxWidth:'800px', borderRadius:'12px', overflow:'hidden', boxShadow:'0 20px 25px rgba(0,0,0,0.15)'}}>
                        <div style={{padding:'20px', borderBottom:'1px solid #edf2f7', display:'flex', justifyContent:'space-between', alignItems:'center', backgroundColor: '#f8fafc'}}>
                            <h3 style={{margin:0}}>DETALLE GUÍA: {guiaSeleccionada.folio}</h3>
                            <button onClick={() => setMostrarModal(false)} style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer'}}>×</button>
                        </div>
                        <div style={{padding:'20px', maxHeight:'60vh', overflowY:'auto'}}>
                            <table style={{width:'100%', borderCollapse:'collapse'}}>
                                <thead>
                                    <tr style={{textAlign:'left', borderBottom:'2px solid #edf2f7', color:'#718096', fontSize:'0.75rem'}}>
                                        <th style={{padding:'10px'}}>PRODUCTO</th>
                                        <th style={{padding:'10px'}}>DESTINO</th>
                                        <th style={{padding:'10px', textAlign:'right'}}>CANTIDAD</th>
                                        <th style={{padding:'10px', textAlign:'right'}}>NETO LÍNEA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {guiaSeleccionada.detalles.map((d, i) => (
                                        <tr key={i} style={{borderBottom:'1px solid #f7fafc'}}>
                                            <td style={{padding:'12px'}}><strong>{d.productoNombre}</strong><br/><small style={{color:'#a0aec0'}}>SKU: {d.sku}</small></td>
                                            <td style={{padding:'12px'}}>{d.areaDestino}</td>
                                            <td style={{padding:'12px', textAlign:'right', fontWeight:'bold'}}>{d.cantidad}</td>
                                            <td style={{padding:'12px', textAlign:'right'}}>${d.valorNeto?.toLocaleString('es-CL')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{padding:'20px', textAlign:'right', backgroundColor:'#f8fafc'}}>
                            <button onClick={() => setMostrarModal(false)} style={{padding:'10px 20px', borderRadius:'8px', border:'1px solid #cbd5e0', cursor:'pointer'}}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}