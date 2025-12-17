import api from './api';

// 1. Crear Guía de Consumo (POST)
// NOTA: Le cambiamos el nombre a 'procesarGuiaConsumo' para que coincida con tu página
export const procesarGuiaConsumo = async (guiaDto) => {
    // La ruta debe ser /api/salidas (donde configuramos el Controller)
    const response = await api.post('/api/salidas', guiaDto);
    return response.data;
};

// 2. Obtener Historial de Salidas (GET)
// Esto lo usa la página de Historial
export const getSalidas = async () => {
    const response = await api.get('/api/salidas');
    return response.data;
};