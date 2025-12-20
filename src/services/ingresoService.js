import api from './api';

export const registrarIngreso = async (payload) => {
    try {
        const response = await api.post('/api/ingresos', payload);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data || "Error en el ingreso");
    }
};

export const getHistorialIngresos = async () => {
    try {
        const response = await api.get('/api/ingresos/historial');
        return response.data;
    } catch (error) {
        console.error("Error en historial ingresos:", error);
        throw error;
    }
};

export const actualizarIngresoItem = async (id, datosActualizados) => {
    try {
        const response = await api.put(`/api/ingresos/${id}`, datosActualizados);
        return response.data;
    } catch (error) {
        console.error("Error actualizando ítem:", error);
        throw error;
    }
};