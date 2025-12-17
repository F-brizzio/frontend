import { useState, useEffect } from 'react';
import { getProducts } from '../services/productService';
import { getAreas } from '../services/areaService';
import { registrarSalida } from '../services/salidaService';
import { useNavigate } from 'react-router-dom';

export default function SalidaPage() {
    const navigate = useNavigate();

    // Listas Maestras
    const [products, setProducts] = useState([]);
    const [areas, setAreas] = useState([]);

    // Formulario
    const [formData, setFormData] = useState({
        productSku: '',
        areaId: '',
        cantidad: ''
    });

    // Estados visuales
    const [sugerencias, setSugerencias] = useState([]);
    const [nombreProductoSeleccionado, setNombreProductoSeleccionado] = useState('');
    const [mensaje, setMensaje] = useState({ text: '', type: '' });

    // Cargar datos al inicio
    useEffect(() => {
        async function load() {
            try {
                const p = await getProducts();
                const a = await getAreas();
                setProducts(p);
                setAreas(a);
            } catch (e) { console.error(e); }
        }
        load();
    }, []);

    // Buscador Inteligente de Productos
    const handleSkuChange = (e) => {
        const texto = e.target.value;
        setFormData({ ...formData, productSku: texto });

        if (texto.length > 0) {
            const coincidencias = products.filter(p => 
                p.sku.toLowerCase().includes(texto.toLowerCase()) || 
                p.name.toLowerCase().includes(texto.toLowerCase())
            );
            setSugerencias(coincidencias);
        } else {
            setSugerencias([]);
            setNombreProductoSeleccionado('');
        }
    };

    const seleccionarProducto = (p) => {
        setFormData({ ...formData, productSku: p.sku });
        setNombreProductoSeleccionado(p.name);
        setSugerencias([]); // Ocultar lista
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMensaje({ text: '', type: '' });

        if (!formData.productSku || !formData.areaId || !formData.cantidad) {
            setMensaje({ text: 'Complete todos los campos', type: 'error' });
            return;
        }

        try {
            // Convertimos a número antes de enviar
            const payload = {
                ...formData,
                areaId: Number(formData.areaId),
                cantidad: Number(formData.cantidad)
            };

            await registrarSalida(payload);
            
            setMensaje({ text: '✅ Salida registrada. Stock descontado (FIFO).', type: 'success' });
            // Limpiar solo cantidad
            setFormData({ ...formData, cantidad: '' });
        } catch (error) {
            // Aquí mostramos el error de "Stock insuficiente" que manda el backend
            setMensaje({ text: '❌ Error: ' + error, type: 'error' });
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h2>📤 Salida de Productos (Consumo)</h2>
            <button onClick={() => navigate('/menu')}>⬅ Volver</button>

            {mensaje.text && <div style={{ padding: '10px', margin: '15px 0', borderRadius:'4px', background: mensaje.type === 'error' ? '#f8d7da' : '#d4edda' }}>{mensaje.text}</div>}

            <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'grid', gap: '15px' }}>
                
                {/* BUSCADOR */}
                <div style={{ position: 'relative' }}>
                    <label>Buscar Producto (SKU o Nombre):</label>
                    <input 
                        type="text" 
                        value={formData.productSku} 
                        onChange={handleSkuChange} 
                        placeholder="Ej: Leche..."
                        style={{ width: '100%', padding: '10px' }}
                    />
                    {sugerencias.length > 0 && (
                        <ul style={{ position: 'absolute', width: '100%', background: 'white', border: '1px solid #ccc', listStyle: 'none', padding: 0, zIndex: 100 }}>
                            {sugerencias.map(p => (
                                <li key={p.id} onClick={() => seleccionarProducto(p)} style={{ padding: '10px', cursor: 'pointer', borderBottom:'1px solid #eee' }}>
                                    {p.name} ({p.sku})
                                </li>
                            ))}
                        </ul>
                    )}
                    {nombreProductoSeleccionado && <small style={{color:'green'}}>Seleccionado: <strong>{nombreProductoSeleccionado}</strong></small>}
                </div>

                {/* ÁREA DE ORIGEN */}
                <div>
                    <label>Desde Área (Origen):</label>
                    <select name="areaId" value={formData.areaId} onChange={handleChange} style={{ width: '100%', padding: '10px' }} required>
                        <option value="">-- Seleccione donde está el producto --</option>
                        {areas.map(a => (
                            <option key={a.id} value={a.id}>{a.nombre}</option>
                        ))}
                    </select>
                </div>

                {/* CANTIDAD A SACAR */}
                <div>
                    <label>Cantidad a Retirar:</label>
                    <input 
                        type="number" 
                        name="cantidad" 
                        value={formData.cantidad} 
                        onChange={handleChange} 
                        placeholder="0"
                        style={{ width: '100%', padding: '10px' }}
                        required
                    />
                </div>

                <button type="submit" style={{ padding: '15px', background: '#dc3545', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                    REGISTRAR SALIDA
                </button>
            </form>
        </div>
    );
}