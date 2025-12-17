import axios from 'axios';

// 1. Detectar si estamos en Local o Producción (Nube)
const baseURL = import.meta.env.VITE_API_URL || 'https://gestion.centroelagora.cl';

const api = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- INTERCEPTOR 1: SOLICITUD (REQUEST) ---
// Antes de salir, pégale el token a la mochila
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// --- INTERCEPTOR 2: RESPUESTA (RESPONSE) - LA SOLUCIÓN A TU PROBLEMA ---
// Cuando vuelve la respuesta del backend...
api.interceptors.response.use(
    (response) => {
        // Si todo salió bien, pasa la respuesta
        return response;
    },
    (error) => {
        // Si hay error, verificamos si es por Token Vencido (403 o 401)
        if (error.response && (error.response.status === 403 || error.response.status === 401)) {
            
            console.warn("🔒 Token vencido o no autorizado. Cerrando sesión...");
            
            // 1. Borramos el token "basura" automáticamente
            localStorage.removeItem('token');
            localStorage.removeItem('user'); // Si guardas datos del usuario, bórralos también

            // 2. Redirigimos forzosamente al Login
            // Usamos window.location porque aquí no podemos usar hooks de React (useNavigate)
            window.location.href = '/login'; 
        }
        
        return Promise.reject(error);
    }
);

export default api;