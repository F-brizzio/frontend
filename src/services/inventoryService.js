import axios from 'axios';

// Asegúrate de que esta URL coincida con tu backend
// Si tu backend corre en otro puerto, cámbialo aquí.
const API_URL = 'http://localhost:8080/api/inventory'; 

// 1. Obtener stock filtrado por área (Para selección normal)
export const getStockByArea = async (areaId) => {
    try {
        const response = await axios.get(`${API_URL}/area/${areaId}`);
        return response.data;
    } catch (error) {
        console.error(`Error al obtener stock del área ${areaId}:`, error);
        throw error;
    }
};

// 2. Obtener TODO el stock de la empresa (Para la opción "GENERAL")
export const getAllStock = async () => {
    try {
        // Llama al nuevo endpoint que agregamos en el Controller
        const response = await axios.get(`${API_URL}/all`);
        
        // Mapeamos un poco los datos para asegurar que el buscador del frontend
        // tenga los campos "nombreArea" claros, en caso de que el DTO no los traiga directos.
        // Si tu InventarioDetalleDto ya trae "nombreArea", esto es redundante pero seguro.
        return response.data.map(item => ({
            ...item,
            // Aseguramos compatibilidad con el buscador
            nombreArea: item.areaNombre || item.nombreArea || 'Sin Área' 
        }));
    } catch (error) {
        console.error("Error al obtener el inventario completo:", error);
        throw error;
    }
};