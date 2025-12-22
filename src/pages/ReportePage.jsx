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

    // ... (Limpieza de filtros y carga de opciones)

    const handleGenerar = async () => {
        setTablaData([]); setChartData(null);
        try {
            const payload = { tipoReporte, fechaInicio, fechaFin, entidadFiltro, valoresFiltro: seleccionados.length > 0 ? seleccionados : null };
            
            let datos = []; 
            if (tipoReporte === 'GASTOS') datos = await generarReporteGastos(payload);
            else if (tipoReporte === 'CONSUMO') datos = await generarReporteConsumo(payload);
            else if (tipoReporte === 'STOCK_FINAL') datos = await generarReporteStock(payload);
            else if (tipoReporte === 'COMPARATIVO') datos = await generarReporteComparativo(payload);
            else if (tipoReporte === 'VENTA_DIARIA') datos = await generarReporteVentaDiaria(payload);

            if (!datos || datos.length === 0) { alert("No se encontraron datos."); return; }
            setTablaData(datos);
            procesarGrafico(datos);
        } catch (error) { console.error(error); }
    };

    const procesarGrafico = (datos) => {
        const labels = datos.map(d => d.concepto || d.label || d.fecha);
        if (tipoReporte === 'VENTA_DIARIA') {
            setChartData({ 
                labels, 
                datasets: [{ label: 'Venta Diaria ($)', data: datos.map(d => d.valorTotal), backgroundColor: '#007bff' }] 
            });
        } 
        // ... (otros reportes según lo definido)
    };

    const calcularTotales = () => {
        let t = { stock: 0, in: 0, out: 0, venta: 0 };
        tablaData.forEach(d => {
            t.stock += (d.valorTotal || 0);
            t.in += (d.ingresoDinero || d.totalGastado || 0);
            t.out += (d.salidaDinero || d.valorConsumo || 0);
            t.venta += (d.valorTotal || 0); // Para Venta Diaria
        });
        return t;
    };
    const t = calcularTotales();

    return (
        <div className="inventory-container">
            {/* ... (Cabecera y Filtros) */}

            {tablaData.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                    <div className="table-container">
                        <table className="responsive-table">
                            <thead>
                                <tr>
                                    <th>Concepto / Fecha</th>
                                    {tipoReporte === 'VENTA_DIARIA' && (
                                        <>
                                            <th style={{textAlign:'right'}}>Unidades Vendidas</th>
                                            <th style={{textAlign:'right'}}>Venta Total ($)</th>
                                        </>
                                    )}
                                    {/* ... otras columnas */}
                                </tr>
                            </thead>
                            <tbody>
                                {tablaData.map((d, i) => (
                                    <tr key={i}>
                                        <td style={{fontWeight:'bold'}}>{d.label || d.fecha || d.concepto}</td>
                                        {tipoReporte === 'VENTA_DIARIA' && (
                                            <>
                                                <td style={{textAlign:'right'}}>{d.cantidadTotal?.toLocaleString()}</td>
                                                <td style={{textAlign:'right'}}>${Math.round(d.valorTotal||0).toLocaleString()}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {/* TOTAL ABAJO PARA VENTA */}
                        <div style={{ padding: '20px', textAlign: 'right', background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                            {tipoReporte === 'VENTA_DIARIA' && (
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#007bff' }}>
                                    TOTAL VENTAS: ${t.venta.toLocaleString()}
                                </span>
                            )}
                            {/* ... otros totales definidos anteriormente (Ingreso, Guía, Balance, Stock) */}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}