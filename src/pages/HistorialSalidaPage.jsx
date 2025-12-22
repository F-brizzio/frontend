import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Asegúrate de que el servicio esté correcto
import { getSalidas, getDetalleSalida } from '../services/historialSalidaService'; 

// Utilidad para formateo de moneda CLP (Igual al de ingresos)
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', { 
        style: 'currency', 
        currency: 'CLP',
        minimumFractionDigits: 0 
    }).format(amount);
};

export default function HistorialSalidaPage() {
    const navigate = useNavigate();
    const [historialResumen, setHistorialResumen] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    // Modal
    const [mostrarModal, setMostrarModal] = useState(false);
    const [guiaSeleccionada, setGuiaSeleccionada] = useState(null); 
    const [itemsDetalle, setItemsDetalle] = useState([]); // Para guardar el desglose real

    useEffect(() => { cargarResumen(); }, []);

    // 1. Cargar el Resumen (Primera Instancia)
    const cargarResumen = async () => {
        setLoading(true);
        try {
            const data = await getSalidas();
            setHistorialResumen(data);
        } catch (error) { 
            console.error(error);
            alert("Error cargando historial de salidas.");
        } finally { 
            setLoading(false); 
        }
    };

    // 2. Abrir Modal y cargar el Detalle real desde la BD
    const abrirModalDetalle = async (guia) => {
        try {
            const dataItems = await getDetalleSalida(guia.folio);
            setGuiaSeleccionada(guia);
            setItemsDetalle(dataItems);
            setMostrarModal(true);
        } catch (error) {
            alert("No se pudo cargar el detalle de la guía " + guia.folio);
        }
    };

    // Renderizado
    return (
        <div className="inventory-container" style={{padding: '20px', backgroundColor: '#f4f7f6', minHeight: '100vh'}}>
            {/* Header Principal */}
            <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px'}}>
                <div>
                    <h2 style={{margin: 0, color: '#2d3748'}}>📤 Historial de Guías de Consumo</h2>
                    <p style={{margin: 0, color: '#718096', fontSize: '0.9rem'}}>Registro de salidas y valorización FIFO</p>
                </div>
                <button onClick={() => navigate('/menu')} className="back-btn" style={{padding: '10px 20px', cursor:'pointer'}}>⬅ Volver al Menú</button>
            </div>

            {/* Barra de Filtros (Igual a Ingresos) */}
            <div className="filters-panel" style={{background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px'}}>
                <input 
                    type="text" 
                    placeholder="🔍 Buscar por Folio o Responsable..." 
                    value={busqueda} 
                    onChange={e => setBusqueda(e.target.value)}
                    className="filter-input"
                    style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #e2e8f0', fontSize: '1rem'}}
                />
            </div>

            {/* Tabla Principal (Primera Instancia) */}
            <div className="table-container" style={{background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden'}}>
                {loading ? (
                    <div style={{padding: '40px', textAlign: 'center', color: '#718096'}}>Cargando historial...</div>
                ) : (
                    <table className="responsive-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead style={{backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0'}}>
                            <tr>
                                <th style={{padding: '15px', textAlign: 'left', color: '#4a5568'}}>Fecha</th>
                                <th style={{padding: '15px', textAlign: 'left', color: '#4a5568'}}>Responsable</th>
                                <th style={{padding: '15px', textAlign: 'left', color: '#4a5568'}}>Destino</th>
                                <th style={{padding: '15px', textAlign: 'right', color: '#2d3748'}}>Total Neto</th>
                                <th style={{padding: '15px', textAlign: 'center', color: '#4a5568'}}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historialResumen.filter(g => 
                                g.folio.toLowerCase().includes(busqueda.toLowerCase()) || 
                                g.responsable.toLowerCase().includes(busqueda.toLowerCase())
                            ).map((g, i) => (
                                <tr key={i} style={{borderBottom: '1px solid #edf2f7', transition: 'background 0.2s'}}>
                                    <td style={{padding: '15px'}}>{g.fecha}</td>
                                    <td style={{padding: '15px', fontWeight: 'bold'}}>{g.responsable}</td>
                                    <td style={{padding: '15px'}}>{g.destino}</td>
                                    <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#2f855a'}}>
                                        {formatCurrency(g.totalNeto)}
                                    </td>
                                    <td style={{padding: '15px', textAlign: 'center'}}>
                                        <button 
                                            onClick={() => abrirModalDetalle(g)} 
                                            className="btn-primary"
                                            style={{padding: '6px 12px', fontSize: '0.85rem', borderRadius: '4px', cursor: 'pointer', border: '1px solid #3182ce', background: 'white', color: '#3182ce'}}
                                        >
                                            📄 Ver Detalle
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODAL DETALLE (Estilo Factura) */}
            {mostrarModal && guiaSeleccionada && (
                <div className="modal-overlay" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
                    <div className="modal-content" style={{backgroundColor: 'white', padding: '0', borderRadius: '8px', width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column'}}>
                        
                        {/* Header del Modal */}
                        <div style={{padding: '20px 30px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                            <div>
                                <h3 style={{margin: '0 0 5px 0', color: '#2d3748', textTransform: 'uppercase'}}>Detalle Guía de Consumo</h3>
                                <div style={{fontSize: '0.9rem', color: '#718096'}}>
                                    <strong>Responsable:</strong> {guiaSeleccionada.responsable}<br/>
                                    <strong>Fecha de Emisión:</strong> {guiaSeleccionada.fecha}
                                </div>
                            </div>
                            <div style={{textAlign: 'right'}}>
                                <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#3182ce'}}>Folio {guiaSeleccionada.folio}</div>
                                <div style={{fontSize: '0.9rem', color: '#4a5568'}}>Casino de Alimentos</div>
                            </div>
                        </div>

                        {/* Cuerpo (Tabla Desglose) */}
                        <div style={{padding: '20px 30px', flex: 1}}>
                            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem'}}>
                                <thead>
                                    <tr style={{borderBottom: '2px solid #edf2f7', color: '#718096', fontSize: '0.75rem', textTransform: 'uppercase'}}>
                                        <th style={{textAlign: 'left', padding: '10px'}}>Producto</th>
                                        <th style={{textAlign: 'left', padding: '10px'}}>Origen</th>
                                        <th style={{textAlign: 'left', padding: '10px'}}>Destino</th>
                                        <th style={{textAlign: 'left', padding: '10px'}}>Tipo</th>
                                        <th style={{textAlign: 'center', padding: '10px'}}>Cant.</th>
                                        <th style={{textAlign: 'right', padding: '10px'}}>V. Total Neto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemsDetalle.map((d, idx) => (
                                        <tr key={idx} style={{borderBottom: '1px solid #edf2f7'}}>
                                            <td style={{padding: '12px 10px'}}><strong>{d.productName}</strong></td>
                                            <td style={{padding: '12px 10px'}}>{d.areaOrigen}</td>
                                            <td style={{padding: '12px 10px'}}>{d.areaDestino}</td>
                                            <td style={{padding: '12px 10px'}}>
                                                <span style={{fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: d.tipoSalida === 'MERMA' ? '#fff5f5' : '#f0fff4', color: d.tipoSalida === 'MERMA' ? '#c53030' : '#2f855a', fontWeight: 'bold'}}>
                                                    {d.tipoSalida}
                                                </span>
                                            </td>
                                            <td style={{padding: '10px', textAlign: 'center', fontWeight: 'bold'}}>{d.cantidad}</td>
                                            <td style={{padding: '10px', textAlign: 'right', fontWeight: '500'}}>
                                                {formatCurrency(d.valorNeto)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer (Totalizadores) */}
                        <div style={{backgroundColor: '#f8fafc', padding: '20px 30px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end'}}>
                            <div style={{minWidth: '250px', textAlign: 'right'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3748', borderTop: '2px solid #cbd5e0', paddingTop: '10px'}}>
                                    <span>SUMA TOTAL NETO:</span>
                                    <span>{formatCurrency(guiaSeleccionada.totalNeto)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Botón Cerrar */}
                        <div style={{padding: '15px', textAlign: 'center', backgroundColor: 'white'}}>
                            <button 
                                onClick={() => setMostrarModal(false)} 
                                style={{padding: '10px 30px', backgroundColor: '#718096', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'}}
                            >
                                Cerrar Detalle
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}