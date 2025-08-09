import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPlus, faSave } from '@fortawesome/free-solid-svg-icons';
import CamadaApiService from '../services/CamadaApiService';
import GranjaApiService from '../services/GranjaApiService';
import DispositivoApiService from '../services/DispositivoApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function CreateCamadaModal({ isOpen, onClose, onCamadaCreated }) {
  const { darkMode } = useDarkMode();
  const [formData, setFormData] = useState({
    nombre_camada: '',
    sexaje: '',
    tipo_ave: '',
    tipo_estirpe: '',
    fecha_hora_inicio: '',
    codigo_granja: '',
    id_naves: '',
  });
  const [granjas, setGranjas] = useState([]);
  const [dispositivos, setDispositivos] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        nombre_camada: '',
        sexaje: '',
        tipo_ave: '',
        tipo_estirpe: '',
        fecha_hora_inicio: '',
        codigo_granja: '',
        id_naves: '',
      });
      setSelectedDevices([]);
      setDeviceSearch('');
      setError('');
      GranjaApiService.getGranjas()
        .then(res => setGranjas(Array.isArray(res.data) ? res.data : res))
        .catch(() => setGranjas([]));
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.codigo_granja) {
      DispositivoApiService.getByGranja(formData.codigo_granja)
        .then(res => setDispositivos(Array.isArray(res) ? res : res.data))
        .catch(() => setDispositivos([]));
    } else {
      setDispositivos([]);
      setSelectedDevices([]);
    }
  }, [formData.codigo_granja]);

  if (!isOpen) return null;

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleDevice = id => {
    setSelectedDevices(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const filteredDispositivos = dispositivos.filter(d =>
    (d.numero_serie || '').toLowerCase().includes(deviceSearch.toLowerCase())
  );

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const created = await CamadaApiService.createCamada({
        ...formData,
        fecha_hora_inicio: formData.fecha_hora_inicio
          ? new Date(formData.fecha_hora_inicio).toISOString()
          : null,
        alta: 1,
      });
      const camadaId = created.id_camada;
      await Promise.all(selectedDevices.map(id => CamadaApiService.attachDispositivo(camadaId, id)));
      onCamadaCreated();
      onClose();
    } catch (err) {
      setError('Error al crear camada');
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
            <FontAwesomeIcon icon={faPlus} className="mr-2 text-blue-600" />
            Nueva Camada
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
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input name="nombre_camada" value={formData.nombre_camada} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sexaje</label>
              <input name="sexaje" value={formData.sexaje} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo Ave</label>
              <input name="tipo_ave" value={formData.tipo_ave} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo Estirpe</label>
              <input name="tipo_estirpe" value={formData.tipo_estirpe} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha Inicio</label>
              <input type="datetime-local" name="fecha_hora_inicio" value={formData.fecha_hora_inicio} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Código Granja</label>
              <select name="codigo_granja" value={formData.codigo_granja} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700">
                <option value="">Seleccione...</option>
                {granjas.map(g => (
                  <option key={g.numero_rega || g.codigo_granja} value={g.numero_rega || g.codigo_granja}>
                    {g.nombre_granja || g.numero_rega}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Nave</label>
              <input name="id_naves" value={formData.id_naves} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
            </div>
          </div>
          {formData.codigo_granja && (
            <div>
              <label className="block text-sm font-medium mb-1">Dispositivos</label>
              <input placeholder="Buscar" value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)} className="w-full mb-2 px-3 py-2 border rounded-md bg-white dark:bg-gray-700" />
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                {filteredDispositivos.map(d => (
                  <label key={d.id_dispositivo} className="flex items-center space-x-2">
                    <input type="checkbox" checked={selectedDevices.includes(d.id_dispositivo)} onChange={() => toggleDevice(d.id_dispositivo)} />
                    <span>{d.numero_serie}</span>
                  </label>
                ))}
                {!filteredDispositivos.length && (
                  <p className="text-sm text-gray-500">Sin dispositivos</p>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center">
              <FontAwesomeIcon icon={faSave} className="mr-2" />
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}