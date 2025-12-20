import api from './api';

export const getInventarioCompleto = async () => {
    try {
        const response = await api.get('/api/inventory/completo');
        return response.data;
    } catch (error) {
        console.error("Error en getInventarioCompleto:", error);
        throw error;
    }
};

// Esta función resuelve el error de importación en GuiaConsumoPage
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

export const ajustarStock = async (ajusteDto) => {
    try {
        const response = await api.post('/api/inventory/ajuste', ajusteDto);
        return response.data;
    } catch (error) {
        const msg = error.response?.data?.message || "Error al realizar el ajuste";
        throw new Error(msg);
    }
};