import api from './api';

// 1. Registrar un INGRESO MASIVO (Formato Factura)
export const registrarIngreso = async (ingresoData) => {
    try {
        const response = await api.post('/api/ingresos', ingresoData);
        return response.data;
    } catch (error) {
        console.error("Error en servicio de ingreso:", error);
        throw error.response?.data || "Error desconocido al registrar el ingreso";
    }
};

// 2. Obtener el historial completo
export const getHistorialIngresos = async () => {
    try {
        const response = await api.get('/api/ingresos/historial'); 
        return response.data;
    } catch (error) {
        console.error("Error al obtener historial:", error);
        throw error.response?.data || "Error al cargar historial";
    }
};

// 3. Actualizar un registro del historial (ESTA ES LA QUE FALTA)
export const actualizarIngresoItem = async (id, data) => {
    try {
        const response = await api.put(`/api/ingresos/${id}`, data);
        return response.data;
    } catch (error) {
        console.error("Error al actualizar ingreso:", error);
        throw error.response?.data || "Error al actualizar el registro";
    }
};