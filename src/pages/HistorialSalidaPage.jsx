import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSalidas, getDetalleSalida } from '../services/historialSalidaService'; 
import jsPDF from 'jspdf';
// CORRECCIÓN: Importación explícita de autoTable para que la función sea reconocida
import autoTable from 'jspdf-autotable'; 

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
    const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

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
        try {
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

            // CORRECCIÓN: Uso de la función autoTable importada directamente
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 58,
                theme: 'grid',
                headStyles: { fillColor: [45, 55, 72] },
                styles: { fontSize: 8 }
            });

            // doc.lastAutoTable sigue estando disponible para calcular la posición final
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text(`VALOR TOTAL NETO: ${formatCurrency(guiaSeleccionada.totalNeto)}`, 130, finalY);

            doc.save(`Guia_${guiaSeleccionada.folio}.pdf`);
        } catch (error) {
            console.error("Error al exportar PDF:", error);
            alert("No se pudo generar el PDF. Verifica la consola.");
        }
    };

    // Lógica de filtrado
    const datosFiltrados = historialResumen.filter(g => 
        !fechaFiltro || g.fecha === fechaFiltro
    );

    return (
        <div className="inventory-container" style={{padding: '20px', backgroundColor: '#f4f7f6', minHeight: '100vh'}}>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h2 style={{margin: 0, color: '#2d3748'}}>📜 Historial de Salidas</h2>
                    <p style={{margin: 0, color: '#718096', fontSize: '0.9rem'}}>Gestión y descarga de guías de consumo</p>
                </div>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Volver</button>
            </div>

            {/* Filtro de Fecha */}
            <div className="filters-panel">
                <label style={{fontWeight: 'bold', color: '#4a5568'}}>Seleccionar Fecha:</label>
                <input 
                    type="date" 
                    value={fechaFiltro} 
                    onChange={e => setFechaFiltro(e.target.value)}
                    className="filter-input"
                    style={{ width: 'auto' }}
                />
            </div>

            {/* Tabla Principal */}
            <div className="table-container">
                <table className="responsive-table">
                    <thead>
                        <tr>
                            <th style={{textAlign: 'left'}}>Fecha</th>
                            <th style={{textAlign: 'left'}}>Responsable</th>
                            <th style={{textAlign: 'left'}}>Destino</th>
                            <th style={{textAlign: 'right'}}>Total Neto</th>
                            <th style={{textAlign: 'center'}}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>Cargando registros...</td></tr>
                        ) : datosFiltrados.length === 0 ? (
                            <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#a0aec0'}}>No hay guías para la fecha seleccionada.</td></tr>
                        ) : (
                            datosFiltrados.map((g, i) => (
                                <tr key={i}>
                                    <td>{g.fecha}</td>
                                    <td><strong>{g.responsable}</strong></td>
                                    <td>{g.destino}</td>
                                    <td style={{textAlign: 'right', fontWeight: 'bold', color: '#2f855a'}}>
                                        {formatCurrency(g.totalNeto)}
                                    </td>
                                    <td style={{textAlign: 'center'}}>
                                        <button 
                                            onClick={() => abrirModalDetalle(g)} 
                                            className="btn-secondary"
                                            style={{ color: '#3182ce', borderColor: '#3182ce' }}
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
                <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
                    <div className="modal-content" style={{ maxWidth: '1000px', width: '95%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{margin: 0}}>DETALLE GUÍA {guiaSeleccionada.folio}</h3>
                                <p style={{margin: 0, color: '#718096'}}>Responsable: {guiaSeleccionada.responsable}</p>
                            </div>
                            <button 
                                onClick={exportarAPDF}
                                className="btn-primary"
                                style={{ backgroundColor: '#e53e3e' }}
                            >
                                📥 Descargar PDF
                            </button>
                        </div>

                        <div className="table-container" style={{ boxShadow: 'none' }}>
                            <table className="responsive-table">
                                <thead>
                                    <tr>
                                        <th>PRODUCTO</th>
                                        <th>DESTINO</th>
                                        <th>TIPO</th>
                                        <th style={{textAlign: 'center'}}>CANT.</th>
                                        <th style={{textAlign: 'right'}}>V. NETO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemsDetalle.map((d, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{d.productName}</strong></td>
                                            <td>{d.areaDestino}</td>
                                            <td>{d.tipoSalida}</td>
                                            <td style={{textAlign: 'center'}}>{d.cantidad}</td>
                                            <td style={{textAlign: 'right'}}>{formatCurrency(d.valorNeto)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style={{marginTop: '20px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem'}}>
                            TOTAL NETO: {formatCurrency(guiaSeleccionada.totalNeto)}
                        </div>

                        <div className="form-actions" style={{ marginTop: '20px' }}>
                            <button className="btn-secondary" onClick={() => setMostrarModal(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}