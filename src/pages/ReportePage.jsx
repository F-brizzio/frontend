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

import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // <--- IMPORTANTE: IMPORTAR ESTO

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ReportePage() {
    const navigate = useNavigate();
    
    // --- ESTADOS ---
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

    // ... (Mantén los useEffect de carga inicial, limpieza, opciones y subfiltros IGUAL que antes) ...
    // ... Cópialos de tu versión anterior, no han cambiado ...
    
    // NOTA: Pego aquí solo los useEffect mínimos para que el código funcione al copiar,
    // pero idealmente mantén los tuyos si ya funcionan.
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

    // ... (El handleGenerar y procesarGrafico tampoco cambian) ...
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
        if (tipoReporte === 'CONSUMO') {
            const datasets = [{ label: 'Consumo Real (U)', data: datos.map(d => d.cantConsumo), backgroundColor: '#28a745' }];
            if (incluirMerma) datasets.push({ label: 'Merma (U)', data: datos.map(d => d.cantMerma), backgroundColor: '#dc3545' });
            setChartData({ labels, datasets });
        } else if (tipoReporte === 'COMPARATIVO') {
            setChartData({ labels, datasets: [{ label: 'Ingresos ($)', data: datos.map(d => d.ingresoDinero), backgroundColor: '#28a745' }, { label: 'Salidas ($)', data: datos.map(d => d.salidaDinero), backgroundColor: '#dc3545' }] });
        } else if (tipoReporte === 'VENTA_DIARIA') {
            setChartData({ labels, datasets: [{ label: 'Venta Diaria ($)', data: datos.map(d => d.valorTotal), backgroundColor: '#007bff' }] });
        } else {
            let label = '', color = '', key = '';
            if (tipoReporte === 'GASTOS') { label='Total ($)'; color='#007bff'; key='totalGastado'; }
            else if (tipoReporte === 'STOCK_FINAL') { label='Unidades'; color='#ffc107'; key='stockActual'; }
            setChartData({ labels, datasets: [{ label, data: datos.map(d => d[key]), backgroundColor: color }] });
        }
    };

    // --- NUEVO SISTEMA DE PDF MULTI-PÁGINA ---
    const descargarPDF = async () => {
        const doc = new jsPDF();
        
        // 1. CAPTURAR EL ENCABEZADO (KPIs + GRÁFICO) COMO IMAGEN
        // Solo capturamos la parte visual superior
        const headerElement = document.getElementById('report-header-section'); 
        
        if (headerElement) {
            const canvas = await html2canvas(headerElement, { scale: 2 }); // Scale 2 para mejor calidad
            const imgData = canvas.toDataURL('image/png');
            
            // Ajustar tamaño para que quepa en A4 (210mm ancho)
            const imgProps = doc.getImageProperties(imgData);
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            // Agregar imagen al PDF
            doc.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
            
            // Calcular dónde empezar la tabla (un poco más abajo de la imagen)
            var startY = pdfHeight + 15;
        } else {
            var startY = 20;
        }

        // 2. CONFIGURAR COLUMNAS Y FILAS SEGÚN REPORTE
        let head = [];
        let body = [];

        if (tipoReporte === 'GASTOS') {
            head = [['Concepto', 'Total ($)', 'Unidades', 'Docs']];
            body = tablaData.map(d => [
                d.label || d.concepto,
                `$${d.totalGastado?.toLocaleString()}`,
                d.unidadesCompradas?.toLocaleString(),
                d.cantidadFacturas
            ]);
        } else if (tipoReporte === 'CONSUMO') {
            let cols = ['Concepto', 'Consumo (U)', 'Costo ($)'];
            if(incluirMerma) cols.push('Merma (U)', 'Pérdida ($)');
            head = [cols];
            
            body = tablaData.map(d => {
                let row = [
                    d.label || d.concepto,
                    d.cantConsumo?.toLocaleString(),
                    `$${Math.round(d.valorConsumo||0).toLocaleString()}`
                ];
                if(incluirMerma) {
                    row.push(d.cantMerma?.toLocaleString());
                    row.push(`$${Math.round(d.valorMerma||0).toLocaleString()}`);
                }
                return row;
            });
        } else if (tipoReporte === 'STOCK_FINAL') {
            head = [['Producto', 'Stock', 'Items', 'Valor Total']];
            body = tablaData.map(d => [
                d.label || d.concepto,
                d.stockActual?.toLocaleString(),
                d.itemsDistintos,
                `$${Math.round(d.valorTotal||0).toLocaleString()}`
            ]);
        } else if (tipoReporte === 'COMPARATIVO') {
            head = [['Concepto', 'Entrada ($)', 'Entrada (U)', 'Salida ($)', 'Salida (U)']];
            body = tablaData.map(d => [
                d.label || d.concepto,
                `$${d.ingresoDinero?.toLocaleString()}`,
                d.ingresoCantidad?.toLocaleString(),
                `$${d.salidaDinero?.toLocaleString()}`,
                d.salidaCantidad?.toLocaleString()
            ]);
        } else if (tipoReporte === 'VENTA_DIARIA') {
            head = [['Fecha', 'Venta Total ($)', 'N° Ventas']];
            body = tablaData.map(d => [
                d.fecha,
                `$${Math.round(d.valorTotal||0).toLocaleString()}`,
                d.cantidadTotal?.toLocaleString()
            ]);
        }

        // 3. GENERAR TABLA AUTOMÁTICA
        autoTable(doc, {
            startY: startY,
            head: head,
            body: body,
            theme: 'striped', // Diseño de tabla
            headStyles: { fillColor: [52, 58, 64] }, // Color oscuro como tu app
            styles: { fontSize: 10 },
            // Si la tabla es muy larga, esto crea nueva página auto
            margin: { top: 20 } 
        });

        doc.save(`Reporte_${tipoReporte}.pdf`);
    };

    const totales = () => {
        if (!tablaData || tablaData.length === 0) return null;
        let t = { 
            gastos: { dinero: 0, unid: 0, docs: 0 },
            consumo: { realU: 0, realV: 0, mermaU: 0, mermaV: 0, guias: 0 },
            stock: { unid: 0, valor: 0, items: 0 },
            comp: { inDinero: 0, inCant: 0, outDinero: 0, outCant: 0 },
            diario: { cant: 0, valor: 0 }
        };
        tablaData.forEach(d => {
            t.gastos.dinero += (d.totalGastado || 0);
            t.gastos.unid += (d.unidadesCompradas || 0);
            t.gastos.docs += (d.cantidadFacturas || 0); 
            t.consumo.realU += (d.cantConsumo || 0);
            t.consumo.realV += (d.valorConsumo || 0);
            t.consumo.mermaU += (d.cantMerma || 0);
            t.consumo.mermaV += (d.valorMerma || 0);
            t.consumo.guias += (d.cantidadGuias || 0);
            t.stock.unid += (d.stockActual || 0);
            t.stock.valor += (d.valorTotal || 0);
            t.stock.items += (d.itemsDistintos || 0);
            t.comp.inDinero += (d.ingresoDinero || 0);
            t.comp.inCant += (d.ingresoCantidad || 0);
            t.comp.outDinero += (d.salidaDinero || 0);
            t.comp.outCant += (d.salidaCantidad || 0);
            t.diario.cant += (d.cantidadTotal || 0);
            t.diario.valor += (d.valorTotal || 0);
        });
        return t;
    };
    
    const t = totales();

    // --- COMPONENTE KPI ---
    const KpiCard = ({ title, value, color }) => (
        <div style={{ background:'white', padding:'15px', borderRadius:'8px', borderLeft:`5px solid ${color}`, boxShadow:'0 2px 5px rgba(0,0,0,0.05)' }}>
            <div style={{color:'#666', fontSize:'0.85em', fontWeight:'bold', textTransform:'uppercase'}}>{title}</div>
            <div style={{fontSize:'1.5em', fontWeight:'bold', color: '#333', marginTop:'5px'}}>{value}</div>
        </div>
    );

    return (
        <div className="inventory-container">
            <div className="page-header">
                <h2 className="page-title">📊 Reportes de Gestión</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Volver</button>
            </div>

            {/* FILTROS (Igual que antes) */}
            <div className="filters-panel">
                <div className="filter-group">
                    <label className="filter-label">1. Tipo Reporte</label>
                    <select value={tipoReporte} onChange={e => setTipoReporte(e.target.value)} className="filter-select">
                        <option value="GASTOS">💰 Gastos (Compras)</option>
                        <option value="CONSUMO">📦 Consumo / Mermas</option>
                        <option value="STOCK_FINAL">🏁 Stock Valorizado</option>
                        <option value="COMPARATIVO">⚖️ In vs Out</option>
                        <option value="VENTA_DIARIA">📈 Evolución Ventas</option>
                    </select>
                </div>

                {tipoReporte === 'CONSUMO' && (
                    <div className="filter-group" style={{ justifyContent:'flex-end' }}>
                        <label className="filter-label" style={{opacity:0}}>.</label>
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
                <div style={{ marginTop: '30px', animation: 'fadeIn 0.5s' }}>
                    
                    <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'20px' }}>
                        <button onClick={descargarPDF} className="btn-secondary" style={{ display:'flex', alignItems:'center', gap:'5px', background:'#e53e3e', color:'white', border:'none' }}>
                            <span>📄</span> Descargar PDF
                        </button>
                    </div>

                    {/* ESTE ID 'report-header-section' ES CLAVE: Define qué se convierte en IMAGEN */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        
                        {/* SECCIÓN VISUAL (SE IMPRIME COMO FOTO) */}
                        <div id="report-header-section" style={{ background:'white', padding:'10px' }}> {/* Padding extra para que la foto no salga cortada */}
                            <h3 style={{textAlign:'center', color:'#2d3748', margin:'0 0 5px 0'}}>
                                {tipoReporte === 'VENTA_DIARIA' ? 'EVOLUCIÓN DE VENTAS' : `${tipoReporte} POR ${entidadFiltro}`}
                            </h3>
                            <p style={{textAlign:'center', color:'#718096', margin:'0 0 20px 0', fontSize:'0.9em'}}>
                                Periodo: {fechaInicio} al {fechaFin}
                            </p>

                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'15px', marginBottom:'30px' }}>
                                {tipoReporte === 'GASTOS' && (
                                    <>
                                        <KpiCard title="Total Gastado" value={`$${t.gastos.dinero.toLocaleString()}`} color="#007bff" />
                                        <KpiCard title="Unidades" value={t.gastos.unid.toLocaleString()} color="#6c757d" />
                                        <KpiCard title="Facturas" value={t.gastos.docs} color="#28a745" />
                                    </>
                                )}
                                {tipoReporte === 'CONSUMO' && (
                                    <>
                                        <KpiCard title="Consumo Real" value={t.consumo.realU.toLocaleString()} color="#28a745" />
                                        <KpiCard title="Costo Consumo" value={`$${Math.round(t.consumo.realV).toLocaleString()}`} color="#28a745" />
                                        {incluirMerma && <KpiCard title="Total Mermas" value={t.consumo.mermaU.toLocaleString()} color="#dc3545" />}
                                        {incluirMerma && <KpiCard title="Pérdida $" value={`$${Math.round(t.consumo.mermaV).toLocaleString()}`} color="#dc3545" />}
                                    </>
                                )}
                                {tipoReporte === 'STOCK_FINAL' && (
                                    <>
                                        <KpiCard title="Total Unidades" value={t.stock.unid.toLocaleString()} color="#ffc107" />
                                        <KpiCard title="Valor Inventario" value={`$${Math.round(t.stock.valor).toLocaleString()}`} color="#28a745" />
                                        <KpiCard title="Items Únicos" value={t.stock.items} color="#17a2b8" />
                                    </>
                                )}
                                {tipoReporte === 'COMPARATIVO' && (
                                    <>
                                        <KpiCard title="Entrada ($)" value={`$${t.comp.inDinero.toLocaleString()}`} color="#28a745" />
                                        <KpiCard title="Salida ($)" value={`$${t.comp.outDinero.toLocaleString()}`} color="#dc3545" />
                                        <KpiCard title="Balance" value={`$${(t.comp.inDinero - t.comp.outDinero).toLocaleString()}`} color={t.comp.inDinero > t.comp.outDinero ? '#28a745' : '#dc3545'} />
                                    </>
                                )}
                                {tipoReporte === 'VENTA_DIARIA' && (
                                    <>
                                        <KpiCard title="Venta Total" value={`$${t.diario.valor.toLocaleString()}`} color="#007bff" />
                                        <KpiCard title="Items Vendidos" value={t.diario.cant.toLocaleString()} color="#17a2b8" />
                                    </>
                                )}
                            </div>

                            <div style={{ height: '350px', marginBottom: '20px', position:'relative' }}>
                                <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins:{ legend:{ position:'bottom' } } }} />
                            </div>
                        </div>
                        
                        {/* SECCIÓN TABLA (SE GENERA COMO TEXTO EN PDF) */}
                        <div className="table-container" style={{ boxShadow:'none', border:'1px solid #eee' }}>
                            <table className="responsive-table">
                                <thead>
                                    <tr>
                                        <th>Concepto</th>
                                        {tipoReporte === 'GASTOS' && (<><th style={{textAlign:'right'}}>Total ($)</th><th style={{textAlign:'right'}}>Unid.</th><th style={{textAlign:'center'}}>Docs</th></>)}
                                        {tipoReporte === 'CONSUMO' && (<><th style={{textAlign:'right'}}>Consumo (U)</th><th style={{textAlign:'right'}}>Costo ($)</th>{incluirMerma && <th style={{textAlign:'right', color:'#dc3545'}}>Merma (U)</th>}{incluirMerma && <th style={{textAlign:'right', color:'#dc3545'}}>Pérdida ($)</th>}</>)}
                                        {tipoReporte === 'STOCK_FINAL' && (<><th style={{textAlign:'right'}}>Stock</th><th style={{textAlign:'center'}}>Items</th><th style={{textAlign:'right'}}>Valor ($)</th></>)}
                                        {tipoReporte === 'COMPARATIVO' && (<><th style={{textAlign:'right', color:'#28a745'}}>Entrada ($)</th><th style={{textAlign:'right', color:'#dc3545'}}>Salida ($)</th></>)}
                                        {tipoReporte === 'VENTA_DIARIA' && (<><th style={{textAlign:'right'}}>Venta ($)</th><th style={{textAlign:'right'}}>Unidades</th></>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tablaData.map((d, i) => (
                                        <tr key={i}>
                                            <td data-label="Concepto" style={{fontWeight:'bold'}}>{d.label || d.concepto || d.fecha}</td>
                                            
                                            {tipoReporte === 'GASTOS' && (
                                                <>
                                                    <td data-label="Total ($)" style={{textAlign:'right'}}>${d.totalGastado?.toLocaleString()}</td>
                                                    <td data-label="Unidades" style={{textAlign:'right'}}>{d.unidadesCompradas?.toLocaleString()}</td>
                                                    <td data-label="Docs" style={{textAlign:'center'}}>{d.cantidadFacturas}</td>
                                                </>
                                            )}

                                            {tipoReporte === 'CONSUMO' && (
                                                <>
                                                    <td data-label="Consumo (U)" style={{textAlign:'right'}}>{d.cantConsumo?.toLocaleString()}</td>
                                                    <td data-label="Costo ($)" style={{textAlign:'right'}}>${Math.round(d.valorConsumo||0).toLocaleString()}</td>
                                                    {incluirMerma && <td data-label="Merma (U)" style={{textAlign:'right', color:'#dc3545'}}>{d.cantMerma?.toLocaleString()}</td>}
                                                    {incluirMerma && <td data-label="Pérdida ($)" style={{textAlign:'right', color:'#dc3545'}}>${Math.round(d.valorMerma||0).toLocaleString()}</td>}
                                                </>
                                            )}

                                            {tipoReporte === 'STOCK_FINAL' && (
                                                <>
                                                    <td data-label="Stock" style={{textAlign:'right'}}>{d.stockActual?.toLocaleString()}</td>
                                                    <td data-label="Items" style={{textAlign:'center'}}>{d.itemsDistintos}</td>
                                                    <td data-label="Valor ($)" style={{textAlign:'right'}}>${Math.round(d.valorTotal||0).toLocaleString()}</td>
                                                </>
                                            )}

                                            {tipoReporte === 'COMPARATIVO' && (
                                                <>
                                                    <td data-label="Entrada ($)" style={{textAlign:'right', color:'#28a745'}}>${d.ingresoDinero?.toLocaleString()}</td>
                                                    <td data-label="Salida ($)" style={{textAlign:'right', color:'#dc3545'}}>${d.salidaDinero?.toLocaleString()}</td>
                                                </>
                                            )}

                                            {tipoReporte === 'VENTA_DIARIA' && (
                                                <>
                                                    <td data-label="Venta ($)" style={{textAlign:'right', fontWeight:'bold', color:'#007bff'}}>${Math.round(d.valorTotal||0).toLocaleString()}</td>
                                                    <td data-label="Unidades" style={{textAlign:'right'}}>{d.cantidadTotal?.toLocaleString()}</td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}