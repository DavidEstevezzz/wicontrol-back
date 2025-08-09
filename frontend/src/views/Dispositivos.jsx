import React, { useState, useEffect, useCallback } from 'react';
import DispositivoApiService from '../services/DispositivoApiService';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useStateContext } from '../contexts/ContextProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faEdit,
    faTrash,
    faPlus,
    faCheck,
    faTimes,
    faSearch,
    faSync,
    faEye,
    faSort,
    faSortUp,
    faSortDown,
    faMicrochip,
    faWifi,
    faBatteryHalf,
    faMapMarkerAlt,
    faCog,
    faTools,
    faExclamationTriangle,
    faCheckCircle,
    faTimesCircle,
    faCalendarAlt,
    faRedo
} from '@fortawesome/free-solid-svg-icons';

// Componentes de modales (se programarán después)
import CreateDeviceModal from '../components/CreateDeviceModal';
import EditDeviceModal from '../components/EditDeviceModal';
import DeleteDeviceModal from '../components/DeleteDeviceModal';
import ViewDeviceModal from '../components/ViewDeviceModal';
import CalibrateDeviceModal from '../components/CalibrateDeviceModal';
import ConfigureSensorsModal from '../components/ConfigureSensorsModal';



export default function Devices() {
    // Context
    const { darkMode } = useDarkMode();
    const { user } = useStateContext();

    // Estados
    const [dispositivos, setDispositivos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('numero_serie');
    const [sortDirection, setSortDirection] = useState('asc');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Estados para modales
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [calibrateModalOpen, setCalibrateModalOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [configureSensorsModalOpen, setConfigureSensorsModalOpen] = useState(false);


    // Verificar permisos de usuario
    const canManageDevices = user && ['SuperMaster', 'Master', 'Instalador'].includes(user.usuario_tipo);
    const canCalibrateDevices = user && ['SuperMaster', 'Master', 'Instalador'].includes(user.usuario_tipo);

    // Función para cargar dispositivos
    const loadDispositivos = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const data = await DispositivoApiService.getAll();

            // Normalizar los datos si es necesario
            const normalizedData = (Array.isArray(data) ? data : data.data || []).map(device => ({
                ...device,
                // Asegurar que los IDs estén presentes
                id_dispositivo: device.id_dispositivo || device.id,
                id_instalacion: device.id_instalacion,
                // Normalizar el campo usuario
                usuario_id: device.usuario_id || device.id_usuario,
                id_usuario: device.usuario_id || device.id_usuario
            }));

            setDispositivos(normalizedData);

            const itemsPerPage = 20;
            setTotalPages(Math.ceil(normalizedData.length / itemsPerPage));
            setLoading(false);
        } catch (err) {
            setError('Error al cargar dispositivos. Por favor, inténtelo de nuevo.');
            setLoading(false);
            console.error('Error loading dispositivos:', err);
        }
    }, []);

    // Cargar dispositivos cuando cambie la página o se solicite una actualización
    useEffect(() => {
        loadDispositivos();
    }, [loadDispositivos, refreshTrigger]);

    // Función para actualizar la lista después de operaciones CRUD
    const refreshList = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    // Función para cambiar la página
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Función para cambiar ordenación
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Obtener el icono de ordenación para cada columna
    const getSortIcon = (field) => {
        if (sortField !== field) return <FontAwesomeIcon icon={faSort} className="ml-1 text-gray-400" />;
        return sortDirection === 'asc'
            ? <FontAwesomeIcon icon={faSortUp} className="ml-1 text-blue-500" />
            : <FontAwesomeIcon icon={faSortDown} className="ml-1 text-blue-500" />;
    };

    // Función para ordenar dispositivos
    const sortedDispositivos = React.useMemo(() => {
        if (!dispositivos.length) return [];

        return [...dispositivos].sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';

            // Manejar campos de fecha
            if (sortField.includes('fecha')) {
                aVal = new Date(aVal).getTime() || 0;
                bVal = new Date(bVal).getTime() || 0;
            } else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }

            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
    }, [dispositivos, sortField, sortDirection]);

    // Función para filtrar dispositivos
    const filteredDispositivos = React.useMemo(() => {
        if (!searchTerm.trim()) return sortedDispositivos;

        const term = searchTerm.toLowerCase().trim();
        return sortedDispositivos.filter(dispositivo =>
            (dispositivo.numero_serie && dispositivo.numero_serie.toLowerCase().includes(term)) ||
            (dispositivo.ip_address && dispositivo.ip_address.toLowerCase().includes(term)) ||
            (dispositivo.fw_version && dispositivo.fw_version.toLowerCase().includes(term)) ||
            (dispositivo.hw_version && dispositivo.hw_version.toLowerCase().includes(term)) ||
            (dispositivo.id_dispositivo && dispositivo.id_dispositivo.toString().includes(term))
        );
    }, [sortedDispositivos, searchTerm]);

    // Paginación local
    const paginatedDispositivos = React.useMemo(() => {
        const itemsPerPage = 20;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredDispositivos.slice(startIndex, endIndex);
    }, [filteredDispositivos, currentPage]);

    // Función para manejar la activación/desactivación de dispositivos
    const handleToggleStatus = async (device) => {
        try {
            const updatedData = { alta: !device.alta };
            await DispositivoApiService.update(device.id_dispositivo, updatedData);
            refreshList();
        } catch (error) {
            setError(`Error al cambiar el estado del dispositivo: ${error.message}`);
        }
    };

    const handleResetDevice = async (device) => {
        if (!window.confirm(`¿Está seguro de que desea resetear el dispositivo ${device.numero_serie}?\n\nEsta acción programará un reinicio que se ejecutará en el próximo heartbeat.`)) {
            return;
        }

        try {
            const response = await DispositivoApiService.resetDevice(device.id_dispositivo);

            if (response.success) {
                // Mostrar mensaje de éxito
                alert(response.message);
                refreshList();
            } else {
                setError(response.message || 'Error al programar el reset');
            }
        } catch (error) {
            console.error('Error al resetear dispositivo:', error);
            setError(`Error al resetear el dispositivo: ${error.response?.data?.message || error.message}`);
        }
    };

    // Funciones para manejar modales
    const openCreateModal = () => setCreateModalOpen(true);

    const openEditModal = (device) => {
        // Estructurar los datos correctamente para el modal
        const deviceForEdit = {
            // IDs necesarios
            id_dispositivo: device.id_dispositivo,
            id_instalacion: device.id_instalacion,

            // Datos del dispositivo
            numero_serie: device.numero_serie,

            // Datos de la instalación - normalizar nombres
            usuario_id: device.usuario_id || device.id_usuario, // Manejar ambos nombres
            id_usuario: device.usuario_id || device.id_usuario, // Para compatibilidad
            fecha_hora_alta: device.fecha_hora_alta,
            numero_rega: device.numero_rega,
            id_nave: device.id_nave,

            // Otros datos que puedan ser necesarios
            ip_address: device.ip_address,
            fw_version: device.fw_version,
            hw_version: device.hw_version,
            bateria: device.bateria,
            alta: device.alta,
            calibrado: device.calibrado,
            Lat: device.Lat,
            Lon: device.Lon,
            fecha_hora_last_msg: device.fecha_hora_last_msg
        };

        console.log('Datos enviados al modal de edición:', deviceForEdit); // Para debug

        setSelectedDevice(deviceForEdit);
        setEditModalOpen(true);
    };


    const openConfigureSensorsModal = (device) => {
        setSelectedDevice(device);
        setConfigureSensorsModalOpen(true);
    };

    const openDeleteModal = (device) => {
        setSelectedDevice(device);
        setDeleteModalOpen(true);
    };

    const openViewModal = (device) => {
        setSelectedDevice(device);
        setViewModalOpen(true);
    };

    const openCalibrateModal = (device) => {
        setSelectedDevice(device);
        setCalibrateModalOpen(true);
    };

    const closeModals = () => {
        setCreateModalOpen(false);
        setEditModalOpen(false);
        setDeleteModalOpen(false);
        setViewModalOpen(false);
        setCalibrateModalOpen(false);
        setConfigureSensorsModalOpen(false);
        setSelectedDevice(null);
    };

    // Función para obtener el estado del dispositivo
    const getDeviceStatusBadge = (device) => {
        if (!device.alta) {
            return { class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', text: 'Inactivo' };
        }
        if (device.calibrado) {
            return { class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', text: 'Calibrado' };
        }
        return { class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', text: 'Sin Calibrar' };
    };

    // Función para obtener el estado de la batería
    const getBatteryIcon = (battery) => {
        if (!battery) return <FontAwesomeIcon icon={faBatteryHalf} className="text-gray-400" />;
        const level = parseInt(battery);
        if (level > 70) return <FontAwesomeIcon icon={faBatteryHalf} className="text-green-500" />;
        if (level > 30) return <FontAwesomeIcon icon={faBatteryHalf} className="text-yellow-500" />;
        return <FontAwesomeIcon icon={faBatteryHalf} className="text-red-500" />;
    };

    // Función para formatear fechas
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'N/A';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
                Gestión de Dispositivos
            </h1>

            {/* Alertas de errores */}
            {error && (
                <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
                    <p className="font-medium">{error}</p>
                    <button
                        className="text-red-600 dark:text-red-300 hover:underline ml-2"
                        onClick={() => setError('')}
                    >
                        Cerrar
                    </button>
                </div>
            )}

            {/* Barra de herramientas */}
            <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                {/* Buscador */}
                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Buscar dispositivos..."
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <FontAwesomeIcon
                        icon={faSearch}
                        className="absolute left-3 top-3 text-gray-500 dark:text-gray-400"
                    />
                    {searchTerm && (
                        <button
                            className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            onClick={() => setSearchTerm('')}
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    )}
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3">
                    <button
                        onClick={refreshList}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center"
                    >
                        <FontAwesomeIcon icon={faSync} className="mr-2" />
                        <span>Actualizar</span>
                    </button>

                    {canManageDevices && (
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                        >
                            <FontAwesomeIcon icon={faPlus} className="mr-2" />
                            <span>Nuevo Dispositivo</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Tabla de dispositivos */}
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <table className="table-auto w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-900">
                        <tr>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('numero_serie')}
                            >
                                <div className="flex items-center">
                                    <span>Dispositivo</span>
                                    {getSortIcon('numero_serie')}
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hidden md:table-cell"
                                onClick={() => handleSort('ip_address')}
                            >
                                <div className="flex items-center">
                                    <span>Red</span>
                                    {getSortIcon('ip_address')}
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
                                onClick={() => handleSort('fw_version')}
                            >
                                <div className="flex items-center">
                                    <span>Versiones</span>
                                    {getSortIcon('fw_version')}
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
                                onClick={() => handleSort('bateria')}
                            >
                                <div className="flex items-center">
                                    <span>Batería</span>
                                    {getSortIcon('bateria')}
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('alta')}
                            >
                                <div className="flex items-center">
                                    <span>Estado</span>
                                    {getSortIcon('alta')}
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hidden md:table-cell"
                                onClick={() => handleSort('fecha_hora_last_msg')}
                            >
                                <div className="flex items-center">
                                    <span>Último Mensaje</span>
                                    {getSortIcon('fecha_hora_last_msg')}
                                </div>
                            </th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-4 text-center">
                                    <div className="flex justify-center items-center space-x-2">
                                        <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span className="text-gray-700 dark:text-gray-300">Cargando dispositivos...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginatedDispositivos.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">
                                        {searchTerm
                                            ? 'No se encontraron dispositivos con esos criterios de búsqueda.'
                                            : 'No hay dispositivos disponibles.'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedDispositivos.map(dispositivo => {
                                    const statusBadge = getDeviceStatusBadge(dispositivo);
                                    return (
                                        <tr
                                            key={dispositivo.id_dispositivo}
                                            className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${!dispositivo.alta ? 'bg-gray-100 dark:bg-gray-900 opacity-75' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                                        <FontAwesomeIcon icon={faMicrochip} className="text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {dispositivo.numero_serie || `ID: ${dispositivo.id_dispositivo}`}
                                                        </div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            ID: {dispositivo.id_dispositivo}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell">
                                                <div className="flex items-center text-sm text-gray-900 dark:text-white">
                                                    <FontAwesomeIcon icon={faWifi} className="mr-2 text-gray-400" />
                                                    <div>
                                                        <div>{dispositivo.ip_address || 'N/A'}</div>
                                                        {dispositivo.Lat && dispositivo.Lon && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1" />
                                                                {dispositivo.Lat}, {dispositivo.Lon}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden lg:table-cell">
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    <div>FW: {dispositivo.fw_version || 'N/A'}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        HW: {dispositivo.hw_version || 'N/A'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden lg:table-cell">
                                                <div className="flex items-center text-sm text-gray-900 dark:text-white">
                                                    {getBatteryIcon(dispositivo.bateria)}
                                                    <span className="ml-2">{dispositivo.bateria || 'N/A'}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col space-y-1">
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadge.class}`}>
                                                        {statusBadge.text}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white hidden md:table-cell">
                                                <div className="flex items-center">
                                                    <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-gray-400" />
                                                    <div>
                                                        <div>{formatDate(dispositivo.fecha_hora_last_msg)}</div>
                                                        {dispositivo.fecha_hora_alta && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                Alta: {formatDate(dispositivo.fecha_hora_alta)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button
                                                        onClick={() => openViewModal(dispositivo)}
                                                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                        title="Ver detalles"
                                                    >
                                                        <FontAwesomeIcon icon={faEye} />
                                                    </button>

                                                    {canManageDevices && (
                                                        <>
                                                            <button
                                                                onClick={() => openEditModal(dispositivo)}
                                                                className="p-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                                                                title="Editar dispositivo"
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} />
                                                            </button>
                                                            <button
                                                                onClick={() => openConfigureSensorsModal(dispositivo)}
                                                                className="p-1 text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
                                                                title="Configurar sensores"
                                                            >
                                                                <FontAwesomeIcon icon={faMicrochip} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleStatus(dispositivo)}
                                                                className={`p-1 ${dispositivo.alta
                                                                    ? 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300'
                                                                    : 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300'
                                                                    }`}
                                                                title={dispositivo.alta ? 'Desactivar dispositivo' : 'Activar dispositivo'}
                                                            >
                                                                <FontAwesomeIcon icon={dispositivo.alta ? faTimes : faCheck} />
                                                            </button>
                                                        </>
                                                    )}

                                                    {canCalibrateDevices && (
                                                        <button
                                                            onClick={() => openCalibrateModal(dispositivo)}
                                                            className="p-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                                                            title="Calibrar dispositivo"
                                                        >
                                                            <FontAwesomeIcon icon={faTools} />
                                                        </button>
                                                    )}

                                                    {canManageDevices && dispositivo.alta && (
                                                        <button
                                                            onClick={() => handleResetDevice(dispositivo)}
                                                            className="p-1 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
                                                            title="Resetear dispositivo"
                                                        >
                                                            <FontAwesomeIcon icon={faRedo} />
                                                        </button>
                                                    )}

                                                    {canManageDevices && (
                                                        <button
                                                            onClick={() => openDeleteModal(dispositivo)}
                                                            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                            title="Eliminar dispositivo"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                    Mostrando {paginatedDispositivos.length} de {filteredDispositivos.length} dispositivos
                    {searchTerm && ` (Filtrados por: "${searchTerm}")`}
                </div>

                <div className="flex space-x-2">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Anterior
                    </button>

                    {/* Números de página */}
                    <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = index + 1;
                            } else if (currentPage <= 3) {
                                pageNum = index + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + index;
                            } else {
                                pageNum = currentPage - 2 + index;
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => handlePageChange(pageNum)}
                                    className={`px-3 py-1 text-sm rounded-md ${currentPage === pageNum
                                        ? 'bg-blue-600 text-white'
                                        : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Siguiente
                    </button>
                </div>
            </div>

            {/* Modales */}
            {createModalOpen && (
                <CreateDeviceModal
                    isOpen={createModalOpen}
                    onClose={closeModals}
                    onDeviceCreated={refreshList}
                />
            )}

            {editModalOpen && selectedDevice && (
                <EditDeviceModal
                    isOpen={editModalOpen}
                    onClose={closeModals}
                    onDeviceUpdated={refreshList}
                    device={selectedDevice}
                />
            )}

            {deleteModalOpen && selectedDevice && (
                <DeleteDeviceModal
                    isOpen={deleteModalOpen}
                    onClose={closeModals}
                    onDeviceDeleted={refreshList}
                    device={selectedDevice}
                />
            )}

            {viewModalOpen && selectedDevice && (
                <ViewDeviceModal
                    isOpen={viewModalOpen}
                    onClose={closeModals}
                    device={selectedDevice}
                />
            )}

            {calibrateModalOpen && selectedDevice && (
                <CalibrateDeviceModal
                    isOpen={calibrateModalOpen}
                    onClose={closeModals}
                    onDeviceCalibrated={refreshList}
                    device={selectedDevice}
                />
            )}

            {configureSensorsModalOpen && selectedDevice && (
                <ConfigureSensorsModal
                    isOpen={configureSensorsModalOpen}
                    onClose={closeModals}
                    onSensorsConfigured={refreshList}
                    device={selectedDevice}
                />
            )}
        </div>
    );
}