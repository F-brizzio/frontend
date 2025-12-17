import { useState, useEffect } from 'react';
import { getHistorialIngresos, actualizarIngresoItem } from '../services/ingresoService';
import { useNavigate } from 'react-router-dom';

export default function HistorialIngresoPage() {
    const navigate = useNavigate();
    const [datosRaw, setDatosRaw] = useState([]);
    const [historialAgrupado, setHistorialAgrupado] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    // Modal y Edición
    const [mostrarModal, setMostrarModal] = useState(false);
    const [detalleSeleccionado, setDetalleSeleccionado] = useState([]);
    const [docSeleccionado, setDocSeleccionado] = useState('');
    const [idEditando, setIdEditando] = useState(null);
    const [datosEdit, setDatosEdit] = useState({});

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const data = await getHistorialIngresos();
            setDatosRaw(data);
            agruparDatos(data);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const agruparDatos = (lista) => {
        const grupos = {};
        lista.forEach(item => {
            const key = `${item.numeroDocumento}-${item.supplierRut}`;
            if (!grupos[key]) {
                grupos[key] = {
                    ...item,
                    detalles: [],
                    totalNetoFactura: 0,
                    totalBrutoFactura: 0
                };
            }
            grupos[key].totalNetoFactura += (item.totalNeto || 0);
            grupos[key].totalBrutoFactura += (item.totalBruto || 0);
            grupos[key].detalles.push(item);
        });
        setHistorialAgrupado(Object.values(grupos));
    };

    const iniciarEdicion = (item) => {
        setIdEditando(item.id);
        setDatosEdit({ ...item });
    };

    const guardarCambios = async () => {
        try {
            await actualizarIngresoItem(idEditando, datosEdit);
            alert("✅ Cambios guardados y stock actualizado");
            setIdEditando(null);
            cargarDatos(); // Recargar todo para ver los nuevos totales
            setMostrarModal(false); // Cerramos para refrescar vista
        } catch (error) {
            alert("❌ Error: " + (error.response?.data || "No se pudo actualizar"));
        }
    };

    const formatoDinero = (v) => Math.round(v || 0).toLocaleString('es-CL');

    return (
        <div className="inventory-container">
            <div className="page-header">
                <h2>📜 Historial de Ingresos</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Volver</button>
            </div>

            <div className="filters-panel">
                <input 
                    type="text" 
                    placeholder="Buscar por documento o proveedor..." 
                    value={busqueda} 
                    onChange={e => setBusqueda(e.target.value)}
                    className="filter-input"
                />
            </div>

            <div className="table-container">
                <table className="responsive-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>N° Doc</th>
                            <th>Proveedor</th>
                            <th style={{textAlign:'right'}}>Total Neto</th>
                            <th style={{textAlign:'center'}}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historialAgrupado.filter(h => h.numeroDocumento.includes(busqueda) || h.supplierName.toLowerCase().includes(busqueda.toLowerCase())).map((grupo, i) => (
                            <tr key={i}>
                                <td>{grupo.fecha}</td>
                                <td>{grupo.numeroDocumento}</td>
                                <td>{grupo.supplierName}</td>
                                <td style={{textAlign:'right'}}>${formatoDinero(grupo.totalNetoFactura)}</td>
                                <td style={{textAlign:'center'}}>
                                    <button onClick={() => {
                                        setDocSeleccionado(grupo.numeroDocumento);
                                        setDetalleSeleccionado(grupo.detalles);
                                        setMostrarModal(true);
                                    }} className="btn-primary">Ver Detalle / Editar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {mostrarModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{maxWidth: '900px'}}>
                        <h3>Detalle Documento: {docSeleccionado}</h3>
                        <table className="responsive-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cantidad</th>
                                    <th>Costo Unit.</th>
                                    <th>Total</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detalleSeleccionado.map(d => (
                                    <tr key={d.id}>
                                        <td>{d.productName}</td>
                                        <td>
                                            {idEditando === d.id ? 
                                                <input type="number" value={datosEdit.cantidad} onChange={e => setDatosEdit({...datosEdit, cantidad: e.target.value})} style={{width:'80px'}}/> 
                                                : d.cantidad}
                                        </td>
                                        <td>
                                            {idEditando === d.id ? 
                                                <input type="number" value={datosEdit.costoUnitario} onChange={e => setDatosEdit({...datosEdit, costoUnitario: e.target.value})} style={{width:'100px'}}/> 
                                                : `$${formatoDinero(d.costoUnitario)}`}
                                        </td>
                                        <td>${formatoDinero(idEditando === d.id ? datosEdit.cantidad * datosEdit.costoUnitario : d.totalNeto)}</td>
                                        <td>
                                            {idEditando === d.id ? 
                                                <button onClick={guardarCambios} className="btn-success">💾</button> :
                                                <button onClick={() => iniciarEdicion(d)} className="btn-edit">✏️</button>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={() => {setMostrarModal(false); setIdEditando(null);}} className="btn-secondary" style={{marginTop:'15px'}}>Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
}