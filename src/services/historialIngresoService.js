import api from './api';

// 1. Obtener todo el historial (El Frontend se encarga de agrupar por facturas)
// Nota: Renombré la función para que coincida con lo que importamos en la página.
export const getHistorialIngresos = async () => {
    // Asegúrate que esta ruta devuelva la lista plana de items ingresados
    const response = await api.get('/api/historial/ingresos');
    return response.data;
};

// 2. Actualizar un ítem específico (Edición de cantidad o precio desde el Modal)
// Esta es la función que te faltaba para que funcione el botón "Guardar"
export const actualizarIngresoItem = async (id, datosActualizados) => {
    // Se asume que el backend recibe un PUT en /api/historial/ingresos/{id}
    const response = await api.put(`/api/historial/ingresos/${id}`, datosActualizados);
    return response.data;
};

// (Opcional) Si tu backend prefiere cargar el detalle bajo demanda, puedes dejar esta,
// pero con la lógica actual del Frontend (agrupación local), no la estamos usando.
export const getDetalleIngreso = async (numeroDocumento) => {
    const response = await api.get(`/api/historial/ingresos/${numeroDocumento}`);
    return response.data;
};