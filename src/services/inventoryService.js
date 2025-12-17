import api from './api';

// Obtener stock agrupado por área (Para Guía Consumo)
export const getStockByArea = async (areaId) => {
    const response = await api.get(`/api/inventory/area/${areaId}`);
    return response.data;
};

// NUEVO: Obtener Inventario Completo (Para Módulo Inventario)
export const getInventarioCompleto = async () => {
    const response = await api.get('/api/inventory/completo');
    return response.data;
};