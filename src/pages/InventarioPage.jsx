import { useState, useEffect } from 'react';
import { getInventarioCompleto, ajustarStock } from '../services/inventoryService';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function InventarioPage() {
    const navigate = useNavigate();
    const [inventario, setInventario] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filtros y Selección
    const [busqueda, setBusqueda] = useState('');
    const [filtroArea, setFiltroArea] = useState('');
    const [listaAreas, setListaAreas] = useState([]);
    const [seleccionados, setSeleccionados] = useState({});

    // Estado del Modal de Ajuste
    const [showModal, setShowModal] = useState(false);
    const [itemAjuste, setItemAjuste] = useState(null);
    const [nuevaCantidad, setNuevaCantidad] = useState('');
    const [motivoAjuste, setMotivoAjuste] = useState('');

    useEffect(() => {
        cargarInventario();
    }, []);

    const cargarInventario = async () => {
        try {
            const data = await getInventarioCompleto();
            setInventario(data);
            setListaAreas([...new Set(data.map(item => item.areaNombre))].sort());
        } catch (error) {
            console.error("Error:", error);
        } finally { setLoading(false); }
    };

    // Lógica de Modal
    const abrirModalAjuste = (item) => {
        setItemAjuste(item);
        setNuevaCantidad(item.cantidadTotal);
        setMotivoAjuste('Corrección por inventario físico');
        setShowModal(true);
    };

    const ejecutarAjuste = async () => {
        if (!nuevaCantidad || nuevaCantidad < 0) return alert("Cantidad no válida");
        try {
            await ajustarStock({
                productSku: itemAjuste.productSku,
                areaId: itemAjuste.areaId,
                nuevaCantidad: parseFloat(nuevaCantidad),
                motivo: motivoAjuste
            });
            alert("✅ Stock actualizado correctamente");
            setShowModal(false);
            cargarInventario();
        } catch (error) {
            alert(error.message);
        }
    };

    const datosFiltrados = inventario.filter(item => {
        const matchText = item.productName?.toLowerCase().includes(busqueda.toLowerCase()) || 
                         item.productSku?.toLowerCase().includes(busqueda.toLowerCase());
        const matchArea = !filtroArea || item.areaNombre === filtroArea;
        return matchText && matchArea;
    });

    return (
        <div className="inventory-container">
            <div className="page-header">
                <h2 className="page-title">📦 Control de Inventario</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">Volver</button>
            </div>

            {/* Panel de Filtros */}
            <div className="filters-panel">
                <div className="filter-group" style={{ gridColumn: 'span 2' }}>
                    <input 
                        className="filter-input"
                        placeholder="Buscar por nombre o SKU..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <select className="filter-select" onChange={(e) => setFiltroArea(e.target.value)}>
                        <option value="">Todas las Áreas</option>
                        {listaAreas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
            </div>

            <div className="table-container">
                <table className="responsive-table">
                    <thead>
                        <tr>
                            <th>Producto / SKU</th>
                            <th>Ubicación</th>
                            <th style={{ textAlign: 'right' }}>Stock</th>
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {datosFiltrados.map((item) => {
                            const isLow = item.cantidadTotal <= 5;
                            return (
                                <tr key={`${item.productSku}-${item.areaNombre}`}>
                                    <td data-label="Producto">
                                        <strong>{item.productName}</strong>
                                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>{item.productSku}</div>
                                    </td>
                                    <td data-label="Área">
                                        <span className="badge-category">{item.areaNombre}</span>
                                    </td>
                                    <td data-label="Stock" style={{ textAlign: 'right' }}>
                                        <span style={{ color: isLow ? '#e53e3e' : '#2f855a', fontWeight: 'bold' }}>
                                            {item.cantidadTotal} {item.unidadMedida}
                                        </span>
                                        {isLow && <div style={{ fontSize: '0.65rem', color: '#e53e3e' }}>¡STOCK BAJO!</div>}
                                    </td>
                                    <td data-label="Acciones" style={{ textAlign: 'center' }}>
                                        <button className="btn-secondary" onClick={() => abrirModalAjuste(item)}>
                                            🔧 Ajustar
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal de Ajuste */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Ajuste Manual: {itemAjuste?.productName}</h3>
                        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
                            Ubicación: {itemAjuste?.areaNombre}
                        </p>
                        
                        <div className="form-group">
                            <label className="form-label">Nueva Cantidad Física</label>
                            <input 
                                type="number" 
                                className="form-input"
                                value={nuevaCantidad}
                                onChange={(e) => setNuevaCantidad(e.target.value)}
                            />
                        </div>

                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label className="form-label">Motivo</label>
                            <select className="form-select" value={motivoAjuste} onChange={(e) => setMotivoAjuste(e.target.value)}>
                                <option value="Diferencia Inventario">Diferencia de Inventario</option>
                                <option value="Producto Dañado">Producto Dañado / Merma</option>
                                <option value="Error de Ingreso">Error de Ingreso Previo</option>
                            </select>
                        </div>

                        <div className="form-actions">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="btn-primary" onClick={ejecutarAjuste}>Guardar Ajuste</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}