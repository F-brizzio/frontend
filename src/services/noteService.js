import api from './api';

export const getNotes = async () => {
    const response = await api.get('/api/notes');
    return response.data;
};

export const createNote = async (note) => {
    const response = await api.post('/api/notes', note);
    return response.data;
};

export const updateNote = async (id, note) => {
    const response = await api.put(`/api/notes/${id}`, note);
    return response.data;
};

export const deleteNote = async (id) => {
    await api.delete(`/api/notes/${id}`);
};