import { useState, useEffect } from 'react';
import { getAlertas } from '../services/alertaService';
import { useNavigate } from 'react-router-dom';

export default function AlertaPage() {
    const navigate = useNavigate();
    
    const [alertas, setAlertas] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Iniciar por defecto en 'BAJO_STOCK'
    const [filtroActual, setFiltroActual] = useState('BAJO_STOCK');

    useEffect(() => {
        cargarAlertas();
    }, []);

    const cargarAlertas = async () => {
        try {
            const data = await getAlertas();
            setAlertas(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE CLASIFICACIÓN ---
    const getAlertasPorTipo = (tipoFiltro) => {
        return alertas.filter(a => {
            if (tipoFiltro === 'BAJO_STOCK') {
                return a.tipo === 'CRITICO' || a.tipo === 'ADVERTENCIA' || a.tipo === 'BAJO_STOCK';
            }
            if (tipoFiltro === 'SOBRE_STOCK') {
                return a.tipo === 'SOBRE_STOCK' || a.tipo === 'EXCESO';
            }
            if (tipoFiltro === 'POR_VENCER') {
                return a.tipo === 'VENCIMIENTO' || a.tipo === 'POR_VENCER';
            }
            return false;
        });
    };

    const alertasVisibles = getAlertasPorTipo(filtroActual);

    const countBajo = getAlertasPorTipo('BAJO_STOCK').length;
    const countSobre = getAlertasPorTipo('SOBRE_STOCK').length;
    const countVencer = getAlertasPorTipo('POR_VENCER').length;

    const getConfig = () => {
        switch (filtroActual) {
            case 'BAJO_STOCK':
                return { color: '#dc3545', bg: '#fff5f5', border: '#feb2b2', icon: '📉', label: 'BAJO STOCK' };
            case 'SOBRE_STOCK':
                return { color: '#0d6efd', bg: '#f0f7ff', border: '#cfe2ff', icon: '📈', label: 'SOBRE STOCK' };
            case 'POR_VENCER':
                return { color: '#fd7e14', bg: '#fff8f3', border: '#ffcca5', icon: '⏳', label: 'POR VENCER' };
            default:
                return { color: '#666', bg: '#fff', border: '#ccc' };
        }
    };

    const config = getConfig();

    return (
        <div className="inventory-container">
            <div className="page-header">
                <h2 className="page-title">🔔 Gestión de Alertas</h2>
                <button onClick={() => navigate('/menu')} className="back-btn">⬅ Menú</button>
            </div>

            {/* --- 3 BOTONES DE FILTRO (TABS) --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '25px' }}>
                
                {/* 1. BAJO STOCK (Rojo) */}
                <button 
                    onClick={() => setFiltroActual('BAJO_STOCK')}
                    style={{
                        padding: '15px', borderRadius: '8px', cursor: 'pointer',
                        background: filtroActual === 'BAJO_STOCK' ? '#dc3545' : '#fff',
                        color: filtroActual === 'BAJO_STOCK' ? 'white' : '#dc3545',
                        border: '1px solid #dc3545',
                        fontWeight: 'bold', boxShadow: filtroActual === 'BAJO_STOCK' ? '0 4px 6px rgba(220,53,69,0.3)' : 'none',
                        transition: '0.2s', display:'flex', flexDirection:'column', alignItems:'center', gap:'5px'
                    }}
                >
                    <span style={{fontSize:'1.2em'}}>📉 Bajo Stock</span>
                    <span style={{background: filtroActual === 'BAJO_STOCK' ? 'rgba(255,255,255,0.3)' : '#dc3545', color: 'white', padding:'2px 8px', borderRadius:'10px', fontSize:'0.8em'}}>
                        {countBajo}
                    </span>
                </button>

                {/* 2. SOBRE STOCK (Azul) */}
                <button 
                    onClick={() => setFiltroActual('SOBRE_STOCK')}
                    style={{
                        padding: '15px', borderRadius: '8px', cursor: 'pointer',
                        background: filtroActual === 'SOBRE_STOCK' ? '#0d6efd' : '#fff',
                        color: filtroActual === 'SOBRE_STOCK' ? 'white' : '#0d6efd',
                        border: '1px solid #0d6efd',
                        fontWeight: 'bold', boxShadow: filtroActual === 'SOBRE_STOCK' ? '0 4px 6px rgba(13,110,253,0.3)' : 'none',
                        transition: '0.2s', display:'flex', flexDirection:'column', alignItems:'center', gap:'5px'
                    }}
                >
                    <span style={{fontSize:'1.2em'}}>📈 Sobre Stock</span>
                    <span style={{background: filtroActual === 'SOBRE_STOCK' ? 'rgba(255,255,255,0.3)' : '#0d6efd', color: 'white', padding:'2px 8px', borderRadius:'10px', fontSize:'0.8em'}}>
                        {countSobre}
                    </span>
                </button>

                {/* 3. POR VENCER (Naranja) */}
                <button 
                    onClick={() => setFiltroActual('POR_VENCER')}
                    style={{
                        padding: '15px', borderRadius: '8px', cursor: 'pointer',
                        background: filtroActual === 'POR_VENCER' ? '#fd7e14' : '#fff',
                        color: filtroActual === 'POR_VENCER' ? 'white' : '#fd7e14',
                        border: '1px solid #fd7e14',
                        fontWeight: 'bold', boxShadow: filtroActual === 'POR_VENCER' ? '0 4px 6px rgba(253,126,20,0.3)' : 'none',
                        transition: '0.2s', display:'flex', flexDirection:'column', alignItems:'center', gap:'5px'
                    }}
                >
                    <span style={{fontSize:'1.2em'}}>⏳ Por Vencer</span>
                    <span style={{background: filtroActual === 'POR_VENCER' ? 'rgba(255,255,255,0.3)' : '#fd7e14', color: 'white', padding:'2px 8px', borderRadius:'10px', fontSize:'0.8em'}}>
                        {countVencer}
                    </span>
                </button>
            </div>

            {/* --- CONTENIDO --- */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                    <p>Analizando datos...</p>
                </div>
            ) : alertasVisibles.length === 0 ? (
                <div style={{ padding: '40px', background: '#f8f9fa', color: '#6c757d', borderRadius: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👍</div>
                    <h3 style={{ margin: 0 }}>Sin alertas en esta categoría</h3>
                    <p>Todo se ve bien por aquí.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                    {alertasVisibles.map((a, index) => (
                        <div key={index} style={{ 
                            background: config.bg, 
                            borderRadius: '12px', 
                            border: `1px solid ${config.border}`,
                            borderLeft: `6px solid ${config.color}`,
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                            transition: 'transform 0.2s'
                        }}>
                            <div>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                                    <span style={{ 
                                        background: config.color, 
                                        color: 'white', 
                                        padding: '4px 10px', 
                                        borderRadius: '20px', 
                                        fontSize: '0.75em', 
                                        fontWeight: 'bold',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {config.icon} {config.label}
                                    </span>
                                    <small style={{ color: '#718096', fontWeight:'600' }}>{a.productSku}</small>
                                </div>
                                
                                <h3 style={{ margin: '0 0 10px 0', color: '#2d3748', fontSize: '1.2rem' }}>
                                    {a.productName}
                                </h3>
                                
                                <p style={{ color: config.color, fontWeight: '600', margin: 0, fontSize:'0.95rem' }}>
                                    {a.mensaje}
                                </p>
                            </div>
                            
                            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: `1px solid ${config.border}`, textAlign: 'right' }}>
                                {filtroActual === 'BAJO_STOCK' && (
                                    <button 
                                        onClick={() => navigate('/ingresos')}
                                        style={{ width: '100%', background: 'white', border: `2px solid ${config.color}`, color: config.color, padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '800', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                    >
                                        <span>📥</span> IR A REPONER STOCK
                                    </button>
                                )}

                                {filtroActual === 'SOBRE_STOCK' && (
                                    <button 
                                        onClick={() => navigate('/guia-consumo')} 
                                        style={{ width: '100%', background: 'white', border: `2px solid ${config.color}`, color: config.color, padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '800', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                    >
                                        <span>📤</span> GESTIONAR SALIDA / OFERTA
                                    </button>
                                )}

                                {filtroActual === 'POR_VENCER' && (
                                    <button 
                                        onClick={() => navigate('/guia-consumo')} 
                                        style={{ width: '100%', background: 'white', border: `2px solid ${config.color}`, color: config.color, padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '800', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                    >
                                        <span>⚡</span> PRIORIZAR USO
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}