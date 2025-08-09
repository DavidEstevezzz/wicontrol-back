import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEdit, faSave, faUser } from '@fortawesome/free-solid-svg-icons';
import EmpresaApiService from '../services/EmpresaApiService';
import UsuarioApiService from '../services/UsuarioApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function EditEmpresaModal({ isOpen, onClose, onEmpresaUpdated, empresa }) {
  const { darkMode } = useDarkMode();
  const [formData, setFormData] = useState({
    cif: '',
    nombre_empresa: '',
    direccion: '',
    email: '',
    telefono: '',
    pagina_web: '',
    pais: '',
    provincia: '',
    localidad: '',
    codigo_postal: '',
    usuario_contacto: '',
    fecha_hora_alta: '',
    alta: 1,
  });
  const [usuarios, setUsuarios] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && empresa) {
      setFormData({
        cif: empresa.cif || '',
        nombre_empresa: empresa.nombre_empresa || '',
        direccion: empresa.direccion || '',
        email: empresa.email || '',
        telefono: empresa.telefono || '',
        pagina_web: empresa.pagina_web || '',
        pais: empresa.pais || '',
        provincia: empresa.provincia || '',
        localidad: empresa.localidad || '',
        codigo_postal: empresa.codigo_postal || '',
        usuario_contacto: empresa.usuario_contacto || '',
        fecha_hora_alta: empresa.fecha_hora_alta || new Date().toISOString(),
        alta: empresa.alta ?? 1,
      });
      setUserSearch('');
      setError('');
      UsuarioApiService.getUsuarios()
        .then(res => setUsuarios(res.data))
        .catch(() => setUsuarios([]));
    }
  }, [isOpen, empresa]);

  if (!isOpen || !empresa) return null;

  const filteredUsuarios = usuarios.filter(u => {
    const term = userSearch.toLowerCase();
    return (
      (u.nombre && u.nombre.toLowerCase().includes(term)) ||
      (u.apellidos && u.apellidos.toLowerCase().includes(term)) ||
      (u.alias_usuario && u.alias_usuario.toLowerCase().includes(term))
    );
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await EmpresaApiService.updateEmpresa(empresa.id, {
        ...formData,
        codigo_postal: parseInt(formData.codigo_postal, 10),
      });
      onEmpresaUpdated();
      onClose();
    } catch (err) {
      setError('Error al actualizar empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose} />
      <div className={`${darkMode ? 'dark ' : ''}relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-2xl mx-4`}>
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faEdit} className="mr-2 text-blue-600" />
            Editar Empresa
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">CIF</label>
              <input name="cif" value={formData.cif} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input name="nombre_empresa" value={formData.nombre_empresa} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dirección</label>
              <input name="direccion" value={formData.direccion} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input name="email" value={formData.email} onChange={handleChange} type="email" className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input name="telefono" value={formData.telefono} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Página web</label>
              <input name="pagina_web" value={formData.pagina_web} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">País</label>
              <input name="pais" value={formData.pais} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Provincia</label>
              <input name="provincia" value={formData.provincia} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Localidad</label>
              <input name="localidad" value={formData.localidad} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Código Postal</label>
              <input name="codigo_postal" value={formData.codigo_postal} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center">
              <FontAwesomeIcon icon={faUser} className="mr-2" /> Usuario de contacto
            </label>
            <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Buscar usuario..." className="w-full px-3 py-2 mb-2 border rounded-md bg-white dark:bg-gray-700" />
            <select name="usuario_contacto" value={formData.usuario_contacto} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700">
              <option value="">-- Seleccione --</option>
              {filteredUsuarios.map(u => (
                <option key={u.id} value={u.id}>{u.alias_usuario || `${u.nombre} ${u.apellidos}`}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center">
              {loading && <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
              <FontAwesomeIcon icon={faSave} className="mr-2" /> Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}