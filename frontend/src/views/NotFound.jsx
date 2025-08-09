// src/views/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function NotFound() {
  const { darkMode } = useDarkMode();

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className={`text-center p-8 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h1 className="text-6xl font-bold text-red-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Página no encontrada</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Lo sentimos, la página que buscas no existe o ha sido movida.</p>
        
        <Link 
          to="/dashboard"
          className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}