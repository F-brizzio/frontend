import api from './api';

/**
 * Obtiene la lista de todas las áreas de trabajo (Casino, Coffee, etc.)
 * Llama al @GetMapping en AreaController
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
 * Registra una nueva área de trabajo en el sistema.
 * Llama al @PostMapping en AreaController
 * @param {Object} areaData - El objeto área (ej: { nombre: 'Nueva Área' })
 */
export const createArea = async (areaData) => {
    try {
        const response = await api.post('/api/areas', areaData);
        return response.data;
    } catch (error) {
        console.error("Error al crear área:", error);
        const msg = error.response?.data?.message || "No se pudo crear el área";
        throw new Error(msg);
    }
};