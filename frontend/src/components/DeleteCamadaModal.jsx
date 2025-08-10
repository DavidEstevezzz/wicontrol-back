import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faTrash,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import CamadaApiService from '../services/CamadaApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function DeleteCamadaModal({ isOpen, onClose, onCamadaDeleted, camada }) {
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Manejar la eliminación de la camada
  const handleDelete = async () => {
    if (!camada) return;
    
    setLoading(true);
    setError('');

    try {
      await CamadaApiService.deleteCamada(camada.id_camada);
      console.log('✅ Camada eliminada exitosamente');
      onCamadaDeleted(camada.id_camada);
      onClose();
    } catch (err) {
      console.error('❌ Error eliminando camada:', err);
      setError(`Error al eliminar la camada: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Prevenir cierre accidental del modal
  const handleBackdropClick = (e) => {
    // Solo cerrar si se hace clic específicamente en el backdrop, no en el contenido del modal
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Si el modal no está abierto o no hay camada, no renderizar nada
  if (!isOpen || !camada) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center">
      {/* Fondo oscurecido - CRÍTICO: solo cerrar si se hace clic en el backdrop */}
      <div 
        className="fixed inset-0 bg-black opacity-50 transition-opacity"
        onClick={handleBackdropClick}
      />
      
      {/* Modal - CRÍTICO: evitar propagación de clicks */}
      <div 
        className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 ${darkMode ? 'dark' : ''}`}
        onClick={(e) => e.stopPropagation()} // Evitar que clicks en el modal lo cierren
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faTrash} className="mr-2 text-red-600" />
            Eliminar Camada
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>
        
        {/* Contenido */}
        <div className="p-6">
          {/* Mensaje de error */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}
          
          {/* Advertencia */}
          <div className="flex items-center text-amber-600 dark:text-amber-400 mb-4">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl mr-3" />
            <p className="font-medium">Esta acción no se puede deshacer.</p>
          </div>
          
          {/* Información de la camada */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-200 dark:border-gray-700 mb-4">
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
              Información de la Camada
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li><span className="font-medium">Nombre:</span> {camada.nombre_camada}</li>
              <li><span className="font-medium">Tipo de Ave:</span> {camada.tipo_ave || 'N/A'}</li>
              <li><span className="font-medium">Estirpe:</span> {camada.tipo_estirpe || 'N/A'}</li>
              <li><span className="font-medium">Sexaje:</span> {camada.sexaje || 'N/A'}</li>
              {camada.fecha_hora_inicio && (
                <li>
                  <span className="font-medium">Fecha Inicio:</span>{' '}
                  {new Date(camada.fecha_hora_inicio).toLocaleDateString('es-ES')}
                </li>
              )}
              <li><span className="font-medium">Granja:</span> {camada.codigo_granja || 'N/A'}</li>
              {camada.id_naves && (
                <li><span className="font-medium">Nave:</span> {camada.id_naves}</li>
              )}
            </ul>
          </div>
          
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            ¿Está seguro de que desea eliminar la camada{' '}
            <span className="font-bold text-red-600 dark:text-red-400">
              "{camada.nombre_camada}"
            </span>?
          </p>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
              <strong>Advertencia:</strong> Esta acción eliminará permanentemente:
            </p>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 ml-4 list-disc">
              <li>Todos los datos asociados a esta camada</li>
              <li>Las vinculaciones con dispositivos</li>
              <li>Los registros históricos de pesadas</li>
              <li>Los datos de monitoreo ambiental</li>
            </ul>
          </div>
        </div>
        
        {/* Footer con botones */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed flex items-center transition-colors"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4" 
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Eliminando...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faTrash} className="mr-2" />
                Eliminar Definitivamente
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}