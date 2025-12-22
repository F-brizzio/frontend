import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSalidas, getDetalleSalida } from '../services/salidaService'; // Asegúrate de tener getDetalleSalida

export default function HistorialSalidaPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [historialResumen, setHistorialResumen] = useState([]); 
    const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

    const [mostrarModal, setMostrarModal] = useState(false);
    const [guiaSeleccionada, setGuiaSeleccionada] = useState(null);

    // 1. CARGA EL RESUMEN (Para la tabla principal)
    useEffect(() => {
        const cargarResumen = async () => {
            setLoading(true);
            try {
                const data = await getSalidas(); 
                setHistorialResumen(data);
            } catch (error) {
                console.error("Error cargando historial", error);
            } finally {
                setLoading(false);
            }
        };
        cargarResumen();
    }, []);

    // 2. CARGA EL DETALLE ESPECÍFICO (Para el Modal)
    const verDetalle = async (resumen) => {
        try {
            // Llama a /api/historial/salidas/{folio}
            const dataDetalle = await getDetalleSalida(resumen.folio); 
            setGuiaSeleccionada({ ...resumen, items: dataDetalle });
            setMostrarModal(true);
        } catch (error) {
            alert("Error al obtener los productos de la guía");
        }
    };

    const datosFiltrados = historialResumen.filter(g => !fechaFiltro || g.fecha === fechaFiltro);

    return (
        <div style={{padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh'}}>
            <h2 style={{fontWeight: 'bold'}}>HISTORIAL DE GUÍAS</h2>

            {/* TABLA PRINCIPAL: Fecha, Responsable, Destino, Total Neto */}
            <div style={{backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead style={{backgroundColor: '#f8fafc'}}>
                        <tr style={{textAlign: 'left', color: '#718096', fontSize: '0.8rem'}}>
                            <th style={{padding: '15px'}}>Fecha</th>
                            <th style={{padding: '15px'}}>Responsable</th>
                            <th style={{padding: '15px'}}>Destino</th>
                            <th style={{padding: '15px', textAlign: 'right'}}>Total Neto</th>
                            <th style={{padding: '15px', textAlign: 'center'}}>Detalle</th>
                        </tr>
                    </thead>
                    <tbody>
                        {datosFiltrados.map((g, i) => (
                            <tr key={i} style={{borderBottom: '1px solid #f1f5f9'}}>
                                <td style={{padding: '15px'}}>{g.fecha}</td>
                                <td style={{padding: '15px', fontWeight: 'bold'}}>{g.responsable}</td>
                                <td style={{padding: '15px'}}>{g.destino}</td>
                                <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold'}}>
                                    ${g.totalNeto?.toLocaleString('es-CL')}
                                </td>
                                <td style={{padding: '15px', textAlign: 'center'}}>
                                    <button onClick={() => verDetalle(g)} style={{background: '#3182ce', color: 'white', padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer'}}>
                                        🔍 Ver
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL DETALLE: Nombre Producto, Responsable, Origen, Destino, Tipo, Cantidad, Valor Neto */}
            {mostrarModal && guiaSeleccionada && (
                <div style={{position: 'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000}}>
                    <div style={{backgroundColor:'white', width:'95%', maxWidth:'1100px', borderRadius:'15px', overflow:'hidden'}}>
                        <div style={{padding:'20px', background:'#2d3748', color:'white', display:'flex', justifyContent:'space-between'}}>
                            <h3 style={{margin:0}}>Detalle Guía: {guiaSeleccionada.folio}</h3>
                            <button onClick={() => setMostrarModal(false)} style={{background:'none', border:'none', color:'white', fontSize:'2rem', cursor:'pointer'}}>&times;</button>
                        </div>
                        <div style={{padding: '25px', maxHeight: '70vh', overflowY: 'auto'}}>
                            <table style={{width: '100%', borderCollapse: 'collapse'}}>
                                <thead>
                                    <tr style={{textAlign: 'left', borderBottom: '2px solid #eee', fontSize: '0.75rem', color: '#4a5568'}}>
                                        <th>PRODUCTO</th>
                                        <th>RESPONSABLE</th>
                                        <th>ORIGEN</th>
                                        <th>DESTINO</th>
                                        <th>TIPO</th>
                                        <th style={{textAlign: 'center'}}>CANTIDAD</th>
                                        <th style={{textAlign: 'right'}}>V. NETO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {guiaSeleccionada.items.map((d, i) => (
                                        <tr key={i} style={{borderBottom: '1px solid #edf2f7', fontSize: '0.9rem'}}>
                                            {/* SE USAN LOS NOMBRES EXACTOS DE SalidaHistorial.java */}
                                            <td style={{padding: '12px'}}><strong>{d.productName}</strong></td>
                                            <td style={{padding: '12px'}}>{d.usuarioResponsable}</td>
                                            <td style={{padding: '12px'}}>{d.areaOrigen}</td>
                                            <td style={{padding: '12px'}}>{d.areaDestino}</td>
                                            <td style={{padding: '12px'}}>{d.tipoSalida}</td>
                                            <td style={{padding: '12px', textAlign: 'center'}}>{d.cantidad}</td>
                                            <td style={{padding: '12px', textAlign: 'right'}}>${d.valorNeto?.toLocaleString('es-CL')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* SUMA TOTAL NETO */}
                        <div style={{padding: '20px', background: '#f8fafc', textAlign: 'right', borderTop: '2px solid #eee'}}>
                            <span style={{fontWeight: 'bold', fontSize: '1.2rem'}}>TOTAL GUÍA: ${guiaSeleccionada.totalNeto?.toLocaleString('es-CL')}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}