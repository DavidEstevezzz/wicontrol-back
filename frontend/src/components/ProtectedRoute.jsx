import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStateContext } from '../contexts/ContextProvider';

const ProtectedRoute = ({ element, allowedRoles = [] }) => {
  const { user, token, isLoading } = useStateContext();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.usuario_tipo)) {
    return <Navigate to="/dashboard" />;
  }

  return element;
};

export default ProtectedRoute;