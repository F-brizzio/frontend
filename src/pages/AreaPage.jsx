import { useState, useEffect } from 'react';
import { getAreas, createArea } from '../services/areaService'; //
import { useNavigate } from 'react-router-dom';

export default function AreaPage() {
    const navigate = useNavigate();
    
    // --- ESTADOS ---
    const [areas, setAreas] = useState([]);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarAreas();
    }, []);

    const cargarAreas = async () => {
        try {
            const data = await getAreas(); //
            setAreas(data);
        } catch (err) {
            setError('Error al cargar las áreas');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!nuevoNombre.trim()) return;

        try {
            await createArea(nuevoNombre); //
            setNuevoNombre('');
            cargarAreas(); 
        } catch (err) {
            setError('No se pudo crear el área. Verifique que no exista ya.');
        }
    };

    return (
        <div className="inventory-container">
            <div className="page-header">
                <h2 className="page-title">🏢 Gestión de Áreas / Bodegas</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Menú</button>
            </div>

            <div className="form-card" style={{ marginBottom: '30px', borderLeft: '5px solid #3182ce' }}>
                <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#2d3748' }}>➕ Registrar Nueva Ubicación</h3>
                
                {error && (
                    <div style={{ background: '#fff5f5', color: '#c53030', padding: '10px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #feb2b2' }}>
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <label className="form-label">Nombre del Área</label>
                        <input
                            type="text"
                            value={nuevoNombre}
                            onChange={(e) => setNuevoNombre(e.target.value)}
                            placeholder="Ej: Cocina Caliente, Barra, Bodega Vinos..."
                            className="form-input"
                            autoComplete="off"
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="btn-primary"
                        style={{ height: '46px', padding: '0 30px' }} 
                        disabled={!nuevoNombre.trim()}
                    >
                        Guardar
                    </button>
                </form>
            </div>

            <div className="table-container">
                <h4 style={{ padding: '15px 20px', margin: 0, borderBottom: '1px solid #eee', background: '#f8f9fa', color: '#4a5568' }}>
                    📍 Listado de Ubicaciones ({areas.length})
                </h4>
                
                <table className="responsive-table">
                    <thead>
                        <tr>
                            {/* Cambio de "ID" a "#" */}
                            <th style={{ width: '80px', textAlign: 'center' }}>#</th> 
                            <th>Nombre del Área</th>
                            <th style={{ textAlign: 'center' }}>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center' }}>Cargando ubicaciones...</td></tr>
                        ) : areas.length === 0 ? (
                            <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>No hay áreas registradas.</td></tr>
                        ) : (
                            // Usamos el índice (index) para enumerar
                            areas.map((area, index) => (
                                <tr key={area.id}>
                                    <td data-label="#" style={{ textAlign: 'center', color: '#718096', fontWeight: 'bold' }}>
                                        {index + 1} {/* Muestra 1, 2, 3... */}
                                    </td>
                                    <td data-label="Nombre">
                                        <strong style={{ fontSize: '1.1em', color: '#2d3748' }}>{area.nombre}</strong>
                                    </td>
                                    <td data-label="Estado" style={{ textAlign: 'center' }}>
                                        <span className="badge-category" style={{ background: '#c6f6d5', color: '#22543d' }}>
                                            Activa
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}