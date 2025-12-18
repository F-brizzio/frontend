import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAreas } from '../services/areaService';
import { getAllStock } from '../services/inventoryService';
import { procesarGuiaConsumo } from '../services/salidaService';

export default function GuiaConsumoPage() {
    const navigate = useNavigate();

    // --- ESTADOS ---
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [areaOrigen, setAreaOrigen] = useState('');
    const [tipoSalida, setTipoSalida] = useState('CONSUMO');
    
    // Inicializamos como arrays vacíos para evitar errores de .map
    const [listaAreas, setListaAreas] = useState([]);
    const [inventario, setInventario] = useState([]);

    const [productoSeleccionado, setProductoSeleccionado] = useState('');
    const [cantidadInput, setCantidadInput] = useState('');
    const [detalles, setDetalles] = useState([]);

    // --- CARGAR DATOS ---
    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            console.log("Cargando datos...");
            
            const areasData = await getAreas();
            console.log("Areas recibidas:", areasData);
            // Validación de seguridad: si no es array, forzamos array vacío
            setListaAreas(Array.isArray(areasData) ? areasData : []);

            const stocksData = await getAllStock();
            console.log("Inventario recibido:", stocksData);
            // Validación de seguridad
            setInventario(Array.isArray(stocksData) ? stocksData : []);

        } catch (error) {
            console.error("Error cargando datos:", error);
        }
    };

    // --- MANEJADORES ---
    const handleAgregarProducto = () => {
        if (!productoSeleccionado || !cantidadInput) return alert("Falta producto o cantidad");
        if (parseFloat(cantidadInput) <= 0) return alert("La cantidad debe ser mayor a 0");

        // Búsqueda segura
        const prodInfo = inventario.find(p => p.productSku === productoSeleccionado);

        const nuevoItem = {
            productSku: productoSeleccionado,
            productName: prodInfo ? prodInfo.productName : 'Desconocido',
            unidad: prodInfo ? prodInfo.unidadMedida : 'Uni',
            cantidad: parseFloat(cantidadInput),
            tipoSalida: tipoSalida, 
            areaOrigenId: areaOrigen
        };

        setDetalles([...detalles, nuevoItem]);
        setProductoSeleccionado('');
        setCantidadInput('');
    };

    const handleEliminarDetalle = (index) => {
        const nuevaLista = [...detalles];
        nuevaLista.splice(index, 1);
        setDetalles(nuevaLista);
    };

    const handleGuardarGuia = async () => {
        if (detalles.length === 0) return alert("No hay productos en la guía");
        if (!areaOrigen) return alert("Selecciona el Origen");

        const guiaDto = {
            areaOrigenId: areaOrigen,
            fecha: fecha,
            responsable: "Usuario Actual", 
            detalles: detalles
        };

        try {
            await procesarGuiaConsumo(guiaDto);
            alert("✅ Guía registrada correctamente");
            navigate('/menu');
        } catch (error) {
            console.error(error);
            alert("❌ Error al guardar la guía");
        }
    };

    return (
        <div style={{ padding: '2rem', backgroundColor: '#f7fafc', minHeight: '100vh' }}>
            
            <div style={{ maxWidth: '900px', margin: '0 auto 1.5rem auto' }}>
                <h2 style={{ color: '#2d3748', fontSize: '1.8rem' }}>📋 Nueva Guía de Salida</h2>
            </div>

            <div className="form-card">
                
                {/* 1. DATOS GENERALES */}
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Fecha de Emisión</label>
                        <input 
                            type="date" 
                            className="form-input"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Origen (Área)</label>
                        <select 
                            className="form-select"
                            value={areaOrigen}
                            onChange={(e) => setAreaOrigen(e.target.value)}
                        >
                            <option value="">-- Seleccionar --</option>
                            {/* PROTECCIÓN: (listaAreas || []) asegura que siempre haya algo que mapear */}
                            {(listaAreas || []).map(area => (
                                <option key={area.id} value={area.id}>{area.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Tipo de Salida</label>
                        <select 
                            className="form-select"
                            value={tipoSalida}
                            onChange={(e) => setTipoSalida(e.target.value)}
                            style={{ 
                                borderColor: tipoSalida === 'MERMA' ? '#fc8181' : '#68d391',
                                borderWidth: '2px'
                            }}
                        >
                            <option value="CONSUMO">✅ Consumo Interno</option>
                            <option value="MERMA">🗑 Merma / Pérdida</option>
                        </select>
                    </div>
                </div>

                <hr style={{ margin: '2rem 0', border: '0', borderTop: '1px solid #e2e8f0' }} />

                {/* 2. AGREGAR PRODUCTOS */}
                <h4 style={{ marginBottom: '1rem', color: '#4a5568' }}>Agregar Productos</h4>
                
                <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr auto', alignItems: 'end' }}>
                    
                    <div className="form-group">
                        <label className="form-label">Buscar Producto</label>
                        <select 
                            className="form-select"
                            value={productoSeleccionado}
                            onChange={(e) => setProductoSeleccionado(e.target.value)}
                        >
                            <option value="">-- Selecciona Producto --</option>
                            {/* PROTECCIÓN: Verificamos que inventario sea un array antes de mapear */}
                            {Array.isArray(inventario) && [...new Set(inventario.map(item => item.productSku))].map(sku => {
                                const item = inventario.find(p => p.productSku === sku);
                                return (
                                    <option key={sku} value={sku}>
                                        {item ? item.productName : 'Producto'} ({sku})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Cantidad</label>
                        <input 
                            type="number" 
                            className="form-input"
                            placeholder="0.0"
                            value={cantidadInput}
                            onChange={(e) => setCantidadInput(e.target.value)}
                        />
                    </div>

                    <button 
                        onClick={handleAgregarProducto}
                        className="btn-primary"
                        style={{ height: '48px', justifyContent: 'center' }}
                    >
                        + Agregar
                    </button>
                </div>

                {/* 3. TABLA DE DETALLES */}
                <div style={{ marginTop: '2rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#edf2f7', textAlign: 'left' }}>
                                <th style={{ padding: '12px', color: '#4a5568' }}>Producto</th>
                                <th style={{ padding: '12px', color: '#4a5568' }}>Tipo</th>
                                <th style={{ padding: '12px', textAlign: 'right', color: '#4a5568' }}>Cantidad</th>
                                <th style={{ padding: '12px', textAlign: 'center', color: '#4a5568' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detalles.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#a0aec0' }}>
                                        No has agregado productos aún.
                                    </td>
                                </tr>
                            ) : (
                                detalles.map((d, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid #edf2f7' }}>
                                        <td style={{ padding: '12px' }}>
                                            <strong>{d.productName}</strong>
                                            <div style={{ fontSize: '0.85rem', color: '#718096' }}>{d.productSku}</div>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ 
                                                padding: '4px 8px', 
                                                borderRadius: '6px', 
                                                backgroundColor: d.tipoSalida === 'CONSUMO' ? '#c6f6d5' : '#fed7d7',
                                                color: d.tipoSalida === 'CONSUMO' ? '#22543d' : '#822727'
                                            }}>
                                                {d.tipoSalida}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                            {d.cantidad} {d.unidad}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button 
                                                onClick={() => handleEliminarDetalle(index)}
                                                style={{ color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="form-actions">
                    <button onClick={() => navigate('/menu')} className="btn-secondary">
                        Cancelar
                    </button>
                    <button 
                        onClick={handleGuardarGuia} 
                        className="btn-primary"
                        disabled={detalles.length === 0}
                    >
                        💾 Guardar Guía
                    </button>
                </div>
            </div>
        </div>
    );
}