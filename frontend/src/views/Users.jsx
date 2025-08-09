import React, { useState, useEffect, useCallback } from 'react';
import UsuarioApiService from '../services/UsuarioApiService';
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
  faUser,
  faLock,
  faEnvelope
} from '@fortawesome/free-solid-svg-icons';

// Componentes de modales
import CreateUserModal from '../components/CreateUserModal';
import EditUserModal from '../components/EditUserModal';
import DeleteUserModal from '../components/DeleteUserModal';
import ViewUserModal from '../components/ViewUserModal';

export default function Users() {
  // Context
  const { darkMode } = useDarkMode();
  const { user } = useStateContext();

  // Estados
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('nombre');
  const [sortDirection, setSortDirection] = useState('asc');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Estados para modales
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Verificar si el usuario actual es administrador
  const isAdmin = user && user.usuario_tipo === 'SuperMaster';

  // Función para cargar usuarios
  const loadUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await UsuarioApiService.getUsuarios(currentPage);
      setUsuarios(data.data);
      setTotalPages(Math.ceil(data.total / data.per_page));
      setLoading(false);
    } catch (err) {
      setError('Error al cargar usuarios. Por favor, inténtelo de nuevo.');
      setLoading(false);
      console.error('Error loading usuarios:', err);
    }
  }, [currentPage]);

  // Cargar usuarios cuando cambie la página o se solicite una actualización
  useEffect(() => {
    loadUsuarios();
  }, [loadUsuarios, currentPage, refreshTrigger]);

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
      // Si ya estamos ordenando por este campo, cambiamos la dirección
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Si es un nuevo campo, ordenamos ascendente por defecto
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

  // Función para ordenar usuarios
  const sortedUsuarios = React.useMemo(() => {
    if (!usuarios.length) return [];

    return [...usuarios].sort((a, b) => {

      if (sortField === 'empresas') {
        const aEmpresas = a.empresas && a.empresas.length ? a.empresas.map(e => e.nombre_empresa || e.nombre).join(', ') : '';
        const bEmpresas = b.empresas && b.empresas.length ? b.empresas.map(e => e.nombre_empresa || e.nombre).join(', ') : '';

        return sortDirection === 'asc'
          ? aEmpresas.localeCompare(bEmpresas)
          : bEmpresas.localeCompare(aEmpresas);
      }

      let aVal = a[sortField];
      let bVal = b[sortField];

      // Manejar valores null o undefined
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Convertir a string para comparación (por defecto)
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();

      if (sortDirection === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
  }, [usuarios, sortField, sortDirection]);

  // Función para filtrar usuarios
  const filteredUsuarios = React.useMemo(() => {
    if (!searchTerm.trim()) return sortedUsuarios;

    const term = searchTerm.toLowerCase().trim();
    return sortedUsuarios.filter(usuario =>
      (usuario.nombre && usuario.nombre.toLowerCase().includes(term)) ||
      (usuario.apellidos && usuario.apellidos.toLowerCase().includes(term)) ||
      (usuario.email && usuario.email.toLowerCase().includes(term)) ||
      (usuario.alias_usuario && usuario.alias_usuario.toLowerCase().includes(term)) ||
      (usuario.dni && usuario.dni.toLowerCase().includes(term)) ||
      (usuario.empresas && usuario.empresas.some(emp =>
        (emp.nombre_empresa && emp.nombre_empresa.toLowerCase().includes(term)) ||
        (emp.nombre && emp.nombre.toLowerCase().includes(term))
      ))
    );
  }, [sortedUsuarios, searchTerm]);

  // Función para manejar la activación/desactivación de usuarios
  const handleToggleStatus = async (user) => {
    try {
      if (user.alta) {
        await UsuarioApiService.deleteUsuario(user.id);
      } else {
        await UsuarioApiService.activateUsuario(user.id);
      }
      refreshList();
    } catch (error) {
      setError(`Error al cambiar el estado del usuario: ${error.message}`);
    }
  };

  // Funciones para manejar modales
  const openCreateModal = () => setCreateModalOpen(true);

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const openViewModal = (user) => {
    setSelectedUser(user);
    setViewModalOpen(true);
  };

  const closeModals = () => {
    setCreateModalOpen(false);
    setEditModalOpen(false);
    setDeleteModalOpen(false);
    setViewModalOpen(false);
    setSelectedUser(null);
  };

  // Función para obtener el color de badge según el tipo de usuario
  const getUserTypeBadgeClass = (type) => {
    switch (type) {
      case 'SuperMaster':
        return 'bg-purple-600 text-white';
      case 'Master':
        return 'bg-blue-600 text-white';
      case 'Responsable_Zona':
        return 'bg-teal-600 text-white';
      case 'Ganadero':
        return 'bg-green-600 text-white';
      case 'Instalador':
        return 'bg-orange-600 text-white';
      case 'Demo':
        return 'bg-yellow-600 text-white';
      case 'User':
        return 'bg-gray-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Gestión de Usuarios
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
            placeholder="Buscar usuarios..."
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

          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              <span>Nuevo Usuario</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <table className="table-auto w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-900">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('alias_usuario')}
              >
                <div className="flex items-center">
                  <span>Usuario</span>
                  {getSortIcon('alias_usuario')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('nombre')}
              >
                <div className="flex items-center">
                  <span>Nombre</span>
                  {getSortIcon('nombre')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center">
                  <span>Correo</span>
                  {getSortIcon('email')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hidden md:table-cell"
                onClick={() => handleSort('usuario_tipo')}
              >
                <div className="flex items-center">
                  <span>Tipo</span>
                  {getSortIcon('usuario_tipo')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
                onClick={() => handleSort('empresas')}
              >
                <div className="flex items-center">
                  <span>Empresas</span>
                  {getSortIcon('empresas')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hidden md:table-cell"
                onClick={() => handleSort('alta')}
              >
                <div className="flex items-center">
                  <span>Estado</span>
                  {getSortIcon('alta')}
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
                    <span className="text-gray-700 dark:text-gray-300">Cargando usuarios...</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">
                    {searchTerm
                      ? 'No se encontraron usuarios con esos criterios de búsqueda.'
                      : 'No hay usuarios disponibles.'}
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map(usuario => (
                  <tr
                    key={usuario.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${!usuario.alta ? 'bg-gray-100 dark:bg-gray-900 opacity-75' : ''}`}
                  >
                    <td className="px-6 py-4 ">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-200">
                          {usuario.foto ? (
                            <img src={usuario.foto} alt={usuario.nombre} className="h-10 w-10 rounded-full" />
                          ) : (
                            <FontAwesomeIcon icon={faUser} />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {usuario.alias_usuario}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {usuario.dni || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 ">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {usuario.nombre} {usuario.apellidos}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                        {usuario.localidad && `${usuario.localidad}, ${usuario.provincia}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 ">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {usuario.email}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {usuario.telefono}
                      </div>
                    </td>
                    <td className="px-6 py-4  hidden md:table-cell">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getUserTypeBadgeClass(usuario.usuario_tipo)}`}>
                        {usuario.usuario_tipo.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white hidden lg:table-cell">
                      {usuario.empresas && usuario.empresas.length > 0
                        ? usuario.empresas.map(emp => emp.nombre_empresa || emp.nombre).join(', ')
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4  hidden md:table-cell">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${usuario.alta
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                        {usuario.alta ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4  text-sm text-gray-900 dark:text-white text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openViewModal(usuario)}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Ver detalles"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditModal(usuario)}
                              className="p-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                              title="Editar usuario"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>

                            <button
                              onClick={() => handleToggleStatus(usuario)}
                              className={`p-1 ${usuario.alta
                                ? 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300'
                                : 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300'
                                }`}
                              title={usuario.alta ? 'Desactivar usuario' : 'Activar usuario'}
                            >
                              <FontAwesomeIcon icon={usuario.alta ? faTimes : faCheck} />
                            </button>

                            <button
                              onClick={() => openDeleteModal(usuario)}
                              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 mr-2"
                              title="Eliminar usuario"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Mostrando {filteredUsuarios.length} de {usuarios.length} usuarios
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
              // Mostrar siempre las primeras páginas, la página actual y las últimas
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
        <CreateUserModal
          isOpen={createModalOpen}
          onClose={closeModals}
          onUserCreated={refreshList}
        />
      )}

      {editModalOpen && selectedUser && (
        <EditUserModal
          isOpen={editModalOpen}
          onClose={closeModals}
          onUserUpdated={refreshList}
          user={selectedUser}
        />
      )}

      {deleteModalOpen && selectedUser && (
        <DeleteUserModal
          isOpen={deleteModalOpen}
          onClose={closeModals}
          onUserDeleted={refreshList}
          user={selectedUser}
        />
      )}

      {viewModalOpen && selectedUser && (
        <ViewUserModal
          isOpen={viewModalOpen}
          onClose={closeModals}
          user={selectedUser}
        />
      )}
    </div>
  );
}