import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faDoorClosed, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import CamadaApiService from '../services/CamadaApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function CloseCamadaModal({ isOpen, camada, onClose, onCamadaClosed }) {
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !camada) return null;

  // Prevenir cierre accidental del modal
  const handleBackdropClick = (e) => {
    // Solo cerrar si se hace clic específicamente en el backdrop, no en el contenido del modal
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleClose = async () => {
    setLoading(true);
    setError('');
    
    try {
      await CamadaApiService.closeCamada(camada.id_camada);
      console.log('✅ Camada cerrada exitosamente');
      onCamadaClosed();
      onClose();
    } catch (err) {
      console.error('❌ Error cerrando camada:', err);
      setError(`Error al cerrar la camada: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      {/* Fondo oscurecido - CRÍTICO: solo cerrar si se hace clic en el backdrop */}
      <div 
        className="fixed inset-0 bg-black opacity-50 transition-opacity" 
        onClick={handleBackdropClick}
      />
      
      {/* Modal - CRÍTICO: evitar propagación de clicks */}
      <div 
        className={`${darkMode ? 'dark ' : ''}relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4`}
        onClick={(e) => e.stopPropagation()} // Evitar que clicks en el modal lo cierren
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faDoorClosed} className="mr-2 text-orange-600" />
            Cerrar Camada
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            disabled={loading}
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Mensaje de error */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {/* Información de la camada */}
          <div className="bg-blue-50 dark:bg-blue-900/50 p-4 rounded-md border border-blue-200 dark:border-blue-800 mb-4">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Información de la Camada
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li><span className="font-medium">Nombre:</span> {camada.nombre_camada}</li>
              <li><span className="font-medium">Tipo de Ave:</span> {camada.tipo_ave || 'N/A'}</li>
              <li><span className="font-medium">Estirpe:</span> {camada.tipo_estirpe || 'N/A'}</li>
              <li><span className="font-medium">Granja:</span> {camada.codigo_granja || 'N/A'}</li>
              {camada.fecha_hora_inicio && (
                <li>
                  <span className="font-medium">Fecha Inicio:</span>{' '}
                  {new Date(camada.fecha_hora_inicio).toLocaleDateString('es-ES')}
                </li>
              )}
              {camada.id_naves && (
                <li><span className="font-medium">Nave:</span> {camada.id_naves}</li>
              )}
            </ul>
          </div>

          <p className="mb-4 text-gray-700 dark:text-gray-300">
            ¿Está seguro de que desea cerrar la camada{' '}
            <span className="font-bold text-orange-600 dark:text-orange-400">
              "{camada.nombre_camada}"
            </span>?
          </p>

          {/* Advertencia sobre las consecuencias */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3 mb-4">
            <div className="flex items-start">
              <FontAwesomeIcon 
                icon={faExclamationTriangle} 
                className="text-orange-600 dark:text-orange-400 mr-2 mt-0.5 flex-shrink-0" 
              />
              <div>
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                  Al cerrar esta camada:
                </p>
                <ul className="text-sm text-orange-700 dark:text-orange-300 list-disc ml-4 space-y-1">
                  <li>Se desvinculará automáticamente de todos los dispositivos</li>
                  <li>Los dispositivos quedarán disponibles para otras camadas</li>
                  <li>Se establecerá la fecha de finalización</li>
                  <li>No se podrán registrar más datos en esta camada</li>
                </ul>
              </div>
            </div>
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
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed flex items-center transition-colors"
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
                Cerrando...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faDoorClosed} className="mr-2" />
                Cerrar Camada
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}