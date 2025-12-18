import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAreas } from '../services/areaService';
import { getAllStock } from '../services/inventoryService';
import { procesarGuiaConsumo } from '../services/salidaService';

// NO importamos CSS aquí, porque ya está en App.css

export default function GuiaConsumoPage() {
    const navigate = useNavigate();

    // --- ESTADOS ---
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [areaOrigen, setAreaOrigen] = useState('');
    const [tipoSalida, setTipoSalida] = useState('CONSUMO');
    const [responsable, setResponsable] = useState('');
    
    // Listas para selects
    const [listaAreas, setListaAreas] = useState([]);
    const [inventario, setInventario] = useState([]);

    // Estados para agregar producto
    const [productoSeleccionado, setProductoSeleccionado] = useState(''); // SKU
    const [cantidadInput, setCantidadInput] = useState('');
    const [detalles, setDetalles] = useState([]);

    // --- CARGAR DATOS ---
    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            const areas = await getAreas();
            setListaAreas(areas);
            const stocks = await getAllStock();
            setInventario(stocks);
        } catch (error) {
            console.error("Error cargando datos", error);
        }
    };

    // --- FUNCIONES ---
    const agregarProducto = () => {
        if (!productoSeleccionado || !cantidadInput) return alert("Selecciona producto y cantidad");
        
        // Buscar info del producto seleccionado
        const productoInfo = inventario.find(p => p.productSku === productoSeleccionado);
        
        const nuevoDetalle = {
            productSku: productoSeleccionado,
            productName: productoInfo ? productoInfo.productName : 'Desconocido',
            cantidad: parseFloat(cantidadInput),
            tipoSalida: tipoSalida,
            areaOrigenId: areaOrigen 
        };

        setDetalles([...detalles, nuevoDetalle]);
        setProductoSeleccionado('');
        setCantidadInput('');
    };

    const eliminarDetalle = (index) => {
        const nuevos = [...detalles];
        nuevos.splice(index, 1);
        setDetalles(nuevos);
    };

    const guardarGuia = async () => {
        if (detalles.length === 0) return alert("Agrega al menos un producto");
        if (!areaOrigen) return alert("Selecciona el Origen");

        const guiaDto = {
            areaOrigenId: areaOrigen,
            fecha: fecha,
            responsable: responsable,
            detalles: detalles
        };

        try {
            await procesarGuiaConsumo(guiaDto);
            alert("✅ Guía guardada con éxito");
            navigate('/menu');
        } catch (error) {
            console.error(error);
            alert("❌ Error al guardar");
        }
    };

    // --- RENDERIZADO ---
    return (
        <div className="guia-container">
            {/* CABECERA */}
            <div className="header-section">
                <h2><span className="title-icon">📋</span> Nueva Guía de Salida</h2>
                <button onClick={() => navigate('/menu')} className="btn btn-secondary">
                    Cancelar
                </button>
            </div>

            {/* PASO 1: DATOS GENERALES */}
            <div className="card-panel">
                <div className="form-grid">
                    <div className="form-group">
                        <label>1. Fecha de Emisión</label>
                        <input 
                            type="date" 
                            className="form-input"
                            value={fecha} 
                            onChange={e => setFecha(e.target.value)} 
                        />
                    </div>

                    <div className="form-group">
                        <label>2. Origen (¿De dónde sale?)</label>
                        <select 
                            className="form-select"
                            value={areaOrigen} 
                            onChange={e => setAreaOrigen(e.target.value)}
                        >
                            <option value="">-- Seleccionar Origen --</option>
                            {listaAreas.map(area => (
                                <option key={area.id} value={area.id}>{area.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>3. Tipo de Salida</label>
                        <div className="radio-group">
                            <label className="radio-label">
                                <input 
                                    type="radio" 
                                    name="tipo" 
                                    checked={tipoSalida === 'CONSUMO'} 
                                    onChange={() => setTipoSalida('CONSUMO')} 
                                /> 
                                ✅ Consumo
                            </label>
                            <label className="radio-label">
                                <input 
                                    type="radio" 
                                    name="tipo" 
                                    checked={tipoSalida === 'MERMA'} 
                                    onChange={() => setTipoSalida('MERMA')} 
                                /> 
                                🗑 Merma
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* PASO 2: AGREGAR ITEMS */}
            <div className="add-product-section">
                <div className="form-group">
                    <label>Seleccionar Producto</label>
                    <select 
                        className="form-select"
                        value={productoSeleccionado}
                        onChange={e => setProductoSeleccionado(e.target.value)}
                    >
                        <option value="">-- Buscar Producto --</option>
                        {[...new Set(inventario.map(item => item.productSku))].map(sku => {
                            const prod = inventario.find(p => p.productSku === sku);
                            return <option key={sku} value={sku}>{prod.productName} ({sku})</option>
                        })}
                    </select>
                </div>

                <div className="form-group">
                    <label>Cantidad</label>
                    <input 
                        type="number" 
                        className="form-input"
                        placeholder="Ej: 5"
                        value={cantidadInput}
                        onChange={e => setCantidadInput(e.target.value)}
                    />
                </div>

                <button onClick={agregarProducto} className="btn btn-primary" style={{marginBottom: '2px'}}>
                    + Agregar
                </button>
            </div>

            {/* PASO 3: TABLA DE DETALLES */}
            <div className="table-responsive">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>SKU</th>
                            <th>Tipo</th>
                            <th>Cantidad</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {detalles.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{textAlign: 'center', padding: '2rem', color: '#888'}}>
                                    No hay ítems en la guía. Agrega productos arriba.
                                </td>
                            </tr>
                        ) : (
                            detalles.map((d, index) => (
                                <tr key={index}>
                                    <td>{d.productName}</td>
                                    <td>{d.productSku}</td>
                                    <td>
                                        <span style={{
                                            padding: '4px 8px', 
                                            borderRadius:'4px', 
                                            backgroundColor: d.tipoSalida === 'CONSUMO' ? '#d1e7dd' : '#f8d7da',
                                            color: d.tipoSalida === 'CONSUMO' ? '#0f5132' : '#842029'
                                        }}>
                                            {d.tipoSalida}
                                        </span>
                                    </td>
                                    <td><strong>{d.cantidad}</strong></td>
                                    <td>
                                        <button onClick={() => eliminarDetalle(index)} className="btn btn-danger">
                                            X
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* FOOTER */}
            <button 
                onClick={guardarGuia} 
                className="btn btn-success"
                disabled={detalles.length === 0}
            >
                💾 Guardar Guía de Salida
            </button>
        </div>
    );
}