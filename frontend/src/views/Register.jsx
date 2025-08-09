// src/views/Register.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStateContext } from '../contexts/ContextProvider';
import UsuarioApiService from '../services/UsuarioApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function Register() {
    const navigate = useNavigate();
    const { user } = useStateContext();
    const { darkMode } = useDarkMode();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        alias_usuario: '',
        contrasena: '',
        nombre: '',
        apellidos: '',
        direccion: '',
        localidad: '',
        provincia: '',
        codigo_postal: '',
        telefono: '',
        email: '',
        fecha_hora_alta: new Date().toISOString().slice(0, 10),
        empresa_id: user?.empresa_id || 1,
        alta: true,
        pais: 'España',
        usuario_tipo: 'User',
        dni: ''
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await UsuarioApiService.createUsuario(formData);
            navigate('/users');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Error al crear el usuario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h1 className="text-2xl font-bold mb-6">Crear Nuevo Usuario</h1>
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Alias de Usuario</label>
                        <input
                            type="text"
                            name="alias_usuario"
                            value={formData.alias_usuario}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Contraseña</label>
                        <input
                            type="password"
                            name="contrasena"
                            value={formData.contrasena}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Nombre</label>
                        <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Apellidos</label>
                        <input
                            type="text"
                            name="apellidos"
                            value={formData.apellidos}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">DNI</label>
                        <input
                            type="text"
                            name="dni"
                            value={formData.dni}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Teléfono</label>
                        <input
                            type="text"
                            name="telefono"
                            value={formData.telefono}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Dirección</label>
                        <input
                            type="text"
                            name="direccion"
                            value={formData.direccion}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Localidad</label>
                        <input
                            type="text"
                            name="localidad"
                            value={formData.localidad}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Provincia</label>
                        <input
                            type="text"
                            name="provincia"
                            value={formData.provincia}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Código Postal</label>
                        <input
                            type="text"
                            name="codigo_postal"
                            value={formData.codigo_postal}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">País</label>
                        <input
                            type="text"
                            name="pais"
                            value={formData.pais}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Tipo de Usuario</label>
                        <select
                            name="usuario_tipo"
                            value={formData.usuario_tipo}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            required
                        >
                            <option value="User">Usuario</option>
                            <option value="Admin">Administrador</option>
                            <option value="SuperMaster">SuperMaster</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name="alta"
                            checked={formData.alta}
                            onChange={handleChange}
                            className="mr-2"
                        />
                        <span className="text-sm">Usuario Activo</span>
                    </label>
                </div>
                
                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => navigate('/users')}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`px-4 py-2 rounded text-white ${
                            loading 
                                ? 'bg-blue-400 cursor-not-allowed' 
                                : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                    >
                        {loading ? 'Creando...' : 'Crear Usuario'}
                    </button>
                </div>
            </form>
        </div>
    );
}