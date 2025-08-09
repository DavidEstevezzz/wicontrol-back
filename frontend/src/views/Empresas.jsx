import EmpresaApiService from '../services/EmpresaApiService';
import UsuarioApiService from '../services/UsuarioApiService';
import React, { useState, useEffect, useCallback } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useStateContext } from '../contexts/ContextProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTrash,
  faPlus,
  faSearch,
  faSync,
  faSort,
  faSortUp,
  faSortDown
} from '@fortawesome/free-solid-svg-icons';
import CreateEmpresaModal from '../components/CreateEmpresaModal';
import EditEmpresaModal from '../components/EditEmpresaModal';
import DeleteEmpresaModal from '../components/DeleteEmpresaModal';

export default function Empresas() {
  const { darkMode } = useDarkMode();
  const { user } = useStateContext();
  const isAdmin = user && user.usuario_tipo === 'SuperMaster';

  const [empresas, setEmpresas] = useState([]);
  const [usuariosMap, setUsuariosMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('nombre_empresa');
  const [sortDirection, setSortDirection] = useState('asc');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);

  const loadEmpresas = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await EmpresaApiService.getEmpresas();
      setEmpresas(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar empresas. Por favor, inténtelo de nuevo.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmpresas();
  }, [loadEmpresas, refreshTrigger]);

  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        const res = await UsuarioApiService.getUsuarios();
        const map = {};
        res.data.forEach(u => { map[u.id] = u.alias_usuario || u.nombre; });
        setUsuariosMap(map);
      } catch (e) {
        setUsuariosMap({});
      }
    };
    loadUsuarios();
  }, []);

  const refreshList = () => setRefreshTrigger(prev => prev + 1);

  const handleSort = field => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = field => {
    if (sortField !== field) return <FontAwesomeIcon icon={faSort} className="ml-1 text-gray-400" />;
    return sortDirection === 'asc'
      ? <FontAwesomeIcon icon={faSortUp} className="ml-1 text-blue-500" />
      : <FontAwesomeIcon icon={faSortDown} className="ml-1 text-blue-500" />;
  };

  const sortedEmpresas = React.useMemo(() => {
    if (!empresas.length) return [];
    return [...empresas].sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [empresas, sortField, sortDirection]);

  const filteredEmpresas = React.useMemo(() => {
    if (!searchTerm.trim()) return sortedEmpresas;
    const term = searchTerm.toLowerCase();
    return sortedEmpresas.filter(e =>
      (e.nombre_empresa && e.nombre_empresa.toLowerCase().includes(term)) ||
      (e.cif && e.cif.toLowerCase().includes(term)) ||
      (e.email && e.email.toLowerCase().includes(term))
    );
  }, [sortedEmpresas, searchTerm]);

  const openEditModal = empresa => {
    setSelectedEmpresa(empresa);
    setEditModalOpen(true);
  };

  const openDeleteModal = empresa => {
    setSelectedEmpresa(empresa);
    setDeleteModalOpen(true);
  };

  const closeModals = () => {
    setCreateModalOpen(false);
    setEditModalOpen(false);
    setDeleteModalOpen(false);
    setSelectedEmpresa(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Gestión de Empresas</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
          <p className="font-medium">{error}</p>
          <button className="text-red-600 dark:text-red-300 hover:underline ml-2" onClick={() => setError('')}>
            Cerrar
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="relative w-full md:w-1/3">
          <input
            type="text"
            placeholder="Buscar empresas..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="flex gap-3">
          <button onClick={refreshList} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center">
            <FontAwesomeIcon icon={faSync} className="mr-2" />
            <span>Actualizar</span>
          </button>
          {isAdmin && (
            <button onClick={() => setCreateModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              <span>Nueva Empresa</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <table className="table-auto w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-900">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('nombre_empresa')}>
                <div className="flex items-center">
                  <span>Nombre</span>
                  {getSortIcon('nombre_empresa')}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('cif')}>
                <div className="flex items-center">
                  <span>CIF</span>
                  {getSortIcon('cif')}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Teléfono</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Contacto</th>
              {isAdmin && <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={isAdmin ? 6 : 5} className="text-center py-4">Cargando...</td></tr>
            ) : filteredEmpresas.length === 0 ? (
              <tr><td colSpan={isAdmin ? 6 : 5} className="text-center py-4">No se encontraron empresas.</td></tr>
            ) : (
              filteredEmpresas.map(empresa => (
                <tr key={empresa.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">{empresa.nombre_empresa}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{empresa.cif}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{empresa.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{empresa.telefono || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{usuariosMap[empresa.usuario_contacto] || '-'}</td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                      <button onClick={() => openEditModal(empresa)} className="text-blue-600 hover:text-blue-800"><FontAwesomeIcon icon={faEdit} /></button>
                      <button onClick={() => openDeleteModal(empresa)} className="text-red-600 hover:text-red-800"><FontAwesomeIcon icon={faTrash} /></button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateEmpresaModal isOpen={createModalOpen} onClose={closeModals} onEmpresaCreated={refreshList} />
      {selectedEmpresa && (
        <>
          <EditEmpresaModal isOpen={editModalOpen} onClose={closeModals} onEmpresaUpdated={refreshList} empresa={selectedEmpresa} />
          <DeleteEmpresaModal isOpen={deleteModalOpen} onClose={closeModals} onEmpresaDeleted={refreshList} empresa={selectedEmpresa} />
        </>
      )}
    </div>
  );
}