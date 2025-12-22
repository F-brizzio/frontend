import api from './api';

// Obtener lista resumen (Agrupada por Folio)
// Cambiamos el nombre a 'getSalidas' para que coincida con tu import en la página
export const getSalidas = async () => {
    try {
        const response = await api.get('/api/historial/salidas');
        return response.data; // Retorna List<ResumenSalidaDto>
    } catch (error) {
        console.error("Error en getSalidas:", error);
        throw error;
    }
};

// Obtener detalle de un folio específico
export const getDetalleSalida = async (folio) => {
    try {
        const response = await api.get(`/api/historial/salidas/${folio}`);
        return response.data; // Retorna List<SalidaHistorial>
    } catch (error) {
        console.error("Error en getDetalleSalida:", error);
        throw error;
    }
};