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
    
    // --- ESTADOS ORIGINALES RECUPERADOS ---
    const [tipoReporte, setTipoReporte] = useState('GASTOS'); 
    const [entidadFiltro, setEntidadFiltro] = useState('CATEGORIA');
    const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
    const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
    const [incluirMerma, setIncluirMerma] = useState(false); 

    const [maestroProductos, setMaestroProductos] = useState([]); 
    const [subFiltroTipo, setSubFiltroTipo] = useState('TODOS'); 
    const [subFiltroValor, setSubFiltroValor] = useState(''); 
    const [opcionesSubFiltro, setOpcionesSubFiltro] = useState([]); 
    const [opcionesDisponibles, setOpcionesDisponibles] = useState([]);
    const [seleccionados, setSeleccionados] = useState([]);

    const [chartData, setChartData] = useState(null);
    const [tablaData, setTablaData] = useState([]);

    // --- EFECTOS ORIGINALES RECUPERADOS ---
    useEffect(() => {
        async function init() {
            try { setMaestroProductos(await getProductosInfo()); } catch (e) { console.error(e); }
        }
        init();
    }, []);

    useEffect(() => {
        setSeleccionados([]); setSubFiltroTipo('TODOS'); setSubFiltroValor(''); 
        setChartData(null); setTablaData([]); setIncluirMerma(false);
        cargarOpciones();
    }, [tipoReporte, entidadFiltro]);

    const cargarOpciones = async () => {
        if (entidadFiltro === 'PRODUCTO') {
            if (maestroProductos.length > 0) {
                setOpcionesDisponibles(maestroProductos.map(p => ({ value: `${p.sku} - ${p.nombre}`, label: `${p.sku} - ${p.nombre}` })));
            }
        } else {
            try {
                const data = await getOpcionesFiltro(entidadFiltro);
                setOpcionesDisponibles(data.map(item => ({ value: item, label: item })));
            } catch (error) { console.error(error); }
        }
    };

    useEffect(() => {
        if (entidadFiltro !== 'PRODUCTO') return;
        if (subFiltroTipo === 'CATEGORIA') setOpcionesSubFiltro([...new Set(maestroProductos.map(p => p.categoria || 'Sin Cat'))].sort());
        else if (subFiltroTipo === 'PROVEEDOR') setOpcionesSubFiltro([...new Set(maestroProductos.map(p => p.proveedor || 'Sin Prov'))].sort());
        else if (subFiltroTipo === 'AREA') {
            const todasAreas = maestroProductos.flatMap(p => (p.area||'').split(',').map(s=>s.trim())).filter(s=>s!==''&&s!=='Sin Movimiento');
            setOpcionesSubFiltro([...new Set(todasAreas)].sort());
        } else setOpcionesSubFiltro([]);

        let filtrados = maestroProductos;
        if (subFiltroValor) {
            if (subFiltroTipo === 'CATEGORIA') filtrados = maestroProductos.filter(p => (p.categoria||'').trim() === subFiltroValor);
            else if (subFiltroTipo === 'PROVEEDOR') filtrados = maestroProductos.filter(p => (p.proveedor||'').trim() === subFiltroValor);
            else if (subFiltroTipo === 'AREA') filtrados = maestroProductos.filter(p => (p.area||'').toLowerCase().includes(subFiltroValor.toLowerCase()));
        }
        setOpcionesDisponibles(filtrados.map(p => ({ value: `${p.sku} - ${p.nombre}`, label: `${p.sku} - ${p.nombre}` })));
    }, [subFiltroTipo, subFiltroValor, maestroProductos, entidadFiltro]);

    const handleGenerar = async () => {
        setTablaData([]); setChartData(null);
        try {
            let filtroExtra = null;
            if (entidadFiltro === 'PRODUCTO' && subFiltroTipo === 'AREA' && subFiltroValor !== '') filtroExtra = subFiltroValor; 

            const payload = { tipoReporte, fechaInicio, fechaFin, entidadFiltro, valoresFiltro: seleccionados.length > 0 ? seleccionados : null, filtroGlobalArea: filtroExtra, filtroTipoSalida: 'TODOS' };
            
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
        const colores = ['#3182ce', '#38a169', '#d69e2e', '#e53e3e', '#805ad5', '#319795', '#718096'];

        if ((tipoReporte === 'GASTOS' || tipoReporte === 'CONSUMO') && entidadFiltro !== 'PRODUCTO') {
            setChartData({
                labels,
                datasets: [{
                    label: 'Total ($)',
                    data: datos.map(d => tipoReporte === 'GASTOS' ? d.totalGastado : d.valorConsumo),
                    backgroundColor: colores,
                }]
            });
        } else if (tipoReporte === 'CONSUMO' && entidadFiltro === 'PRODUCTO') {
            setChartData(null); // Producto en consumo no lleva gráfico
        } else if (tipoReporte === 'GASTOS' && entidadFiltro === 'PRODUCTO') {
            setChartData(null); // Producto en ingreso no lleva gráfico
        } else if (tipoReporte === 'COMPARATIVO') {
            setChartData({ labels, datasets: [{ label: 'Ingresos ($)', data: datos.map(d => d.ingresoDinero), backgroundColor: '#28a745' }, { label: 'Salidas ($)', data: datos.map(d => d.salidaDinero), backgroundColor: '#dc3545' }] });
        } else if (tipoReporte === 'VENTA_DIARIA') {
            setChartData({ labels, datasets: [{ label: 'Venta Diaria ($)', data: datos.map(d => d.valorTotal), backgroundColor: '#007bff' }] });
        } else {
            setChartData({ labels, datasets: [{ label: 'Unidades', data: datos.map(d => d.stockActual), backgroundColor: '#ffc107' }] });
        }
    };

    const descargarPDF = async () => {
        const doc = new jsPDF();
        const headerElement = document.getElementById('report-header-section'); 
        if (headerElement) {
            const canvas = await html2canvas(headerElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = (doc.getImageProperties(imgData).height * pdfWidth) / doc.getImageProperties(imgData).width;
            doc.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
            var startY = pdfHeight + 15;
        } else { var startY = 20; }

        let head = [];
        let body = [];

        if (tipoReporte === 'GASTOS' || tipoReporte === 'CONSUMO') {
            head = [['Concepto', 'Unidades', 'Total ($)']];
            body = tablaData.map(d => [
                d.label || d.concepto || d.fecha,
                (tipoReporte === 'GASTOS' ? d.unidadesCompradas : d.cantConsumo)?.toLocaleString(),
                `$${Math.round(tipoReporte === 'GASTOS' ? d.totalGastado : d.valorConsumo).toLocaleString()}`
            ]);
        } else {
            // Estructura original para otros reportes
            head = [['Concepto', 'Valor']];
            body = tablaData.map(d => [d.label || d.concepto || d.fecha, d.valorTotal || d.stockActual]);
        }

        autoTable(doc, { startY, head, body, theme: 'striped', headStyles: { fillColor: [52, 58, 64] } });
        doc.save(`Reporte_${tipoReporte}.pdf`);
    };

    const t = () => {
        let total = 0;
        tablaData.forEach(d => {
            if (tipoReporte === 'GASTOS') total += (d.totalGastado || 0);
            else if (tipoReporte === 'CONSUMO') total += (d.valorConsumo || 0);
            else if (tipoReporte === 'STOCK_FINAL') total += (d.valorTotal || 0);
            else total += (d.valorTotal || 0);
        });
        return total;
    };

    return (
        <div className="inventory-container">
            <div className="page-header">
                <h2 className="page-title">📊 Reportes de Gestión</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Volver</button>
            </div>

            {/* --- PANEL DE FILTROS ORIGINAL COMPLETO --- */}
            <div className="filters-panel">
                <div className="filter-group">
                    <label className="filter-label">1. Tipo Reporte</label>
                    <select value={tipoReporte} onChange={e => setTipoReporte(e.target.value)} className="filter-select">
                        <option value="GASTOS">📥 Ingreso (Compras)</option>
                        <option value="CONSUMO">📋 Guía de Consumo</option>
                        <option value="STOCK_FINAL">🏁 Stock Valorizado</option>
                        <option value="COMPARATIVO">⚖️ In vs Out</option>
                        <option value="VENTA_DIARIA">📈 Evolución Ventas</option>
                    </select>
                </div>

                {tipoReporte !== 'VENTA_DIARIA' && (
                    <div className="filter-group">
                        <label className="filter-label">2. Agrupar Por</label>
                        <select value={entidadFiltro} onChange={e => setEntidadFiltro(e.target.value)} className="filter-select">
                            <option value="CATEGORIA">Categoría</option>
                            <option value="PROVEEDOR">Proveedor</option>
                            <option value="AREA">Área Trabajo</option>
                            <option value="PRODUCTO">Producto</option>
                        </select>
                    </div>
                )}

                <div className="filter-group">
                    <label className="filter-label">Desde</label>
                    <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="filter-input" />
                </div>
                <div className="filter-group">
                    <label className="filter-label">Hasta</label>
                    <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="filter-input" />
                </div>

                {/* --- SUB-FILTROS INTELIGENTES RECUPERADOS --- */}
                {tipoReporte !== 'VENTA_DIARIA' && entidadFiltro === 'PRODUCTO' && (
                    <div className="filter-group" style={{ gridColumn: '1 / -1' }}>
                        <div style={{ background: '#f7fafc', padding: '15px', borderRadius: '8px', border: '1px solid #edf2f7' }}>
                            <label className="filter-label">Filtrar lista de productos por:</label>
                            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginTop:'5px' }}>
                                <select value={subFiltroTipo} onChange={e => { setSubFiltroTipo(e.target.value); setSubFiltroValor(''); }} className="filter-select" style={{flex:1}}>
                                    <option value="TODOS">Todos</option>
                                    <option value="CATEGORIA">Categoría</option>
                                    <option value="PROVEEDOR">Proveedor</option>
                                    <option value="AREA">Área</option>
                                </select>
                                {subFiltroTipo !== 'TODOS' && (
                                    <select value={subFiltroValor} onChange={e => setSubFiltroValor(e.target.value)} className="filter-select" style={{flex:1}}>
                                        <option value="">- Seleccionar -</option>
                                        {opcionesSubFiltro.map(op => <option key={op} value={op}>{op}</option>)}
                                    </select>
                                )}
                            </div>
                            <div style={{marginTop:'10px'}}>
                                <MultiSelect label="Selección Específica:" options={opcionesDisponibles} selectedValues={seleccionados} onChange={setSeleccionados} />
                            </div>
                        </div>
                    </div>
                )}

                <div className="filter-group" style={{ gridColumn: '1 / -1', marginTop:'10px' }}>
                    <button onClick={handleGenerar} className="btn-primary" style={{width:'100%', justifyContent:'center'}}>
                        📊 Generar Reporte
                    </button>
                </div>
            </div>

            {/* --- RESULTADOS --- */}
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
                                {tipoReporte === 'GASTOS' ? `INGRESO POR ${entidadFiltro}` : 
                                 tipoReporte === 'CONSUMO' ? `GUÍA DE CONSUMO POR ${entidadFiltro}` : 
                                 tipoReporte}
                            </h3>
                            
                            <div style={{ height: '350px', marginBottom: '40px' }}>
                                {(tipoReporte === 'GASTOS' || tipoReporte === 'CONSUMO') && entidadFiltro !== 'PRODUCTO' ? (
                                    <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins:{ legend:{ position:'right' } } }} />
                                ) : chartData ? (
                                    <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
                                ) : (
                                    <p style={{textAlign:'center', padding:'50px', color:'#718096'}}>Vista por producto: gráfico no disponible.</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="table-container">
                            <table className="responsive-table">
                                <thead>
                                    <tr>
                                        <th>Concepto</th>
                                        {(tipoReporte === 'GASTOS' || tipoReporte === 'CONSUMO') ? (
                                            <>
                                                <th style={{textAlign:'right'}}>Unidades</th>
                                                <th style={{textAlign:'right'}}>Total ($)</th>
                                            </>
                                        ) : (
                                            <th style={{textAlign:'right'}}>Valor</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tablaData.map((d, i) => (
                                        <tr key={i}>
                                            <td style={{fontWeight:'bold'}}>{d.label || d.concepto || d.fecha}</td>
                                            {(tipoReporte === 'GASTOS' || tipoReporte === 'CONSUMO') ? (
                                                <>
                                                    <td style={{textAlign:'right'}}>{(tipoReporte === 'GASTOS' ? d.unidadesCompradas : d.cantConsumo)?.toLocaleString()}</td>
                                                    <td style={{textAlign:'right'}}>${Math.round(tipoReporte === 'GASTOS' ? d.totalGastado : d.valorConsumo).toLocaleString()}</td>
                                                </>
                                            ) : (
                                                <td style={{textAlign:'right'}}>{(d.valorTotal || d.stockActual)?.toLocaleString()}</td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            {(tipoReporte === 'GASTOS' || tipoReporte === 'CONSUMO') && (
                                <div style={{ padding: '20px', textAlign: 'right', background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3748' }}>
                                        TOTAL: ${Math.round(t()).toLocaleString()}
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