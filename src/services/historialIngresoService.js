import api from './api';

// 1. Obtener la lista resumen (Agrupada por facturas)
export const getResumenIngresos = async () => {
    const response = await api.get('/api/historial/ingresos');
    return response.data;
};

// 2. Obtener el detalle de una factura específica
export const getDetalleIngreso = async (numeroDocumento) => {
    const response = await api.get(`/api/historial/ingresos/${numeroDocumento}`);
    return response.data;
};