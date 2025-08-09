import React, { useState, useEffect, useCallback } from 'react';
import CamadaApiService from '../services/CamadaApiService';
import { useDarkMode } from '../contexts/DarkModeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTrash,
  faPlus,
  faSearch,
  faSync,
  faSort,
  faSortUp,
  faSortDown,
  faDoorClosed
} from '@fortawesome/free-solid-svg-icons';
import CreateCamadaModal from '../components/CreateCamadaModal';
import EditCamadaModal from '../components/EditCamadaModal';
import DeleteCamadaModal from '../components/DeleteCamadaModal';
import CloseCamadaModal from '../components/CloseCamadaModal';

export default function Camadas() {
  const { darkMode } = useDarkMode();

  const [camadas, setCamadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('nombre_camada');
  const [sortDirection, setSortDirection] = useState('asc');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [selectedCamada, setSelectedCamada] = useState(null);

  const loadCamadas = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await CamadaApiService.getCamadas();
      setCamadas(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar camadas.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCamadas();
  }, [loadCamadas, refreshTrigger]);

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

  const sortedCamadas = React.useMemo(() => {
    if (!camadas.length) return [];
    return [...camadas].sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [camadas, sortField, sortDirection]);

  const filteredCamadas = React.useMemo(() => {
    if (!searchTerm.trim()) return sortedCamadas;
    const term = searchTerm.toLowerCase();
    return sortedCamadas.filter(c =>
      (c.nombre_camada && c.nombre_camada.toLowerCase().includes(term)) ||
      (c.codigo_granja && c.codigo_granja.toLowerCase().includes(term))
    );
  }, [sortedCamadas, searchTerm]);

  const openEditModal = camada => {
    setSelectedCamada(camada);
    setEditModalOpen(true);
  };

  const openDeleteModal = camada => {
    setSelectedCamada(camada);
    setDeleteModalOpen(true);
  };

  const openCloseModal = camada => {
    setSelectedCamada(camada);
    setCloseModalOpen(true);
  };

  const closeModals = () => {
    setCreateModalOpen(false);
    setEditModalOpen(false);
    setDeleteModalOpen(false);
    setCloseModalOpen(false);
    setSelectedCamada(null);
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
        <button onClick={loadCamadas} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          <FontAwesomeIcon icon={faSync} className="mr-2" />Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'dark ' : ''}p-6`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 md:mb-0">Camadas</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded-md bg-white dark:bg-gray-700"
            />
            <FontAwesomeIcon icon={faSearch} className="absolute right-3 top-3 text-gray-400" />
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />Nueva
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('nombre_camada')}
              >
                Nombre {getSortIcon('nombre_camada')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('codigo_granja')}
              >
                Granja {getSortIcon('codigo_granja')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inicio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredCamadas.map(camada => (
              <tr key={camada.id_camada}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{camada.nombre_camada}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{camada.codigo_granja}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{camada.fecha_hora_inicio ? new Date(camada.fecha_hora_inicio).toLocaleDateString() : ''}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{camada.fecha_hora_final ? new Date(camada.fecha_hora_final).toLocaleDateString() : ''}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button onClick={() => openEditModal(camada)} className="text-blue-600 hover:text-blue-900">
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button onClick={() => openDeleteModal(camada)} className="text-red-600 hover:text-red-900">
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                  {!camada.fecha_hora_final && (
                    <button onClick={() => openCloseModal(camada)} className="text-green-600 hover:text-green-800">
                      <FontAwesomeIcon icon={faDoorClosed} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!filteredCamadas.length && (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron camadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateCamadaModal
        isOpen={createModalOpen}
        onClose={closeModals}
        onCamadaCreated={refreshList}
      />
      <EditCamadaModal
        isOpen={editModalOpen}
        camada={selectedCamada}
        onClose={closeModals}
        onCamadaUpdated={refreshList}
      />
      <DeleteCamadaModal
        isOpen={deleteModalOpen}
        camada={selectedCamada}
        onClose={closeModals}
        onCamadaDeleted={refreshList}
      />
      <CloseCamadaModal
        isOpen={closeModalOpen}
        camada={selectedCamada}
        onClose={closeModals}
        onCamadaClosed={refreshList}
      />
    </div>
  );
}