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
  faSave,
  faEye,
  faEyeSlash,
  faCheck,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import UsuarioApiService from '../services/UsuarioApiService';
import EmpresaApiService from '../services/EmpresaApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function EditUserModal({ isOpen, onClose, onUserUpdated, user }) {
  const { darkMode } = useDarkMode();
  const [formData, setFormData] = useState({
    alias_usuario: '',
    contrasena: '',
    confirmar_contrasena: '', // NUEVO campo
    changePassword: false,
    nombre: '',
    apellidos: '',
    dni: '',
    fecha_hora_alta: '',
    email: '',
    telefono: '',
    direccion: '',
    localidad: '',
    provincia: '',
    codigo_postal: '',
    pais: 'España',
    empresas: [],
    usuario_tipo: 'User',
    foto: '',
    alta: true
  });
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  
  // NUEVOS estados para manejo de contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState('');

  // Carga inicial de datos
  useEffect(() => {
    if (isOpen && user) {
      const dt = user.fecha_hora_alta
        ? new Date(user.fecha_hora_alta).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      setFormData({
        alias_usuario: user.alias_usuario || '',
        contrasena: '',
        confirmar_contrasena: '', // NUEVO
        changePassword: false,
        nombre: user.nombre || '',
        apellidos: user.apellidos || '',
        dni: user.dni || '',
        fecha_hora_alta: dt,
        email: user.email || '',
        telefono: user.telefono || '',
        direccion: user.direccion || '',
        localidad: user.localidad || '',
        provincia: user.provincia || '',
        codigo_postal: user.codigo_postal || '',
        pais: user.pais || 'España',
        empresas: user.empresas ? user.empresas.map(emp => emp.id) : [],
        usuario_tipo: user.usuario_tipo || 'User',
        foto: user.foto || '',
        alta: user.alta
      });
      
      // Resetear estados de contraseña
      setPasswordMatch(true);
      setPasswordStrength('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      
      EmpresaApiService.getEmpresas()
        .then(data => setEmpresas(data))
        .catch(() => setError('No se pudieron cargar las empresas'));
    }
  }, [isOpen, user]);

  // Función para evaluar la fortaleza de la contraseña
  const evaluatePasswordStrength = (password) => {
    if (password.length === 0) return '';
    if (password.length < 6) return 'Muy débil';
    if (password.length < 8) return 'Débil';
    
    let score = 0;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score === 4 && password.length >= 12) return 'Muy fuerte';
    if (score >= 3 && password.length >= 8) return 'Fuerte';
    if (score >= 2) return 'Moderada';
    return 'Débil';
  };

  // Manejador genérico de inputs
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: val };
      
      // Lógica especial para contraseñas
      if (name === 'contrasena') {
        setPasswordStrength(evaluatePasswordStrength(val));
        setPasswordMatch(val === prev.confirmar_contrasena || prev.confirmar_contrasena === '');
      } else if (name === 'confirmar_contrasena') {
        setPasswordMatch(val === prev.contrasena);
      } else if (name === 'changePassword' && !val) {
        // Si desmarca "cambiar contraseña", limpiar los campos
        newData.contrasena = '';
        newData.confirmar_contrasena = '';
        setPasswordStrength('');
        setPasswordMatch(true);
        setShowPassword(false);
        setShowConfirmPassword(false);
      }
      
      return newData;
    });
    
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Validaciones mejoradas
  const validate = () => {
    const errs = {};
    if (!formData.alias_usuario) errs.alias_usuario = 'El usuario es obligatorio';
    
    if (formData.changePassword) {
      if (!formData.contrasena) {
        errs.contrasena = 'La contraseña es obligatoria';
      } else if (formData.contrasena.length < 6) {
        errs.contrasena = 'Mínimo 6 caracteres';
      }
      
      if (!formData.confirmar_contrasena) {
        errs.confirmar_contrasena = 'Debe confirmar la contraseña';
      } else if (formData.contrasena !== formData.confirmar_contrasena) {
        errs.confirmar_contrasena = 'Las contraseñas no coinciden';
      }
    }
    
    if (!formData.nombre) errs.nombre = 'El nombre es obligatorio';
    if (!formData.apellidos) errs.apellidos = 'Los apellidos son obligatorios';
    if (!formData.dni) errs.dni = 'El DNI/NIF es obligatorio';
    if (!formData.email) errs.email = 'El correo es obligatorio';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Formato de correo inválido';
    if (!formData.telefono) errs.telefono = 'El teléfono es obligatorio';
    if (!formData.direccion) errs.direccion = 'La dirección es obligatoria';
    if (!formData.localidad) errs.localidad = 'La localidad es obligatoria';
    if (!formData.provincia) errs.provincia = 'La provincia es obligatoria';
    if (!formData.codigo_postal) errs.codigo_postal = 'El código postal es obligatorio';
    if (!formData.empresas || formData.empresas.length === 0) errs.empresas = 'Debe seleccionar al menos una empresa';
    
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Envío del formulario
  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const data = { ...formData };
      if (!formData.changePassword) {
        delete data.contrasena;
      }
      delete data.changePassword;
      delete data.confirmar_contrasena; // No enviar confirmación al backend
      
      const res = await UsuarioApiService.updateUsuario(user.id, data);
      
      // Mostrar mensaje de éxito específico si se cambió la contraseña
      if (formData.changePassword) {
        alert('Usuario actualizado correctamente. La contraseña ha sido cambiada.');
      }
      
      onUserUpdated(res);
      onClose();
    } catch (err) {
      console.error('Error al actualizar usuario:', err);
      setError('Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener el color de la fortaleza de contraseña
  const getPasswordStrengthColor = (strength) => {
    switch (strength) {
      case 'Muy débil': return 'text-red-600';
      case 'Débil': return 'text-red-500';
      case 'Moderada': return 'text-yellow-500';
      case 'Fuerte': return 'text-green-500';
      case 'Muy fuerte': return 'text-green-600';
      default: return 'text-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      {/* Fondo */}
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className={`${darkMode ? 'dark ' : ''}relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto`}>
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faUser} className="mr-2 text-amber-600 dark:text-amber-400" />
            Editar Usuario
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </header>

        {/* Error general */}
        {error && (
          <div className="m-6 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Datos Personales */}
          <section>
            <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Datos Personales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FontAwesomeIcon icon={faUser} className="mr-2" />
                  Nombre <span className="text-red-600">*</span>
                </label>
                <input
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.nombre
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                />
                {formErrors.nombre && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.nombre}</p>}
              </div>

              {/* Apellidos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FontAwesomeIcon icon={faUser} className="mr-2" />
                  Apellidos <span className="text-red-600">*</span>
                </label>
                <input
                  name="apellidos"
                  value={formData.apellidos}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.apellidos
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                />
                {formErrors.apellidos && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.apellidos}</p>
                )}
              </div>

              {/* DNI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FontAwesomeIcon icon={faIdCard} className="mr-2" />
                  DNI/NIF <span className="text-red-600">*</span>
                </label>
                <input
                  name="dni"
                  value={formData.dni}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.dni
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                />
                {formErrors.dni && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.dni}</p>}
              </div>

              {/* Fecha de alta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                  Fecha de Alta
                </label>
                <input
                  name="fecha_hora_alta"
                  type="date"
                  value={formData.fecha_hora_alta}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                />
              </div>
            </div>
          </section>

          {/* Datos de Acceso - SECCIÓN MEJORADA */}
          <section>
            <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Datos de Acceso
            </h3>
            <div className="space-y-4">
              {/* Usuario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FontAwesomeIcon icon={faUser} className="mr-2" />
                  Usuario <span className="text-red-600">*</span>
                </label>
                <input
                  name="alias_usuario"
                  value={formData.alias_usuario}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.alias_usuario
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                />
                {formErrors.alias_usuario && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {formErrors.alias_usuario}
                  </p>
                )}
              </div>

              {/* Cambiar contraseña */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="changePassword"
                    checked={formData.changePassword}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <FontAwesomeIcon icon={faLock} className="mr-2" />
                    Cambiar contraseña
                  </span>
                </label>
                
                {formData.changePassword && (
                  <div className="mt-4 space-y-4">
                    {/* Nueva Contraseña */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nueva Contraseña <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          name="contrasena"
                          type={showPassword ? "text" : "password"}
                          value={formData.contrasena}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring ${formErrors.contrasena
                            ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                            } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                          minLength={6}
                          placeholder="Mínimo 6 caracteres"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <FontAwesomeIcon 
                            icon={showPassword ? faEyeSlash : faEye} 
                            className="h-4 w-4 text-gray-400 hover:text-gray-600"
                          />
                        </button>
                      </div>
                      
                      {/* Indicador de fortaleza */}
                      {passwordStrength && (
                        <div className="mt-1 flex items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">Fortaleza:</span>
                          <span className={`text-xs font-medium ${getPasswordStrengthColor(passwordStrength)}`}>
                            {passwordStrength}
                          </span>
                        </div>
                      )}
                      
                      {formErrors.contrasena && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {formErrors.contrasena}
                        </p>
                      )}
                    </div>

                    {/* Confirmar Contraseña */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Confirmar Contraseña <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          name="confirmar_contrasena"
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirmar_contrasena}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring ${
                            formErrors.confirmar_contrasena || !passwordMatch
                              ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                              : passwordMatch && formData.confirmar_contrasena
                                ? 'border-green-500 focus:ring-green-200 dark:focus:ring-green-800'
                                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                            } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                          placeholder="Repita la contraseña"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          <FontAwesomeIcon 
                            icon={showConfirmPassword ? faEyeSlash : faEye} 
                            className="h-4 w-4 text-gray-400 hover:text-gray-600"
                          />
                        </button>
                      </div>
                      
                      {/* Indicador de coincidencia */}
                      {formData.confirmar_contrasena && (
                        <div className="mt-1 flex items-center">
                          {passwordMatch ? (
                            <div className="flex items-center text-green-600 dark:text-green-400">
                              <FontAwesomeIcon icon={faCheck} className="h-3 w-3 mr-1" />
                              <span className="text-xs">Las contraseñas coinciden</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600 dark:text-red-400">
                              <FontAwesomeIcon icon={faExclamationTriangle} className="h-3 w-3 mr-1" />
                              <span className="text-xs">Las contraseñas no coinciden</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {formErrors.confirmar_contrasena && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {formErrors.confirmar_contrasena}
                        </p>
                      )}
                    </div>

                    {/* Consejos de seguridad */}
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-700">
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                        Consejos para una contraseña segura:
                      </p>
                      <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                        <li>• Al menos 8 caracteres de longitud</li>
                        <li>• Incluye mayúsculas, minúsculas, números y símbolos</li>
                        <li>• Evita información personal como nombres o fechas</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Datos de Contacto */}
          <section>
            <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Datos de Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                  Correo <span className="text-red-600">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.email
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.email}</p>
                )}
              </div>
              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FontAwesomeIcon icon={faPhone} className="mr-2" />
                  Teléfono <span className="text-red-600">*</span>
                </label>
                <input
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.telefono
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                />
                {formErrors.telefono && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.telefono}</p>
                )}
              </div>
              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                  Dirección <span className="text-red-600">*</span>
                </label>
                <input
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.direccion
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                />
                {formErrors.direccion && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.direccion}</p>
                )}
              </div>
              {/* Localidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Localidad <span className="text-red-600">*</span>
                </label>
                <input
                  name="localidad"
                  value={formData.localidad}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.localidad
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                />
                {formErrors.localidad && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.localidad}</p>
                )}
              </div>
              {/* Provincia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Provincia <span className="text-red-600">*</span>
                </label>
                <input
                  name="provincia"
                  value={formData.provincia}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.provincia
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                />
                {formErrors.provincia && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.provincia}</p>
                )}
              </div>
              {/* Código Postal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Código Postal <span className="text-red-600">*</span>
                </label>
                <input
                  name="codigo_postal"
                  value={formData.codigo_postal}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring ${formErrors.codigo_postal
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 dark:focus:ring-blue-800'
                    } bg-white dark:bg-gray-700 text-gray-800 dark:text-white`}
                />
                {formErrors.codigo_postal && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.codigo_postal}</p>
                )}
              </div>
              {/* País */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  País
                </label>
                <input
                  name="pais"
                  value={formData.pais}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                />
              </div>
            </div>
          </section>

          {/* Datos Profesionales */}
          <section>
            <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Datos Profesionales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Empresas */}
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
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre_empresa || emp.nombre}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Mantén presionada la tecla Ctrl (o Cmd en Mac) para seleccionar múltiples empresas.
                </p>
                {formErrors.empresas && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {formErrors.empresas}
                  </p>
                )}
              </div>

              {/* Tipo de Usuario */}
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

              {/* URL Fotografía */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL de Fotografía
                </label>
                <input
                  name="foto"
                  value={formData.foto}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  placeholder="URL de la fotografía (opcional)"
                />
              </div>

              {/* Estado Alta */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="alta"
                  checked={formData.alta}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="alta" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Usuario Activo
                </label>
              </div>
            </div>
          </section>

          {/* NUEVA SECCIÓN: Aviso de cambio de contraseña */}
          {formData.changePassword && (
            <section className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <div className="flex items-start">
                <FontAwesomeIcon 
                  icon={faExclamationTriangle} 
                  className="h-5 w-5 text-yellow-400 dark:text-yellow-300 mt-0.5 mr-3" 
                />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Cambio de contraseña activo
                  </h4>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    Se cambiará la contraseña del usuario <strong>{formData.alias_usuario}</strong>. 
                    El usuario deberá utilizar la nueva contraseña en su próximo inicio de sesión.
                  </p>
                  <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                    💡 Asegúrate de comunicar la nueva contraseña al usuario de forma segura.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (formData.changePassword && (!passwordMatch || !formData.contrasena))}
              className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed flex items-center"
            >
              {loading && (
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              <FontAwesomeIcon icon={faSave} className="mr-2" />
              {formData.changePassword ? 'Guardar y Cambiar Contraseña' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}