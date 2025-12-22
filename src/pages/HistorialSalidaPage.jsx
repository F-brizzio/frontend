import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSalidas } from '../services/salidaService';
import * as XLSX from 'xlsx';

export default function HistorialSalidaPage() {
    const navigate = useNavigate();

    // --- ESTADOS ---
    const [loading, setLoading] = useState(true);
    const [historialAgrupado, setHistorialAgrupado] = useState([]); 
    const [busqueda, setBusqueda] = useState('');
    const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

    // Modal Detalle
    const [mostrarModal, setMostrarModal] = useState(false);
    const [guiaSeleccionada, setGuiaSeleccionada] = useState(null);

    // --- CARGAR Y AGRUPAR DATOS ---
    useEffect(() => {
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
                            responsable: item.usuarioResponsable || 'Sistema',
                            destinoGeneral: item.destino || 'Consumo Interno',
                            valorTotalNeto: 0, 
                            detalles: []
                        };
                    }

                    // Sumamos el valorNeto acumulado por el backend para el total de la guía
                    grupos[key].valorTotalNeto += (item.valorNeto || 0);
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
        cargarDatos();
    }, []);

    // --- FILTRADO ---
    const datosFiltrados = historialAgrupado.filter(grupo => {
        const coincideFecha = !fechaFiltro || grupo.fecha === fechaFiltro;
        const coincideBusqueda = grupo.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
                                 grupo.responsable.toLowerCase().includes(busqueda.toLowerCase());
        return coincideFecha && coincideBusqueda;
    });

    return (
        <div style={{padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'sans-serif'}}>
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
                <h2 style={{margin: 0, color: '#2d3748', fontSize: '1.7rem', fontWeight: 'bold'}}>HISTORIAL DE GUÍAS DE CONSUMO</h2>
                <button onClick={() => navigate('/menu')} style={{padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e0', cursor: 'pointer', background: 'white'}}>⬅ Volver</button>
            </div>

            {/* FILTROS */}
            <div style={{backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '25px', display: 'flex', gap: '20px'}}>
                <div style={{flex: 1}}>
                    <label style={{display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.8rem'}}>FECHA</label>
                    <input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0'}} />
                </div>
                <div style={{flex: 2}}>
                    <label style={{display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.8rem'}}>BUSCAR FOLIO / RESPONSABLE</label>
                    <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0'}} />
                </div>
            </div>

            {/* TABLA PRINCIPAL (RESUMEN) */}
            <div style={{backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden'}}>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead style={{backgroundColor: '#f8fafc', borderBottom: '2px solid #edf2f7'}}>
                        <tr style={{textAlign: 'left', color: '#718096', fontSize: '0.8rem', textTransform: 'uppercase'}}>
                            <th style={{padding: '15px'}}>Fecha</th>
                            <th style={{padding: '15px'}}>Responsable</th>
                            <th style={{padding: '15px'}}>Destino</th>
                            <th style={{padding: '15px', textAlign: 'right'}}>Total Neto</th>
                            <th style={{padding: '15px', textAlign: 'center'}}>Detalle</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{padding: '40px', textAlign: 'center'}}>Cargando...</td></tr>
                        ) : datosFiltrados.map((g, i) => (
                            <tr key={i} style={{borderBottom: '1px solid #f1f5f9'}}>
                                <td style={{padding: '15px'}}>{g.fecha}</td>
                                <td style={{padding: '15px', fontWeight: 'bold'}}>{g.responsable}</td>
                                <td style={{padding: '15px'}}>{g.destinoGeneral}</td>
                                <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#2d3748'}}>
                                    ${g.valorTotalNeto.toLocaleString('es-CL')}
                                </td>
                                <td style={{padding: '15px', textAlign: 'center'}}>
                                    <button 
                                        onClick={() => { setGuiaSeleccionada(g); setMostrarModal(true); }}
                                        style={{background: '#3182ce', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}}
                                    >
                                        🔍 Ver Detalle
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL DETALLE EXTENDIDO */}
            {mostrarModal && guiaSeleccionada && (
                <div style={{position: 'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.6)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000}}>
                    <div style={{backgroundColor:'white', width:'95%', maxWidth:'1100px', borderRadius:'15px', overflow:'hidden', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)'}}>
                        
                        {/* HEADER DEL MODAL */}
                        <div style={{padding:'20px 30px', background:'#2d3748', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <h3 style={{margin:0, fontSize: '1.2rem'}}>DETALLE DE GUÍA: {guiaSeleccionada.folio}</h3>
                            <button onClick={() => setMostrarModal(false)} style={{background:'none', border:'none', fontSize:'2rem', color:'white', cursor:'pointer'}}>&times;</button>
                        </div>

                        {/* TABLA DE DETALLE SOLICITADA */}
                        <div style={{padding: '30px', maxHeight: '70vh', overflowY: 'auto'}}>
                            <table style={{width: '100%', borderCollapse: 'collapse'}}>
                                <thead>
                                    <tr style={{textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#4a5568', fontSize: '0.75rem', textTransform: 'uppercase'}}>
                                        <th style={{padding: '12px'}}>Producto</th>
                                        <th style={{padding: '12px'}}>Responsable</th>
                                        <th style={{padding: '12px'}}>Origen</th>
                                        <th style={{padding: '12px'}}>Destino</th>
                                        <th style={{padding: '12px'}}>Tipo Salida</th>
                                        <th style={{padding: '12px', textAlign: 'center'}}>Cantidad</th>
                                        <th style={{padding: '12px', textAlign: 'right'}}>V. Total Neto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {guiaSeleccionada.detalles.map((d, i) => (
                                        <tr key={i} style={{borderBottom: '1px solid #edf2f7', fontSize: '0.9rem'}}>
                                            <td style={{padding: '12px'}}><strong>{d.producto || d.productoNombre}</strong></td>
                                            <td style={{padding: '12px'}}>{d.usuarioResponsable}</td>
                                            <td style={{padding: '12px'}}>{d.origen || d.areaOrigen}</td>
                                            <td style={{padding: '12px'}}>{d.destino || d.areaDestino}</td>
                                            <td style={{padding: '12px'}}>
                                                <span style={{
                                                    padding: '3px 8px', 
                                                    borderRadius: '4px', 
                                                    fontSize: '0.7rem', 
                                                    fontWeight: 'bold',
                                                    backgroundColor: d.tipoSalida === 'MERMA' ? '#fff5f5' : '#f0fff4',
                                                    color: d.tipoSalida === 'MERMA' ? '#c53030' : '#2f855a'
                                                }}>
                                                    {d.tipoSalida}
                                                </span>
                                            </td>
                                            <td style={{padding: '12px', textAlign: 'center', fontWeight: 'bold'}}>{d.cantidad}</td>
                                            <td style={{padding: '12px', textAlign: 'right', fontWeight: 'bold'}}>
                                                ${(d.valorNeto || 0).toLocaleString('es-CL')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* FOOTER CON SUMA DE TOTALES */}
                        <div style={{padding: '20px 30px', background: '#f8fafc', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px'}}>
                            <span style={{fontSize: '1rem', fontWeight: 'bold', color: '#4a5568'}}>SUMA TOTAL NETO:</span>
                            <span style={{fontSize: '1.4rem', fontWeight: '900', color: '#2d3748'}}>
                                ${guiaSeleccionada.valorTotalNeto.toLocaleString('es-CL')}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}