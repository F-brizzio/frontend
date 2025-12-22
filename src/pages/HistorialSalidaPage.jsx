import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSalidas, getDetalleSalida } from '../services/historialSalidaService'; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Utilidad para formateo de moneda CLP profesional
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', { 
        style: 'currency', 
        currency: 'CLP',
        minimumFractionDigits: 0 
    }).format(amount || 0);
};

export default function HistorialSalidaPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [historialResumen, setHistorialResumen] = useState([]);
    
    // --- CAMBIO: Filtro de fecha inicializado con la fecha de hoy ---
    const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

    // Estados para el Modal y Detalle
    const [mostrarModal, setMostrarModal] = useState(false);
    const [guiaSeleccionada, setGuiaSeleccionada] = useState(null); 
    const [itemsDetalle, setItemsDetalle] = useState([]); 

    useEffect(() => { cargarResumen(); }, []);

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

    const exportarAPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("GUÍA DE CONSUMO INTERNO", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Folio: ${guiaSeleccionada.folio}`, 14, 32);
        doc.text(`Fecha: ${guiaSeleccionada.fecha}`, 14, 38);
        doc.text(`Responsable: ${guiaSeleccionada.responsable}`, 14, 44);
        doc.text(`Bodega Origen: ${guiaSeleccionada.areaOrigen}`, 14, 50);

        const tableColumn = ["Producto", "Destino", "Tipo", "Cant.", "Valor Neto"];
        const tableRows = itemsDetalle.map(item => [
            item.productName,
            item.areaDestino,
            item.tipoSalida,
            item.cantidad,
            formatCurrency(item.valorNeto)
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 58,
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72] },
            styles: { fontSize: 8 }
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`VALOR TOTAL NETO: ${formatCurrency(guiaSeleccionada.totalNeto)}`, 130, finalY);

        doc.save(`Guia_${guiaSeleccionada.folio}.pdf`);
    };

    // --- LÓGICA DE FILTRADO POR FECHA ---
    const datosFiltrados = historialResumen.filter(g => 
        !fechaFiltro || g.fecha === fechaFiltro
    );

    return (
        <div className="inventory-container" style={{padding: '20px', backgroundColor: '#f4f7f6', minHeight: '100vh'}}>
            {/* Header */}
            <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px'}}>
                <div>
                    <h2 style={{margin: 0, color: '#2d3748'}}>📜 Historial de Salidas</h2>
                    <p style={{margin: 0, color: '#718096', fontSize: '0.9rem'}}>Consulta de guías por fecha seleccionada</p>
                </div>
                <button onClick={() => navigate('/menu')} style={{padding: '10px 20px', cursor:'pointer', borderRadius:'6px', border:'1px solid #cbd5e0', background:'white'}}>⬅ Volver</button>
            </div>

            {/* PANEL DE FILTRO DE FECHA */}
            <div className="filters-panel" style={{background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px'}}>
                <label style={{fontWeight: 'bold', color: '#4a5568'}}>Filtrar por Fecha:</label>
                <input 
                    type="date" 
                    value={fechaFiltro} 
                    onChange={e => setFechaFiltro(e.target.value)}
                    style={{padding: '8px 15px', borderRadius: '5px', border: '1px solid #e2e8f0', fontSize: '1rem', color: '#2d3748'}}
                />
                <button 
                    onClick={() => setFechaFiltro('')} 
                    style={{background: 'none', border: 'none', color: '#3182ce', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline'}}
                >
                    Ver todas las fechas
                </button>
            </div>

            {/* Tabla Principal */}
            <div className="table-container" style={{background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden'}}>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead style={{backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0'}}>
                        <tr style={{color: '#718096', textTransform: 'uppercase', fontSize: '0.75rem'}}>
                            <th style={{padding: '15px', textAlign: 'left'}}>Fecha</th>
                            <th style={{padding: '15px', textAlign: 'left'}}>Responsable</th>
                            <th style={{padding: '15px', textAlign: 'left'}}>Destino</th>
                            <th style={{padding: '15px', textAlign: 'right'}}>Total Neto</th>
                            <th style={{padding: '15px', textAlign: 'center'}}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{padding: '30px', textAlign: 'center'}}>Cargando registros...</td></tr>
                        ) : datosFiltrados.length === 0 ? (
                            <tr><td colSpan="5" style={{padding: '30px', textAlign: 'center', color: '#a0aec0'}}>No hay guías para la fecha seleccionada.</td></tr>
                        ) : (
                            datosFiltrados.map((g, i) => (
                                <tr key={i} style={{borderBottom: '1px solid #edf2f7'}}>
                                    <td style={{padding: '15px'}}>{g.fecha}</td>
                                    <td style={{padding: '15px', fontWeight: 'bold'}}>{g.responsable}</td>
                                    <td style={{padding: '15px'}}>{g.destino}</td>
                                    <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#2f855a'}}>
                                        {formatCurrency(g.totalNeto)}
                                    </td>
                                    <td style={{padding: '15px', textAlign: 'center'}}>
                                        <button 
                                            onClick={() => abrirModalDetalle(g)} 
                                            style={{padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #3182ce', color: '#3182ce', background: 'white'}}
                                        >
                                            📄 Ver Detalle
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Detalle */}
            {mostrarModal && guiaSeleccionada && (
                <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
                    <div style={{backgroundColor: 'white', borderRadius: '8px', width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto'}}>
                        
                        <div style={{padding: '20px 30px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <div>
                                <h3 style={{margin: 0, color: '#2d3748'}}>DETALLE GUÍA {guiaSeleccionada.folio}</h3>
                                <p style={{margin: 0, fontSize: '0.85rem', color: '#718096'}}>Emitida el {guiaSeleccionada.fecha}</p>
                            </div>
                            <button 
                                onClick={exportarAPDF}
                                style={{padding: '10px 20px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}}
                            >
                                📥 Descargar PDF
                            </button>
                        </div>

                        <div style={{padding: '25px'}}>
                            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem'}}>
                                <thead>
                                    <tr style={{borderBottom: '2px solid #edf2f7', color: '#718096', textTransform: 'uppercase', fontSize: '0.75rem'}}>
                                        <th style={{textAlign: 'left', padding: '10px'}}>PRODUCTO</th>
                                        <th style={{textAlign: 'left', padding: '10px'}}>DESTINO</th>
                                        <th style={{textAlign: 'left', padding: '10px'}}>TIPO</th>
                                        <th style={{textAlign: 'center', padding: '10px'}}>CANT.</th>
                                        <th style={{textAlign: 'right', padding: '10px'}}>V. NETO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemsDetalle.map((d, idx) => (
                                        <tr key={idx} style={{borderBottom: '1px solid #edf2f7'}}>
                                            <td style={{padding: '12px 10px'}}><strong>{d.productName}</strong></td>
                                            <td style={{padding: '12px 10px'}}>{d.areaDestino}</td>
                                            <td style={{padding: '12px 10px'}}>{d.tipoSalida}</td>
                                            <td style={{padding: '12px 10px', textAlign: 'center'}}>{d.cantidad}</td>
                                            <td style={{padding: '12px 10px', textAlign: 'right'}}>{formatCurrency(d.valorNeto)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{marginTop: '20px', textAlign: 'right', borderTop: '2px solid #cbd5e0', paddingTop: '10px'}}>
                                <span style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3748'}}>SUMA TOTAL NETO: {formatCurrency(guiaSeleccionada.totalNeto)}</span>
                            </div>
                        </div>

                        <div style={{padding: '15px', textAlign: 'center', borderTop: '1px solid #e2e8f0'}}>
                            <button onClick={() => setMostrarModal(false)} style={{padding: '8px 25px', backgroundColor: '#718096', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}