import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MODULOS } from './constants/modules';

// PÁGINAS PRINCIPALES
import LoginPage from './pages/LoginPage';
import AreaPage from './pages/AreaPage';
import ProductPage from './pages/ProductPage';
import InventarioPage from './pages/InventarioPage';
import IngresoPage from './pages/IngresoPage';
import GuiaConsumoPage from './pages/GuiaConsumoPage'; 
import HistorialIngresoPage from './pages/HistorialIngresoPage';
import HistorialSalidaPage from './pages/HistorialSalidaPage';
import ReportePage from './pages/ReportePage';
import AlertaPage from './pages/AlertaPage';
import NotasPage from './pages/NotasPage';
import AdminUsersPage from './pages/AdminUsersPage';

// --- COMPONENTE DE PROTECCIÓN ESPECÍFICA POR MÓDULO ---
const ProtectedRoute = ({ children, modulo }) => {
    const { user, canAccess } = useAuth();
    
    if (!user) return <Navigate to="/login" />;
    
    // Si no se especifica módulo, solo valida login
    if (!modulo) return children;

    // Si tiene permiso, pasa. Si no, al menú.
    return canAccess(modulo) ? children : <Navigate to="/menu" replace />;
};

// --- COMPONENTE DEL MENÚ PRINCIPAL (DASHBOARD) ---
const MainMenu = () => {
    const { user, logout, canAccess } = useAuth();
    const navigate = useNavigate();

    // Función auxiliar para renderizar tarjetas de forma limpia y consistente
    const renderCard = (modulo, ruta, color, icon, titulo, subtitulo = '') => {
        // Si el usuario no tiene permiso, no renderizamos nada
        if (!canAccess(modulo)) return null;

        return (
            <button 
                onClick={() => navigate(ruta)} 
                className="menu-card"
                style={{ backgroundColor: color }} // El color de fondo es lo único que mantenemos dinámico aquí
            >
                <span className="menu-icon">{icon}</span>
                <span className="menu-text-container">
                    {titulo}
                    {subtitulo && <div className="menu-subtitle">{subtitulo}</div>}
                </span>
            </button>
        );
    };

    return (
        <div className="dashboard-container">
            {/* CABECERA */}
            <header className="dashboard-header">
                <h1 className="dashboard-title">📦 Sistema Bodega</h1>
                
                <div className="user-info-panel">
                    <div className="user-details">
                        <div className="user-name">{user?.fullName}</div>
                        <span className="user-role">{user?.role}</span>
                    </div>
                    <button onClick={logout} className="logout-btn">
                        Salir
                    </button>
                </div>
            </header>

            <main>
                <h2 style={{ color: '#718096', marginBottom: '20px', fontSize: '1.2rem', fontWeight: '600' }}>
                    Panel de Control
                </h2>
                
                <div className="dashboard-grid">
                    {/* --- BOTONES GENERADOS DINÁMICAMENTE --- */}
                    
                    {renderCard(MODULOS.INGRESO, '/ingresos', '#28a745', '📥', 'Ingreso Mercadería')}
                    
                    {renderCard(MODULOS.GUIA_CONSUMO, '/guia-consumo', '#dc3545', '📋', 'Guía de Consumo', '(Salidas / Retiros)')}
                    
                    {renderCard(MODULOS.NOTAS, '/notas', '#6f42c1', '📝', 'Bitácora y Notas', '(Ventas Diarias)')}
                    
                    {renderCard(MODULOS.INVENTARIO, '/inventario', '#17a2b8', '📦', 'Inventario Actual')}
                    
                    {renderCard(MODULOS.PRODUCTOS, '/products', '#ffc107', '🏷️', 'Catálogo Productos')}
                    
                    {renderCard(MODULOS.AREAS, '/areas', '#6c757d', '🏢', 'Áreas de Trabajo')}
                    
                    {renderCard(MODULOS.REPORTES, '/reportes', '#007bff', '📊', 'Reportes Avanzados')}
                    
                    {renderCard(MODULOS.ALERTAS, '/alertas', '#fd7e14', '🔔', 'Centro de Alertas')}
                    
                    {renderCard(MODULOS.HISTORIAL_INGRESO, '/historial-ingresos', '#20c997', '📅', 'Historial Ingresos')}
                    
                    {renderCard(MODULOS.USUARIOS, '/admin-users', '#343a40', '👥', 'Gestión Usuarios', '(Admin)')}
                    
                    {renderCard(MODULOS.HISTORIAL_SALIDA, '/historial-salidas', '#e83e8c', '📤', 'Historial Salidas')}
                </div>
            </main>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL APP ---
function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* RUTA PÚBLICA */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<Navigate to="/login" />} />

                    {/* MENÚ PRINCIPAL (Accesible para todos los logueados) */}
                    <Route path="/menu" element={<ProtectedRoute><MainMenu /></ProtectedRoute>} />
                    
                    {/* --- RUTAS PROTEGIDAS POR MÓDULO --- */}
                    <Route path="/ingresos" element={<ProtectedRoute modulo={MODULOS.INGRESO}><IngresoPage /></ProtectedRoute>} />
                    <Route path="/guia-consumo" element={<ProtectedRoute modulo={MODULOS.GUIA_CONSUMO}><GuiaConsumoPage /></ProtectedRoute>} />
                    <Route path="/notas" element={<ProtectedRoute modulo={MODULOS.NOTAS}><NotasPage /></ProtectedRoute>} />
                    
                    <Route path="/inventario" element={<ProtectedRoute modulo={MODULOS.INVENTARIO}><InventarioPage /></ProtectedRoute>} />
                    <Route path="/products" element={<ProtectedRoute modulo={MODULOS.PRODUCTOS}><ProductPage /></ProtectedRoute>} />
                    <Route path="/areas" element={<ProtectedRoute modulo={MODULOS.AREAS}><AreaPage /></ProtectedRoute>} />
                    
                    <Route path="/reportes" element={<ProtectedRoute modulo={MODULOS.REPORTES}><ReportePage /></ProtectedRoute>} />
                    <Route path="/alertas" element={<ProtectedRoute modulo={MODULOS.ALERTAS}><AlertaPage /></ProtectedRoute>} />
                    
                    <Route path="/historial-ingresos" element={<ProtectedRoute modulo={MODULOS.HISTORIAL_INGRESO}><HistorialIngresoPage /></ProtectedRoute>} />
                    <Route path="/historial-salidas" element={<ProtectedRoute modulo={MODULOS.HISTORIAL_SALIDA}><HistorialSalidaPage /></ProtectedRoute>} />
                    
                    <Route path="/admin-users" element={<ProtectedRoute modulo={MODULOS.USUARIOS}><AdminUsersPage /></ProtectedRoute>} />

                    {/* CUALQUIER RUTA NO DEFINIDA -> LOGIN */}
                    <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;