import api from './api';

/**
 * Lista todas las áreas de trabajo disponibles (Casino, Coffee, General, etc.)
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