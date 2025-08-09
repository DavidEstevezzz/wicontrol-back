// src/contexts/ContextProvider.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AuthApiService from '../services/AuthApiService';

const StateContext = createContext({
  user: null,
  token: null,
  setUser: () => {},
  setToken: () => {},
  isLoading: false
});

export const ContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, _setToken] = useState(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const setToken = (token) => {
    _setToken(token);
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  };

  const fetchUser = async () => {
    if (token) {
      try {
        setIsLoading(true);
        const response = await AuthApiService.getCurrentUser();
        setUser(response.data);
      } catch (error) {
        console.error('Error al obtener el usuario:', error.response?.data || error.message);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      setUser(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [token]);

  return (
    <StateContext.Provider value={{ user, token, setUser, setToken, isLoading }}>
      {children}
    </StateContext.Provider>
  );
};

export const useStateContext = () => useContext(StateContext);