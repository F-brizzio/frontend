import api from './api';

// Obtener lista resumen (Agrupada por Folio)
export const getResumenSalidas = async () => {
    const response = await api.get('/api/historial/salidas');
    return response.data;
};

// Obtener detalle de un folio específico
export const getDetalleSalida = async (folio) => {
    const response = await api.get(`/api/historial/salidas/${folio}`);
    return response.data;
};