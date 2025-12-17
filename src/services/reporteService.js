import api from './api';

// 1. Reporte de Gastos (Detallado)
export const generarReporteGastos = async (payload) => {
    const response = await api.post('/api/reportes/gastos', payload);
    return response.data;
};

// 2. Reporte Consumo
export const generarReporteConsumo = async (payload) => {
    const response = await api.post('/api/reportes/consumo', payload);
    return response.data;
};

// 3. Reporte Stock Final
export const generarReporteStock = async (payload) => {
    const response = await api.post('/api/reportes/stock', payload);
    return response.data;
};

// 4. Reporte Comparativo (In vs Out)
export const generarReporteComparativo = async (payload) => {
    const response = await api.post('/api/reportes/comparativo', payload);
    return response.data;
};

// 5. NUEVO: Reporte Venta Diaria (Evolución)
export const generarReporteVentaDiaria = async (payload) => {
    const response = await api.post('/api/reportes/venta-diaria', payload);
    return response.data;
};

// --- FILTROS Y MAESTROS ---

// Obtener opciones para el filtro (Multiselect)
export const getOpcionesFiltro = async (entidad) => {
    const response = await api.get(`/api/reportes/filtros/${entidad}`);
    return response.data;
};

// Obtener Info completa de productos para el filtro inteligente
export const getProductosInfo = async () => {
    const response = await api.get('/api/reportes/productos-info');
    return response.data;
};