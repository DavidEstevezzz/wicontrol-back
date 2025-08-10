import React, { useState, useEffect, useCallback } from 'react';
import GranjaApiService from '../services/GranjaApiService';
import EmpresaApiService from '../services/EmpresaApiService';
import UsuarioApiService from '../services/UsuarioApiService';
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
import CreateGranjaModal from '../components/CreateGranjaModal';
import EditGranjaModal from '../components/EditGranjaModal';
import DeleteGranjaModal from '../components/DeleteGranjaModal';

export default function Granjas() {
  const { darkMode } = useDarkMode();
  const { user } = useStateContext();
  const isAdmin = user && user.usuario_tipo === 'SuperMaster';

  const [granjas, setGranjas] = useState([]);
  const [empresasMap, setEmpresasMap] = useState({});
  const [usuariosMap, setUsuariosMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('nombre');
  const [sortDirection, setSortDirection] = useState('asc');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedGranja, setSelectedGranja] = useState(null);

  const loadGranjas = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await GranjaApiService.getGranjas();
      const list = Array.isArray(data) ? data : (data.data || []);
      setGranjas(list);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar granjas.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGranjas();
  }, [loadGranjas, refreshTrigger]);

  useEffect(() => {
    const loadAux = async () => {
      try {
        const empresas = await EmpresaApiService.getEmpresas();
        const eMap = {};
        (Array.isArray(empresas) ? empresas : empresas.data || []).forEach(e => { eMap[e.id] = e.nombre_empresa; });
        setEmpresasMap(eMap);
      } catch (e) {
        setEmpresasMap({});
      }
      try {
        const res = await UsuarioApiService.getUsuarios();
        const uMap = {};
        (res.data || []).forEach(u => { uMap[u.id] = u.alias_usuario || u.nombre; });
        setUsuariosMap(uMap);
      } catch (e) {
        setUsuariosMap({});
      }
    };
    loadAux();
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

  const sortedGranjas = React.useMemo(() => {
    if (!granjas.length) return [];
    return [...granjas].sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [granjas, sortField, sortDirection]);

  const filteredGranjas = React.useMemo(() => {
    if (!searchTerm.trim()) return sortedGranjas;
    const term = searchTerm.toLowerCase();
    return sortedGranjas.filter(g =>
      (g.nombre && g.nombre.toLowerCase().includes(term)) ||
      (g.codigo && g.codigo.toLowerCase().includes(term)) ||
      (g.numero_rega && g.numero_rega.toLowerCase().includes(term))
    );
  }, [sortedGranjas, searchTerm]);

  const openEditModal = granja => {
    setSelectedGranja(granja);
    setEditModalOpen(true);
  };

  const openDeleteModal = granja => {
    setSelectedGranja(granja);
    setDeleteModalOpen(true);
  };

  const closeModals = () => {
    setCreateModalOpen(false);
    setEditModalOpen(false);
    setDeleteModalOpen(false);
    setSelectedGranja(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Gestión de Granjas</h1>

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
            placeholder="Buscar granjas..."
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
              <span>Nueva Granja</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <table className="table-auto w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-900">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('nombre')}>
                <div className="flex items-center">
                  <span>Nombre</span>
                  {getSortIcon('nombre')}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('codigo')}>
                <div className="flex items-center">
                  <span>Código</span>
                  {getSortIcon('codigo')}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Empresa</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Contacto</th>
              {isAdmin && <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={isAdmin ? 5 : 4} className="text-center py-4">Cargando...</td></tr>
            ) : filteredGranjas.length === 0 ? (
              <tr><td colSpan={isAdmin ? 5 : 4} className="text-center py-4">No se encontraron granjas.</td></tr>
            ) : (
              filteredGranjas.map(granja => (
                <tr key={granja.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">{granja.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{granja.codigo}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{empresasMap[granja.empresa_id] || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{usuariosMap[granja.usuario_contacto] || '-'}</td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                      <button onClick={() => openEditModal(granja)} className="text-blue-600 hover:text-blue-800"><FontAwesomeIcon icon={faEdit} /></button>
                      <button onClick={() => openDeleteModal(granja)} className="text-red-600 hover:text-red-800"><FontAwesomeIcon icon={faTrash} /></button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateGranjaModal isOpen={createModalOpen} onClose={closeModals} onGranjaCreated={refreshList} />
      {selectedGranja && (
        <>
          <EditGranjaModal isOpen={editModalOpen} onClose={closeModals} onGranjaUpdated={refreshList} granja={selectedGranja} />
          <DeleteGranjaModal isOpen={deleteModalOpen} onClose={closeModals} onGranjaDeleted={refreshList} granja={selectedGranja} />
        </>
      )}
    </div>
  );
}