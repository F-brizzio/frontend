import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

// SERVICIOS
import { getAreas } from '../services/areaService';
import { getStockByArea, getAllStock } from '../services/inventoryService'; 
import { procesarGuiaConsumo } from '../services/salidaService'; 

// Estilos para el autocompletado flotante
const suggestionsStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 10,
    border: '1px solid #cbd5e0',
    borderRadius: '0 0 4px 4px',
    background: 'white',
    maxHeight: '200px',
    overflowY: 'auto',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
};

export default function GuiaConsumoPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // --- ESTADOS PRINCIPALES ---
    const [areas, setAreas] = useState([]);
    
    // Cabecera de la Guía
    const [fechaGuia, setFechaGuia] = useState(new Date().toISOString().split('T')[0]);
    const [areaOrigenId, setAreaOrigenId] = useState('');
    const [tipoMovimiento, setTipoMovimiento] = useState('CONSUMO'); // CONSUMO o MERMA
    
    // Estado del Inventario disponible para buscar
    const [inventarioDisponible, setInventarioDisponible] = useState([]);
    const [esModoGeneral, setEsModoGeneral] = useState(false);

    // Formulario de "Agregar Item"
    const [busqueda, setBusqueda] = useState('');
    const [sugerencias, setSugerencias] = useState([]);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [cantidadInput, setCantidadInput] = useState('');
    const [areaDestinoId, setAreaDestinoId] = useState(''); // Solo para modo GENERAL

    // Carrito de Salida
    const [carrito, setCarrito] = useState([]);
    const [cargando, setCargando] = useState(false);

    // 1. Cargar Áreas al inicio
    useEffect(() => {
        getAreas().then(data => {
            setAreas(data);
        }).catch(console.error);
    }, []);

    // 2. Manejar Cambio de Origen (Carga el inventario correspondiente)
    const handleOrigenChange = async (e) => {
        const id = e.target.value;
        setAreaOrigenId(id);
        
        // Resetear formulario de producto
        setProductoSeleccionado(null);
        setBusqueda('');
        setSugerencias([]);
        setInventarioDisponible([]);

        if (!id) return;

        // Detectar si es la opción especial "GENERAL"
        if (id === 'GENERAL_MODE') {
            setEsModoGeneral(true);
            try {
                // Llama a la función getAllStock que definimos en inventoryService.js
                const allStock = await getAllStock(); 
                setInventarioDisponible(allStock);
            } catch (error) {
                console.error("Error cargando todo el stock", error);
                alert("Error al cargar el inventario general. Revisa la consola.");
            }
        } else {
            setEsModoGeneral(false);
            try {
                const stock = await getStockByArea(id);
                setInventarioDisponible(stock);
            } catch (error) {
                console.error(error);
            }
        }
    };

    // 3. Lógica del Buscador (Autocomplete)
    const handleBusquedaChange = (texto) => {
        setBusqueda(texto);
        setProductoSeleccionado(null); // Reset si el usuario sigue escribiendo

        if (texto.length < 2) {
            setSugerencias([]);
            return;
        }

        const textoMin = texto.toLowerCase();
        // Filtramos el inventario cargado
        const filtrados = inventarioDisponible.filter(item => {
            const nombre = (item.productName || item.nombreProducto || '').toLowerCase();
            const sku = (item.sku || item.productSku || '').toLowerCase();
            return nombre.includes(textoMin) || sku.includes(textoMin);
        });

        setSugerencias(filtrados.slice(0, 10)); // Mostrar máx 10 opciones
    };

    const seleccionarProducto = (item) => {
        setProductoSeleccionado(item);
        setBusqueda(`${item.productName || item.nombreProducto} (${item.sku || item.productSku})`);
        setSugerencias([]);
        // Enfocar el input de cantidad automáticamente
        const inputCant = document.getElementById('inputCantidad');
        if(inputCant) inputCant.focus();
    };

    // 4. Agregar al Carrito
    const agregarItem = () => {
        if (!productoSeleccionado) return alert("Selecciona un producto válido de la lista.");
        if (!cantidadInput || Number(cantidadInput) <= 0) return alert("Ingresa una cantidad válida.");

        const cant = parseFloat(cantidadInput);
        
        // Validación de Stock
        if (cant > productoSeleccionado.cantidadTotal) {
            return alert(`Stock insuficiente. Solo tienes ${productoSeleccionado.cantidadTotal} disponibles.`);
        }

        // Validación Modo General: Requiere Destino
        let nombreDestino = 'Consumo Interno';
        let destinoIdFinal = null;

        if (esModoGeneral) {
            if (!areaDestinoId) return alert("En modo GENERAL debes seleccionar un Área de Destino.");
            const areaDestObj = areas.find(a => a.id === Number(areaDestinoId));
            nombreDestino = areaDestObj ? areaDestObj.nombre : 'Desconocido';
            destinoIdFinal = Number(areaDestinoId);
        }

        const nuevoItem = {
            uniqueId: Date.now(), // ID temporal para la lista visual
            productSku: productoSeleccionado.sku || productoSeleccionado.productSku,
            productName: productoSeleccionado.productName || productoSeleccionado.nombreProducto,
            cantidad: cant,
            // Si es modo general, el origen real es el área del producto seleccionado
            areaOrigenRealId: esModoGeneral ? productoSeleccionado.areaId : Number(areaOrigenId),
            nombreAreaOrigen: esModoGeneral ? (productoSeleccionado.nombreArea || 'Varios') : areas.find(a => a.id === Number(areaOrigenId))?.nombre,
            areaDestinoId: destinoIdFinal,
            nombreAreaDestino: nombreDestino,
            costoUnitario: productoSeleccionado.costoPromedio || productoSeleccionado.costo || 0,
            tipo: tipoMovimiento
        };

        setCarrito([...carrito, nuevoItem]);
        
        // Resetear campos de entrada para el siguiente producto
        setBusqueda('');
        setCantidadInput('');
        setProductoSeleccionado(null);
        setAreaDestinoId('');
    };

    const eliminarDelCarrito = (id) => {
        setCarrito(carrito.filter(item => item.uniqueId !== id));
    };

    // 5. Guardar Guía Final
    const guardarGuia = async () => {
        if (carrito.length === 0) return alert("La guía está vacía.");
        if (!fechaGuia) return alert("Falta la fecha.");

        setCargando(true);
        try {
            const payload = {
                fecha: fechaGuia,
                areaOrigenId: esModoGeneral ? null : Number(areaOrigenId), 
                esMultiOrigen: esModoGeneral, 
                responsable: user?.fullName || 'Sistema',
                detalles: carrito.map(item => ({
                    productSku: item.productSku,
                    cantidad: item.cantidad,
                    areaOrigenId: item.areaOrigenRealId, // CRUCIAL: Enviar de dónde sale realmente
                    areaDestinoId: item.areaDestinoId,
                    tipoSalida: item.tipo
                }))
            };

            await procesarGuiaConsumo(payload);
            alert("✅ Guía registrada con éxito");
            navigate('/menu');
        } catch (error) {
            console.error(error);
            alert("Error al guardar: " + error.message);
        } finally {
            setCargando(false);
        }
    };

    // Cálculos de Totales
    const totalNetoGuia = carrito.reduce((acc, item) => acc + (item.cantidad * item.costoUnitario), 0);

    return (
        <div className="container-fluid" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* CABECERA TÍTULO */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">📋 Nueva Guía de Salida</h2>
                    <p className="text-gray-500">Registra consumos, mermas o traspasos internos.</p>
                </div>
                <button onClick={() => navigate('/menu')} className="text-gray-600 hover:text-gray-800">
                    Cancelar
                </button>
            </div>

            {/* PASO 1 y 2: CONFIGURACIÓN INICIAL */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Fecha */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">1. Fecha de Emisión</label>
                        <input 
                            type="date" 
                            className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                            value={fechaGuia}
                            onChange={(e) => setFechaGuia(e.target.value)}
                        />
                    </div>

                    {/* Área de Origen */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">2. Origen (¿De dónde sale?)</label>
                        <select 
                            className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                            value={areaOrigenId}
                            onChange={handleOrigenChange}
                        >
                            <option value="">-- Seleccionar Origen --</option>
                            <option value="GENERAL_MODE" style={{fontWeight: 'bold', color: '#d69e2e'}}>⭐ GENERAL (Todo el Stock)</option>
                            {areas.map(area => (
                                <option key={area.id} value={area.id}>{area.nombre}</option>
                            ))}
                        </select>
                        {esModoGeneral && <small className="text-yellow-600">Modo multiproducto activado</small>}
                    </div>

                    {/* Tipo de Movimiento */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">3. Tipo de Salida</label>
                        <div className="flex gap-4 mt-1">
                            <label className={`flex items-center gap-2 px-4 py-2 rounded cursor-pointer border ${tipoMovimiento === 'CONSUMO' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300'}`}>
                                <input 
                                    type="radio" 
                                    name="tipo" 
                                    checked={tipoMovimiento === 'CONSUMO'} 
                                    onChange={() => setTipoMovimiento('CONSUMO')}
                                    className="hidden" 
                                />
                                ✅ Consumo
                            </label>
                            <label className={`flex items-center gap-2 px-4 py-2 rounded cursor-pointer border ${tipoMovimiento === 'MERMA' ? 'bg-red-50 border-red-500 text-red-700' : 'border-gray-300'}`}>
                                <input 
                                    type="radio" 
                                    name="tipo" 
                                    checked={tipoMovimiento === 'MERMA'} 
                                    onChange={() => setTipoMovimiento('MERMA')}
                                    className="hidden" 
                                />
                                🗑️ Merma
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* PASO 3 y 4: AGREGAR PRODUCTOS */}
            {areaOrigenId && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6" style={{ borderLeft: '4px solid #3182ce' }}>
                    <h3 className="text-lg font-bold text-gray-700 mb-4">Agregar Productos a la Guía</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        
                        {/* Buscador Autocomplete */}
                        <div className="md:col-span-5 relative">
                            <label className="block text-xs font-bold text-gray-500 mb-1">BUSCAR PRODUCTO</label>
                            <input 
                                type="text"
                                placeholder="Escribe nombre o SKU..."
                                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                value={busqueda}
                                onChange={(e) => handleBusquedaChange(e.target.value)}
                            />
                            {/* Lista de Sugerencias */}
                            {sugerencias.length > 0 && (
                                <ul style={suggestionsStyle}>
                                    {sugerencias.map(item => (
                                        <li 
                                            key={item.id || item.inventoryId} 
                                            onClick={() => seleccionarProducto(item)}
                                            className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 flex justify-between"
                                        >
                                            <span>{item.productName || item.nombreProducto}</span>
                                            <span className="text-gray-500 text-sm">Stock: {item.cantidadTotal} {esModoGeneral && `(${item.nombreArea})`}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Cantidad */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1">CANTIDAD</label>
                            <input 
                                id="inputCantidad"
                                type="number" 
                                placeholder="0.0" 
                                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                value={cantidadInput}
                                onChange={(e) => setCantidadInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && agregarItem()}
                            />
                        </div>

                        {/* Destino (Solo visible en modo GENERAL) */}
                        {esModoGeneral && (
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-gray-500 mb-1">DESTINO FINAL</label>
                                <select 
                                    className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                                    value={areaDestinoId}
                                    onChange={(e) => setAreaDestinoId(e.target.value)}
                                >
                                    <option value="">-- ¿Dónde se usará? --</option>
                                    {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Botón Agregar */}
                        <div className="md:col-span-2">
                            <button 
                                onClick={agregarItem}
                                className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition"
                            >
                                ➕ Agregar
                            </button>
                        </div>
                    </div>
                    
                    {productoSeleccionado && (
                        <div className="mt-2 text-sm text-gray-600">
                            Stock disponible: <strong>{productoSeleccionado.cantidadTotal}</strong> | 
                            Costo Unit: <strong>${productoSeleccionado.costoPromedio || productoSeleccionado.costo || 0}</strong>
                        </div>
                    )}
                </div>
            )}

            {/* PASO 5: DETALLE (TABLA) */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                            <th className="p-4 text-xs font-bold text-gray-600 uppercase">Fecha</th>
                            <th className="p-4 text-xs font-bold text-gray-600 uppercase">Producto</th>
                            <th className="p-4 text-xs font-bold text-gray-600 uppercase">Origen Real</th>
                            <th className="p-4 text-xs font-bold text-gray-600 uppercase">Destino / Tipo</th>
                            <th className="p-4 text-xs font-bold text-gray-600 uppercase text-right">Cantidad</th>
                            <th className="p-4 text-xs font-bold text-gray-600 uppercase text-right">Neto Total</th>
                            <th className="p-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {carrito.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="p-8 text-center text-gray-400 italic">
                                    No hay items en la guía. Agrega productos arriba.
                                </td>
                            </tr>
                        ) : (
                            carrito.map((item) => (
                                <tr key={item.uniqueId} className="hover:bg-gray-50">
                                    <td className="p-4 text-gray-700">{fechaGuia}</td>
                                    <td className="p-4 font-medium text-gray-800">
                                        {item.productName}
                                        <div className="text-xs text-gray-400">{item.productSku}</div>
                                    </td>
                                    <td className="p-4 text-gray-600">{item.nombreAreaOrigen}</td>
                                    <td className="p-4">
                                        {item.tipo === 'MERMA' 
                                            ? <span className="inline-block px-2 py-1 text-xs font-bold text-red-600 bg-red-100 rounded">MERMA</span>
                                            : <span className="text-gray-700">{item.nombreAreaDestino || 'Consumo'}</span>
                                        }
                                    </td>
                                    <td className="p-4 text-right font-bold">{item.cantidad}</td>
                                    <td className="p-4 text-right text-gray-700">
                                        ${(item.cantidad * item.costoUnitario).toLocaleString('es-CL')}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => eliminarDelCarrito(item.uniqueId)}
                                            className="text-red-500 hover:text-red-700 font-bold"
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {carrito.length > 0 && (
                        <tfoot className="bg-gray-50 border-t border-gray-200">
                            <tr>
                                <td colSpan="5" className="p-4 text-right font-bold text-gray-700">TOTAL NETO GUÍA:</td>
                                <td className="p-4 text-right font-bold text-blue-700 text-lg">
                                    ${totalNetoGuia.toLocaleString('es-CL')}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* BOTÓN FINAL */}
            <div className="mt-6 flex justify-end">
                <button 
                    onClick={guardarGuia}
                    disabled={cargando || carrito.length === 0}
                    className={`px-8 py-3 rounded shadow text-white font-bold text-lg transition
                        ${cargando || carrito.length === 0 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-green-600 hover:bg-green-700 transform hover:scale-105'}`}
                >
                    {cargando ? 'Guardando...' : '💾 Guardar Guía de Salida'}
                </button>
            </div>
        </div>
    );
}