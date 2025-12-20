import api from './api';

/**
 * Buscador dinámico de productos con stock para la Guía de Consumo.
 * Conecta con SalidaController -> @GetMapping("/api/salidas/buscar-productos")
 */
export const buscarStockParaGuia = async (areaId, query) => {
    try {
        const response = await api.get('/api/salidas/buscar-productos', {
            params: { 
                areaId: areaId || undefined, 
                query: query 
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error en buscarStockParaGuia:", error);
        throw error;
    }
};

/**
 * Envía la Guía de Consumo al backend para procesar descuentos FIFO.
 * Conecta con SalidaController -> @PostMapping("/api/salidas")
 */
export const procesarGuiaConsumo = async (guiaDto) => {
    try {
        const response = await api.post('/api/salidas', guiaDto);
        return response.data;
    } catch (error) {
        // Captura errores como "Stock insuficiente" enviados por el backend
        throw new Error(error.response?.data || "Error al procesar la guía");
    }
};

/**
 * Obtiene el historial de salidas.
 */
export const getSalidas = async () => {
    try {
        const response = await api.get('/api/salidas');
        return response.data;
    } catch (error) {
        console.error("Error al obtener historial:", error);
        throw error;
    }
};