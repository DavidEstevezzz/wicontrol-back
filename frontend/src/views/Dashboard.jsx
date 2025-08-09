import React, { useState, useEffect } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import EmpresaApiService from '../services/EmpresaApiService';
import GranjaApiService from '../services/GranjaApiService';
import CamadaApiService from '../services/CamadaApiService';
import UsuarioApiService from '../services/UsuarioApiService'; // Añadir este import
import MonitoreoLuzView from './MonitoreoLuzView';
import ActividadAvesView from './ActividadAvesView';
import TemperaturaHumedadView from './TemperaturaMediaView';
import PesoMedioGranjaView from './PesoMedioGranjaView';
import PesadasCamadaView from './PesadasCamadaView';
import { useStateContext } from '../contexts/ContextProvider'; // Asumiendo que tienes un contexto con el usuario actual

export default function Dashboard() {
  // Obtener usuario actual del contexto
  const { user } = useStateContext();

  // Estados para selección y filtros
  const [empresas, setEmpresas] = useState([]);
  const [granjas, setGranjas] = useState([]);
  const [camadas, setCamadas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [selectedGranja, setSelectedGranja] = useState('');
  const [selectedCamada, setSelectedCamada] = useState('');
  const [camadaInfo, setCamadaInfo] = useState(null);

  // Estado para controlar carga y errores
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estado para controlar las pestañas
  const [tabIndex, setTabIndex] = useState(0);
  const [tabsEnabled, setTabsEnabled] = useState({
    info: true,
    luz: false,
    actividad: false,
    temperatura: false,
    pesoMedio: false,
    pesadasCamada: false
  });

  // 1. Cargar empresas según tipo de usuario
  useEffect(() => {
    setLoading(true);

    if (user && user.usuario_tipo === 'SuperMaster') {
      // SuperMaster puede ver todas las empresas
      EmpresaApiService.getEmpresas()
        .then(data => setEmpresas(data))
        .catch(() => setError('No se pudieron cargar las empresas.'))
        .finally(() => setLoading(false));
    } else if (user) {
      // Otros usuarios solo ven las empresas a las que están asignados
      UsuarioApiService.getUsuarioEmpresas(user.id)
        .then(data => {
          if (data && data.empresas) {
            setEmpresas(data.empresas);
          } else {
            setEmpresas([]);
          }
        })
        .catch(() => setError('No se pudieron cargar las empresas asignadas.'))
        .finally(() => setLoading(false));
    }
  }, [user]);

  // 2. Cargar granjas al cambiar empresa con restricciones según tipo de usuario
  useEffect(() => {
    if (!selectedEmpresa) {
      setGranjas([]);
      setSelectedGranja('');
      return;
    }

    setLoading(true);

    // Función para filtrar granjas según el tipo de usuario
    const filterGranjasByUserType = (granjas) => {
      if (!user) return granjas;

      if (user.usuario_tipo === 'SuperMaster' || user.usuario_tipo === 'Master') {
        // SuperMaster y Master pueden ver todas las granjas
        return granjas;
      } else if (user.usuario_tipo === 'Responsable_Zona') {
        // Responsable_Zona solo ve granjas donde sea responsable
        return granjas.filter(granja => granja.responsable === user.id);
      } else if (user.usuario_tipo === 'Ganadero') {
        // Ganadero solo ve granjas donde sea ganadero
        return granjas.filter(granja => granja.ganadero === user.id);
      }

      // Para otros tipos, mostrar todas las granjas
      return granjas;
    };

    GranjaApiService.getGranjasByEmpresa(selectedEmpresa)
      .then(data => {
        const filteredGranjas = filterGranjasByUserType(data);
        setGranjas(filteredGranjas);
      })
      .catch(() => setError('No se pudieron cargar las granjas.'))
      .finally(() => setLoading(false));

    // Habilitar pestaña de Peso Medio cuando se selecciona una empresa
    setTabsEnabled(prev => ({
      ...prev,
      pesoMedio: true
    }));
  }, [selectedEmpresa, user]);

  useEffect(() => {
    if (!selectedGranja) {
      setCamadas([]);
      setSelectedCamada('');
      return;
    }
    setLoading(true);
    CamadaApiService.getCamadasByGranja(selectedGranja)
      .then(data => setCamadas(data))
      .catch(() => setError('No se pudieron cargar las camadas.'))
      .finally(() => setLoading(false));

    // Habilitar pestaña de Peso Medio cuando se selecciona una granja
    setTabsEnabled(prev => ({
      ...prev,
      pesoMedio: true
    }));
  }, [selectedGranja]);

  // 4. Cargar información detallada de la camada cuando se selecciona
  useEffect(() => {
    if (!selectedCamada) {
      setCamadaInfo(null);
      // Deshabilitar pestañas que requieren una camada
      setTabsEnabled(prev => ({
        ...prev,
        luz: false,
        actividad: false,
        temperatura: false,
        pesadasCamada: false
      }));
      return;
    }

    setLoading(true);

    // Cargar información detallada de la camada
    CamadaApiService.getCamadaInfo(selectedCamada)
      .then(data => {
        setCamadaInfo(data);
        // Habilitar pestañas que requieren una camada
        setTabsEnabled(prev => ({
          ...prev,
          luz: true,
          actividad: true,
          temperatura: true,
          pesadasCamada: true
        }));
      })
      .catch(error => {
        console.error("Error al cargar información de camada:", error);
        setError('No se pudo obtener la información de la camada.');
      })
      .finally(() => setLoading(false));
  }, [selectedCamada]);

  // Función para cambiar de pestaña con validación
  const handleTabSelect = (index) => {
    // Validar si se puede cambiar a la pestaña
    if (index === 0 || // Siempre permitir la pestaña de información
      (index === 1 && tabsEnabled.luz) || // Pestaña de luz
      (index === 2 && tabsEnabled.actividad) || // Pestaña de actividad
      (index === 3 && tabsEnabled.temperatura) || // Pestaña de temperatura
      (index === 4 && tabsEnabled.pesoMedio) || // Pestaña de peso medio
      (index === 5 && tabsEnabled.pesadasCamada)) { // Pestaña de actividad
      setTabIndex(index);
    }
  };

  const renderNoAccessMessage = () => {
    if (empresas.length === 0 && !loading) {
      return (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg text-yellow-700 dark:text-yellow-200 mb-6">
          <p className="font-medium">No tiene acceso a ninguna empresa.</p>
          <p>Contacte con el administrador si cree que esto es un error.</p>
        </div>
      );
    }
    return null;
  };

  // Y llamarlo en el JSX justo después del mensaje de error
  {
    error && (
      <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-100 px-4 py-3 rounded mb-4">
        {error}
      </div>
    )
  }
  { renderNoAccessMessage() }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
        Dashboard de Monitoreo
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-100 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filtros generales */}
      <div className="p-6 rounded-lg shadow-md mb-6 bg-gray-50 dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Empresa */}
          <div>
            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
              Empresa
            </label>
            <select
              className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
              value={selectedEmpresa}
              onChange={(e) => {
                setSelectedEmpresa(e.target.value);
                setSelectedGranja('');
                setSelectedCamada('');
                setCamadaInfo(null);
              }}
              disabled={loading || empresas.length === 0}
            >
              <option value="">-- Seleccione empresa --</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre_empresa || empresa.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Granja */}
          <div>
            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
              Granja
            </label>
            <select
              className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
              value={selectedGranja}
              onChange={(e) => {
                setSelectedGranja(e.target.value);
                setSelectedCamada('');
                setCamadaInfo(null);
              }}
              disabled={loading || !selectedEmpresa || granjas.length === 0}
            >
              <option value="">-- Seleccione granja --</option>
              {granjas.map((granja) => (
                <option key={granja.id} value={granja.numero_rega}>
                  {granja.nombre} ({granja.numero_rega})
                </option>
              ))}
            </select>
            {selectedEmpresa && granjas.length === 0 && !loading && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                No tiene acceso a granjas en esta empresa.
              </p>
            )}
          </div>

          {/* Camada */}
          <div>
            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
              Camada
            </label>
            <select
              className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
              value={selectedCamada}
              onChange={(e) => setSelectedCamada(e.target.value)}
              disabled={loading || !selectedGranja || camadas.length === 0}
            >
              <option value="">-- Seleccione camada --</option>
              {camadas.map((camada) => (
                <option key={camada.id_camada} value={camada.id_camada}>
                  {camada.nombre_camada}
                </option>
              ))}
            </select>
            {selectedGranja && camadas.length === 0 && !loading && (
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                No hay camadas disponibles en esta granja.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Información de camada seleccionada */}
      {camadaInfo && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Información de la camada
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <span className="block text-sm text-gray-500 dark:text-gray-400">Nombre:</span>
              <span className="font-medium">{camadaInfo.nombre_camada}</span>
            </div>
            <div>
              <span className="block text-sm text-gray-500 dark:text-gray-400">Tipo de ave:</span>
              <span className="font-medium">{camadaInfo.tipo_ave} {camadaInfo.tipo_estirpe}</span>
            </div>
            <div>
              <span className="block text-sm text-gray-500 dark:text-gray-400">Fecha inicio:</span>
              <span className="font-medium">
                {camadaInfo.fecha_hora_inicio ? new Date(camadaInfo.fecha_hora_inicio).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div>
              <span className="block text-sm text-gray-500 dark:text-gray-400">Edad actual:</span>
              <span className="font-medium">
                {camadaInfo.fecha_hora_inicio ?
                  Math.floor((new Date() - new Date(camadaInfo.fecha_hora_inicio)) / (1000 * 60 * 60 * 24)) + ' días'
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sistema de pestañas */}
      <Tabs selectedIndex={tabIndex} onSelect={handleTabSelect}>
        <TabList className="flex border-b mb-4">
          <Tab
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors cursor-pointer
                        ${tabIndex === 0
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
          >
            Información General
          </Tab>
          <Tab
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors 
                        ${!tabsEnabled.luz
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : tabIndex === 1
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 cursor-pointer'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer'}`}
            disabled={!tabsEnabled.luz}
          >
            Monitoreo de Luz
          </Tab>
          <Tab
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors 
                        ${!tabsEnabled.actividad
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : tabIndex === 2
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 cursor-pointer'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer'}`}
            disabled={!tabsEnabled.actividad}
          >
            Monitoreo de Actividad
          </Tab>
          <Tab
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors 
                        ${!tabsEnabled.temperatura
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : tabIndex === 3
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 cursor-pointer'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer'}`}
            disabled={!tabsEnabled.temperatura}
          >
            Temperatura y Humedad
          </Tab>
          <Tab
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors 
                        ${!tabsEnabled.pesoMedio
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : tabIndex === 4
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 cursor-pointer'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer'}`}
            disabled={!tabsEnabled.pesoMedio}
          >
            Peso Medio Granjas
          </Tab>
          <Tab
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors 
    ${!tabsEnabled.pesadasCamada
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : tabIndex === 5
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 cursor-pointer'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer'}`}
            disabled={!tabsEnabled.pesadasCamada}
          >
            Pesadas Dispositivos
          </Tab>
        </TabList>

        <TabPanel>
          {/* Contenido de la pestaña de Información General */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Información General
            </h2>
            {selectedGranja ? (
              <div>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Bienvenido al panel de control para la granja seleccionada. Aquí podrá visualizar
                  información sobre las condiciones ambientales y el comportamiento de las aves.
                </p>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Para ver datos específicos, seleccione una camada en el menú superior y luego
                  navegue a las diferentes pestañas de monitoreo.
                </p>
                {selectedCamada ? (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded">
                    <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                      Camada seleccionada: {camadaInfo?.nombre_camada}
                    </h3>
                    <p className="text-blue-700 dark:text-blue-200">
                      Las pestañas de monitoreo ahora están activas. Haga clic en ellas para
                      ver los datos de Luz, Actividad, y Temperatura/Humedad.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900 rounded">
                    <p className="text-yellow-700 dark:text-yellow-200">
                      Para habilitar todas las funciones de monitoreo de aves, seleccione una camada.
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-200 mt-2">
                      La pestaña de Peso Medio ya está activa y no requiere seleccionar una camada.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-700 dark:text-gray-300">
                Por favor, seleccione una empresa y una granja para comenzar.
              </p>
            )}
          </div>
        </TabPanel>

        <TabPanel>
          {/* Vista de Monitoreo de Luz */}
          {tabsEnabled.luz && (
            <MonitoreoLuzView
              selectedEmpresa={selectedEmpresa}
              selectedGranja={selectedGranja}
              selectedCamada={selectedCamada}
              camadaInfo={camadaInfo}
              isEmbedded={true} // Indica que está en modo incrustado
            />
          )}
        </TabPanel>

        <TabPanel>
          {/* Vista de Monitoreo de Actividad */}
          {tabsEnabled.actividad && (
            <ActividadAvesView
              selectedEmpresa={selectedEmpresa}
              selectedGranja={selectedGranja}
              selectedCamada={selectedCamada}
              camadaInfo={camadaInfo}
              isEmbedded={true} // Indica que está en modo incrustado
            />
          )}
        </TabPanel>

        <TabPanel>
          {/* Vista de Temperatura y Humedad */}
          {tabsEnabled.temperatura && (
            <TemperaturaHumedadView
              selectedEmpresa={selectedEmpresa}
              selectedGranja={selectedGranja}
              selectedCamada={selectedCamada}
              camadaInfo={camadaInfo}
              isEmbedded={true} // Indica que está en modo incrustado
            />
          )}
        </TabPanel>

        <TabPanel>
          {/* Vista de Peso Medio */}
          {tabsEnabled.pesoMedio && (
            <PesoMedioGranjaView
              selectedEmpresa={selectedEmpresa}
              selectedGranja={selectedGranja}
              isEmbedded={true} // Indica que está en modo incrustado
            />
          )}
        </TabPanel>

        <TabPanel>
          {/* Vista de Pesadas de Camada */}
          {tabsEnabled.pesadasCamada && (
            <PesadasCamadaView
              selectedEmpresa={selectedEmpresa}
              selectedGranja={selectedGranja}
              selectedCamada={selectedCamada}
              camadaInfo={camadaInfo}
              isEmbedded={true} // Indica que está en modo incrustado
            />
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}