// src/router.jsx
import { createBrowserRouter, Navigate, Route } from 'react-router-dom';
import Login from './views/Login';
import NotFound from './views/NotFound';
import Users from './views/Users';
import Dashboard from './views/Dashboard';
import Register from './views/Register';
import UserProfile from './views/UserProfile';
import DefaultLayout from './layout/DefaultLayout';
import GuestLayout from './layout/GuestLayout';
import ProtectedRoute from './components/ProtectedRoute';
import TemperaturaMediaView from './views/TemperaturaMediaView';
import PesadasCamadaView from './views/PesadasCamadaView';
import PesoMedioGranjaView from './views/PesoMedioGranjaView';
import ActividadAvesView from './views/ActividadAvesView';
import MonitoreoLuzView from './views/MonitoreoLuzView';
import Dispositivos from './views/Dispositivos';
import DeviceLogsMonitoring from './views/DeviceLogsMonitoring';
import Empresas from './views/Empresas';

const router = createBrowserRouter([
  {
    path: '/',
    element: <DefaultLayout />,
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" />
      },
      {
        path: '/dashboard',
        element: <Dashboard />
      },
      {
        path: '/users',
        element: <ProtectedRoute element={<Users />} allowedRoles={['SuperMaster', 'Admin']} />
      },
      {
        path: '/dispositivos',
        element: <ProtectedRoute element={<Dispositivos />} allowedRoles={['SuperMaster', 'Admin']} />
      },
      {
        path: '/empresas',
        element: <ProtectedRoute element={<Empresas />} allowedRoles={['SuperMaster', 'Admin']} />
      },
      {
        path: '/register',
        element: <ProtectedRoute element={<Register />} allowedRoles={['SuperMaster', 'Admin']} />
      },
      {
        path: '/sensores',
        element: <ProtectedRoute element={<DeviceLogsMonitoring />} allowedRoles={['SuperMaster', 'Admin']} />
      },
      {
        path: '/temperatura-media',
        element: <ProtectedRoute element={<TemperaturaMediaView />} />
      },
      {
        path: '/analisis-peso-granjas',
        element: <ProtectedRoute element={<PesoMedioGranjaView />} />
      },
      {
        path: '/analisis-actividad-camadas',
        element: <ProtectedRoute element={<ActividadAvesView />} />
      },
      {
        path: '/analisis-luz-camadas',
        element: <ProtectedRoute element={<MonitoreoLuzView />} />
      },
    {
        path: '/peso-medio',
        element: <ProtectedRoute element={<PesadasCamadaView />} />
      },
      {
        path: '/profile',
        element: <UserProfile />
      }
    ]
  },
  {
    path: '/',
    element: <GuestLayout />,
    children: [
      {
        path: '/login',
        element: <Login />
      }
    ]
  },
  {
    path: '*',
    element: <NotFound />
  }
]);

export default router;