import api from './api';

/**
 * Obtiene todo el inventario agrupado para la tabla principal.
 * Conecta con InventoryController -> @GetMapping("/api/inventory/completo")
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
 * Busca productos con stock real para la Guía de Consumo.
 * Conecta con SalidaController -> @GetMapping("/api/salidas/buscar-productos")
 * Soporta búsqueda global (Modo General) si areaId es null.
 */
export const buscarStockParaGuia = async (areaId, query) => {
    try {
        const response = await api.get('/api/salidas/buscar-productos', {
            params: { 
                areaId: areaId || undefined, // Envía undefined para que el backend no reciba el parámetro si es null
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
 * Realiza el ajuste manual de stock desde la tabla de inventario.
 * Conecta con InventoryController -> @PostMapping("/api/inventory/ajuste")
 * Requiere el DTO AjusteStockDto (productSku, areaId, nuevaCantidad, motivo)
 */
export const ajustarStock = async (ajusteDto) => {
    try {
        const response = await api.post('/api/inventory/ajuste', ajusteDto);
        return response.data;
    } catch (error) {
        // Captura el mensaje de error personalizado del backend
        const msg = error.response?.data?.message || "Error al realizar el ajuste";
        throw new Error(msg);
    }
};