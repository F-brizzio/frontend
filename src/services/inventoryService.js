import api from './api';

/**
 * Obtiene el inventario completo para la tabla principal.
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
 * Realiza el ajuste manual de stock.
 */
export const ajustarStock = async (ajusteDto) => {
    try {
        const response = await api.post('/api/inventory/ajuste', ajusteDto);
        return response.data;
    } catch (error) {
        const msg = error.response?.data?.message || "Error al realizar el ajuste";
        throw new Error(msg);
    }
};