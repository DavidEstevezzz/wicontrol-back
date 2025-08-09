// src/components/Aside.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useStateContext } from '../contexts/ContextProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faUser,
  faUsers,
  faUserPlus,
  faChartLine,
  faTemperatureLow,
  faWeightHanging,
  faRunning,
  faLightbulb,
  faBalanceScale,
  faChevronDown,
  faChevronUp,
  faTachometerAlt,
  faMicrochip,
  faBuilding,
  faLayerGroup
} from '@fortawesome/free-solid-svg-icons';

export default function Aside() {
  const location = useLocation();
  const { darkMode } = useDarkMode();
  const { user } = useStateContext();
  const [dashboardOpen, setDashboardOpen] = useState(false);

  const isAdmin = user && user.usuario_tipo === 'SuperMaster';

  // Check if the current path is one of the dashboard subroutes
  const isDashboardActive = location.pathname === '/dashboard' ||
    location.pathname.startsWith('/temperatura-media') ||
    location.pathname.startsWith('/analisis-peso-granjas') ||
    location.pathname.startsWith('/analisis-actividad-camadas') ||
    location.pathname.startsWith('/analisis-luz-camadas') ||
    location.pathname.startsWith('/peso-medio');

  // If the current path is one of the dashboard subroutes, open the dropdown
  React.useEffect(() => {
    if (isDashboardActive) {
      setDashboardOpen(true);
    }
  }, [isDashboardActive]);

  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: faTachometerAlt,
      access: true,
      isDropdown: true,
      children: [
        { path: '/analisis-peso-granjas', label: 'Análisis de Peso por Granja', icon: faWeightHanging },
        { path: '/peso-medio', label: 'Análisis de Peso por Camada', icon: faBalanceScale },
        { path: '/temperatura-media', label: 'Monitoreo de Temperatura', icon: faTemperatureLow },
        { path: '/analisis-actividad-camadas', label: 'Monitoreo de Actividad', icon: faRunning },
        { path: '/analisis-luz-camadas', label: 'Monitoreo de Luz', icon: faLightbulb },
      ]
    },
    { path: '/profile', label: 'Perfil', icon: faUser, access: true },
    { path: '/users', label: 'Usuarios', icon: faUsers, access: isAdmin },
    { path: '/dispositivos', label: 'Dispositivos', icon: faMicrochip, access: isAdmin },
    { path: '/empresas', label: 'Empresas', icon: faBuilding, access: isAdmin },
    { path: '/camadas', label: 'Camadas', icon: faLayerGroup, access: isAdmin },



  ];

  return (
    <aside className={`w-64 h-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'} shadow-lg`}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">Menú</h2>
        <nav>
          <ul>
            {menuItems.map((item, index) => (
              item.access && (
                <li key={index} className="mb-2">
                  {item.isDropdown ? (
                    <div>
                      <div className={`flex items-center rounded-lg ${isDashboardActive
                        ? 'bg-blue-500 text-white'
                        : `hover:bg-gray-100 ${darkMode ? 'hover:text-gray-800' : ''}`
                        }`}>
                        {/* Enlace a Dashboard */}
                        <Link
                          to={item.path}
                          className="flex items-center flex-grow p-2"
                        >
                          <FontAwesomeIcon icon={item.icon} className="mr-3" />
                          <span>{item.label}</span>
                        </Link>

                        {/* Botón para desplegar submenú */}
                        <button
                          onClick={() => setDashboardOpen(!dashboardOpen)}
                          className="p-2 focus:outline-none"
                          aria-label={dashboardOpen ? "Colapsar menú" : "Expandir menú"}
                        >
                          <FontAwesomeIcon icon={dashboardOpen ? faChevronUp : faChevronDown} />
                        </button>
                      </div>

                      {dashboardOpen && (
                        <ul className="pl-4 mt-2 space-y-1">
                          {item.children.map((child, childIndex) => (
                            <li key={`child-${childIndex}`}>
                              <Link
                                to={child.path}
                                className={`flex items-center p-2 rounded-lg ${location.pathname === child.path
                                  ? 'bg-blue-500 text-white'
                                  : `hover:bg-gray-100 ${darkMode ? 'hover:text-gray-800' : ''}`
                                  }`}
                              >
                                <FontAwesomeIcon icon={child.icon} className="mr-3" />
                                <span>{child.label}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.path}
                      className={`flex items-center p-2 rounded-lg ${location.pathname === item.path
                        ? 'bg-blue-500 text-white'
                        : `hover:bg-gray-100 ${darkMode ? 'hover:text-gray-800' : ''}`
                        }`}
                    >
                      <FontAwesomeIcon icon={item.icon} className="mr-3" />
                      <span>{item.label}</span>
                    </Link>
                  )}
                </li>
              )
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}