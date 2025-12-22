import { useState, useEffect } from 'react';
import { getInventory } from '../services/inventoryService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// Importar librerías para PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function InventarioPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [inventario, setInventario] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    // --- NUEVO: Estado para Selección ---
    const [seleccionados, setSeleccionados] = useState([]);

    useEffect(() => {
        cargarInventario();
    }, []);

    const cargarInventario = async () => {
        try {
            const data = await getInventory();
            setInventario(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE SELECCIÓN ---
    const toggleSeleccionarTodo = () => {
        if (seleccionados.length === inventarioFiltrado.length) {
            setSeleccionados([]);
        } else {
            setSeleccionados(inventarioFiltrado.map(item => item.id));
        }
    };

    const toggleSeleccion = (id) => {
        setSeleccionados(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // --- GENERAR PDF ---
    const generarPDF = () => {
        const doc = new jsPDF();
        const productosPDF = inventario.filter(p => seleccionados.includes(p.id));
        
        doc.text("Lista de Productos Seleccionados", 14, 15);
        doc.setFontSize(10);
        doc.text(`Generado por: ${user?.fullName || user?.username} - ${new Date().toLocaleDateString()}`, 14, 22);

        const tableColumn = ["Producto", "Categoría", "Stock Actual", "Precio"];
        const tableRows = productosPDF.map(p => [
            p.name, 
            p.category, 
            p.stock, 
            `$${p.price?.toLocaleString() || '0'}`
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
        });

        doc.save(`inventario_seleccionado_${new Date().getTime()}.pdf`);
    };

    const inventarioFiltrado = inventario.filter(item => 
        item.name.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="inventory-container">
            <div className="page-header">
                <h2 className="page-title">📦 Inventario de Productos</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {/* Botón para generar PDF */}
                    <button 
                        onClick={generarPDF} 
                        disabled={seleccionados.length === 0}
                        className="btn-primary"
                        style={{ background: seleccionados.length > 0 ? '#e53e3e' : '#cbd5e0' }}
                    >
                        📄 Exportar PDF ({seleccionados.length})
                    </button>
                    <button onClick={() => navigate('/menu')} className="back-btn">⬅ Menú</button>
                </div>
            </div>

            <div className="filters-panel">
                <input 
                    type="text" 
                    placeholder="Buscar producto..." 
                    value={busqueda} 
                    onChange={e => setBusqueda(e.target.value)}
                    className="filter-input"
                />
            </div>

            <div className="table-container">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>
                                {/* OPCIÓN SELECCIONAR TODO */}
                                <input 
                                    type="checkbox" 
                                    onChange={toggleSeleccionarTodo}
                                    checked={seleccionados.length === inventarioFiltrado.length && inventarioFiltrado.length > 0}
                                />
                            </th>
                            <th>Producto</th>
                            <th>Stock</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventarioFiltrado.map(item => (
                            <tr key={item.id}>
                                <td>
                                    <input 
                                        type="checkbox" 
                                        checked={seleccionados.includes(item.id)}
                                        onChange={() => toggleSeleccion(item.id)}
                                    />
                                </td>
                                <td>{item.name}</td>
                                <td>{item.stock} {item.unit}</td>
                                <td>
                                    {/* SE ELIMINÓ LA OPCIÓN DE AJUSTAR */}
                                    <button className="btn-secondary" onClick={() => navigate(`/product/${item.id}`)}>Ver</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}