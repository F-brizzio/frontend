import api from './api';

export const getAreas = async () => {
    try {
        const response = await api.get('/api/areas');
        return response.data;
    } catch (error) {
        console.error("Error cargando áreas", error);
        throw error;
    }
};

export const createArea = async (areaData) => {
    try {
        const response = await api.post('/api/areas', areaData);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || "Error al crear área");
    }
};