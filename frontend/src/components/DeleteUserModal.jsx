import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';
import UsuarioApiService from '../services/UsuarioApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function DeleteUserModal({ isOpen, onClose, onUserDeleted, user }) {
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      await UsuarioApiService.deleteUsuario(user.id);
      onUserDeleted(user);
      onClose();
    } catch (err) {
      setError('Error al eliminar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      {/* Fondo */}
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className={`${darkMode ? 'dark ' : ''}relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4`}>
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faTrash} className="mr-2 text-red-600 dark:text-red-400" />
            Eliminar Usuario
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </header>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200">
              {error}
            </div>
          )}
          <p className="text-gray-800 dark:text-gray-200">
            ¿Estás seguro de que deseas eliminar al usuario{' '}
            <span className="font-semibold">{user.alias_usuario}</span> (
            {user.nombre} {user.apellidos})?
          </p>
        </div>

        {/* Footer / Actions */}
        <footer className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed flex items-center"
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
            Eliminar
          </button>
        </footer>
      </div>
    </div>
  );
}
