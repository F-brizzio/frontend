import api from './api';

/**
 * Buscador dinámico de productos con stock para la Guía de Consumo.
 * @param {string} query - Nombre o parte del nombre del producto.
 * @param {number|null} areaId - ID del área de origen. Si es null o vacío, busca en TODO el inventario (Modo General).
 */
export const buscarStockParaGuia = async (query, areaId = null) => {
    try {
        const response = await api.get('/api/salidas/buscar-productos', {
            params: { 
                query: query,
                areaId: areaId || undefined // Si no hay areaId, no envía el parámetro para búsqueda global
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error en buscarStockParaGuia:", error);
        throw error;
    }
};

/**
 * Envía la Guía de Consumo completa para ser procesada mediante FIFO en el backend.
 * @param {Object} guiaDto - { areaOrigenId, fecha, responsable, detalles: [...] }
 */
export const procesarGuiaConsumo = async (guiaDto) => {
    try {
        const response = await api.post('/api/salidas', guiaDto);
        return response.data;
    } catch (error) {
        // El backend devuelve errores como "Stock insuficiente" en el cuerpo de la respuesta
        const msg = error.response?.data || "Error al procesar la guía de consumo";
        throw new Error(msg);
    }
};

export const getHistorialSalidas = async () => {
    try {
        const response = await api.get('/api/salidas');
        return response.data;
    } catch (error) {
        console.error("Error al obtener historial de salidas:", error);
        throw error;
    }
};