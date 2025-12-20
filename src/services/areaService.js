import api from './api';

/**
 * Obtiene la lista de todas las áreas de trabajo (Casino, Coffee, etc.)
 * Se conecta con @GetMapping("/api/areas") en el backend
 */
export const getAreas = async () => {
    try {
        const response = await api.get('/api/areas');
        return response.data;
    } catch (error) {
        console.error("Error al obtener áreas:", error);
        throw error;
    }
};

/**
 * Registra una nueva área de trabajo.
 * Se conecta con @PostMapping("/api/areas") en el backend
 * @param {Object} areaData - Objeto con los datos del área, ej: { nombre: 'Nueva Área' }
 */
export const createArea = async (areaData) => {
    try {
        const response = await api.post('/api/areas', areaData);
        return response.data;
    } catch (error) {
        // Captura el mensaje de error específico del backend si existe
        const msg = error.response?.data?.message || "No se pudo crear el área";
        throw new Error(msg);
    }
};