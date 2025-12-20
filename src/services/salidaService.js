import api from './api';

export const procesarGuiaConsumo = async (guiaDto) => {
    try {
        const response = await api.post('/api/salidas', guiaDto);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data || "Error al procesar la guía");
    }
};

// Esta función resuelve el error de build en HistorialSalidaPage
export const getSalidas = async () => {
    try {
        // Usamos el endpoint del HistorialSalidaController
        const response = await api.get('/api/historial/salidas');
        return response.data;
    } catch (error) {
        console.error("Error al obtener historial de salidas:", error);
        throw error;
    }
};

export const getDetalleSalida = async (folio) => {
    try {
        const response = await api.get(`/api/historial/salidas/${folio}`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener detalle de salida:", error);
        throw error;
    }
};