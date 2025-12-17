import api from './api';

export const getAlertas = async () => {
    try {
        const response = await api.get('/api/alertas');
        return response.data;
    } catch (error) {
        console.error("Error cargando alertas", error);
        return []; // Si falla, devolvemos lista vacía para no romper la pantalla
    }
};