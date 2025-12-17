import api from './api';

// Obtener todas las áreas
export const getAreas = async () => {
    try {
        const response = await api.get('/api/areas');
        return response.data;
    } catch (error) {
        console.error("Error al obtener áreas", error);
        throw error;
    }
};

// Crear una nueva área
export const createArea = async (nombre) => {
    try {
        const response = await api.post('/api/areas', { nombre });
        return response.data;
    } catch (error) {
        console.error("Error al crear área", error);
        throw error;
    }
};