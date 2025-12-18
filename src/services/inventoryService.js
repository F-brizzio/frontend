import api from './api'; // Asegúrate de importar tu instancia de axios configurada

// 1. Para la página de Inventario General (La tabla grande)
export const getInventarioCompleto = async () => {
    try {
        const response = await api.get('/inventory/completo');
        return response.data;
    } catch (error) {
        console.error("Error en getInventarioCompleto:", error);
        throw error;
    }
};

// 2. Para la Guía de Consumo (El error que te salía: getAllStock)
// Nota: Usamos el mismo endpoint que el inventario completo porque necesitamos buscar en todo.
export const getAllStock = async () => {
    try {
        const response = await api.get('/inventory/completo');
        return response.data;
    } catch (error) {
        console.error("Error en getAllStock:", error);
        throw error;
    }
};

// 3. Para buscar stock solo de un área específica (Tambien lo pide tu página)
export const getStockByArea = async (areaId) => {
    try {
        // Asegúrate de que en tu Java (Backend) tengas un endpoint tipo: @GetMapping("/area/{id}")
        const response = await api.get(`/inventory/area/${areaId}`);
        return response.data;
    } catch (error) {
        console.error(`Error en getStockByArea (ID: ${areaId}):`, error);
        throw error;
    }
};