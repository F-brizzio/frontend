import { useState, useEffect } from 'react';
import { 
    generarReporteGastos, 
    generarReporteConsumo, 
    generarReporteStock, 
    generarReporteComparativo, 
    generarReporteVentaDiaria, 
    getOpcionesFiltro,
    getProductosInfo 
} from '../services/reporteService';
import MultiSelect from '../components/MultiSelect';
import { useNavigate } from 'react-router-dom';

import { Bar, Pie } from 'react-chartjs-2'; 
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function ReportePage() {
    const navigate = useNavigate();
    
    // --- ESTADOS ---
    const [tipoReporte, setTipoReporte] = useState('GASTOS'); 
    const [entidadFiltro, setEntidadFiltro] = useState('CATEGORIA');
    const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
    const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
    const [incluirMerma, setIncluirMerma] = useState(false); 

    const [maestroProductos, setMaestroProductos] = useState([]); 
    const [opcionesDisponibles, setOpcionesDisponibles] = useState([]);
    const [seleccionados, setSeleccionados] = useState([]);

    const [chartData, setChartData] = useState(null);
    const [tablaData, setTablaData] = useState([]);

    useEffect(() => {
        async function init() {
            try { setMaestroProductos(await getProductosInfo()); } catch (e) { console.error(e); }
        }
        init();
    }, []);

    // ... (Mantener useEffect de limpieza y cargarOpciones igual)

    const handleGenerar = async () => {
        setTablaData([]); setChartData(null);
        try {
            const payload = { tipoReporte, fechaInicio, fechaFin, entidadFiltro, valoresFiltro: seleccionados.length > 0 ? seleccionados : null, filtroGlobalArea: null, filtroTipoSalida: 'TODOS' };
            
            let datos = []; 
            if (tipoReporte === 'GASTOS') datos = await generarReporteGastos(payload);
            else if (tipoReporte === 'CONSUMO') datos = await generarReporteConsumo(payload);
            else if (tipoReporte === 'STOCK_FINAL') datos = await generarReporteStock(payload);
            else if (tipoReporte === 'COMPARATIVO') datos = await generarReporteComparativo(payload);
            else if (tipoReporte === 'VENTA_DIARIA') datos = await generarReporteVentaDiaria(payload);

            if (!datos || datos.length === 0) { alert("No se encontraron datos."); return; }
            setTablaData(datos);
            procesarGrafico(datos);
        } catch (error) { console.error(error); alert("Error al generar reporte."); }
    };

    const procesarGrafico = (datos) => {
        const labels = datos.map(d => d.concepto || d.label || d.fecha);
        const colores = ['#38a169', '#3182ce', '#d69e2e', '#e53e3e', '#805ad5', '#319795', '#718096'];

        if (tipoReporte === 'GASTOS' || tipoReporte === 'CONSUMO') {
            // CAMBIO: Gráfico de torta para ambos reportes (Ingreso y Consumo)
            if (entidadFiltro === 'PRODUCTO') {
                setChartData(null); 
            } else {
                setChartData({
                    labels,
                    datasets: [{
                        label: 'Total ($)',
                        data: datos.map(d => tipoReporte === 'GASTOS' ? d.totalGastado : d.valorConsumo),
                        backgroundColor: colores,
                    }]
                });
            }
        } else if (tipoReporte === 'COMPARATIVO') {
            setChartData({ labels, datasets: [{ label: 'Ingresos ($)', data: datos.map(d => d.ingresoDinero), backgroundColor: '#28a745' }, { label: 'Salidas ($)', data: datos.map(d => d.salidaDinero), backgroundColor: '#dc3545' }] });
        } else if (tipoReporte === 'VENTA_DIARIA') {
            setChartData({ labels, datasets: [{ label: 'Venta Diaria ($)', data: datos.map(d => d.valorTotal), backgroundColor: '#007bff' }] });
        } else {
            setChartData({ labels, datasets: [{ label: 'Unidades', data: datos.map(d => d.stockActual), backgroundColor: '#ffc107' }] });
        }
    };

    // ... (descargarPDF se mantiene con la lógica de autoTable)

    const totales = () => {
        if (!tablaData || tablaData.length === 0) return null;
        let t = { ingreso: { dinero: 0 }, consumo: { valor: 0 }, stock: { valor: 0 }, diario: { valor: 0 } };
        tablaData.forEach(d => {
            t.ingreso.dinero += (d.totalGastado || 0);
            t.consumo.valor += (d.valorConsumo || 0);
            t.stock.valor += (d.valorTotal || 0);
            t.diario.valor += (d.valorTotal || 0);
        });
        return t;
    };
    
    const t = totales();

    return (
        <div className="inventory-container">
            <div className="page-header">
                <h2 className="page-title">📊 Reportes de Gestión</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Volver</button>
            </div>

            <div className="filters-panel">
                <div className="filter-group">
                    <label className="filter-label">1. Tipo Reporte</label>
                    <select value={tipoReporte} onChange={e => setTipoReporte(e.target.value)} className="filter-select">
                        <option value="GASTOS">📥 Ingreso (Compras)</option>
                        {/* CAMBIO 1: Nombre a Guía de Consumo */}
                        <option value="CONSUMO">📋 Guía de Consumo</option>
                        <option value="STOCK_FINAL">🏁 Stock Valorizado</option>
                        <option value="COMPARATIVO">⚖️ In vs Out</option>
                        <option value="VENTA_DIARIA">📈 Evolución Ventas</option>
                    </select>
                </div>
                {/* ... filtros de fecha y multiselect ... */}
                <div className="filter-group" style={{ gridColumn: '1 / -1', marginTop:'10px' }}>
                    <button onClick={handleGenerar} className="btn-primary" style={{width:'100%', justifyContent:'center'}}>
                        📊 Generar Reporte
                    </button>
                </div>
            </div>

            {chartData && tablaData.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                    <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'20px' }}>
                        <button onClick={descargarPDF} className="btn-secondary" style={{ background:'#e53e3e', color:'white' }}>
                            <span>📄</span> Descargar PDF
                        </button>
                    </div>

                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div id="report-header-section" style={{ background:'white' }}>
                            <h3 style={{textAlign:'center', color:'#2d3748', textTransform: 'uppercase'}}>
                                {/* CAMBIO 2: Título del gráfico actualizado */}
                                {tipoReporte === 'GASTOS' ? `INGRESO POR ${entidadFiltro}` : 
                                 tipoReporte === 'CONSUMO' ? `GUÍA DE CONSUMO POR ${entidadFiltro}` : 
                                 tipoReporte}
                            </h3>
                            
                            {/* CAMBIO 3: KPIs eliminados para Consumo, igual que en Ingreso */}
                            {(tipoReporte !== 'GASTOS' && tipoReporte !== 'CONSUMO') && (
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'15px', marginBottom:'30px' }}>
                                    {/* Otros KPIs de Stock o Comparativo */}
                                </div>
                            )}

                            <div style={{ height: '350px', marginBottom: '40px' }}>
                                {/* CAMBIO 4: Gráfico de torta para Consumo */}
                                {(tipoReporte === 'GASTOS' || tipoReporte === 'CONSUMO') ? (
                                    chartData ? <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins:{ legend:{ position:'right' } } }} /> : <p style={{textAlign:'center', padding:'50px'}}>Gráfico no disponible para vista por producto.</p>
                                ) : (
                                    <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
                                )}
                            </div>
                        </div>
                        
                        <div className="table-container">
                            <table className="responsive-table">
                                <thead>
                                    <tr>
                                        <th>Concepto</th>
                                        {tipoReporte === 'GASTOS' && (
                                            <><th style={{textAlign:'right'}}>Unidades</th><th style={{textAlign:'right'}}>Total Ingreso ($)</th></>
                                        )}
                                        {tipoReporte === 'CONSUMO' && (
                                            <><th style={{textAlign:'right'}}>Unidades</th><th style={{textAlign:'right'}}>Total ($)</th></>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tablaData.map((d, i) => (
                                        <tr key={i}>
                                            <td style={{fontWeight:'bold'}}>{d.label || d.concepto || d.fecha}</td>
                                            {tipoReporte === 'GASTOS' && (
                                                <><td style={{textAlign:'right'}}>{d.unidadesCompradas?.toLocaleString()}</td><td style={{textAlign:'right'}}>${d.totalGastado?.toLocaleString()}</td></>
                                            )}
                                            {tipoReporte === 'CONSUMO' && (
                                                <><td style={{textAlign:'right'}}>{d.cantConsumo?.toLocaleString()}</td><td style={{textAlign:'right'}}>${Math.round(d.valorConsumo||0).toLocaleString()}</td></>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            {/* CAMBIO 6: Total al final de la tabla para Consumo */}
                            {(tipoReporte === 'GASTOS' || tipoReporte === 'CONSUMO') && (
                                <div style={{ padding: '20px', textAlign: 'right', background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3748' }}>
                                        TOTAL: ${ (tipoReporte === 'GASTOS' ? t.ingreso.dinero : t.consumo.valor).toLocaleString() }
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}