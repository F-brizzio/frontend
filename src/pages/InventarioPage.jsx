import { useState, useEffect } from 'react';
// Corregido: Importamos el nombre exacto del servicio
import { getInventarioCompleto } from '../services/inventoryService'; 
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function InventarioPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [inventario, setInventario] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroArea, setFiltroArea] = useState('');
    const [listaAreas, setListaAreas] = useState([]);

    // --- NUEVO: Estado para Selección ---
    // Usamos una combinación de SKU y Área como ID único
    const [seleccionados, setSeleccionados] = useState([]);

    useEffect(() => {
        cargarInventario();
    }, []);

    const cargarInventario = async () => {
        try {
            const data = await getInventarioCompleto();
            setInventario(data);
            setListaAreas([...new Set(data.map(item => item.areaNombre))].sort());
        } catch (error) {
            console.error("Error al cargar inventario:", error);
        } finally { setLoading(false); }
    };

    // --- LÓGICA DE FILTRADO ---
    const datosFiltrados = inventario.filter(item => {
        const matchText = item.productName?.toLowerCase().includes(busqueda.toLowerCase()) || 
                         item.productSku?.toLowerCase().includes(busqueda.toLowerCase());
        const matchArea = !filtroArea || item.areaNombre === filtroArea;
        return matchText && matchArea;
    });

    // --- LÓGICA DE SELECCIÓN ---
    const toggleSeleccion = (id) => {
        setSeleccionados(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleSeleccionarTodo = () => {
        if (seleccionados.length === datosFiltrados.length && datosFiltrados.length > 0) {
            setSeleccionados([]);
        } else {
            const todosIds = datosFiltrados.map(item => `${item.productSku}-${item.areaNombre}`);
            setSeleccionados(todosIds);
        }
    };

    // --- GENERAR PDF ---
    const generarPDF = () => {
        const doc = new jsPDF();
        const itemsParaPdf = inventario.filter(item => 
            seleccionados.includes(`${item.productSku}-${item.areaNombre}`)
        );
        
        doc.setFontSize(18);
        doc.text("Lista de Inventario Seleccionada", 14, 20);
        
        doc.setFontSize(10);
        doc.text(`Generado por: ${user?.fullName || user?.username}`, 14, 28);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 33);

        const tableColumn = ["Producto", "SKU", "Ubicación", "Stock"];
        const tableRows = itemsParaPdf.map(item => [
            item.productName,
            item.productSku,
            item.areaNombre,
            `${item.cantidadTotal} ${item.unidadMedida}`
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'striped',
            headStyles: { fillColor: [49, 130, 206] }
        });

        doc.save(`inventario_seleccionado_${new Date().getTime()}.pdf`);
    };

    return (
        <div className="inventory-container">
            <div className="page-header">
                <div>
                    <h2 className="page-title">📦 Control de Inventario</h2>
                    <p style={{ margin: 0, color: '#718096', fontSize: '0.85em' }}>
                        Selecciona productos para exportar a PDF
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={generarPDF} 
                        disabled={seleccionados.length === 0}
                        className="btn-primary"
                        style={{ backgroundColor: seleccionados.length > 0 ? '#2f855a' : '#cbd5e0' }}
                    >
                        📄 Generar PDF ({seleccionados.length})
                    </button>
                    <button onClick={() => navigate('/menu')} className="back-btn">Volver</button>
                </div>
            </div>

            <div className="filters-panel">
                <div className="filter-group" style={{ flex: 2 }}>
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
                            <th style={{ width: '40px', textAlign: 'center' }}>
                                <input 
                                    type="checkbox" 
                                    onChange={toggleSeleccionarTodo}
                                    checked={seleccionados.length === datosFiltrados.length && datosFiltrados.length > 0}
                                />
                            </th>
                            <th>Producto / SKU</th>
                            <th>Ubicación</th>
                            <th style={{ textAlign: 'right' }}>Stock</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr>
                        ) : datosFiltrados.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No se encontraron productos.</td></tr>
                        ) : datosFiltrados.map((item) => {
                            const itemId = `${item.productSku}-${item.areaNombre}`;
                            const isLow = item.cantidadTotal <= 5;
                            return (
                                <tr key={itemId}>
                                    <td style={{ textAlign: 'center' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={seleccionados.includes(itemId)}
                                            onChange={() => toggleSeleccion(itemId)}
                                        />
                                    </td>
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
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}