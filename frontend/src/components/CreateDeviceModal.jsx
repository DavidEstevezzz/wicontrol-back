import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faMicrochip,
  faCalendarAlt,
  faSave,
  faBuilding,
  faUser,
  faWarehouse
} from '@fortawesome/free-solid-svg-icons';
import DispositivoApiService from '../services/DispositivoApiService';
import InstalacionApiService from '../services/InstalacionApiService';
import GranjaApiService from '../services/GranjaApiService';
import UsuarioApiService from '../services/UsuarioApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function CreateDeviceModal({ isOpen, onClose, onDeviceCreated }) {
  const { darkMode } = useDarkMode();

  // Estados
  const [instaladores, setInstaladores] = useState([]);
  const [granjas, setGranjas] = useState([]);
  const [naves, setNaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Estado del formulario según las validaciones de los controladores
  const [formData, setFormData] = useState({
    // Para tb_instalacion
    id_usuario: '', // instalador
    numero_rega: '',
    fecha_hora_alta: new Date().toISOString().slice(0, 16),
    alta: 1, // siempre 1 para nuevas instalaciones
    id_nave: '',

    // Para tb_dispositivo (campos requeridos)
    numero_serie: '',
    fw_version: '-1', // valor por defecto según requerimiento
    hw_version: '-1', // valor por defecto según requerimiento

    // Campos opcionales con valores por defecto
    ip_address: null,
    bateria: '100',
    calibrado: false,
    pesoCalibracion: null,
    runCalibracion: false,
    sensoresConfig: 0,
    Lat: '',
    Lon: '',
    count: 1,
    sensorMovimiento: 0,
    sensorCarga: 0,
    sensorLuminosidad: 0,
    sensorHumSuelo: 0,
    sensorTempAmbiente: 0,
    sensorHumAmbiente: 0,
    sensorPresion: 0,
    tiempoEnvio: 30,
    sensorTempYacija: 0,
    errorCalib: 0,
    reset: false,
    sensorCalidadAireCO2: 0,
    sensorCalidadAireTVOC: 0,
    sensorSHT20_temp: 0,
    sensorSHT20_humedad: 0
  });

  // Resetear formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setFormData({
        // Para tb_instalacion
        id_usuario: '',
        numero_rega: '',
        fecha_hora_alta: new Date().toISOString().slice(0, 16),
        alta: 1,
        id_nave: '',

        // Para tb_dispositivo
        numero_serie: '',
        fw_version: '-1',
        hw_version: '-1',
        ip_address: null,
        bateria: '100',
        calibrado: false,
        pesoCalibracion: null,
        runCalibracion: false,
        sensoresConfig: 0,
        Lat: '',
        Lon: '',
        count: 1,
        sensorMovimiento: 0,
        sensorCarga: 0,
        sensorLuminosidad: 0,
        sensorHumSuelo: 0,
        sensorTempAmbiente: 0,
        sensorHumAmbiente: 0,
        sensorPresion: 0,
        tiempoEnvio: 30,
        sensorTempYacija: 0,
        errorCalib: 0,
        reset: false,
        sensorCalidadAireCO2: 0,
        sensorCalidadAireTVOC: 0,
        sensorSHT20_temp: 0,
        sensorSHT20_humedad: 0
      });
      setFormErrors({});
      setError('');
      setNaves([]);
    }
  }, [isOpen]);

  // Cargar instaladores (usuarios con tipo = 'instalador')
  useEffect(() => {
    const fetchInstaladores = async () => {
      try {
        const response = await UsuarioApiService.getUsuarios();
        // Filtrar solo instaladores y que estén activos
        const instaladoresList = response.data.filter(
          user => user.usuario_tipo === 'Instalador' && user.alta === 1
        );
        setInstaladores(instaladoresList);
      } catch (err) {
        console.error('Error fetching instaladores:', err);
        setError('No se pudieron cargar los instaladores. Por favor, inténtelo de nuevo.');
      }
    };

    if (isOpen) {
      fetchInstaladores();
    }
  }, [isOpen]);

  // Cargar granjas (solo las que están dadas de alta)
  useEffect(() => {
    const fetchGranjas = async () => {
      try {
        const response = await GranjaApiService.getGranjas();
        // Filtrar granjas activas y que no sean '-1'
        const granjasList = response.data.filter(
          granja => granja.alta === 1 && granja.numero_rega !== '-1'
        );
        setGranjas(granjasList);
      } catch (err) {
        console.error('Error fetching granjas:', err);
        setError('No se pudieron cargar las granjas. Por favor, inténtelo de nuevo.');
      }
    };

    if (isOpen) {
      fetchGranjas();
    }
  }, [isOpen]);

  // Generar opciones de naves y obtener coordenadas cuando se selecciona una granja
  useEffect(() => {
    const actualizarGranjaInfo = async () => {
      if (formData.numero_rega) {
        const granjaSeleccionada = granjas.find(g => g.numero_rega === formData.numero_rega);

        if (granjaSeleccionada) {
          // Actualizar coordenadas automáticamente
          setFormData(prev => ({
            ...prev,
            Lat: granjaSeleccionada.Lat || '',
            Lon: granjaSeleccionada.Lon || ''
          }));

          // Generar naves disponibles
          const navesDisponibles = [];
          navesDisponibles.push({ value: '', label: 'Elegir opción' });

          // Generar naves según la lógica del código original
          const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
          letras.forEach(letra => {
            navesDisponibles.push({ value: letra, label: letra });
            navesDisponibles.push({ value: `${letra}1`, label: `${letra}1` });
            navesDisponibles.push({ value: `${letra}2`, label: `${letra}2` });
          });

          setNaves(navesDisponibles);
        } else {
          // Si no encontramos la granja en el estado local, intentamos obtenerla de la API
          try {
            const granjaData = await GranjaApiService.getGranja(formData.numero_rega);
            setFormData(prev => ({
              ...prev,
              Lat: granjaData.Lat || '',
              Lon: granjaData.Lon || ''
            }));
          } catch (err) {
            console.error('Error fetching granja coordinates:', err);
          }
        }
      } else {
        // Limpiar coordenadas y naves si no hay granja seleccionada
        setFormData(prev => ({
          ...prev,
          Lat: '',
          Lon: ''
        }));
        setNaves([]);
      }
    };

    actualizarGranjaInfo();
  }, [formData.numero_rega, granjas]);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error de este campo si existe
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validar formulario según las validaciones de los controladores
  const validateForm = () => {
    const errors = {};

    // Validaciones para tb_instalacion
    if (!formData.id_usuario) {
      errors.id_usuario = 'El instalador es obligatorio';
    }

    if (!formData.numero_rega.trim()) {
      errors.numero_rega = 'El código REGA de la granja es obligatorio';
    } else if (formData.numero_rega.length > 50) {
      errors.numero_rega = 'El código REGA no puede tener más de 50 caracteres';
    }

    if (!formData.fecha_hora_alta) {
      errors.fecha_hora_alta = 'La fecha de instalación es obligatoria';
    }

    if (!formData.id_nave.trim()) {
      errors.id_nave = 'La nave es obligatoria';
    } else if (formData.id_nave.length > 20) {
      errors.id_nave = 'El ID de nave no puede tener más de 20 caracteres';
    }

    // Validaciones para tb_dispositivo
    if (!formData.numero_serie.trim()) {
      errors.numero_serie = 'El número de serie es obligatorio';
    } else if (formData.numero_serie.length > 50) {
      errors.numero_serie = 'El número de serie no puede tener más de 50 caracteres';
    }

    if (!formData.fw_version.trim()) {
      errors.fw_version = 'La versión de firmware es obligatoria';
    } else if (formData.fw_version.length > 20) {
      errors.fw_version = 'La versión de firmware no puede tener más de 20 caracteres';
    }

    if (!formData.hw_version.trim()) {
      errors.hw_version = 'La versión de hardware es obligatoria';
    } else if (formData.hw_version.length > 20) {
      errors.hw_version = 'La versión de hardware no puede tener más de 20 caracteres';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enviar formulario siguiendo las validaciones de los controladores
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Paso 1: Crear la instalación
      const instalacionData = {
        id_usuario: parseInt(formData.id_usuario),
        numero_rega: formData.numero_rega,
        fecha_hora_alta: formData.fecha_hora_alta,
        alta: formData.alta,
        id_nave: formData.id_nave
      };

      const instalacionResponse = await InstalacionApiService.createInstalacion(instalacionData);

      // Paso 2: Crear el dispositivo con el ID de la instalación
      const dispositivoData = {
        id_instalacion: instalacionResponse.id,
        numero_serie: formData.numero_serie,
        ip_address: formData.ip_address,
        bateria: formData.bateria,
        fecha_hora_alta: formData.fecha_hora_alta,
        alta: formData.calibrado, // boolean
        calibrado: formData.calibrado, // boolean
        pesoCalibracion: formData.pesoCalibracion,
        runCalibracion: formData.runCalibracion, // boolean
        sensoresConfig: formData.sensoresConfig,
        Lat: formData.Lat,
        Lon: formData.Lon,
        fw_version: formData.fw_version,
        hw_version: formData.hw_version,
        count: formData.count,
        sensorMovimiento: formData.sensorMovimiento,
        sensorCarga: formData.sensorCarga,
        sensorLuminosidad: formData.sensorLuminosidad,
        sensorHumSuelo: formData.sensorHumSuelo,
        sensorTempAmbiente: formData.sensorTempAmbiente,
        sensorHumAmbiente: formData.sensorHumAmbiente,
        sensorPresion: formData.sensorPresion,
        tiempoEnvio: formData.tiempoEnvio,
        sensorTempYacija: formData.sensorTempYacija,
        errorCalib: formData.errorCalib,
        reset: formData.reset, // boolean
        sensorCalidadAireCO2: formData.sensorCalidadAireCO2,
        sensorCalidadAireTVOC: formData.sensorCalidadAireTVOC,
        sensorSHT20_temp: formData.sensorSHT20_temp,
        sensorSHT20_humedad: formData.sensorSHT20_humedad
      };

      const dispositivoResponse = await DispositivoApiService.createDispositivo(dispositivoData);

      setLoading(false);

      // Notificar éxito
      if (onDeviceCreated) {
        onDeviceCreated({
          dispositivo: dispositivoResponse,
          instalacion: instalacionResponse
        });
      }

      onClose();

    } catch (err) {
      console.error('Error creating device:', err);

      // Manejar errores específicos
      if (err.response && err.response.data) {
        if (err.response.data.message && err.response.data.message.includes('mismo código')) {
          setError('Error: Ya existe un dispositivo con el mismo número de serie. Introduzca otro código.');
        } else if (err.response.data.errors) {
          const backendErrors = err.response.data.errors;
          const formattedErrors = {};

          Object.keys(backendErrors).forEach(key => {
            formattedErrors[key] = Array.isArray(backendErrors[key])
              ? backendErrors[key][0]
              : backendErrors[key];
          });

          setFormErrors(formattedErrors);
        } else {
          setError(err.response.data.message || 'Error al crear el dispositivo.');
        }
      } else {
        setError('Error de conexión. Por favor, inténtelo de nuevo.');
      }

      setLoading(false);
    }
  };

  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center">
      {/* Fondo oscurecido */}
      <div
        className="fixed inset-0 bg-black opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto ${darkMode ? 'dark' : ''}`}>
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faMicrochip} className="mr-2 text-blue-600 dark:text-blue-400" />
            Crear Dispositivo
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Mensaje de error general */}
        {error && (
          <div className="mx-6 my-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
            <p>{error}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Número de serie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FontAwesomeIcon icon={faMicrochip} className="mr-2" />
                Número de Serie <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="numero_serie"
                value={formData.numero_serie}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring focus:outline-none ${formErrors.numero_serie
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                  } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                placeholder="Escribir aquí"
                maxLength="50"
              />
              {formErrors.numero_serie && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.numero_serie}</p>
              )}
            </div>

            {/* Instalador */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FontAwesomeIcon icon={faUser} className="mr-2" />
                Instalador <span className="text-red-600">*</span>
              </label>
              <select
                name="id_usuario"
                value={formData.id_usuario}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring focus:outline-none ${formErrors.id_usuario
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                  } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
              >
                <option value="">Seleccione un usuario</option>
                {instaladores.map(instalador => (
                  <option key={instalador.id} value={instalador.id}>
                    {`${instalador.nombre} ${instalador.apellidos}, Alias -> ${instalador.alias_usuario}`}
                  </option>
                ))}
              </select>
              {formErrors.id_usuario && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.id_usuario}</p>
              )}
            </div>

            {/* Fecha de instalación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                Fecha instalación <span className="text-red-600">*</span>
              </label>
              <input
                type="datetime-local"
                name="fecha_hora_alta"
                value={formData.fecha_hora_alta}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring focus:outline-none ${formErrors.fecha_hora_alta
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                  } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
              />
              {formErrors.fecha_hora_alta && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.fecha_hora_alta}</p>
              )}
            </div>

            {/* Código REGA de la granja */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FontAwesomeIcon icon={faBuilding} className="mr-2" />
                Código REGA de la granja <span className="text-red-600">*</span>
              </label>
              <select
                name="numero_rega"
                value={formData.numero_rega}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring focus:outline-none ${formErrors.numero_rega
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                  } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
              >
                <option value="">Seleccione un código</option>
                {granjas.map(granja => (
                  <option key={granja.id || granja.numero_rega} value={granja.numero_rega}>
                    {granja.numero_rega}
                  </option>
                ))}
              </select>
              {formErrors.numero_rega && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.numero_rega}</p>
              )}
            </div>

            {/* Nave */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FontAwesomeIcon icon={faWarehouse} className="mr-2" />
                Nave <span className="text-red-600">*</span>
              </label>
              <select
                name="id_nave"
                value={formData.id_nave}
                onChange={handleChange}
                disabled={!formData.numero_rega}
                className={`w-full px-3 py-2 border rounded-md focus:ring focus:outline-none ${formErrors.id_nave
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                  } bg-white dark:bg-gray-700 text-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed`}
              >
                <option value="">Elegir opción</option>
                {naves.map(nave => (
                  <option key={nave.value} value={nave.value}>
                    {nave.label}
                  </option>
                ))}
              </select>
              {formErrors.id_nave && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.id_nave}</p>
              )}
              {!formData.numero_rega && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Seleccione primero una granja para habilitar las naves
                </p>
              )}
            </div>

            {/* Información adicional del dispositivo */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Información del Dispositivo (valores por defecto)
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div>• Versión HW: {formData.hw_version}</div>
                <div>• Versión FW: {formData.fw_version}</div>
                <div>• IP Address: {formData.ip_address || 'No asignada'}</div>
                <div>• Batería: {formData.bateria}%</div>
                <div>• Tiempo envío: {formData.tiempoEnvio}s</div>
                <div>• Sensores: Desactivados</div>
              </div>

              {/* Coordenadas obtenidas de la granja */}
              {(formData.Lat || formData.Lon) && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Coordenadas (de la granja seleccionada):</span>
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <div>• Latitud: {formData.Lat || 'No disponible'}</div>
                    <div>• Longitud: {formData.Lon || 'No disponible'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cerrar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}