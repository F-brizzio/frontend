import { useState, useEffect } from 'react';
import { getNotes, createNote, updateNote, deleteNote } from '../services/noteService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotasPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [notas, setNotas] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // --- FILTROS ---
    const [busqueda, setBusqueda] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
    // Nuevos estados para el rango de fechas
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    // --- EDICIÓN ---
    const [modoEdicion, setModoEdicion] = useState(false);
    const [notaEditandoId, setNotaEditandoId] = useState(null);

    const [formData, setFormData] = useState({
        title: 'Cierre de caja',
        date: new Date().toISOString().split('T')[0],
        category: 'Venta Diaria',
        content: '',
        salesAmount: ''
    });

    useEffect(() => {
        cargarNotas();
    }, []);

    const cargarNotas = async () => {
        try {
            const data = await getNotes();
            setNotas(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE FILTRADO ACTUALIZADA ---
    const notasFiltradas = notas.filter(nota => {
        const matchTexto = nota.title.toLowerCase().includes(busqueda.toLowerCase());
        const matchCat = filtroCategoria === 'TODAS' || nota.category === filtroCategoria;
        
        let matchTiempo = true;
        // La fecha de la nota suele venir como "YYYY-MM-DD"
        const fechaNota = nota.date; 

        if (fechaInicio && fechaFin) {
            matchTiempo = fechaNota >= fechaInicio && fechaNota <= fechaFin;
        } else if (fechaInicio) {
            matchTiempo = fechaNota >= fechaInicio;
        } else if (fechaFin) {
            matchTiempo = fechaNota <= fechaFin;
        }

        return matchTexto && matchCat && matchTiempo;
    });

    // --- MANEJO FORMULARIO ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        let nextData = { ...formData, [name]: value };

        if (name === 'category' && value === 'Venta Diaria') {
            nextData.title = 'Cierre de caja';
        }

        setFormData(nextData);
    };

    const cargarParaEditar = (nota) => {
        setModoEdicion(true);
        setNotaEditandoId(nota.id);
        setFormData({
            title: nota.title,
            date: nota.date,
            category: nota.category,
            content: nota.content || '',
            salesAmount: nota.salesAmount || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarEdicion = () => {
        setModoEdicion(false);
        setNotaEditandoId(null);
        setFormData({
            title: 'Cierre de caja',
            date: new Date().toISOString().split('T')[0],
            category: 'Venta Diaria',
            content: '',
            salesAmount: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const notaPayload = {
                ...formData,
                responsible: user ? (user.fullName || user.username) : 'Sistema',
                salesAmount: formData.category === 'Venta Diaria' ? parseFloat(formData.salesAmount) : null
            };

            if (modoEdicion) {
                await updateNote(notaEditandoId, notaPayload);
                alert('✏️ Nota actualizada');
            } else {
                await createNote(notaPayload);
                alert('✅ Nota creada');
            }
            
            cancelarEdicion();
            cargarNotas();
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        }
    };

    const handleDelete = async (id) => {
        if(window.confirm("¿Seguro que deseas eliminar esta nota?")) {
            try {
                await deleteNote(id);
                cargarNotas();
                if (modoEdicion && notaEditandoId === id) cancelarEdicion();
            } catch (e) { alert("Error al borrar"); }
        }
    };

    return (
        <div className="inventory-container">
            {/* CABECERA */}
            <div className="page-header">
                <div>
                    <h2 className="page-title">💰 Ventas</h2>        
                    <p style={{ margin: 0, color: '#718096', fontSize: '0.9em' }}>
                        Usuario Activo: <strong>{user?.fullName || user?.username}</strong>
                    </p>
                </div>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Menú</button>
            </div>

            {/* FORMULARIO DE CREACIÓN / EDICIÓN */}
            <div className="form-card" style={{ marginBottom: '30px', borderLeft: modoEdicion ? '5px solid #d69e2e' : '5px solid #3182ce' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, color: '#2d3748' }}>{modoEdicion ? '✏️ Editando Venta' : '➕ Nueva Venta / Nota'}</h3>
                    {modoEdicion && (
                        <button onClick={cancelarEdicion} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.85em' }}>
                            Cancelar
                        </button>
                    )}
                </div>
                
                <form onSubmit={handleSubmit} className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Fecha</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange} required className="form-input" />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Categoría</label>
                        <select name="category" value={formData.category} onChange={handleChange} className="form-select">
                            <option value="Venta Diaria">💰 Venta Diaria (Cierre)</option>
                            <option value="General">📌 General / Recordatorio</option>
                            <option value="Incidente">⚠️ Incidente</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Título</label>
                        <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="Ej: Cierre de caja..." className="form-input" />
                    </div>

                    {formData.category === 'Venta Diaria' && (
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label" style={{ color: '#2f855a' }}>Monto Total Venta ($)</label>
                            <input type="number" name="salesAmount" value={formData.salesAmount} onChange={handleChange} required placeholder="0" className="form-input" style={{ borderColor: '#2f855a', fontWeight: 'bold' }} />
                        </div>
                    )}

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Contenido / Detalle</label>
                        <textarea name="content" value={formData.content} onChange={handleChange} rows="3" className="form-input" style={{ resize: 'vertical' }} />
                    </div>

                    <div className="form-actions" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            {modoEdicion ? 'Guardar Cambios' : 'Guardar Registro'}
                        </button>
                    </div>
                </form>
            </div>

            {/* BARRA DE FILTROS ACTUALIZADA */}
            <div className="filters-panel" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="filter-group" style={{ flex: '2 1 200px' }}>
                    <label className="filter-label">🔍 Buscar</label>
                    <input 
                        type="text" 
                        placeholder="Buscar por título..." 
                        value={busqueda} 
                        onChange={e => setBusqueda(e.target.value)} 
                        className="filter-input"
                    />
                </div>
                <div className="filter-group" style={{ flex: '1 1 150px' }}>
                    <label className="filter-label">Categoría</label>
                    <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="filter-select">
                        <option value="TODAS">Todas</option>
                        <option value="Venta Diaria">💰 Venta</option>
                        <option value="General">📌 General</option>
                        <option value="Incidente">⚠️ Incidente</option>
                    </select>
                </div>
                {/* Rango de Fechas */}
                <div className="filter-group" style={{ flex: '1 1 150px' }}>
                    <label className="filter-label">Desde</label>
                    <input 
                        type="date" 
                        value={fechaInicio} 
                        onChange={e => setFechaInicio(e.target.value)} 
                        className="filter-input"
                    />
                </div>
                <div className="filter-group" style={{ flex: '1 1 150px' }}>
                    <label className="filter-label">Hasta</label>
                    <input 
                        type="date" 
                        value={fechaFin} 
                        onChange={e => setFechaFin(e.target.value)} 
                        className="filter-input"
                    />
                </div>
                {/* Botón para limpiar filtros de fecha */}
                {(fechaInicio || fechaFin) && (
                    <button 
                        onClick={() => { setFechaInicio(''); setFechaFin(''); }}
                        className="btn-secondary"
                        style={{ height: '40px', padding: '0 15px' }}
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {/* LISTADO DE NOTAS */}
            <div style={{ marginTop: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#4a5568', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                    Historial de Registros ({notasFiltradas.length})
                </h3>
                
                {loading ? <p style={{textAlign:'center', padding:'20px'}}>Cargando...</p> : 
                 notasFiltradas.length === 0 ? <p style={{textAlign:'center', padding:'20px', color:'#718096'}}>No hay registros en este rango.</p> : (
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {notasFiltradas.map(nota => (
                            <div key={nota.id} style={{ 
                                background: 'white',
                                borderRadius: '8px', 
                                border: '1px solid #e2e8f0',
                                borderLeft: nota.category === 'Venta Diaria' ? '5px solid #28a745' : nota.category === 'Incidente' ? '5px solid #e53e3e' : '5px solid #3182ce',
                                padding: '20px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                opacity: (modoEdicion && notaEditandoId !== nota.id) ? 0.5 : 1
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                    <div>
                                        <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                                            <span style={{ fontWeight: '700', fontSize: '1.1em', color:'#2d3748' }}>{nota.title}</span>
                                            <span className="badge-category" style={{ fontSize: '0.8em' }}>{nota.category}</span>
                                        </div>
                                        <div style={{ fontSize: '0.85em', color: '#718096', marginTop: '4px' }}>
                                            📅 {nota.date}
                                        </div>
                                    </div>
                                    
                                    <div style={{ display:'flex', gap:'8px' }}>
                                        <button onClick={() => cargarParaEditar(nota)} disabled={modoEdicion} className="btn-secondary" style={{ padding: '5px 10px' }}>✏️</button>
                                        <button onClick={() => handleDelete(nota.id)} disabled={modoEdicion} className="btn-secondary" style={{ padding: '5px 10px', color: '#e53e3e', background: '#fff5f5' }}>🗑️</button>
                                    </div>
                                </div>
                                
                                <div style={{ color: '#4a5568', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                    {nota.content}
                                </div>
                                
                                {nota.category === 'Venta Diaria' && nota.salesAmount && (
                                    <div style={{ marginTop: '15px', padding: '10px', background: '#f0fff4', borderRadius: '6px', border: '1px solid #c6f6d5', color: '#22543d', fontWeight: 'bold' }}>
                                        💰 Venta Total: ${nota.salesAmount.toLocaleString()}
                                    </div>
                                )}

                                <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #f7fafc', fontSize: '0.85em', color: '#718096' }}>
                                    ✍️ Registrado por: <strong>{nota.responsible}</strong>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}77