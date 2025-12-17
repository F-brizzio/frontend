import { useState, useEffect } from 'react';
import { getHistorialIngresos } from '../services/ingresoService';
import { useNavigate } from 'react-router-dom';

export default function HistorialIngresoPage() {
    const navigate = useNavigate();

    // Datos
    const [datosRaw, setDatosRaw] = useState([]);
    const [historialAgrupado, setHistorialAgrupado] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    // Modal
    const [mostrarModal, setMostrarModal] = useState(false);
    const [detalleSeleccionado, setDetalleSeleccionado] = useState([]);
    const [docSeleccionado, setDocSeleccionado] = useState('');

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            const data = await getHistorialIngresos();
            setDatosRaw(data);

            const grupos = {};
            data.forEach(item => {
                const doc = item.numeroDocumento;
                if (!grupos[doc]) {
                    grupos[doc] = {
                        fecha: item.fecha,
                        numeroDocumento: doc,
                        supplierName: item.supplierName,
                        responsable: item.usuarioResponsable,
                        cantidadItems: 0,
                        totalNetoAcumulado: 0,
                        totalBrutoAcumulado: 0,
                        detalles: []
                    };
                }
                grupos[doc].cantidadItems += 1;
                grupos[doc].totalNetoAcumulado += (item.totalNeto || 0); 
                grupos[doc].totalBrutoAcumulado += (item.totalBruto || 0); 
                grupos[doc].detalles.push(item);
            });

            const listaAgrupada = Object.values(grupos).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            setHistorialAgrupado(listaAgrupada);

        } catch (error) {
            console.error("Error cargando historial", error);
        } finally {
            setLoading(false);
        }
    };

    const datosFiltrados = historialAgrupado.filter(item => {
        const textoMatch = 
            (item.supplierName || '').toLowerCase().includes(busqueda.toLowerCase()) ||
            (item.numeroDocumento || '').toLowerCase().includes(busqueda.toLowerCase()) ||
            (item.responsable || '').toLowerCase().includes(busqueda.toLowerCase());
        
        let fechaMatch = true;
        const fechaItem = new Date(item.fecha);
        if (fechaInicio) fechaMatch = fechaMatch && fechaItem >= new Date(fechaInicio);
        if (fechaFin) fechaMatch = fechaMatch && fechaItem <= new Date(fechaFin);

        return textoMatch && fechaMatch;
    });

    const verDetalle = (docItem) => {
        setDocSeleccionado(docItem.numeroDocumento);
        setDetalleSeleccionado(docItem.detalles);
        setMostrarModal(true);
    };

    // Helper para formatear dinero
    const formatoDinero = (valor) => {
        return Math.round(valor || 0).toLocaleString();
    };

    return (
        <div className="inventory-container">
            {/* CABECERA */}
            <div className="page-header">
                <h2 className="page-title">📜 Historial de Ingresos</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Volver</button>
            </div>

            {/* BARRA DE FILTROS RESPONSIVA */}
            <div className="filters-panel">
                <div className="filter-group" style={{ flex: 2 }}>
                    <label className="filter-label">🔍 Buscar (Prov / Doc / Resp)</label>
                    <input 
                        type="text" 
                        placeholder="Escriba aquí..." 
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="filter-input"
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label">Desde</label>
                    <input 
                        type="date" 
                        value={fechaInicio} 
                        onChange={(e) => setFechaInicio(e.target.value)} 
                        className="filter-input"
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label">Hasta</label>
                    <input 
                        type="date" 
                        value={fechaFin} 
                        onChange={(e) => setFechaFin(e.target.value)} 
                        className="filter-input"
                    />
                </div>
                <div className="filter-group" style={{justifyContent: 'flex-end'}}>
                    <button 
                        onClick={() => {setBusqueda(''); setFechaInicio(''); setFechaFin('');}} 
                        className="btn-secondary"
                        style={{ height: '42px', display:'flex', alignItems:'center', justifyContent:'center' }}
                    >
                        Limpiar Filtros
                    </button>
                </div>
            </div>

            {/* TABLA PRINCIPAL (RESUMEN) */}
            <div className="table-container">
                <table className="responsive-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>N° Doc</th>
                            <th>Proveedor</th>
                            <th>Responsable</th>
                            <th style={{textAlign: 'center'}}>Items</th>
                            <th style={{textAlign: 'right'}}>Total Neto</th>
                            <th style={{textAlign: 'right'}}>Total Bruto</th>
                            <th style={{textAlign: 'center'}}>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8" style={{ padding: '20px', textAlign: 'center' }}>Cargando historial...</td></tr>
                        ) : datosFiltrados.length === 0 ? (
                            <tr><td colSpan="8" style={{ padding: '20px', textAlign: 'center', color:'#666' }}>No se encontraron registros.</td></tr>
                        ) : (
                            datosFiltrados.map((item, index) => (
                                <tr key={index}>
                                    <td data-label="Fecha">{item.fecha}</td>
                                    <td data-label="N° Documento" style={{ fontWeight: 'bold' }}>{item.numeroDocumento}</td>
                                    <td data-label="Proveedor" style={{ color:'#555' }}>{item.supplierName || '-'}</td>
                                    <td data-label="Responsable">
                                        <span className="badge-category">
                                            {item.responsable || 'Sistema'}
                                        </span>
                                    </td>
                                    <td data-label="Items" style={{ textAlign: 'center' }}>{item.cantidadItems}</td>
                                    
                                    <td data-label="Total Neto" style={{ textAlign: 'right', color: '#718096' }}>
                                        ${formatoDinero(item.totalNetoAcumulado)}
                                    </td>
                                    
                                    <td data-label="Total Bruto" style={{ textAlign: 'right', color: '#2f855a', fontWeight: 'bold' }}>
                                        ${formatoDinero(item.totalBrutoAcumulado)}
                                    </td>

                                    <td data-label="Acción" style={{ textAlign: 'center' }}>
                                        <button 
                                            onClick={() => verDetalle(item)}
                                            className="btn-primary"
                                            style={{ padding: '6px 12px', fontSize: '0.9em', margin: '0 auto' }}
                                        >
                                            Ver Detalle
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL DETALLE (RESPONSIVO TAMBIÉN) */}
            {mostrarModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '1000px', padding: '0' }}>
                        
                        {/* Cabecera Modal */}
                        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f7fafc', borderRadius: '12px 12px 0 0' }}>
                            <div>
                                <h3 style={{ margin: 0, color:'#2d3748' }}>📄 Factura: {docSeleccionado}</h3>
                                <p style={{ margin: 0, fontSize:'0.9em', color:'#718096' }}>Detalle de productos ingresados</p>
                            </div>
                            <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer', color:'#a0aec0' }}>&times;</button>
                        </div>

                        {/* Cuerpo Modal (Tabla Scrollable) */}
                        <div style={{ padding: '20px', overflowY: 'auto', maxHeight: '70vh' }}>
                            <table className="responsive-table">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>SKU</th>
                                        <th>Destino</th>
                                        <th style={{textAlign:'right'}}>Cant.</th>
                                        <th style={{textAlign:'right'}}>P. Unit</th>
                                        <th style={{textAlign:'right'}}>Total Neto</th>
                                        <th style={{textAlign:'right'}}>Total Bruto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detalleSeleccionado.map((d, i) => (
                                        <tr key={i}>
                                            <td data-label="Producto">
                                                <strong>{d.productName}</strong>
                                            </td>
                                            <td data-label="SKU" style={{ fontSize:'0.9em', color:'#666' }}>{d.productSku}</td>
                                            <td data-label="Destino">{d.areaNombre}</td>
                                            <td data-label="Cantidad" style={{ textAlign: 'right' }}>{d.cantidad}</td>
                                            <td data-label="P. Unitario" style={{ textAlign: 'right' }}>${formatoDinero(d.costoUnitario)}</td>
                                            <td data-label="Total Neto" style={{ textAlign: 'right', color:'#718096' }}>
                                                ${formatoDinero(d.totalNeto)}
                                            </td>
                                            <td data-label="Total Bruto" style={{ textAlign: 'right', fontWeight: 'bold', color: '#2f855a' }}>
                                                ${formatoDinero(d.totalBruto)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pie Modal */}
                        <div style={{ padding: '15px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right', background: '#f7fafc', borderRadius: '0 0 12px 12px' }}>
                            <button onClick={() => setMostrarModal(false)} className="btn-secondary">
                                Cerrar Ventana
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}