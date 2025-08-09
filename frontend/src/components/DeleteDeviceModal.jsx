import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faTrash,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import DispositivoApiService from '../services/DispositivoApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function DeleteDeviceModal({ isOpen, onClose, onDeviceDeleted, device }) {
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Manejar la eliminación del dispositivo
  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      await DispositivoApiService.delete(device.id);
      setLoading(false);
      onDeviceDeleted(device.id);
      onClose();
    } catch (err) {
      console.error('Error deleting device:', err);
      setError('Error al eliminar el dispositivo. Por favor, inténtelo de nuevo.');
      setLoading(false);
    }
  };

  // Si el modal no está abierto o no hay dispositivo, no renderizar nada
  if (!isOpen || !device) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center">
      {/* Fondo oscurecido */}
      <div 
        className="fixed inset-0 bg-black opacity-50 transition-opacity"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full ${darkMode ? 'dark' : ''}`}>
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faTrash} className="mr-2 text-red-600" />
            Eliminar Dispositivo
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>
        
        {/* Contenido */}
        <div className="p-6">
          {/* Mensaje de error */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
              <p>{error}</p>
            </div>
          )}
          
          <div className="flex items-center text-amber-600 dark:text-amber-400 mb-4">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl mr-3" />
            <p className="font-medium">Esta acción no se puede deshacer.</p>
          </div>
          
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            ¿Está seguro de que desea eliminar el dispositivo <span className="font-bold">{device.numero_serie || `#${device.id}`}</span>?
          </p>
          
          {/* Información del dispositivo */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-200 dark:border-gray-700 mb-6">
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Información del Dispositivo</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li><span className="font-medium">ID:</span> {device.id}</li>
              <li><span className="font-medium">Número de Serie:</span> {device.numero_serie || 'N/A'}</li>
              <li><span className="font-medium">IP:</span> {device.ip_address || 'N/A'}</li>
              <li><span className="font-medium">Estado:</span> {device.alta ? 'Activo' : 'Inactivo'}</li>
              <li><span className="font-medium">Versión HW:</span> {device.hw_version || 'N/A'}</li>
              <li><span className="font-medium">Versión FW:</span> {device.fw_version || 'N/A'}</li>
            </ul>
          </div>
          
          {/* Acciones */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Eliminando...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faTrash} className="mr-2" />
                  Eliminar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}