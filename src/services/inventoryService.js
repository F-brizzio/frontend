// src/services/inventoryService.js
import api from './api'; // <--- Importamos tu configuración de Axios (la que tiene la URL de la nube)

export const getInventarioCompleto = async () => {
    try {
        // YA NO USAMOS localhost NI fetch.
        // Usamos api.get. Axios ya sabe que la base es https://gestion.centroelagora.cl
        // Solo ponemos la parte final de la ruta.
        
        // Ajusta '/inventory/completo' según tu Controller en Java 
        // (Si en Java es @RequestMapping("/api/inventory"), entonces aquí pon '/inventory/completo')
        const response = await api.get('/inventory/completo'); 
        
        // Con axios, los datos vienen directo en response.data
        return response.data; 
    } catch (error) {
        console.error("Error en getInventarioCompleto:", error);
        throw error;
    }
};