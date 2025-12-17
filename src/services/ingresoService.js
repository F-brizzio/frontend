import api from './api';

// Registrar un INGRESO MASIVO (Formato Factura)
export const registrarIngreso = async (ingresoData) => {
    try {
        // Ahora 'ingresoData' contiene la estructura completa del DTO:
        // { fecha, numeroDocumento, supplierRut, supplierName, items: [...] }
        const response = await api.post('/api/ingresos', ingresoData);
        return response.data;
    } catch (error) {
        // Capturamos errores de negocio (ej: "El documento ya existe para otro proveedor")
        console.error("Error en servicio de ingreso:", error);
        
        // Si el backend devuelve un mensaje de texto plano o un JSON con error
        throw error.response?.data || "Error desconocido al registrar el ingreso";
    }
};

// Obtener el historial completo
export const getHistorialIngresos = async () => {
    try {
        const response = await api.get('/api/ingresos/historial'); 
        return response.data;
    } catch (error) {
        console.error("Error al obtener historial:", error);
        throw error.response?.data || "Error al cargar historial";
    }
};