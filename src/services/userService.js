import api from './api';

export const getUsers = async () => {
    const response = await api.get('/api/users');
    return response.data;
};

export const createUser = async (user) => {
    const response = await api.post('/api/users', user);
    return response.data;
};

export const updateUser = async (id, user) => {
    const response = await api.put(`/api/users/${id}`, user);
    return response.data;
};

export const deleteUser = async (id) => {
    await api.delete(`/api/users/${id}`);
};


export const verifySecurityPassword = async (password) => {
    const response = await api.post('/api/users/verify-security', { password });
    return response.data; 
};