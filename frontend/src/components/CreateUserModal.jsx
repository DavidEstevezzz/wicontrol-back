import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faUser,
  faBuilding,
  faIdCard,
  faLock,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faCalendarAlt,
  faChevronRight,
  faChevronLeft,
  faSave,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import UsuarioApiService from '../services/UsuarioApiService';
import EmpresaApiService from '../services/EmpresaApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function CreateUserModal({ isOpen, onClose, onUserCreated }) {
  const { darkMode } = useDarkMode();

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
    empresas: [],
    alta: true,
    pais: 'España',
    usuario_tipo: 'User',
    dni: '',
    foto: ''
  });

  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [step, setStep] = useState(1); // Para formulario por pasos

  // Cargar empresas
  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const data = await EmpresaApiService.getEmpresas();
        setEmpresas(data);
      } catch (err) {
        console.error('Error fetching empresas:', err);
        setError('No se pudieron cargar las empresas. Por favor, inténtelo de nuevo.');
      }
    };

    if (isOpen) {
      fetchEmpresas();
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Para campos tipo checkbox usar el valor checked
    const finalValue = type === 'checkbox' ? checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));

    // Limpiar error de este campo si existe
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    // Validaciones básicas según los campos requeridos en el backend
    if (!formData.alias_usuario) errors.alias_usuario = 'El nombre de usuario es obligatorio';
    if (!formData.contrasena) errors.contrasena = 'La contraseña es obligatoria';
    else if (formData.contrasena.length < 6) errors.contrasena = 'La contraseña debe tener al menos 6 caracteres';

    if (!formData.nombre) errors.nombre = 'El nombre es obligatorio';
    if (!formData.apellidos) errors.apellidos = 'Los apellidos son obligatorios';
    if (!formData.email) errors.email = 'El correo electrónico es obligatorio';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'El formato de correo electrónico no es válido';

    if (!formData.dni) errors.dni = 'El DNI/NIF es obligatorio';
    if (!formData.empresas || formData.empresas.length === 0) errors.empresas = 'Debe seleccionar al menos una empresa';
    if (!formData.telefono) errors.telefono = 'El teléfono es obligatorio';

    if (!formData.localidad) errors.localidad = 'La localidad es obligatoria';
    if (!formData.provincia) errors.provincia = 'La provincia es obligatoria';
    if (!formData.direccion) errors.direccion = 'La dirección es obligatoria';
    if (!formData.codigo_postal) errors.codigo_postal = 'El código postal es obligatorio';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep = (currentStep) => {
    const errors = {};

    if (currentStep === 1) {
      if (!formData.alias_usuario) errors.alias_usuario = 'El nombre de usuario es obligatorio';
      if (!formData.contrasena) errors.contrasena = 'La contraseña es obligatoria';
      else if (formData.contrasena.length < 6) errors.contrasena = 'La contraseña debe tener al menos 6 caracteres';
      if (!formData.nombre) errors.nombre = 'El nombre es obligatorio';
      if (!formData.apellidos) errors.apellidos = 'Los apellidos son obligatorios';
      if (!formData.dni) errors.dni = 'El DNI/NIF es obligatorio';
    } else if (currentStep === 2) {
      if (!formData.email) errors.email = 'El correo electrónico es obligatorio';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'El formato de correo electrónico no es válido';
      if (!formData.telefono) errors.telefono = 'El teléfono es obligatorio';
      if (!formData.direccion) errors.direccion = 'La dirección es obligatoria';
      if (!formData.localidad) errors.localidad = 'La localidad es obligatoria';
      if (!formData.provincia) errors.provincia = 'La provincia es obligatoria';
      if (!formData.codigo_postal) errors.codigo_postal = 'El código postal es obligatorio';
    } else if (currentStep === 3) {
      if (!formData.empresas || formData.empresas.length === 0) errors.empresas = 'Debe seleccionar al menos una empresa';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep(prevStep => prevStep + 1);
    }
  };

  const handlePrevStep = () => {
    setStep(prevStep => Math.max(prevStep - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await UsuarioApiService.createUsuario(formData);
      setLoading(false);
      onUserCreated(response);
      onClose();
    } catch (err) {
      console.error('Error creating user:', err);

      // Manejar errores de validación del backend
      if (err.response && err.response.data && err.response.data.errors) {
        const backendErrors = err.response.data.errors;
        const formattedErrors = {};

        Object.keys(backendErrors).forEach(key => {
          formattedErrors[key] = backendErrors[key][0]; // Tomar el primer mensaje de error para cada campo
        });

        setFormErrors(formattedErrors);
      } else {
        setError('Error al crear el usuario. Por favor, inténtelo de nuevo.');
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
      <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto ${darkMode ? 'dark' : ''}`}>
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faUser} className="mr-2 text-blue-600 dark:text-blue-400" />
            {step === 1 && "Nuevo Usuario - Datos Personales"}
            {step === 2 && "Nuevo Usuario - Datos de Contacto"}
            {step === 3 && "Nuevo Usuario - Detalles Profesionales"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Indicador de pasos */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-center mb-2">
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                }`}>
                1
              </div>
              <div className={`w-16 h-1 ${step > 1 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}></div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                }`}>
                2
              </div>
              <div className={`w-16 h-1 ${step > 2 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}></div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                }`}>
                3
              </div>
            </div>
          </div>
          <div className="flex justify-center text-xs text-gray-600 dark:text-gray-300 space-x-14">
            <span>Datos Personales</span>
            <span>Datos de Contacto</span>
            <span>Detalles Profesionales</span>
          </div>
        </div>

        {/* Mensaje de error general */}
        {error && (
          <div className="mx-6 my-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
            <p>{error}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Paso 1: Datos Personales */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faUser} className="mr-2" />
                    Nombre <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.nombre
                      ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                      } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                    placeholder="Nombre"
                  />
                  {formErrors.nombre && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.nombre}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faUser} className="mr-2" />
                    Apellidos <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.apellidos
                      ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                      } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                    placeholder="Apellidos"
                  />
                  {formErrors.apellidos && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.apellidos}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faIdCard} className="mr-2" />
                    DNI/NIF <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="dni"
                    value={formData.dni}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.dni
                      ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                      } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                    placeholder="DNI/NIF"
                  />
                  {formErrors.dni && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.dni}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faUser} className="mr-2" />
                    Nombre de Usuario <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="alias_usuario"
                    value={formData.alias_usuario}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.alias_usuario
                      ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                      } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                    placeholder="Nombre de usuario"
                  />
                  {formErrors.alias_usuario && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.alias_usuario}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faLock} className="mr-2" />
                    Contraseña <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    name="contrasena"
                    value={formData.contrasena}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.contrasena
                      ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                      } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                    placeholder="Contraseña (mínimo 6 caracteres)"
                    minLength={6}
                  />
                  {formErrors.contrasena && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.contrasena}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                    Fecha de Alta
                  </label>
                  <input
                    type="date"
                    name="fecha_hora_alta"
                    value={formData.fecha_hora_alta}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                </div>

              </div>
            </div>
          )}

          {/* Paso 2: Datos de Contacto */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                    Correo Electrónico <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.email
                      ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                      } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                    placeholder="correo@ejemplo.com"
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faPhone} className="mr-2" />
                    Teléfono <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.telefono
                      ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                      } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                    placeholder="Teléfono"
                  />
                  {formErrors.telefono && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.telefono}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                    Dirección <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.direccion
                      ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                      } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                    placeholder="Dirección"
                  />
                  {formErrors.direccion && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.direccion}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                    Localidad <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="localidad"
                    value={formData.localidad}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.localidad
                      ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                      } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                    placeholder="Localidad"
                  />
                  {formErrors.localidad && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.localidad}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                    Provincia <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="provincia"
                    value={formData.provincia}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.provincia
                      ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                      } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                    placeholder="Provincia"
                  />
                  {formErrors.provincia && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.provincia}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                    Código Postal <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="codigo_postal"
                    value={formData.codigo_postal}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.codigo_postal
                      ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                      } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                    placeholder="Código Postal"
                  />
                  {formErrors.codigo_postal && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.codigo_postal}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                    País
                  </label>
                  <input
                    type="text"
                    name="pais"
                    value={formData.pais}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    placeholder="País"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Paso 3: Datos Profesionales */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faBuilding} className="mr-2" />
                    Empresas <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="empresas"
                    multiple
                    value={formData.empresas}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                      setFormData(prev => ({
                        ...prev,
                        empresas: selectedOptions
                      }));
                      // Limpiar error si existe
                      if (formErrors.empresas) {
                        setFormErrors(prev => ({
                          ...prev,
                          empresas: ''
                        }));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.empresas
                      ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                      } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                    size="4"
                  >
                    {empresas.map(empresa => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nombre_empresa || empresa.nombre}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Mantén presionada la tecla Ctrl (o Cmd en Mac) para seleccionar múltiples empresas.
                  </p>
                  {formErrors.empresas && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.empresas}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faUser} className="mr-2" />
                    Tipo de Usuario
                  </label>
                  <select
                    name="usuario_tipo"
                    value={formData.usuario_tipo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  >
                    <option value="SuperMaster">Super Master</option>
                    <option value="Master">Master</option>
                    <option value="Responsable_Zona">Responsable de Zona</option>
                    <option value="Ganadero">Ganadero</option>
                    <option value="Instalador">Instalador</option>
                    <option value="Demo">Demo</option>
                    <option value="User">Usuario Estándar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FontAwesomeIcon icon={faUser} className="mr-2" />
                    URL de Fotografía
                  </label>
                  <input
                    type="text"
                    name="foto"
                    value={formData.foto}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    placeholder="URL de la fotografía (opcional)"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="alta"
                    checked={formData.alta}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Usuario Activo
                  </label>
                </div>
              </div>

              <div className="mt-6 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Resumen de Datos</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p><span className="font-medium">Nombre:</span> {formData.nombre} {formData.apellidos}</p>
                    <p><span className="font-medium">DNI/NIF:</span> {formData.dni}</p>
                    <p><span className="font-medium">Usuario:</span> {formData.alias_usuario}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Email:</span> {formData.email}</p>
                    <p><span className="font-medium">Teléfono:</span> {formData.telefono}</p>
                    <p><span className="font-medium">Dirección:</span> {formData.direccion}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Tipo:</span> {formData.usuario_tipo.replace('_', ' ')}</p>
                    <p><span className="font-medium">Estado:</span> {formData.alta ? 'Activo' : 'Inactivo'}</p>
                    <p><span className="font-medium">Empresas:</span> {formData.empresas.length > 0
                      ? formData.empresas.map(id => {
                        const empresa = empresas.find(e => e.id === id);
                        return empresa ? (empresa.nombre_empresa || empresa.nombre) : '';
                      }).filter(Boolean).join(', ')
                      : 'Ninguna seleccionada'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botones de navegación */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
                Anterior
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                Siguiente
                <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creando...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    Guardar Usuario
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}