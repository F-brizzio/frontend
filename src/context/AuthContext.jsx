import { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); 

    useEffect(() => {
        // Al recargar, recuperamos la sesión completa
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            // -----------------------------------------------------------
            // 🚨 CAMBIO IMPORTANTE AQUÍ ABAJO 🚨
            // Antes decía: '/auth/login'
            // Ahora debe decir: '/api/auth/login'
            // (Porque la baseURL ya no tiene el /api, así que lo ponemos aquí)
            // -----------------------------------------------------------
            const response = await api.post('/api/auth/login', { username, password });
            
            // 1. Extraemos TODOS los datos
            const { token, fullName, role, accesos } = response.data;
            
            localStorage.setItem('token', token);
            
            // 2. Guardamos el objeto usuario completo
            const userData = { 
                username, 
                fullName, 
                role, 
                accesos: accesos || [] 
            };
            
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            
            return { success: true };
        } catch (error) {
            console.error("Error login:", error);
            return { success: false, message: 'Credenciales incorrectas o error de servidor' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/login'; 
    };

    const canAccess = (moduloKey) => {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        return user.accesos?.includes(moduloKey);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, canAccess }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);