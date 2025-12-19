import api from './api';

/**
 * Procesa una nueva Guía de Consumo.
 * @param {Object} guiaDto - Objeto con areaOrigenId, fecha, responsable y detalles[]
 */
export const procesarGuiaConsumo = async (guiaDto) => {
    try {
        const response = await api.post('/api/salidas', guiaDto);
        return response.data;
    } catch (error) {
        // Extraemos el mensaje de error del backend (ej: "Stock insuficiente para SKU...")
        const errorMsg = error.response?.data?.message || "Error al procesar la guía de consumo";
        console.error("Error en procesarGuiaConsumo:", errorMsg);
        throw new Error(errorMsg); 
    }
};

/**
 * Obtiene el historial completo de salidas (Guías de Consumo).
 */
export const getSalidas = async () => {
    try {
        const response = await api.get('/api/salidas');
        return response.data;
    } catch (error) {
        console.error("Error al obtener historial de salidas:", error);
        throw error;
    }
};

/**
 * (Opcional) Obtener salidas filtradas por rango de fechas
 */
export const getSalidasPorRango = async (fechaInicio, fechaFin) => {
    try {
        const response = await api.get('/api/salidas/reporte', {
            params: { inicio: fechaInicio, fin: fechaFin }
        });
        return response.data;
    } catch (error) {
        console.error("Error al obtener reporte de salidas:", error);
        throw error;
    }
};