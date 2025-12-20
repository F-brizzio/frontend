import api from './api';

/**
 * Buscador dinámico de productos con stock para la Guía de Consumo.
 * Conecta con SalidaController -> @GetMapping("/api/salidas/buscar-productos")
 * @param {string} query - Nombre del producto.
 * @param {number|null} areaId - ID del área. Si es null, el backend busca en todas las áreas (Modo General).
 */
export const buscarStockParaGuia = async (query, areaId = null) => {
    try {
        const response = await api.get('/api/salidas/buscar-productos', {
            params: { 
                query: query,
                areaId: areaId || undefined // Si no hay ID, no envía el parámetro para búsqueda global
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error en buscarStockParaGuia:", error);
        throw error;
    }
};

/**
 * Envía la Guía de Consumo completa para ser procesada mediante FIFO.
 * Conecta con SalidaController -> @PostMapping("/api/salidas")
 * @param {Object} guiaDto - { areaOrigenId, fecha, responsable, detalles: [...] }
 */
export const procesarGuiaConsumo = async (guiaDto) => {
    try {
        const response = await api.post('/api/salidas', guiaDto);
        return response.data;
    } catch (error) {
        // Captura el mensaje de error del backend (ej: "Stock insuficiente")
        const msg = error.response?.data || "Error al procesar la guía de consumo";
        throw new Error(msg);
    }
};

/**
 * Obtiene el historial de todas las salidas realizadas.
 * Conecta con SalidaController -> @GetMapping("/api/salidas")
 */
export const getHistorialSalidas = async () => {
    try {
        const response = await api.get('/api/salidas');
        return response.data;
    } catch (error) {
        console.error("Error al obtener historial de salidas:", error);
        throw error;
    }
};