import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';
import CamadaApiService from '../services/CamadaApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function DeleteCamadaModal({ isOpen, camada, onClose, onCamadaDeleted }) {
  const { darkMode } = useDarkMode();
  if (!isOpen || !camada) return null;

  const handleDelete = async () => {
    try {
      await CamadaApiService.deleteCamada(camada.id_camada);
      onCamadaDeleted();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose} />
      <div className={`${darkMode ? 'dark ' : ''}bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Eliminar Camada</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          ¿Está seguro de que desea eliminar la camada "{camada.nombre_camada}"?
        </p>
        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md">Cancelar</button>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">
            <FontAwesomeIcon icon={faTrash} className="mr-2" />Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}