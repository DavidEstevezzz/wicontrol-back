import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faUser, faWarehouse } from '@fortawesome/free-solid-svg-icons';
import GranjaApiService from '../services/GranjaApiService';
import EmpresaApiService from '../services/EmpresaApiService';
import UsuarioApiService from '../services/UsuarioApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function CreateGranjaModal({ isOpen, onClose, onGranjaCreated }) {
  const { darkMode } = useDarkMode();
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    direccion: '',
    email: '',
    telefono: '',
    pais: '',
    provincia: '',
    localidad: '',
    codigo_postal: '',
    empresa_id: '',
    numero_rega: '',
    numero_naves: 1,
    lat: '0',
    lon: '0',
    usuario_contacto: '',
    ganadero: '',
    responsable: ''
  });
  const [empresas, setEmpresas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [ganaderoSearch, setGanaderoSearch] = useState('');
  const [responsableSearch, setResponsableSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        codigo: '',
        nombre: '',
        direccion: '',
        email: '',
        telefono: '',
        pais: '',
        provincia: '',
        localidad: '',
        codigo_postal: '',
        empresa_id: '',
        numero_rega: '',
        numero_naves: 1,
        lat: '0',
        lon: '0',
        usuario_contacto: '',
        ganadero: '',
        responsable: ''
      });
      setContactSearch('');
      setGanaderoSearch('');
      setResponsableSearch('');
      setError('');
      EmpresaApiService.getEmpresas().then(res => setEmpresas(Array.isArray(res) ? res : res.data || [])).catch(() => setEmpresas([]));
      UsuarioApiService.getUsuarios().then(res => setUsuarios(res.data || [])).catch(() => setUsuarios([]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const filteredUsuarios = (search) => {
    const term = search.toLowerCase();
    return usuarios.filter(u =>
      (u.nombre && u.nombre.toLowerCase().includes(term)) ||
      (u.apellidos && u.apellidos.toLowerCase().includes(term)) ||
      (u.alias_usuario && u.alias_usuario.toLowerCase().includes(term))
    );
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await GranjaApiService.createGranja({
        ...formData,
        codigo_postal: parseInt(formData.codigo_postal, 10),
        numero_naves: parseInt(formData.numero_naves, 10) || 1,
        fecha_hora_alta: new Date().toISOString(),
        alta: 1
      });
      onGranjaCreated();
      onClose();
    } catch (err) {
      setError('Error al crear granja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose} />
      <div className={`${darkMode ? 'dark ' : ''}relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-3xl mx-4`}>
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faWarehouse} className="mr-2 text-blue-600" />
            Nueva Granja
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
              <label className="block text-sm font-medium mb-1">Código</label>
              <input name="codigo" value={formData.codigo} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dirección</label>
              <input name="direccion" value={formData.direccion} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input name="telefono" value={formData.telefono} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
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
            <div>
              <label className="block text-sm font-medium mb-1">Empresa</label>
              <select name="empresa_id" value={formData.empresa_id} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700">
                <option value="">-- Seleccione --</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre_empresa}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Número REGA</label>
              <input name="numero_rega" value={formData.numero_rega} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Número de Naves</label>
              <input type="number" name="numero_naves" value={formData.numero_naves} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Latitud</label>
              <input name="lat" value={formData.lat} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Longitud</label>
              <input name="lon" value={formData.lon} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center"><FontAwesomeIcon icon={faUser} className="mr-2" />Usuario contacto</label>
              <input type="text" value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Buscar" className="w-full px-3 py-2 mb-2 border rounded-md bg-white dark:bg-gray-700" />
              <select name="usuario_contacto" value={formData.usuario_contacto} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700">
                <option value="">-- Seleccione --</option>
                {filteredUsuarios(contactSearch).map(u => (
                  <option key={u.id} value={u.id}>{u.alias_usuario || `${u.nombre} ${u.apellidos}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center"><FontAwesomeIcon icon={faUser} className="mr-2" />Ganadero</label>
              <input type="text" value={ganaderoSearch} onChange={e => setGanaderoSearch(e.target.value)} placeholder="Buscar" className="w-full px-3 py-2 mb-2 border rounded-md bg-white dark:bg-gray-700" />
              <select name="ganadero" value={formData.ganadero} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700">
                <option value="">-- Seleccione --</option>
                {filteredUsuarios(ganaderoSearch).map(u => (
                  <option key={u.id} value={u.id}>{u.alias_usuario || `${u.nombre} ${u.apellidos}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center"><FontAwesomeIcon icon={faUser} className="mr-2" />Responsable</label>
              <input type="text" value={responsableSearch} onChange={e => setResponsableSearch(e.target.value)} placeholder="Buscar" className="w-full px-3 py-2 mb-2 border rounded-md bg-white dark:bg-gray-700" />
              <select name="responsable" value={formData.responsable} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700">
                <option value="">-- Seleccione --</option>
                {filteredUsuarios(responsableSearch).map(u => (
                  <option key={u.id} value={u.id}>{u.alias_usuario || `${u.nombre} ${u.apellidos}`}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center">
              {loading && <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
              <FontAwesomeIcon icon={faSave} className="mr-2" />Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}