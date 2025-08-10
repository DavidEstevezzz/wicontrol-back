import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEdit, faSave, faInfoCircle, faLink, faUnlink, faSearch } from '@fortawesome/free-solid-svg-icons';
import CamadaApiService from '../services/CamadaApiService';
import GranjaApiService from '../services/GranjaApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function EditCamadaModal({ isOpen, camada, onClose, onCamadaUpdated }) {
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
  const [dispositivosDisponibles, setDispositivosDisponibles] = useState([]);
  const [dispositivosVinculados, setDispositivosVinculados] = useState([]);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [processingDevice, setProcessingDevice] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cargar datos iniciales cuando se abre el modal
  useEffect(() => {
    if (isOpen && camada) {
      console.log('🔄 Cargando datos de camada:', camada);
      
      setFormData({
        nombre_camada: camada.nombre_camada || '',
        sexaje: camada.sexaje || '',
        tipo_ave: camada.tipo_ave || '',
        tipo_estirpe: camada.tipo_estirpe || '',
        fecha_hora_inicio: camada.fecha_hora_inicio ? camada.fecha_hora_inicio.slice(0,16) : '',
        codigo_granja: camada.codigo_granja || '',
        id_naves: camada.id_naves || '',
      });
      
      setDeviceSearch('');
      setError('');
      setSuccess('');
      
      loadGranjas();
      loadDispositivosVinculados();
    }
  }, [isOpen, camada]);

  // Cargar dispositivos disponibles cuando cambia la granja
  useEffect(() => {
    if (formData.codigo_granja) {
      loadDispositivosDisponibles(formData.codigo_granja);
    } else {
      setDispositivosDisponibles([]);
    }
  }, [formData.codigo_granja]);

  const loadGranjas = async () => {
    try {
      const res = await GranjaApiService.getGranjas();
      const granjasData = Array.isArray(res) ? res : (res.data && Array.isArray(res.data) ? res.data : []);
      console.log('✅ Granjas cargadas:', granjasData.length);
      setGranjas(granjasData);
    } catch (err) {
      console.error('❌ Error cargando granjas:', err);
      setGranjas([]);
    }
  };

  const loadDispositivosVinculados = async () => {
    if (!camada) return;
    
    try {
      console.log('🔍 Cargando dispositivos vinculados de camada:', camada.id_camada);
      const dispositivos = await CamadaApiService.getDispositivosVinculadosByCamada(camada.id_camada);
      console.log('✅ Dispositivos vinculados:', dispositivos);
      setDispositivosVinculados(dispositivos);
    } catch (err) {
      console.error('❌ Error cargando dispositivos vinculados:', err);
      setDispositivosVinculados([]);
    }
  };

  const loadDispositivosDisponibles = async (codigoGranja) => {
    setLoadingDevices(true);
    try {
      console.log('🔍 Cargando dispositivos disponibles de granja:', codigoGranja);
      const dispositivos = await CamadaApiService.getDispositivosDisponiblesByGranja(codigoGranja);
      console.log('✅ Dispositivos disponibles:', dispositivos);
      setDispositivosDisponibles(dispositivos);
    } catch (err) {
      console.error('❌ Error cargando dispositivos disponibles:', err);
      setDispositivosDisponibles([]);
      setError(`Error al cargar dispositivos: ${err.message}`);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleVincularDispositivo = async (dispositivoId) => {
    if (!camada) return;
    
    setProcessingDevice(dispositivoId);
    try {
      console.log('🔗 Vinculando dispositivo:', dispositivoId);
      await CamadaApiService.attachDispositivo(camada.id_camada, dispositivoId);
      
      // Recargar listas
      await loadDispositivosVinculados();
      await loadDispositivosDisponibles(formData.codigo_granja);
      
      setSuccess('Dispositivo vinculado exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('❌ Error vinculando dispositivo:', err);
      setError(`Error al vincular dispositivo: ${err.response?.data?.message || err.message}`);
    } finally {
      setProcessingDevice(null);
    }
  };

  const handleDesvincularDispositivo = async (dispositivoId) => {
    if (!camada) return;
    
    setProcessingDevice(dispositivoId);
    try {
      console.log('🔓 Desvinculando dispositivo:', dispositivoId);
      await CamadaApiService.detachDispositivo(camada.id_camada, dispositivoId);
      
      // Recargar listas
      await loadDispositivosVinculados();
      await loadDispositivosDisponibles(formData.codigo_granja);
      
      setSuccess('Dispositivo desvinculado exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('❌ Error desvinculando dispositivo:', err);
      setError(`Error al desvincular dispositivo: ${err.response?.data?.message || err.message}`);
    } finally {
      setProcessingDevice(null);
    }
  };

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Filtrar dispositivos disponibles con búsqueda
  const filteredDispositivosDisponibles = Array.isArray(dispositivosDisponibles) 
    ? dispositivosDisponibles.filter(d => 
        d && d.numero_serie && d.numero_serie.toLowerCase().includes(deviceSearch.toLowerCase())
      )
    : [];

  // Filtrar dispositivos vinculados con búsqueda
  const filteredDispositivosVinculados = Array.isArray(dispositivosVinculados) 
    ? dispositivosVinculados.filter(d => 
        d && d.numero_serie && d.numero_serie.toLowerCase().includes(deviceSearch.toLowerCase())
      )
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!camada) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('💾 Guardando cambios en camada:', camada.id_camada);
      
      await CamadaApiService.updateCamada(camada.id_camada, {
        ...formData,
        fecha_hora_inicio: formData.fecha_hora_inicio
          ? new Date(formData.fecha_hora_inicio).toISOString()
          : null,
      });

      console.log('✅ Camada actualizada exitosamente');
      onCamadaUpdated();
      onClose();
      
    } catch (err) {
      console.error('❌ Error al actualizar camada:', err);
      setError(`Error al actualizar la camada: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose} />
      <div className={`${darkMode ? 'dark ' : ''}relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-6xl mx-4 max-h-[95vh] overflow-y-auto`}>
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faEdit} className="mr-2 text-blue-600" />
            Editar Camada: {formData.nombre_camada}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 dark:bg-green-900 dark:text-green-200 dark:border-green-700">
              <p>{success}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna Izquierda: Datos de la Camada */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                Datos de la Camada
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre de Camada *
                  </label>
                  <input 
                    name="nombre_camada" 
                    value={formData.nombre_camada} 
                    onChange={handleChange} 
                    required 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring focus:ring-blue-200 dark:focus:ring-blue-800" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sexaje *
                  </label>
                  <select
                    name="sexaje" 
                    value={formData.sexaje} 
                    onChange={handleChange} 
                    required 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring focus:ring-blue-200 dark:focus:ring-blue-800"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Mixto">Mixto</option>
                    <option value="Hembras">Hembras</option>
                    <option value="Machos">Machos</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Ave *
                  </label>
                  <input 
                    name="tipo_ave" 
                    value={formData.tipo_ave} 
                    onChange={handleChange} 
                    required 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring focus:ring-blue-200 dark:focus:ring-blue-800" 
                    placeholder="Ej: Broiler, Pavo, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Estirpe *
                  </label>
                  <input 
                    name="tipo_estirpe" 
                    value={formData.tipo_estirpe} 
                    onChange={handleChange} 
                    required 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring focus:ring-blue-200 dark:focus:ring-blue-800" 
                    placeholder="Ej: Ross 308, Cobb 500, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha de Inicio
                  </label>
                  <input 
                    type="datetime-local" 
                    name="fecha_hora_inicio" 
                    value={formData.fecha_hora_inicio} 
                    onChange={handleChange} 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring focus:ring-blue-200 dark:focus:ring-blue-800" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Granja *
                  </label>
                  <select 
                    name="codigo_granja" 
                    value={formData.codigo_granja} 
                    onChange={handleChange} 
                    required 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring focus:ring-blue-200 dark:focus:ring-blue-800"
                  >
                    <option value="">Seleccione una granja...</option>
                    {granjas.map(granja => (
                      <option 
                        key={granja.numero_rega || granja.codigo_granja || granja.id} 
                        value={granja.numero_rega || granja.codigo_granja}
                      >
                        {granja.nombre_granja || granja.numero_rega || granja.codigo_granja}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nave
                  </label>
                  <input 
                    name="id_naves" 
                    value={formData.id_naves} 
                    onChange={handleChange} 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring focus:ring-blue-200 dark:focus:ring-blue-800" 
                    placeholder="Ej: Nave 1, Nave A, etc."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>

            {/* Columna Derecha: Gestión de Dispositivos */}
            {formData.codigo_granja && (
              <div className="space-y-4">
                <div className="flex items-center mb-3">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Gestión de Dispositivos
                  </h3>
                </div>
                
                {/* Estadísticas */}
                <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-300">Disponibles:</span>
                      <span className="ml-1 text-blue-600 dark:text-blue-200">
                        {loadingDevices ? '...' : filteredDispositivosDisponibles.length}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-300">Vinculados:</span>
                      <span className="ml-1 text-blue-600 dark:text-blue-200">
                        {filteredDispositivosVinculados.length}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Búsqueda */}
                <div className="relative">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Buscar dispositivo por número de serie..." 
                    value={deviceSearch} 
                    onChange={(e) => setDeviceSearch(e.target.value)} 
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring focus:ring-blue-200 dark:focus:ring-blue-800" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dispositivos Vinculados */}
                  <div>
                    <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <FontAwesomeIcon icon={faLink} className="mr-2 text-green-600" />
                      Dispositivos Vinculados
                    </h4>
                    <div className="border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 max-h-60 overflow-y-auto">
                      {filteredDispositivosVinculados.length > 0 ? (
                        <div className="p-2 space-y-1">
                          {filteredDispositivosVinculados.map(dispositivo => (
                            <div 
                              key={dispositivo.id_dispositivo} 
                              className="flex items-center justify-between p-2 bg-white dark:bg-gray-600 rounded border hover:bg-gray-100 dark:hover:bg-gray-500"
                            >
                              <div className="flex-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                                  {dispositivo.numero_serie || `Dispositivo ${dispositivo.id_dispositivo}`}
                                </span>
                                {dispositivo.ip_address && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {dispositivo.ip_address}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDesvincularDispositivo(dispositivo.id_dispositivo)}
                                disabled={processingDevice === dispositivo.id_dispositivo}
                                className="ml-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                                title="Desvincular dispositivo"
                              >
                                {processingDevice === dispositivo.id_dispositivo ? (
                                  <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                                ) : (
                                  <FontAwesomeIcon icon={faUnlink} />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                          No hay dispositivos vinculados
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dispositivos Disponibles */}
                  <div>
                    <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <FontAwesomeIcon icon={faUnlink} className="mr-2 text-gray-600" />
                      Dispositivos Disponibles
                    </h4>
                    <div className="border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 max-h-60 overflow-y-auto">
                      {loadingDevices ? (
                        <div className="p-4 text-center text-gray-500">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                          Cargando...
                        </div>
                      ) : filteredDispositivosDisponibles.length > 0 ? (
                        <div className="p-2 space-y-1">
                          {filteredDispositivosDisponibles.map(dispositivo => (
                            <div 
                              key={dispositivo.id_dispositivo} 
                              className="flex items-center justify-between p-2 bg-white dark:bg-gray-600 rounded border hover:bg-gray-100 dark:hover:bg-gray-500"
                            >
                              <div className="flex-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                                  {dispositivo.numero_serie || `Dispositivo ${dispositivo.id_dispositivo}`}
                                </span>
                                {dispositivo.ip_address && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {dispositivo.ip_address}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleVincularDispositivo(dispositivo.id_dispositivo)}
                                disabled={processingDevice === dispositivo.id_dispositivo}
                                className="ml-2 text-green-600 hover:text-green-800 disabled:opacity-50"
                                title="Vincular dispositivo"
                              >
                                {processingDevice === dispositivo.id_dispositivo ? (
                                  <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                                ) : (
                                  <FontAwesomeIcon icon={faLink} />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                          {dispositivosDisponibles.length === 0 
                            ? "No hay dispositivos disponibles en esta granja" 
                            : "No se encontraron dispositivos que coincidan con la búsqueda"
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}