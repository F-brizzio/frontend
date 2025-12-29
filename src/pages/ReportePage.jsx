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
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    BarElement, 
    Title, 
    Tooltip, 
    Legend, 
    ArcElement 
} from 'chart.js'; 
import html2canvas from 'html2canvas'; 
import jsPDF from 'jspdf'; 
import autoTable from 'jspdf-autotable'; 

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement); 

// MAPEO DE ETIQUETAS DINÁMICAS
const etiquetasFiltro = {
    'CATEGORIA': 'Categoría',
    'PROVEEDOR': 'Proveedor',
    'AREA': 'Área de Trabajo',
    'PRODUCTO': 'Producto'
};

export default function ReportePage() {
    const navigate = useNavigate();
    
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

    useEffect(() => { if (tablaData.length > 0) procesarGrafico(tablaData); }, [incluirMerma]);

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
        // ELIMINAR GRÁFICOS PARA COMPARATIVO Y VENTAS
        if (tipoReporte === 'COMPARATIVO' || tipoReporte === 'VENTA_DIARIA') { 
            setChartData(null); 
            return; 
        }

        const labels = datos.map(d => d.concepto || d.label || d.fecha);
        const colores = ['#3182ce', '#38a169', '#d69e2e', '#e53e3e', '#805ad5', '#319795', '#718096'];

        if (tipoReporte === 'CONSUMO' && entidadFiltro !== 'PRODUCTO') {
            const datasets = [{ label: 'Consumo ($)', data: datos.map(d => d.valorConsumo), backgroundColor: '#38a169' }];
            if (incluirMerma) {
                datasets.push({ label: 'Merma ($)', data: datos.map(d => d.valorMerma), backgroundColor: '#e53e3e' });
                setChartData({ labels, datasets });
            } else {
                setChartData({ labels, datasets: [{ label: 'Total ($)', data: datos.map(d => d.valorConsumo), backgroundColor: colores }] });
            }
        } else if (tipoReporte === 'GASTOS' && entidadFiltro !== 'PRODUCTO') {
            setChartData({ labels, datasets: [{ label: 'Total ($)', data: datos.map(d => d.totalGastado), backgroundColor: colores }] });
        } else { setChartData(null); }
    };

    const calcularTotales = () => {
        let t = { ingreso: 0, guia: 0, stock: 0, venta: 0 };
        tablaData.forEach(d => {
            t.ingreso += (d.totalGastado || d.ingresoDinero || 0);
            t.guia += (d.valorConsumo || d.salidaDinero || 0);
            t.stock += (d.valorTotal || 0);
            t.venta += (d.valorTotal || 0);
        });
        return t;
    };
    const t = calcularTotales();

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

        const colPrincipal = tipoReporte === 'VENTA_DIARIA' ? 'Fecha' : (etiquetasFiltro[entidadFiltro] || 'Concepto');
        let head = []; let body = []; let foot = [];

        if (tipoReporte === 'COMPARATIVO') {
            // CABECERA DOBLE SIN COLORES DE FONDO
            head = [
                [
                    { content: colPrincipal, rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
                    { content: 'INGRESO', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
                    { content: 'GUÍA', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
                    { content: 'Balance Valor', rowSpan: 2, styles: { valign: 'middle', halign: 'right' } }
                ],
                [
                    { content: 'Unidad', styles: { halign: 'right' } },
                    { content: 'Valor', styles: { halign: 'right' } },
                    { content: 'Unidad', styles: { halign: 'right' } },
                    { content: 'Valor', styles: { halign: 'right' } }
                ]
            ];
            body = tablaData.map(d => [d.label||d.concepto, d.ingresoCantidad?.toLocaleString(), `$${d.ingresoDinero?.toLocaleString()}`, d.salidaCantidad?.toLocaleString(), `$${d.salidaDinero?.toLocaleString()}`, `$${(d.ingresoDinero-d.salidaDinero).toLocaleString()}`]);
            foot = [['TOTALES', '', `$${t.ingreso.toLocaleString()}`, '', `$${t.guia.toLocaleString()}`, `$${(t.ingreso-t.guia).toLocaleString()}`]];
        } else {
            const hMap = { 
                'GASTOS': [colPrincipal, 'Unidades', 'Total ($)'], 
                'CONSUMO': [colPrincipal, 'Unid. Consumo', 'Costo Consumo ($)'], 
                'STOCK_FINAL': [colPrincipal, 'Stock Actual', 'Valor Total ($)'], 
                'VENTA_DIARIA': ['Fecha', 'Venta Total ($)'] 
            };
            head = [hMap[tipoReporte]];
            body = tablaData.map(d => {
                if (tipoReporte==='GASTOS') return [d.label||d.concepto, d.unidadesCompradas?.toLocaleString(), `$${Math.round(d.totalGastado).toLocaleString()}`];
                if (tipoReporte==='CONSUMO') return [d.label||d.concepto, d.cantConsumo?.toLocaleString(), `$${Math.round(d.valorConsumo).toLocaleString()}`];
                if (tipoReporte==='STOCK_FINAL') return [d.label||d.concepto, d.stockActual?.toLocaleString(), `$${Math.round(d.valorTotal).toLocaleString()}`];
                return [d.fecha, `$${Math.round(d.valorTotal).toLocaleString()}`]; // VENTA_DIARIA solo 2 columnas
            });
            const totalV = tipoReporte==='GASTOS'?t.ingreso:(tipoReporte==='CONSUMO'?t.guia:(tipoReporte==='STOCK_FINAL'?t.stock:t.venta));
            foot = [['TOTAL FINAL', '', `$${Math.round(totalV).toLocaleString()}`]];
        }

        autoTable(doc, { 
            startY, head, body, foot, theme: 'grid',
            headStyles: { textColor: [45,55,72], fontStyle: 'bold', fillColor: [245, 247, 250] }, // Color gris muy suave para cabecera
            footStyles: { fillColor: [45,55,72], textColor: [255,255,255], fontStyle: 'bold', halign: 'right' },
            didParseCell: (data) => {
                // SE ELIMINÓ LA LÓGICA DE COLORES DE FONDO EN EL CUERPO
                if (data.section==='foot' && data.column.index===0) data.cell.styles.halign = 'left';
            }
        });
        doc.save(`Reporte_${tipoReporte}.pdf`);
    };

    return (
        <div className="inventory-container">
            <div className="page-header">
                <h2 className="page-title">📊 Reportes de Gestión</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Volver</button>
            </div>

            <div className="filters-panel">
                {/* ... (Sección de filtros se mantiene igual) ... */}
                <div className="filter-group">
                    <label className="filter-label">1. Tipo Reporte</label>
                    <select value={tipoReporte} onChange={e => setTipoReporte(e.target.value)} className="filter-select">
                        <option value="GASTOS">📥 Ingreso </option>
                        <option value="CONSUMO">📋 Guía de Consumo</option>
                        <option value="STOCK_FINAL">🏁 Stock Valorizado</option>
                        <option value="COMPARATIVO">⚖️ Ingreso vs Guía</option>
                        <option value="VENTA_DIARIA">📈 Evolución Ventas</option>
                    </select>
                </div>
                {tipoReporte === 'CONSUMO' && (
                    <div className="filter-group" style={{ justifyContent:'flex-end' }}>
                        <div style={{display:'flex', alignItems:'center', background:'white', padding:'10px', borderRadius:'6px', border:'1px solid #e2e8f0'}}>
                            <input type="checkbox" checked={incluirMerma} onChange={e => setIncluirMerma(e.target.checked)} style={{width:'20px', height:'20px', marginRight:'10px'}}/>
                            <span style={{fontWeight:'600', color: incluirMerma ? '#dc3545' : '#4a5568'}}>Ver Mermas</span>
                        </div>
                    </div>
                )}
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
                {/* SUBFILTROS PRODUCTO */}
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
                    <button onClick={handleGenerar} className="btn-primary" style={{width:'100%', justifyContent:'center'}}>📊 Generar Reporte</button>
                </div>
            </div>

            {tablaData.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                    <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'20px' }}>
                        <button onClick={descargarPDF} className="btn-secondary" style={{ background:'#e53e3e', color:'white' }}><span>📄</span> Descargar PDF</button>
                    </div>

                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div id="report-header-section" style={{ background:'white', padding:'10px' }}>
                            <h3 style={{textAlign:'center', color:'#2d3748', textTransform: 'uppercase'}}>
                                {tipoReporte === 'GASTOS' ? `INGRESO POR ${entidadFiltro}` : 
                                 tipoReporte === 'CONSUMO' ? `GUÍA DE CONSUMO POR ${entidadFiltro}` : 
                                 tipoReporte === 'STOCK_FINAL' ? `STOCK VALORIZADO POR ${entidadFiltro}` :
                                 tipoReporte === 'COMPARATIVO' ? `INGRESO VS GUÍA POR ${entidadFiltro}` :
                                 'EVOLUCIÓN DE VENTAS'}
                            </h3>
                            {chartData && (
                                <div style={{ height: '350px', marginBottom: '40px' }}>
                                    <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins:{ legend:{ position:'right' } } }} />
                                </div>
                            )}
                        </div>
                        
                        <div className="table-container">
                            <table className="responsive-table">
                                <thead>
                                    {tipoReporte === 'COMPARATIVO' ? (
                                        <>
                                            {/* CABECERA DOBLE LIMPIA SIN COLORES DE FONDO */}
                                            <tr>
                                                <th rowSpan="2" style={{ verticalAlign: 'middle' }}>{etiquetasFiltro[entidadFiltro] || 'Concepto'}</th>
                                                <th colSpan="2" style={{ textAlign: 'center', fontWeight:'bold' }}>INGRESO</th>
                                                <th colSpan="2" style={{ textAlign: 'center', fontWeight:'bold' }}>GUÍA</th>
                                                <th rowSpan="2" style={{ verticalAlign: 'middle', textAlign: 'right' }}>Balance Valor</th>
                                            </tr>
                                            <tr>
                                                <th style={{ textAlign: 'right' }}>Unidad</th>
                                                <th style={{ textAlign: 'right' }}>Valor</th>
                                                <th style={{ textAlign: 'right' }}>Unidad</th>
                                                <th style={{ textAlign: 'right' }}>Valor</th>
                                            </tr>
                                        </>
                                    ) : (
                                        <tr>
                                            <th>{tipoReporte === 'VENTA_DIARIA' ? 'Fecha' : (etiquetasFiltro[entidadFiltro] || 'Concepto')}</th>
                                            {tipoReporte === 'GASTOS' && <><th style={{textAlign:'right'}}>Unidades</th><th style={{textAlign:'right'}}>Total Ingreso ($)</th></>}
                                            {tipoReporte === 'CONSUMO' && <><th style={{textAlign:'right'}}>Unid. Consumo</th><th style={{textAlign:'right'}}>Costo Consumo ($)</th>{incluirMerma && <><th style={{textAlign:'right', color:'#dc3545'}}>Unid. Merma</th><th style={{textAlign:'right', color:'#dc3545'}}>Costo Merma ($)</th></>}</>}
                                            {tipoReporte === 'STOCK_FINAL' && <><th style={{textAlign:'right'}}>Stock Actual</th><th style={{textAlign:'right'}}>Valor Total ($)</th></>}
                                            {tipoReporte === 'VENTA_DIARIA' && <th style={{textAlign:'right'}}>Venta Total ($)</th>}
                                        </tr>
                                    )}
                                </thead>
                                <tbody>
                                    {tablaData.map((d, i) => (
                                        <tr key={i}>
                                            <td style={{fontWeight:'bold'}}>{d.label || d.concepto || d.fecha}</td>
                                            {tipoReporte === 'GASTOS' && <><td style={{textAlign:'right'}}>{d.unidadesCompradas?.toLocaleString()}</td><td style={{textAlign:'right'}}>${Math.round(d.totalGastado).toLocaleString()}</td></>}
                                            {tipoReporte === 'CONSUMO' && <><td style={{textAlign:'right'}}>{d.cantConsumo?.toLocaleString()}</td><td style={{textAlign:'right'}}>${Math.round(d.valorConsumo).toLocaleString()}</td>{incluirMerma && <><td style={{textAlign:'right'}}>{d.cantMerma?.toLocaleString()}</td><td style={{textAlign:'right'}}>${Math.round(d.valorMerma).toLocaleString()}</td></>}</>}
                                            {tipoReporte === 'STOCK_FINAL' && <><td style={{textAlign:'right'}}>{d.stockActual?.toLocaleString()}</td><td style={{textAlign:'right'}}>${Math.round(d.valorTotal).toLocaleString()}</td></>}
                                            {tipoReporte === 'COMPARATIVO' && (
                                                <>
                                                    {/* CELDAS SIN COLOR DE FONDO */}
                                                    <td style={{textAlign:'right'}}>{d.ingresoCantidad?.toLocaleString()}</td>
                                                    <td style={{textAlign:'right'}}>${d.ingresoDinero?.toLocaleString()}</td>
                                                    <td style={{textAlign:'right'}}>{d.salidaCantidad?.toLocaleString()}</td>
                                                    <td style={{textAlign:'right'}}>${d.salidaDinero?.toLocaleString()}</td>
                                                    {/* MANTENEMOS SOLO EL COLOR DEL TEXTO PARA EL BALANCE */}
                                                    <td style={{textAlign:'right', fontWeight:'bold', color: (d.ingresoDinero - d.salidaDinero) >= 0 ? '#2f855a' : '#e53e3e'}}>${(d.ingresoDinero - d.salidaDinero).toLocaleString()}</td>
                                                </>
                                            )}
                                            {tipoReporte === 'VENTA_DIARIA' && <td style={{textAlign:'right'}}>${Math.round(d.valorTotal).toLocaleString()}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ padding: '20px', background: '#f8fafc', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '30px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {tipoReporte === 'GASTOS' && <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>TOTAL INGRESO: ${Math.round(t.ingreso).toLocaleString()}</span>}
                                {tipoReporte === 'CONSUMO' && <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>TOTAL: ${Math.round(t.guia).toLocaleString()}</span>}
                                {tipoReporte === 'STOCK_FINAL' && <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>TOTAL VALORIZADO: ${Math.round(t.stock).toLocaleString()}</span>}
                                {tipoReporte === 'COMPARATIVO' && (
                                    <>
                                        <span style={{ fontWeight:'bold' }}>TOTAL INGRESO: ${t.ingreso.toLocaleString()}</span>
                                        <span style={{ fontWeight:'bold' }}>TOTAL GUÍA: ${t.guia.toLocaleString()}</span>
                                        <span style={{ fontSize:'1.2rem', fontWeight:'bold', color: (t.ingreso - t.guia) >= 0 ? '#2f855a' : '#e53e3e' }}>BALANCE TOTAL: ${(t.ingreso - t.guia).toLocaleString()}</span>
                                    </>
                                )}
                                {tipoReporte === 'VENTA_DIARIA' && <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#007bff' }}>TOTAL VENTAS: ${Math.round(t.venta).toLocaleString()}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}