import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faEye,
  faUser,
  faBuilding,
  faIdCard,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function ViewUserModal({ isOpen, onClose, user }) {
  const { darkMode } = useDarkMode();

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      {/* Fondo */}
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className={`${darkMode ? 'dark ' : ''}relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-auto`}>
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faEye} className="mr-2 text-blue-600 dark:text-blue-400" />
            Ver Usuario
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </header>

        {/* Contenido */}
        <div className="p-6 space-y-6 text-gray-800 dark:text-gray-200">
          {/* Datos Personales */}
          <section>
            <h3 className="mb-2 text-lg font-medium border-b border-gray-200 dark:border-gray-700 pb-1">
              Datos Personales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><span className="font-semibold"><FontAwesomeIcon icon={faUser} className="mr-1" />Nombre:</span> {user.nombre} {user.apellidos}</p>
              </div>
              <div>
                <p><span className="font-semibold"><FontAwesomeIcon icon={faIdCard} className="mr-1" />DNI/NIF:</span> {user.dni}</p>
              </div>
              <div>
                <p><span className="font-semibold"><FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />Alta:</span> {new Date(user.fecha_hora_alta).toLocaleDateString()}</p>
              </div>
            </div>
          </section>

          {/* Datos de Acceso */}
          <section>
            <h3 className="mb-2 text-lg font-medium border-b border-gray-200 dark:border-gray-700 pb-1">
              Datos de Acceso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><span className="font-semibold"><FontAwesomeIcon icon={faUser} className="mr-1" />Usuario:</span> {user.alias_usuario}</p>
              </div>
              <div>
                <p><span className="font-semibold">Tipo:</span> {user.usuario_tipo.replace('_', ' ')}</p>
              </div>
              <div>
                <p><span className="font-semibold">Estado:</span> {user.alta ? 'Activo' : 'Inactivo'}</p>
              </div>
            </div>
          </section>

          {/* Datos de Contacto */}
          <section>
            <h3 className="mb-2 text-lg font-medium border-b border-gray-200 dark:border-gray-700 pb-1">
              Datos de Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><span className="font-semibold"><FontAwesomeIcon icon={faEnvelope} className="mr-1" />Email:</span> {user.email}</p>
              </div>
              <div>
                <p><span className="font-semibold"><FontAwesomeIcon icon={faPhone} className="mr-1" />Teléfono:</span> {user.telefono}</p>
              </div>
              <div>
                <p><span className="font-semibold"><FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1" />Dirección:</span> {user.direccion}, {user.localidad}, {user.provincia}, {user.codigo_postal}</p>
              </div>
              <div>
                <p><span className="font-semibold">País:</span> {user.pais}</p>
              </div>
            </div>
          </section>

          {/* Datos Profesionales */}
          <section>
            <h3 className="mb-2 text-lg font-medium border-b border-gray-200 dark:border-gray-700 pb-1">
              Datos Profesionales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="mb-1"><span className="font-semibold"><FontAwesomeIcon icon={faBuilding} className="mr-1" />Empresas:</span></p>
                {user.empresas && user.empresas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.empresas.map(empresa => (
                      <span
                        key={empresa.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                      >
                        {empresa.nombre_empresa || empresa.nombre}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="italic">Sin empresas asignadas</span>
                )}
              </div>
              <div>
                <p><span className="font-semibold">Foto:</span></p>
                {user.foto
                  ? <img src={user.foto} alt={`${user.alias_usuario}`} className="h-24 w-24 object-cover rounded-md" />
                  : <span className="italic">Sin foto</span>
                }
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <FontAwesomeIcon icon={faTimes} className="mr-2" />
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
