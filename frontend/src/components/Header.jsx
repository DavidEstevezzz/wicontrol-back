import React from 'react';
import { Link } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function Header({ toggleAside, onLogout, user }) {
  const { darkMode, toggleDarkMode } = useDarkMode();
  
  return (
    <header className={`px-6 py-3 shadow-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <button 
            className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            onClick={toggleAside}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/dashboard" className="text-xl font-bold">WiControl</Link>
        </div>
        
        <div className="flex items-center">
          <button 
            onClick={toggleDarkMode}
            className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          
          {user && (
            <div className="relative ml-3">
              <div className="flex items-center">
                <span className="mr-2">{user.nombre} {user.apellidos}</span>
                <button onClick={onLogout} className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}