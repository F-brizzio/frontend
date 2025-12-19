import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAreas } from '../services/areaService';
import { buscarStockPorArea } from '../services/inventoryService';
import { procesarGuiaConsumo } from '../services/salidaService';

export default function GuiaConsumoPage() {
    const navigate = useNavigate();

    // --- ESTADOS DE CABECERA ---
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [areaOrigen, setAreaOrigen] = useState('');
    const [tipoSalida, setTipoSalida] = useState('CONSUMO');
    const [responsable] = useState("Usuario Sistema"); // Podrías sacarlo de un AuthContext

    // --- ESTADOS DE BÚSQUEDA Y DATA ---
    const [listaAreas, setListaAreas] = useState([]);
    const [query, setQuery] = useState('');
    const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [cantidadInput, setCantidadInput] = useState('');

    // --- ESTADO DE LA TABLA DE DETALLES ---
    const [detalles, setDetalles] = useState([]);

    // 1. Cargar áreas al montar el componente
    useEffect(() => {
        getAreas().then(data => setListaAreas(Array.isArray(data) ? data : []));
    }, []);

    // 2. Buscador Dinámico: Se dispara cuando cambia el query o el área
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (areaOrigen && query.length > 1 && !productoSeleccionado) {
                try {
                    const data = await buscarStockPorArea(areaOrigen, query);
                    setResultadosBusqueda(data);
                } catch (error) {
                    console.error("Error en búsqueda:", error);
                }
            } else {
                setResultadosBusqueda([]);
            }
        }, 300); // 300ms de espera para no saturar el servidor

        return () => clearTimeout(delayDebounceFn);
    }, [query, areaOrigen, productoSeleccionado]);

    // 3. Agregar producto a la lista temporal
    const handleAgregarProducto = () => {
        if (!productoSeleccionado) return alert("Debes seleccionar un producto de la lista");
        const cant = parseFloat(cantidadInput);
        
        if (isNaN(cant) || cant <= 0) return alert("Ingresa una cantidad válida");
        if (cant > productoSeleccionado.cantidadTotal) {
            return alert(`Stock insuficiente. Máximo disponible: ${productoSeleccionado.cantidadTotal}`);
        }

        const nuevoItem = {
            productSku: productoSeleccionado.sku,
            productName: productoSeleccionado.nombreProducto,
            unidad: productoSeleccionado.unidadMedida,
            cantidad: cant,
            tipoSalida: tipoSalida,
            areaOrigenId: areaOrigen
        };

        setDetalles([...detalles, nuevoItem]);
        
        // Limpiar buscador
        setProductoSeleccionado(null);
        setQuery('');
        setCantidadInput('');
    };

    // 4. Enviar guía al Backend (Aquí se aplica el FIFO)
    const handleGuardarGuia = async () => {
        if (detalles.length === 0) return alert("La guía está vacía");

        const guiaDto = {
            areaOrigenId: parseInt(areaOrigen),
            fecha,
            responsable,
            detalles
        };

        try {
            await procesarGuiaConsumo(guiaDto);
            alert("✅ Guía procesada. El stock se ha descontado siguiendo el orden FIFO.");
            navigate('/menu');
        } catch (error) {
            const msg = error.response?.data?.message || "Error al procesar la salida";
            alert("❌ " + msg);
        }
    };

    return (
        <div className="inventory-container">
            <div className="page-header">
                <h2 className="page-title">📋 Nueva Guía de Salida</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">Volver</button>
            </div>

            <div className="form-card">
                {/* SECCIÓN 1: CONFIGURACIÓN INICIAL */}
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Fecha</label>
                        <input type="date" className="form-input" value={fecha} onChange={e => setFecha(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Bodega de Origen</label>
                        <select 
                            className="form-select" 
                            value={areaOrigen} 
                            onChange={e => {
                                setAreaOrigen(e.target.value);
                                setDetalles([]); // Limpiar si cambia bodega
                                setProductoSeleccionado(null);
                            }}
                        >
                            <option value="">-- Seleccione Origen --</option>
                            {listaAreas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Motivo General</label>
                        <select className="form-select" value={tipoSalida} onChange={e => setTipoSalida(e.target.value)}>
                            <option value="CONSUMO">Consumo Interno</option>
                            <option value="MERMA">Merma / Desecho</option>
                        </select>
                    </div>
                </div>

                <hr style={{ margin: '2rem 0', opacity: 0.2 }} />

                {/* SECCIÓN 2: BUSCADOR DE STOCK */}
                <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr auto' }}>
                    <div className="search-container">
                        <label className="form-label">Producto (Stock en tiempo real)</label>
                        <input 
                            type="text" 
                            className="form-input"
                            placeholder={areaOrigen ? "Escriba para buscar..." : "⚠️ Primero elija origen"}
                            value={query}
                            onChange={e => { setQuery(e.target.value); setProductoSeleccionado(null); }}
                            disabled={!areaOrigen}
                        />
                        
                        {resultadosBusqueda.length > 0 && (
                            <ul className="search-results-list">
                                {resultadosBusqueda.map(prod => (
                                    <li 
                                        key={prod.sku} 
                                        className="search-result-item"
                                        onClick={() => {
                                            setProductoSeleccionado(prod);
                                            setQuery(prod.nombreProducto);
                                            setResultadosBusqueda([]);
                                        }}
                                    >
                                        <div className="result-info">
                                            <span className="result-name">{prod.nombreProducto}</span>
                                            <span className="result-sku">SKU: {prod.sku}</span>
                                        </div>
                                        <span className="result-stock">{prod.cantidadTotal} {prod.unidadMedida}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Cantidad a sacar</label>
                        <input 
                            type="number" 
                            className="form-input"
                            value={cantidadInput}
                            onChange={e => setCantidadInput(e.target.value)}
                            placeholder={productoSeleccionado ? `Máx ${productoSeleccionado.cantidadTotal}` : "0"}
                        />
                    </div>

                    <button 
                        onClick={handleAgregarProducto} 
                        className="btn-primary" 
                        style={{ height: '45px', marginTop: '28px' }}
                    >
                        + Añadir
                    </button>
                </div>

                {/* SECCIÓN 3: TABLA DE RESUMEN */}
                <div className="table-container" style={{ marginTop: '2rem' }}>
                    <table className="responsive-table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Motivo</th>
                                <th style={{ textAlign: 'right' }}>Cantidad</th>
                                <th style={{ textAlign: 'center' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detalles.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                                        No hay ítems en esta guía
                                    </td>
                                </tr>
                            ) : (
                                detalles.map((d, i) => (
                                    <tr key={i}>
                                        <td data-label="Producto">
                                            <strong>{d.productName}</strong><br/>
                                            <small>{d.productSku}</small>
                                        </td>
                                        <td data-label="Motivo">
                                            <span className={`badge ${d.tipoSalida === 'MERMA' ? 'badge-merma' : 'badge-category'}`}>
                                                {d.tipoSalida}
                                            </span>
                                        </td>
                                        <td data-label="Cantidad" style={{ textAlign: 'right' }}>
                                            {d.cantidad} {d.unidad}
                                        </td>
                                        <td data-label="Acción" style={{ textAlign: 'center' }}>
                                            <button 
                                                onClick={() => setDetalles(detalles.filter((_, idx) => idx !== i))}
                                                style={{ color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }}
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
                    <button onClick={handleGuardarGuia} className="btn-primary" disabled={detalles.length === 0}>
                        💾 Finalizar y Descontar Inventario
                    </button>
                </div>
            </div>
        </div>
    );
}