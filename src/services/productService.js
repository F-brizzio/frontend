import api from './api';

// 1. Obtener todos los productos
export const getProducts = async () => {
    const response = await api.get('/api/products');
    return response.data;
};

// 2. Crear un producto nuevo
export const createProduct = async (product) => {
    const response = await api.post('/api/products', product);
    return response.data;
};

// 3. Editar producto existente (ESTA ES LA QUE TE FALTA O ESTÁ FALLANDO)
export const updateProduct = async (id, product) => {
    const response = await api.put(`/api/products/${id}`, product);
    return response.data;
};

// 4. Eliminar producto (ESTA ES LA QUE TE FALTA)
export const deleteProduct = async (id) => {
    await api.delete(`/api/products/${id}`);
};