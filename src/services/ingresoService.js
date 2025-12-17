import api from './api';

// Coincide con @GetMapping("/historial") dentro de @RequestMapping("/api/ingresos")
export const getHistorialIngresos = async () => {
    const response = await api.get('/api/ingresos/historial');
    return response.data;
};

// Coincide con @PutMapping("/{id}") dentro de @RequestMapping("/api/ingresos")
export const actualizarIngresoItem = async (id, datosActualizados) => {
    const response = await api.put(`/api/ingresos/${id}`, datosActualizados);
    return response.data;
};

// Esta función se usa para el registro inicial (POST)
export const registrarIngreso = async (payload) => {
    const response = await api.post('/api/ingresos', payload);
    return response.data;
};