import { useState, useEffect } from 'react';
import { getInventarioCompleto } from '../services/inventoryService';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';

export default function InventarioPage() {
    const navigate = useNavigate();

    // Datos Principales
    const [inventario, setInventario] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados para Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [filtroArea, setFiltroArea] = useState('');

    // Listas para Selectores
    const [listaCategorias, setListaCategorias] = useState([]);
    const [listaAreas, setListaAreas] = useState([]);

    // Selección PDF
    const [seleccionados, setSeleccionados] = useState({});

    useEffect(() => {
        cargarInventario();
    }, []);

    const cargarInventario = async () => {
        try {
            const data = await getInventarioCompleto();
            setInventario(data);
            
            // Extraer únicos
            const categoriasUnicas = [...new Set(data.map(item => item.category || 'Sin Categoría'))].sort();
            setListaCategorias(categoriasUnicas);
            
            const areasUnicas = [...new Set(data.map(item => item.areaNombre || 'Sin Área'))].sort();
            setListaAreas(areasUnicas);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- FILTRADO ---
    const datosFiltrados = inventario.filter(item => {
        const texto = busqueda.toLowerCase();
        const coincideTexto = 
            (item.productName || '').toLowerCase().includes(texto) ||
            (item.productSku || '').toLowerCase().includes(texto);
        const coincideCategoria = filtroCategoria === '' || (item.category || 'Sin Categoría') === filtroCategoria;
        const coincideArea = filtroArea === '' || (item.areaNombre || 'Sin Área') === filtroArea;
        return coincideTexto && coincideCategoria && coincideArea;
    });

    const toggleSeleccion = (item) => {
        const key = `${item.productSku}-${item.areaNombre}`;
        setSeleccionados(prev => {
            const nuevo = { ...prev };
            if (nuevo[key]) delete nuevo[key];
            else nuevo[key] = item;
            return nuevo;
        });
    };

    const formatearCantidad = (cantidad) => {
        if (!cantidad) return '0';
        return parseFloat(Number(cantidad).toFixed(1));
    };

    const descargarPDF = () => {
        const itemsParaImprimir = Object.values(seleccionados);
        if (itemsParaImprimir.length === 0) {
            alert("Seleccione al menos un producto.");
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Lista de Verificación de Inventario", 14, 20);
        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 28);

        let y = 40;
        doc.setFont(undefined, 'bold');
        doc.text("Producto", 14, y);
        doc.text("Área", 80, y);
        doc.text("Cant.", 130, y);
        doc.text("Categoría", 160, y);
        doc.line(10, y + 2, 200, y + 2);
        
        doc.setFont(undefined, 'normal');
        y += 10;

        itemsParaImprimir.forEach((item) => {
            if (y > 280) { doc.addPage(); y = 20; }
            const nombre = (item.productName || 'Sin Nombre').substring(0,35);
            const area = item.areaNombre || '-';
            const cantidadTxt = `${formatearCantidad(item.cantidadTotal)} ${item.unidadMedida || ''}`;
            
            doc.text(nombre, 14, y);
            doc.text(area, 80, y);
            doc.text(cantidadTxt, 130, y);
            doc.text(item.category || '-', 160, y);
            y += 8;
        });
        doc.save("Lista_Inventario.pdf");
    };

    return (
        <div className="inventory-container">
            {/* CABECERA */}
            <div className="page-header">
                <h2 className="page-title">📦 Inventario</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">
                    ⬅ Volver
                </button>
            </div>

            {/* FILTROS */}
            <div className="filters-panel">
                <div className="filter-group" style={{ flex: 2 }}>
                    <label className="filter-label">Buscar (Nombre/SKU)</label>
                    <input 
                        type="text" 
                        placeholder="Escriba para buscar..." 
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="filter-input"
                    />
                </div>

                <div className="filter-group">
                    <label className="filter-label">Categoría</label>
                    <select 
                        value={filtroCategoria} 
                        onChange={(e) => setFiltroCategoria(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Todas</option>
                        {listaCategorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Área</label>
                    <select 
                        value={filtroArea} 
                        onChange={(e) => setFiltroArea(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Todas</option>
                        {listaAreas.map(area => <option key={area} value={area}>{area}</option>)}
                    </select>
                </div>

                <button 
                    onClick={descargarPDF} 
                    className="pdf-btn"
                    disabled={Object.keys(seleccionados).length === 0}
                >
                    <span>📄</span> PDF ({Object.keys(seleccionados).length})
                </button>
            </div>

            {/* TABLA RESPONSIVA */}
            <div className="table-container">
                <table className="responsive-table">
                    <thead>
                        <tr>
                            <th style={{width: '50px', textAlign:'center'}}>✔</th>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th>Área Ubicación</th>
                            <th style={{textAlign: 'right'}}>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{padding:'20px', textAlign:'center'}}>Cargando inventario...</td></tr>
                        ) : datosFiltrados.length === 0 ? (
                            <tr><td colSpan="5" style={{padding:'20px', textAlign:'center'}}>No se encontraron resultados.</td></tr>
                        ) : (
                            datosFiltrados.map((item, index) => {
                                const key = `${item.productSku}-${item.areaNombre}`;
                                const isChecked = !!seleccionados[key];

                                return (
                                    <tr key={index} className={isChecked ? 'row-selected' : ''}>
                                        <td data-label="Seleccionar">
                                            <input 
                                                type="checkbox" 
                                                checked={isChecked} 
                                                onChange={() => toggleSeleccion(item)}
                                                className="custom-checkbox"
                                            />
                                            {/* Texto visible solo en móvil para aclarar qué es el checkbox */}
                                            <span className="mobile-only-text" style={{display: 'none'}}>Seleccionar</span>
                                        </td>
                                        <td data-label="Producto">
                                            <strong>{item.productName || 'Sin Nombre'}</strong>
                                            <div style={{color:'#718096', fontSize:'0.85em'}}>{item.productSku}</div>
                                        </td>
                                        <td data-label="Categoría">
                                            <span className="badge-category">
                                                {item.category || 'S/C'}
                                            </span>
                                        </td>
                                        <td data-label="Área">
                                            {item.areaNombre || 'General'}
                                        </td>
                                        <td data-label="Cantidad" className="text-quantity" style={{textAlign: 'right'}}>
                                            {formatearCantidad(item.cantidadTotal)} {item.unidadMedida}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
