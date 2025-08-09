// src/layout/DefaultLayout.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useStateContext } from "../contexts/ContextProvider";
import { useDarkMode } from '../contexts/DarkModeContext';
import { useState } from "react";
import AuthApiService from "../services/AuthApiService";
import Aside from "../components/Aside";
import Header from "../components/header";

export default function DefaultLayout() {
    const { user, token, setUser, setToken, isLoading } = useStateContext();
    const [isAsideOpen, setIsAsideOpen] = useState(true);
    const { darkMode } = useDarkMode();

    const toggleAside = () => {
        setIsAsideOpen(!isAsideOpen);
    };

    const onLogout = async (ev) => {
        ev.preventDefault();
        try {
            await AuthApiService.logout();
            setUser(null);
            setToken(null);
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" />;
    }

    return (
        <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
            <Header toggleAside={toggleAside} onLogout={onLogout} user={user} />
            <div className="flex flex-1 overflow-hidden">
                {isAsideOpen && <Aside />}
                <main className="flex-1 p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}