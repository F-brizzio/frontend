import api from './api';

/**
 * Obtiene todo el inventario agrupado para la tabla principal.
 * El backend devuelve InventarioDetalleDto (sku, nombre, categoría, areaId, areaNombre, cantidad, unidad, valor).
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
 * Realiza un ajuste manual de stock (corrección de inventario físico).
 * @param {Object} ajusteDto - { productSku, areaId, nuevaCantidad, motivo }
 */
export const ajustarStock = async (ajusteDto) => {
    try {
        const response = await api.post('/api/inventory/ajuste', ajusteDto);
        return response.data;
    } catch (error) {
        // Capturamos el mensaje de error enviado por el backend (ej: "Cantidad negativa no permitida")
        const msg = error.response?.data?.message || "No se pudo realizar el ajuste";
        throw new Error(msg);
    }
};

// Puedes mantener este si lo usas en algún dashboard, pero verifica que el endpoint exista en el Controller
export const getInventorySummary = async () => {
    try {
        const response = await api.get('/api/inventory/summary');
        return response.data;
    } catch (error) {
        console.error("Error en getInventorySummary:", error);
        throw error;
    }
};