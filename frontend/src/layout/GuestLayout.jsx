// src/layout/GuestLayout.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useStateContext } from "../contexts/ContextProvider";
import { useDarkMode } from '../contexts/DarkModeContext';

export default function GuestLayout() {
    const { token, isLoading } = useStateContext();
    const { darkMode } = useDarkMode();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (token) {
        return <Navigate to="/dashboard" />;
    }

    return (
        <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
            <div className="w-full max-w-md">
                <Outlet />
            </div>
        </div>
    );
}