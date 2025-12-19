import api from './api';

/**
 * 1. INVENTARIO COMPLETO
 * Retorna todos los productos con su stock sumado y agrupado por área.
 */
export const getInventarioCompleto = async () => {
    try {
        const response = await api.get('/api/inventory/completo');
        return response.data;
    } catch (error) {
        console.error("Error en getInventarioCompleto:", error);
        throw error;
    }
};

/**
 * 2. BÚSQUEDA DINÁMICA POR ÁREA (Para Guía de Consumo)
 * Filtra productos que tengan stock disponible en una bodega específica.
 */
export const buscarStockPorArea = async (areaId, query) => {
    try {
        const response = await api.get(`/api/inventory/area/${areaId}/buscar`, {
            params: { q: query }
        });
        return response.data;
    } catch (error) {
        console.error("Error en buscarStockPorArea:", error);
        throw error;
    }
};

/**
 * 3. STOCK POR ÁREA (General)
 * Retorna todo el stock de una ubicación específica.
 */
export const getStockByArea = async (areaId) => {
    try {
        const response = await api.get(`/api/inventory/area/${areaId}`);
        return response.data;
    } catch (error) {
        console.error(`Error en getStockByArea (ID: ${areaId}):`, error);
        throw error;
    }
};

/**
 * 4. AJUSTE MANUAL DE STOCK
 * Envía la nueva cantidad física contada para corregir el sistema.
 * @param {Object} ajusteDto - { productSku, areaId, nuevaCantidad, motivo }
 */
export const ajustarStock = async (ajusteDto) => {
    try {
        const response = await api.post('/api/inventory/ajuste', ajusteDto);
        return response.data;
    } catch (error) {
        const msg = error.response?.data?.message || "No se pudo realizar el ajuste";
        throw new Error(msg);
    }
};

/**
 * 5. DASHBOARD / RESUMEN (Opcional pero recomendado)
 * Para obtener totales de valorización y alertas rápidamente.
 */
export const getInventorySummary = async () => {
    try {
        const response = await api.get('/api/inventory/summary');
        return response.data;
    } catch (error) {
        console.error("Error en getInventorySummary:", error);
        throw error;
    }
};