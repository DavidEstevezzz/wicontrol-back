import React, { useState, useEffect, useCallback } from 'react';
import EmpresaApiService from '../services/EmpresaApiService';
import GranjaApiService from '../services/GranjaApiService';
import DispositivoApiService from '../services/DispositivoApiService';
import CamadaApiService from '../services/CamadaApiService';
import Plot from 'react-plotly.js';
import UsuarioApiService from '../services/UsuarioApiService';
import { useStateContext } from '../contexts/ContextProvider';

export default function TemperaturaHumedadView({
    selectedEmpresa: propSelectedEmpresa,  // Empresa seleccionada desde el dashboard
    selectedGranja: propSelectedGranja,    // Granja seleccionada desde el dashboard
    selectedCamada: propSelectedCamada,    // Camada seleccionada desde el dashboard
    camadaInfo: propCamadaInfo,           // Información de camada desde el dashboard
    isEmbedded = false                    // Indica si está en modo incrustado
}) {
    const { user } = useStateContext();

    // Estado para gestionar las secciones principales
    const [activeSection, setActiveSection] = useState('actual'); // 'actual' o 'analisis'
    // Estado para gestionar las pestañas dentro de cada sección
    const [activeTab, setActiveTab] = useState('temperatura');

    // Estados para selección y filtros
    const [empresas, setEmpresas] = useState([]);
    const [granjas, setGranjas] = useState([]);
    const [camadas, setCamadas] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState(propSelectedEmpresa || '');
    const [selectedGranja, setSelectedGranja] = useState(propSelectedGranja || '');
    const [selectedCamada, setSelectedCamada] = useState(propSelectedCamada || '');
    const [fechaInicio, setFechaInicio] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 7); // Inicialmente, 7 días atrás
        return date.toISOString().slice(0, 10);
    });
    const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().slice(0, 10));
    const [fechaActual, setFechaActual] = useState(() => new Date().toISOString().slice(0, 10));

    // Estados para datos y carga
    const [dispositivosData, setDispositivosData] = useState([]);
    const [selectedDispositivo, setSelectedDispositivo] = useState(null);
    const [camadaInfo, setCamadaInfo] = useState(null);
    const [temperaturaData, setTemperaturaData] = useState(null);
    const [humedadData, setHumedadData] = useState(null);
    const [medidasTemperaturaData, setMedidasTemperaturaData] = useState(null);
    const [medidasHumedadData, setMedidasHumedadData] = useState(null);
    const [datosAmbientalesDiarios, setDatosAmbientalesDiarios] = useState(null);
    const [ubicacionesDispositivos, setUbicacionesDispositivos] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mostrarAlertas, setMostrarAlertas] = useState(false);
    const [soloAlertasActivas, setSoloAlertasActivas] = useState(false);
    const [mostrarAlertasHumedad, setMostrarAlertasHumedad] = useState(false);
    const [soloAlertasActivasHumedad, setSoloAlertasActivasHumedad] = useState(false);
    const [indicesData, setIndicesData] = useState(null);
    const [fechaLimites, setFechaLimites] = useState({
        inicio: null,
        fin: null
    });

    // Estado para el tema (claro/oscuro)
    const [isDarkMode, setIsDarkMode] = useState(false);



    // Detectar modo oscuro
    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setIsDarkMode(isDark);
        };

        checkDarkMode();

        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (isEmbedded) {
            if (propSelectedEmpresa) setSelectedEmpresa(propSelectedEmpresa);
            if (propSelectedGranja) setSelectedGranja(propSelectedGranja);
            if (propSelectedCamada) setSelectedCamada(propSelectedCamada);
            if (propCamadaInfo) setCamadaInfo(propCamadaInfo);

            // Si tenemos una camada seleccionada, cargar sus dispositivos
            if (propSelectedCamada) {
                loadDispositivos();
            }
        }
    }, [propSelectedEmpresa, propSelectedGranja, propSelectedCamada, propCamadaInfo, isEmbedded]);


    // 1. Cargar empresas según tipo de usuario
    useEffect(() => {
        if (!isEmbedded) {
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
        }
    }, [isEmbedded, user]);

    // 2. Cargar granjas al cambiar empresa con restricciones según tipo de usuario
    useEffect(() => {
        if (!isEmbedded && selectedEmpresa) {
            setLoading(true);
            GranjaApiService.getGranjasByEmpresa(selectedEmpresa)
                .then(data => {
                    // Filtrar granjas según el tipo de usuario
                    let granjasFiltradas = data;

                    if (user) {
                        if (user.usuario_tipo === 'SuperMaster' || user.usuario_tipo === 'Master') {
                            // SuperMaster y Master pueden ver todas las granjas
                            granjasFiltradas = data;
                        } else if (user.usuario_tipo === 'Responsable_Zona') {
                            // Responsable_Zona solo ve granjas donde sea responsable
                            granjasFiltradas = data.filter(granja => granja.responsable === user.id);
                        } else if (user.usuario_tipo === 'Ganadero') {
                            // Ganadero solo ve granjas donde sea ganadero
                            granjasFiltradas = data.filter(granja => granja.ganadero === user.id);
                        }
                    }

                    setGranjas(granjasFiltradas);
                })
                .catch(() => setError('No se pudieron cargar las granjas.'))
                .finally(() => setLoading(false));
        }
    }, [selectedEmpresa, isEmbedded, user]);

    // 3. Cargar camadas al cambiar granja con verificación de acceso
    useEffect(() => {
        if (!isEmbedded && selectedGranja) {
            // Verificar si el usuario tiene acceso a esta granja específica
            let tieneAcceso = true;

            if (user) {
                if (user.usuario_tipo === 'Responsable_Zona' || user.usuario_tipo === 'Ganadero') {
                    const granjaEncontrada = granjas.find(g => g.numero_rega === selectedGranja);
                    if (!granjaEncontrada) {
                        tieneAcceso = false;
                    }
                }
            }

            if (!tieneAcceso) {
                setError('No tiene acceso a esta granja.');
                setCamadas([]);
                return;
            }

            setLoading(true);
            CamadaApiService.getCamadasByGranja(selectedGranja)
                .then(data => setCamadas(data))
                .catch(() => setError('No se pudieron cargar las camadas.'))
                .finally(() => setLoading(false));
        }
    }, [selectedGranja, isEmbedded, granjas, user]);

    // 4. Cargar información detallada de la camada cuando se selecciona (solo si no está incrustado)
    useEffect(() => {
        if (!isEmbedded && selectedCamada && !propCamadaInfo) {
            setLoading(true);
            CamadaApiService.getCamadaInfo(selectedCamada)
                .then(data => {
                    setCamadaInfo(data);
                })
                .catch(error => {
                    console.error("Error al cargar información de camada:", error);
                    setError('No se pudo obtener la información de la camada.');
                })
                .finally(() => setLoading(false));
        }
    }, [selectedCamada, propCamadaInfo, isEmbedded]);

    // Establecer límites de fecha válidos según la información de la camada
    useEffect(() => {
        const info = isEmbedded ? (propCamadaInfo || camadaInfo) : camadaInfo;
        if (info && (info.fecha_hora_inicio || info.fecha_hora_final)) {
            const normalize = (str) => {
                if (!str) return null;
                const d = new Date(str);
                if (!isNaN(d.getTime())) {
                    return d.toISOString().slice(0, 10);
                }
                return str.split('T')[0].split(' ')[0];
            };
            setFechaLimites({
                inicio: normalize(info.fecha_hora_inicio),
                fin: normalize(info.fecha_hora_final)
            });
        } else {
            setFechaLimites({ inicio: null, fin: null });
        }
    }, [selectedCamada, propCamadaInfo, camadaInfo, isEmbedded]);

    // 5. Función para cargar dispositivos de la camada seleccionada
    // 5. Función para cargar dispositivos de la camada seleccionada con verificación de acceso
    const loadDispositivos = useCallback(async () => {
        if (!selectedCamada || loading) return;

        // Verificar acceso a la granja si no está en modo incrustado
        if (!isEmbedded && user) {
            if (user.usuario_tipo === 'Responsable_Zona' || user.usuario_tipo === 'Ganadero') {
                const granjaEncontrada = granjas.find(g => g.numero_rega === selectedGranja);
                if (!granjaEncontrada) {
                    setError('No tiene acceso a esta granja.');
                    return;
                }
            }
        }

        setLoading(true);
        setError('');
        setDispositivosData([]);
        setSelectedDispositivo(null);
        setTemperaturaData(null);
        setHumedadData(null);
        setDatosAmbientalesDiarios(null);
        setMedidasTemperaturaData(null);
        setMedidasHumedadData(null);

        try {
            // Cargar dispositivos asociados a la camada seleccionada
            const data = await CamadaApiService.getDispositivosByCamada(selectedCamada);
            setDispositivosData(data);

            // Cargar ubicaciones (granja y nave) para cada dispositivo
            const ubicaciones = {};
            await Promise.all(
                data.map(async (disp) => {
                    try {
                        const ubicacion = await DispositivoApiService.getGranjaYNave(disp.id_dispositivo);
                        ubicaciones[disp.id_dispositivo] = {
                            granja: ubicacion.granja.nombre,
                            nave: ubicacion.nave.id
                        };
                    } catch (error) {
                        console.error(`Error al cargar ubicación para dispositivo ${disp.id_dispositivo}:`, error);
                        ubicaciones[disp.id_dispositivo] = {
                            granja: 'Desconocida',
                            nave: 'N/A'
                        };
                    }
                })
            );

            setUbicacionesDispositivos(ubicaciones);

        } catch (error) {
            console.error('Error al cargar dispositivos:', error);
            setError('No se pudieron cargar los dispositivos: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [selectedCamada, loading, isEmbedded, user, granjas, selectedGranja]);

    const renderNoAccessMessage = () => {
        if (!isEmbedded && empresas.length === 0 && !loading) {
            return (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg text-yellow-700 dark:text-yellow-200 mb-6">
                    <p className="font-medium">No tiene acceso a ninguna empresa.</p>
                    <p>Contacte con el administrador si cree que esto es un error.</p>
                </div>
            );
        }
        return null;
    };

    // Función para obtener datos de índices IEC y THI
    const fetchIndicesData = useCallback(async () => {
        if (!selectedDispositivo || !fechaInicio || !fechaFin) {
            setError('Seleccione un dispositivo y fechas válidas.');
            return;
        }

        setLoading(true);
        setError('');
        setIndicesData(null);

        try {
            const data = await CamadaApiService.getIndicesAmbientalesRango(
                selectedDispositivo,
                fechaInicio,
                fechaFin
            );

            setIndicesData(data);
        } catch (error) {
            console.error('Error al obtener datos de índices:', error);
            setError('Error al procesar los datos de índices ambientales.');
        } finally {
            setLoading(false);
        }
    }, [selectedDispositivo, fechaInicio, fechaFin]);

    // 4. Función para obtener datos ambientales diarios
    const fetchDatosAmbientalesDiarios = useCallback(async () => {
        if (!selectedDispositivo || !fechaActual) {
            setError('Seleccione un dispositivo y fecha válida.');
            return;
        }

        setLoading(true);
        setError('');
        setDatosAmbientalesDiarios(null);

        try {
            const data = await CamadaApiService.getDatosAmbientalesDiarios(
                selectedDispositivo,
                fechaActual
            );

            setDatosAmbientalesDiarios(data);
        } catch (error) {
            console.error('Error al obtener datos ambientales diarios:', error);
            setError('Error al procesar los datos ambientales diarios.');
        } finally {
            setLoading(false);
        }
    }, [selectedDispositivo, fechaActual]);

    // 5. Función para obtener datos de temperatura y alertas
    // Modificar las funciones existentes para resetear el estado
    const fetchTemperaturaData = useCallback(async () => {
        if (!selectedDispositivo || !fechaInicio || !fechaFin) {
            setError('Seleccione un dispositivo y fechas válidas.');
            return;
        }

        setLoading(true);
        setError('');
        setTemperaturaData(null);
        // Resetear el filtro de alertas activas al buscar nuevos datos
        setSoloAlertasActivas(false);

        try {
            const data = await CamadaApiService.getTemperaturaGraficaAlertas(
                selectedDispositivo,
                fechaInicio,
                fechaFin,
                true
            );

            setTemperaturaData(data);
        } catch (error) {
            console.error('Error al obtener datos de temperatura:', error);
            setError('Error al procesar los datos de temperatura.');
        } finally {
            setLoading(false);
        }
    }, [selectedDispositivo, fechaInicio, fechaFin]);

    // 6. Función para obtener datos de humedad y alertas
    const fetchHumedadData = useCallback(async () => {
        if (!selectedDispositivo || !fechaInicio || !fechaFin) {
            setError('Seleccione un dispositivo y fechas válidas.');
            return;
        }

        setLoading(true);
        setError('');
        setHumedadData(null);
        // ✅ Resetear estados de alertas de humedad
        setSoloAlertasActivasHumedad(false);
        setMostrarAlertasHumedad(false);

        try {
            const data = await CamadaApiService.getHumedadGraficaAlertas(
                selectedDispositivo,
                fechaInicio,
                fechaFin
            );

            setHumedadData(data);
        } catch (error) {
            console.error('Error al obtener datos de humedad:', error);
            setError('Error al procesar los datos de humedad.');
        } finally {
            setLoading(false);
        }
    }, [selectedDispositivo, fechaInicio, fechaFin]);

    const formatDateToYYYYMMDD = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // 7. Función para obtener todas las medidas individuales de temperatura
    const fetchMedidasTemperatura = useCallback(async () => {
        if (!selectedDispositivo || !fechaInicio || !fechaFin) {
            setError('Seleccione un dispositivo y fechas válidas.');
            return;
        }

        setLoading(true);
        setError('');
        setMedidasTemperaturaData(null);

        try {
            const data = await CamadaApiService.getMedidasIndividuales(
                selectedDispositivo,
                'temperatura',
                fechaInicio,
                fechaFin
            );

            setMedidasTemperaturaData(data);
        } catch (error) {
            console.error('Error al obtener medidas de temperatura:', error);
            setError('Error al procesar las medidas de temperatura.');
        } finally {
            setLoading(false);
        }
    }, [selectedDispositivo, fechaInicio, fechaFin]);

    // 8. Función para obtener todas las medidas individuales de humedad
    const fetchMedidasHumedad = useCallback(async () => {
        if (!selectedDispositivo || !fechaInicio || !fechaFin) {
            setError('Seleccione un dispositivo y fechas válidas.');
            return;
        }

        setLoading(true);
        setError('');
        setMedidasHumedadData(null);

        try {
            const data = await CamadaApiService.getMedidasIndividuales(
                selectedDispositivo,
                'humedad',
                fechaInicio,
                fechaFin
            );

            setMedidasHumedadData(data);
        } catch (error) {
            console.error('Error al obtener medidas de humedad:', error);
            setError('Error al procesar las medidas de humedad.');
        } finally {
            setLoading(false);
        }
    }, [selectedDispositivo, fechaInicio, fechaFin]);

    // 8a. Función para manejar la selección rápida de fechas
    const handleQuickDateSelection = useCallback((option) => {
        if (!selectedDispositivo) return;

        const today = new Date();
        let startDate, endDate;
        let successMessage = '';

        switch (option) {
            case 'desde-inicio':
                // Usar la información de la camada que ya tenemos cargada
                if (camadaInfo && camadaInfo.fecha_hora_inicio) {
                    startDate = new Date(camadaInfo.fecha_hora_inicio);

                    // Verificar que la fecha sea válida
                    if (isNaN(startDate.getTime())) {
                        setError('La fecha de inicio de la camada no es válida');
                        return;
                    }

                    // Fecha fin será la fecha actual o fecha_hora_final (la que sea menor)
                    if (camadaInfo.fecha_hora_final) {
                        const finalDate = new Date(camadaInfo.fecha_hora_final);
                        if (!isNaN(finalDate.getTime())) {
                            endDate = finalDate < today ? finalDate : today;
                        } else {
                            endDate = today;
                        }
                    } else {
                        endDate = today;
                    }

                    successMessage = `Período configurado desde el inicio de la camada (${startDate.toLocaleDateString()})`;
                } else {
                    setError('No se pudo obtener la fecha de inicio de la camada');
                    return;
                }
                break;

            case 'ultima-semana':
                // Calcular fecha de hace 7 días
                endDate = today;
                startDate = new Date();
                startDate.setDate(today.getDate() - 7);

                successMessage = `Período configurado para la última semana (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;
                break;

            default:
                return;
        }

        const formattedStartDate = formatDateToYYYYMMDD(startDate);
        const formattedEndDate = formatDateToYYYYMMDD(endDate);

        // Actualizar los estados para la UI
        setFechaInicio(formattedStartDate);
        setFechaFin(formattedEndDate);

        // Limpiar errores previos
        const prevError = error;
        setError(successMessage);

        // Cargar datos automáticamente
        if (activeTab === 'temperatura') {
            fetchTemperaturaData();
            fetchMedidasTemperatura();
        } else if (activeTab === 'humedad') {
            fetchHumedadData();
            fetchMedidasHumedad();
        } else if (activeTab === 'indices') {
            fetchIndicesData();
        }

        // Restaurar el estado de error después
        setTimeout(() => {
            if (error === successMessage) {
                setError(prevError);
            }
        }, 3000);
    }, [selectedDispositivo, camadaInfo, activeTab, error, fetchTemperaturaData, fetchHumedadData, fetchMedidasTemperatura, fetchMedidasHumedad]);

    const renderQuickDateSelector = () => (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-100 dark:border-blue-800">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Selección rápida de fechas</h3>
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={() => handleQuickDateSelection('desde-inicio')}
                    disabled={loading || !selectedDispositivo || !camadaInfo}
                    className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-500 disabled:text-gray-200 text-sm flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Desde inicio de camada
                </button>
                <button
                    onClick={() => handleQuickDateSelection('ultima-semana')}
                    disabled={loading || !selectedDispositivo}
                    className="py-2 px-4 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-500 disabled:text-gray-200 text-sm flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Última semana
                </button>
            </div>
        </div>
    );

    // ---------- Validación de fechas ----------
    const handleFechaActualChange = (newFecha) => {
        if (fechaLimites.inicio && newFecha < fechaLimites.inicio) {
            setError(`❌ La fecha no puede ser anterior al inicio de la camada (${fechaLimites.inicio})`);
            return;
        }
        if (fechaLimites.fin && newFecha > fechaLimites.fin) {
            setError(`❌ La fecha no puede ser posterior al final de la camada (${fechaLimites.fin})`);
            return;
        }
        setFechaActual(newFecha);
        if (error.startsWith('❌ La fecha')) setError('');
    };

    const handleFechaInicioChange = (newFecha) => {
        if (fechaLimites.inicio && newFecha < fechaLimites.inicio) {
            setError(`❌ La fecha de inicio no puede ser anterior al inicio de la camada (${fechaLimites.inicio})`);
            return;
        }
        if (fechaLimites.fin && newFecha > fechaLimites.fin) {
            setError(`❌ La fecha de inicio no puede ser posterior al final de la camada (${fechaLimites.fin})`);
            return;
        }
        if (fechaFin && newFecha > fechaFin) {
            setError(`❌ La fecha de inicio no puede ser posterior a la fecha de fin (${fechaFin})`);
            return;
        }
        setFechaInicio(newFecha);
        if (error.startsWith('❌ La fecha')) setError('');
    };

    const handleFechaFinChange = (newFecha) => {
        if (fechaLimites.inicio && newFecha < fechaLimites.inicio) {
            setError(`❌ La fecha de fin no puede ser anterior al inicio de la camada (${fechaLimites.inicio})`);
            return;
        }
        if (fechaLimites.fin && newFecha > fechaLimites.fin) {
            setError(`❌ La fecha de fin no puede ser posterior al final de la camada (${fechaLimites.fin})`);
            return;
        }
        if (fechaInicio && newFecha < fechaInicio) {
            setError(`❌ La fecha de fin no puede ser anterior a la fecha de inicio (${fechaInicio})`);
            return;
        }
        setFechaFin(newFecha);
        if (error.startsWith('❌ La fecha')) setError('');
    };

    // 9. Función para analizar datos según la pestaña activa
    const analizarDatosRango = useCallback(() => {
        if (activeTab === 'temperatura') {
            fetchTemperaturaData();
            fetchMedidasTemperatura();
        } else if (activeTab === 'humedad') {
            fetchHumedadData();
            fetchMedidasHumedad();
        } else if (activeTab === 'indices') {
            fetchIndicesData();
        }
    }, [activeTab, fetchTemperaturaData, fetchHumedadData, fetchMedidasTemperatura, fetchMedidasHumedad, fetchIndicesData]);

    // 10. Definición del tema (claro/oscuro)
    const theme = isDarkMode ?
        {
            bg: '#1e293b',
            paper: '#0f172a',
            grid: '#334155',
            text: '#e2e8f0',
            axisLine: '#64748b',
            primary: '#60a5fa',
            secondary: '#f87171',
            accent: '#34d399',
            alertaAlta: '#f87171',
            alertaBaja: '#38bdf8',
            reference: '#fbbf24',
            limiteInferior: '#a78bfa',
            limiteSuperior: '#fb923c'
        } :
        {
            bg: '#ffffff',
            paper: '#f8fafc',
            grid: '#e2e8f0',
            text: '#334155',
            axisLine: '#94a3b8',
            primary: '#3b82f6',
            secondary: '#ef4444',
            accent: '#10b981',
            alertaAlta: '#ef4444',
            alertaBaja: '#0ea5e9',
            reference: '#f59e0b',
            limiteInferior: '#8b5cf6',
            limiteSuperior: '#f97316'
        };

    // 11. Configuración base para gráficas Plotly
    const baseLayout = {
        font: {
            family: 'Inter, system-ui, sans-serif',
            color: theme.text
        },
        paper_bgcolor: theme.paper,
        plot_bgcolor: theme.bg,
        margin: { l: 60, r: 20, t: 40, b: 170 }, // Márgenes ampliados para las etiquetas
        hovermode: 'closest',
        xaxis: {
            gridcolor: theme.grid,
            zerolinecolor: theme.axisLine,
            linecolor: theme.axisLine,
            title: {
                font: { size: 14, color: theme.text }
            },
            tickangle: -45
        },
        yaxis: {
            gridcolor: theme.grid,
            zerolinecolor: theme.axisLine,
            linecolor: theme.axisLine,
            title: {
                font: { size: 14, color: theme.text }
            }
        },
        legend: {
            font: { color: theme.text },
            orientation: 'h',
            y: -0.5,
            x: 0.5,
            xanchor: 'center'
        }
    };

    // Componente de semicírculo (gauge) para mostrar valores
    // Componente de semicírculo (gauge) para mostrar valores
    const SemicirculoGauge = ({
        valor,
        valorMin = null,
        valorMax = null,
        minimo,
        maximo,
        unidad,
        color,
        titulo,
        size = 120
    }) => {
        const radio = size / 2 - 15;
        const centerX = size / 2;
        const centerY = size / 2 + 10;

        // Función para convertir coordenadas polares a cartesianas
        const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
            const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
            return {
                x: centerX + (radius * Math.cos(angleInRadians)),
                y: centerY + (radius * Math.sin(angleInRadians))
            };
        };

        // Función para crear el path del arco
        const describeArc = (x, y, radius, startAngle, endAngle) => {
            // dibuja de startAngle → endAngle
            const start = polarToCartesian(x, y, radius, startAngle);
            const end = polarToCartesian(x, y, radius, endAngle);
            const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";
            // y usa sweep-flag=1 para que gire “hacia abajo”
            return [
                "M", start.x, start.y,
                "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y
            ].join(" ");
        };

        // Calcular ángulos correctos para semicírculo (-90° a +90°)
        // -90° = izquierda, 0° = arriba, +90° = derecha
        const anguloInicio = -90; // Lado izquierdo
        const anguloFin = 90;     // Lado derecho

        // Calcular el ángulo del valor principal
        let anguloValor = null;
        if (valor !== null && valor >= minimo && valor <= maximo) {
            const porcentaje = (valor - minimo) / (maximo - minimo);
            anguloValor = anguloInicio + (porcentaje * 180); // De -90° a +90°
        }

        // Calcular ángulos para min y max si existen
        let anguloMin = null, anguloMax = null;
        if (valorMin !== null && valorMin >= minimo && valorMin <= maximo) {
            const porcentajeMin = (valorMin - minimo) / (maximo - minimo);
            anguloMin = anguloInicio + (porcentajeMin * 180);
        }
        if (valorMax !== null && valorMax >= minimo && valorMax <= maximo) {
            const porcentajeMax = (valorMax - minimo) / (maximo - minimo);
            anguloMax = anguloInicio + (porcentajeMax * 180);
        }

        const puntoValor = anguloValor !== null
            ? polarToCartesian(centerX, centerY, radio, anguloValor)
            : null;
        const puntoMin = anguloMin !== null
            ? polarToCartesian(centerX, centerY, radio, anguloMin)
            : null;
        const puntoMax = anguloMax !== null
            ? polarToCartesian(centerX, centerY, radio, anguloMax)
            : null;

        return (
            <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {titulo}
                </div>
                <svg width={size} height={size / 2 + 20} className="mb-2">
                    {/* Fondo del semicírculo */}
                    <path
                        d={describeArc(centerX, centerY, radio, anguloInicio, anguloFin)}
                        stroke="#e5e7eb"
                        strokeWidth="8"
                        fill="none"
                        className="dark:stroke-gray-600"
                    />

                    {/* Relleno del valor principal */}
                    {anguloValor !== null && (
                        <path
                            d={describeArc(centerX, centerY, radio, anguloInicio, anguloValor)}
                            stroke={color}
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                        />
                    )}

                    {/* Marcadores sutiles para min y max */}
                    {puntoMin && (
                        <>

                            <circle
                                cx={puntoMin.x}
                                cy={puntoMin.y}
                                r="4"
                                fill="#3b82f6"
                                stroke="#fff"
                                strokeWidth="1"
                            />
                        </>
                    )}

                    {puntoMax && (
                        <>

                            <circle
                                cx={puntoMax.x}
                                cy={puntoMax.y}
                                r="4"
                                fill="#ef4444"
                                stroke="#fff"
                                strokeWidth="1"
                            />
                        </>
                    )}

                    {/* Línea indicadora del valor actual */}
                    +{puntoValor && (
                        <>
                            <line
                                x1={centerX}
                                y1={centerY}
                                x2={puntoValor.x}
                                y2={puntoValor.y}
                                stroke="#fff"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                            />
                            <circle
                                cx={puntoValor.x}
                                cy={puntoValor.y}
                                r="4"
                                fill={color}
                                stroke="#fff"
                                strokeWidth="1"
                            />
                        </>
                    )}

                    {/* Punto central */}
                    <circle
                        cx={centerX}
                        cy={centerY}
                        r="3"
                        fill={color}
                    />

                    {/* Etiquetas de escala */}
                    <text
                        x={centerX + radio * Math.cos(anguloInicio * Math.PI / 180)}
                        y={centerY + radio * Math.sin(anguloInicio * Math.PI / 180) + 15}
                        className="text-xs fill-gray-500 dark:fill-gray-400"
                        textAnchor="middle"
                    >
                        {minimo}
                    </text>
                    <text
                        x={centerX + radio * Math.cos(anguloFin * Math.PI / 180)}
                        y={centerY + radio * Math.sin(anguloFin * Math.PI / 180) + 15}
                        className="text-xs fill-gray-500 dark:fill-gray-400"
                        textAnchor="middle"
                    >
                        {maximo}
                    </text>
                </svg>

                {/* Valor principal */}
                <div className="text-center">
                    <div className={`text-lg font-bold`} style={{ color: color }}>
                        {valor !== null ? `${valor}${unidad}` : 'N/A'}
                    </div>

                    {/* Valores min/max si existen */}
                    {(valorMin !== null || valorMax !== null) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {valorMin !== null && (
                                <span className="text-blue-600 dark:text-blue-400">
                                    Min: {valorMin}{unidad}
                                </span>
                            )}
                            {valorMin !== null && valorMax !== null && <span className="mx-1">|</span>}
                            {valorMax !== null && (
                                <span className="text-red-600 dark:text-red-400">
                                    Max: {valorMax}{unidad}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Funciones para gráficas de índices IEC y THI

    // Layout para gráfica de IEC
    const getIECGraficaLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Índice de Estrés Calórico (IEC)',
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Fecha',
                font: { size: 14, color: theme.text }
            },
            type: 'category'
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'IEC (°C + %)',
                font: { size: 14, color: theme.text }
            }
        },
        shapes: [
            // Zona Normal (0-105)
            {
                type: 'rect',
                xref: 'paper',
                yref: 'y',
                x0: 0,
                y0: 0,
                x1: 1,
                y1: 105,
                fillcolor: 'rgba(34, 197, 94, 0.1)',
                layer: 'below',
                line: { width: 0 }
            },
            // Zona Moderada (105-120)
            {
                type: 'rect',
                xref: 'paper',
                yref: 'y',
                x0: 0,
                y0: 105,
                x1: 1,
                y1: 120,
                fillcolor: 'rgba(234, 179, 8, 0.1)',
                layer: 'below',
                line: { width: 0 }
            },
            // Zona Alta (120-130)
            {
                type: 'rect',
                xref: 'paper',
                yref: 'y',
                x0: 0,
                y0: 120,
                x1: 1,
                y1: 130,
                fillcolor: 'rgba(249, 115, 22, 0.1)',
                layer: 'below',
                line: { width: 0 }
            },
            // Zona Crítica (130+)
            {
                type: 'rect',
                xref: 'paper',
                yref: 'y',
                x0: 0,
                y0: 130,
                x1: 1,
                y1: 200,
                fillcolor: 'rgba(239, 68, 68, 0.1)',
                layer: 'below',
                line: { width: 0 }
            }
        ],

    });

    // Layout para gráfica de THI
    const getTHIGraficaLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Índice Temperatura-Humedad (THI)',
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Fecha',
                font: { size: 14, color: theme.text }
            },
            type: 'category'
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'THI',
                font: { size: 14, color: theme.text }
            }
        },
        shapes: [
            // Zona Normal (0-72)
            {
                type: 'rect',
                xref: 'paper',
                yref: 'y',
                x0: 0,
                y0: 0,
                x1: 1,
                y1: 72,
                fillcolor: 'rgba(34, 197, 94, 0.1)',
                layer: 'below',
                line: { width: 0 }
            },
            // Zona Moderada (72-79)
            {
                type: 'rect',
                xref: 'paper',
                yref: 'y',
                x0: 0,
                y0: 72,
                x1: 1,
                y1: 79,
                fillcolor: 'rgba(234, 179, 8, 0.1)',
                layer: 'below',
                line: { width: 0 }
            },
            // Zona Alta (79-88)
            {
                type: 'rect',
                xref: 'paper',
                yref: 'y',
                x0: 0,
                y0: 79,
                x1: 1,
                y1: 88,
                fillcolor: 'rgba(249, 115, 22, 0.1)',
                layer: 'below',
                line: { width: 0 }
            },
            // Zona Crítica (88+)
            {
                type: 'rect',
                xref: 'paper',
                yref: 'y',
                x0: 0,
                y0: 88,
                x1: 1,
                y1: 100,
                fillcolor: 'rgba(239, 68, 68, 0.1)',
                layer: 'below',
                line: { width: 0 }
            }
        ],

    });

    // Datos para gráfica de IEC
    const getIECGraficaData = () => {
        if (!indicesData || !indicesData.datos_grafica || indicesData.datos_grafica.length === 0) {
            return [];
        }

        // Función para obtener color según nivel
        const getColorByLevel = (nivel) => {
            if (!nivel) return theme.primary;
            switch (nivel.nivel) {
                case 'normal': return '#22c55e';
                case 'moderado': return '#eab308';
                case 'alto': return '#f97316';
                case 'critico': return '#ef4444';
                default: return theme.primary;
            }
        };

        // Línea principal de IEC media
        const traceIECMedia = {
            type: 'scatter',
            mode: 'lines+markers',
            name: 'IEC Media',
            x: indicesData.datos_grafica.map(d => d.fecha),
            y: indicesData.datos_grafica.map(d => d.iec_media),
            line: {
                color: theme.primary,
                width: 3
            },
            marker: {
                size: 8,
                color: indicesData.datos_grafica.map(d => getColorByLevel(d.iec_nivel)),
                line: {
                    color: isDarkMode ? theme.bg : 'white',
                    width: 1.5
                }
            },
            hovertemplate: 'Fecha: %{x}<br>IEC: %{y:.1f}<br>Nivel: %{text}<extra></extra>',
            text: indicesData.datos_grafica.map(d => d.iec_nivel ? d.iec_nivel.nivel : 'N/A')
        };

        // Líneas de mínimo y máximo
        const traceIECMin = {
            type: 'scatter',
            mode: 'lines',
            name: 'IEC Mínimo',
            x: indicesData.datos_grafica.map(d => d.fecha),
            y: indicesData.datos_grafica.map(d => d.iec_minimo),
            line: {
                color: theme.alertaBaja,
                width: 1.5,
                dash: 'dot'
            },
            hovertemplate: 'Fecha: %{x}<br>IEC Mín: %{y:.1f}<extra></extra>'
        };

        const traceIECMax = {
            type: 'scatter',
            mode: 'lines',
            name: 'IEC Máximo',
            x: indicesData.datos_grafica.map(d => d.fecha),
            y: indicesData.datos_grafica.map(d => d.iec_maximo),
            line: {
                color: theme.alertaAlta,
                width: 1.5,
                dash: 'dot'
            },
            hovertemplate: 'Fecha: %{x}<br>IEC Máx: %{y:.1f}<extra></extra>'
        };

        return [traceIECMin, traceIECMax, traceIECMedia];
    };

    // Datos para gráfica de THI
    const getTHIGraficaData = () => {
        if (!indicesData || !indicesData.datos_grafica || indicesData.datos_grafica.length === 0) {
            return [];
        }

        // Función para obtener color según nivel
        const getColorByLevel = (nivel) => {
            if (!nivel) return theme.primary;
            switch (nivel.nivel) {
                case 'normal': return '#22c55e';
                case 'moderado': return '#eab308';
                case 'alto': return '#f97316';
                case 'critico': return '#ef4444';
                default: return theme.primary;
            }
        };

        // Línea principal de THI media
        const traceTHIMedia = {
            type: 'scatter',
            mode: 'lines+markers',
            name: 'THI Media',
            x: indicesData.datos_grafica.map(d => d.fecha),
            y: indicesData.datos_grafica.map(d => d.thi_media),
            line: {
                color: theme.primary,
                width: 3
            },
            marker: {
                size: 8,
                color: indicesData.datos_grafica.map(d => getColorByLevel(d.thi_nivel)),
                line: {
                    color: isDarkMode ? theme.bg : 'white',
                    width: 1.5
                }
            },
            hovertemplate: 'Fecha: %{x}<br>THI: %{y:.1f}<br>Nivel: %{text}<extra></extra>',
            text: indicesData.datos_grafica.map(d => d.thi_nivel ? d.thi_nivel.nivel : 'N/A')
        };

        // Líneas de mínimo y máximo
        const traceTHIMin = {
            type: 'scatter',
            mode: 'lines',
            name: 'THI Mínimo',
            x: indicesData.datos_grafica.map(d => d.fecha),
            y: indicesData.datos_grafica.map(d => d.thi_minimo),
            line: {
                color: theme.alertaBaja,
                width: 1.5,
                dash: 'dot'
            },
            hovertemplate: 'Fecha: %{x}<br>THI Mín: %{y:.1f}<extra></extra>'
        };

        const traceTHIMax = {
            type: 'scatter',
            mode: 'lines',
            name: 'THI Máximo',
            x: indicesData.datos_grafica.map(d => d.fecha),
            y: indicesData.datos_grafica.map(d => d.thi_maximo),
            line: {
                color: theme.alertaAlta,
                width: 1.5,
                dash: 'dot'
            },
            hovertemplate: 'Fecha: %{x}<br>THI Máx: %{y:.1f}<extra></extra>'
        };

        return [traceTHIMin, traceTHIMax, traceTHIMedia];
    };

    const getTemperaturaGraficaLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Evolución de Temperatura',
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Fecha',
                font: { size: 14, color: theme.text }
            },
            type: 'category'
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'Temperatura (°C)',
                font: { size: 14, color: theme.text }
            }
        }
    });



    const getHumedadGraficaLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Evolución de Humedad',
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Fecha',
                font: { size: 14, color: theme.text }
            },
            type: 'category'
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'Humedad (%)',
                font: { size: 14, color: theme.text }
            }
        }
    });

    const getMedidasTemperaturaLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Todas las medidas de temperatura',
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Fecha y Hora',
                font: { size: 14, color: theme.text }
            },
            type: 'date'
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'Temperatura (°C)',
                font: { size: 14, color: theme.text }
            }
        }
    });

    const getMedidasHumedadLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Todas las medidas de humedad',
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Fecha y Hora',
                font: { size: 14, color: theme.text }
            },
            type: 'date'
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'Humedad (%)',
                font: { size: 14, color: theme.text }
            }
        }
    });

    const baseConfig = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToAdd: ['zoom2d', 'pan2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d'],
        displaylogo: false,
        scrollZoom: true,
        toImageButtonOptions: {
            format: 'png',
            filename: 'grafico_temperatura_humedad',
            height: 500,
            width: 700,
            scale: 1
        }
    };

    // 12. Configuración de datos para gráfica de temperatura
    const getTemperaturaGraficaData = () => {
        if (!temperaturaData || !temperaturaData.datos_grafica || temperaturaData.datos_grafica.length === 0) {
            return [];
        }

        // Datos de temperatura media
        const traceTemperatura = {
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Temperatura Media',
            x: temperaturaData.datos_grafica.map(d => d.fecha),
            y: temperaturaData.datos_grafica.map(d => d.temperatura_media),
            line: {
                color: theme.primary,
                width: 3,
                shape: 'spline'
            },
            marker: {
                size: 8,
                color: theme.primary,
                line: {
                    color: isDarkMode ? theme.bg : 'white',
                    width: 1.5
                }
            },
            hovertemplate: 'Fecha: %{x}<br>Temperatura: %{y:.1f}°C<extra></extra>'
        };

        // Datos de temperatura mínima y máxima
        const traceMin = {
            type: 'scatter',
            mode: 'lines',
            name: 'Temperatura Mínima',
            x: temperaturaData.datos_grafica.map(d => d.fecha),
            y: temperaturaData.datos_grafica.map(d => typeof d.temperatura_min === 'string' ? parseFloat(d.temperatura_min) : d.temperatura_min),
            line: {
                color: theme.alertaBaja,
                width: 1.5,
                dash: 'dot'
            },
            hovertemplate: 'Fecha: %{x}<br>Mínima: %{y:.1f}°C<extra></extra>'
        };

        const traceMax = {
            type: 'scatter',
            mode: 'lines',
            name: 'Temperatura Máxima',
            x: temperaturaData.datos_grafica.map(d => d.fecha),
            y: temperaturaData.datos_grafica.map(d => typeof d.temperatura_max === 'string' ? parseFloat(d.temperatura_max) : d.temperatura_max),
            line: {
                color: theme.alertaAlta,
                width: 1.5,
                dash: 'dot'
            },
            hovertemplate: 'Fecha: %{x}<br>Máxima: %{y:.1f}°C<extra></extra>'
        };

        // Datos de temperatura de referencia
        const traceReferencia = {
            type: 'scatter',
            mode: 'lines',
            name: 'Temperatura Referencia',
            x: temperaturaData.datos_grafica.map(d => d.fecha),
            y: temperaturaData.datos_grafica.map(d => d.temperatura_referencia),
            line: {
                color: theme.reference,
                width: 2.5
            },
            hovertemplate: 'Fecha: %{x}<br>Referencia: %{y:.1f}°C<br>Edad: %{text} días<extra></extra>',
            text: temperaturaData.datos_grafica.map(d => d.edad_dias)
        };

        // Límites aceptables
        const traceLimiteInferior = {
            type: 'scatter',
            mode: 'lines',
            name: 'Límite Inferior',
            x: temperaturaData.datos_grafica.map(d => d.fecha),
            y: temperaturaData.datos_grafica.map(d => d.limite_inferior),
            line: {
                color: theme.limiteInferior,
                width: 1.5,
                dash: 'dash'
            },
            hovertemplate: 'Fecha: %{x}<br>Límite inferior: %{y:.1f}°C<extra></extra>'
        };

        const traceLimiteSuperior = {
            type: 'scatter',
            mode: 'lines',
            name: 'Límite Superior',
            x: temperaturaData.datos_grafica.map(d => d.fecha),
            y: temperaturaData.datos_grafica.map(d => d.limite_superior),
            line: {
                color: theme.limiteSuperior,
                width: 1.5,
                dash: 'dash'
            },
            hovertemplate: 'Fecha: %{x}<br>Límite superior: %{y:.1f}°C<extra></extra>'
        };

        // Añadir sombreado entre los límites
        const traceFill = {
            type: 'scatter',
            mode: 'none',
            name: 'Rango Aceptable',
            x: [
                ...temperaturaData.datos_grafica.map(d => d.fecha),
                ...temperaturaData.datos_grafica.map(d => d.fecha).reverse()
            ],
            y: [
                ...temperaturaData.datos_grafica.map(d => d.limite_inferior),
                ...temperaturaData.datos_grafica.map(d => d.limite_superior).reverse()
            ],
            fill: 'toself',
            fillcolor: isDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.1)',
            line: { color: 'transparent' },
            hoverinfo: 'skip',
            showlegend: true
        };

        return [traceFill, traceLimiteInferior, traceLimiteSuperior, traceReferencia, traceMin, traceMax, traceTemperatura];
    };

    // 13. Configuración de datos para gráfica de humedad
    const getHumedadGraficaData = () => {
        if (!humedadData || !humedadData.datos_grafica || humedadData.datos_grafica.length === 0) {
            return [];
        }

        // Datos de humedad media
        const traceHumedad = {
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Humedad Media',
            x: humedadData.datos_grafica.map(d => d.fecha),
            y: humedadData.datos_grafica.map(d => d.humedad_media),
            line: {
                color: theme.primary,
                width: 3,
                shape: 'spline'
            },
            marker: {
                size: 8,
                color: theme.primary,
                line: {
                    color: isDarkMode ? theme.bg : 'white',
                    width: 1.5
                }
            },
            hovertemplate: 'Fecha: %{x}<br>Humedad: %{y:.1f}%<extra></extra>'
        };

        // Datos de humedad mínima y máxima
        const traceMin = {
            type: 'scatter',
            mode: 'lines',
            name: 'Humedad Mínima',
            x: humedadData.datos_grafica.map(d => d.fecha),
            y: humedadData.datos_grafica.map(d => typeof d.humedad_min === 'string' ? parseFloat(d.humedad_min) : d.humedad_min),
            line: {
                color: theme.alertaBaja,
                width: 1.5,
                dash: 'dot'
            },
            hovertemplate: 'Fecha: %{x}<br>Mínima: %{y:.1f}%<extra></extra>'
        };

        const traceMax = {
            type: 'scatter',
            mode: 'lines',
            name: 'Humedad Máxima',
            x: humedadData.datos_grafica.map(d => d.fecha),
            y: humedadData.datos_grafica.map(d => typeof d.humedad_max === 'string' ? parseFloat(d.humedad_max) : d.humedad_max),
            line: {
                color: theme.alertaAlta,
                width: 1.5,
                dash: 'dot'
            },
            hovertemplate: 'Fecha: %{x}<br>Máxima: %{y:.1f}%<extra></extra>'
        };

        // Datos de humedad de referencia
        const traceReferencia = {
            type: 'scatter',
            mode: 'lines',
            name: 'Humedad Referencia',
            x: humedadData.datos_grafica.map(d => d.fecha),
            y: humedadData.datos_grafica.map(d => d.humedad_referencia),
            line: {
                color: theme.reference,
                width: 2.5
            },
            hovertemplate: 'Fecha: %{x}<br>Referencia: %{y:.1f}%<br>Edad: %{text} días<extra></extra>',
            text: humedadData.datos_grafica.map(d => d.edad_dias)
        };

        // Límites aceptables
        const traceLimiteInferior = {
            type: 'scatter',
            mode: 'lines',
            name: 'Límite Inferior',
            x: humedadData.datos_grafica.map(d => d.fecha),
            y: humedadData.datos_grafica.map(d => d.limite_inferior),
            line: {
                color: theme.limiteInferior,
                width: 1.5,
                dash: 'dash'
            },
            hovertemplate: 'Fecha: %{x}<br>Límite inferior: %{y:.1f}%<extra></extra>'
        };

        const traceLimiteSuperior = {
            type: 'scatter',
            mode: 'lines',
            name: 'Límite Superior',
            x: humedadData.datos_grafica.map(d => d.fecha),
            y: humedadData.datos_grafica.map(d => d.limite_superior),
            line: {
                color: theme.limiteSuperior,
                width: 1.5,
                dash: 'dash'
            },
            hovertemplate: 'Fecha: %{x}<br>Límite superior: %{y:.1f}%<extra></extra>'
        };

        // Añadir sombreado entre los límites
        const traceFill = {
            type: 'scatter',
            mode: 'none',
            name: 'Rango Aceptable',
            x: [
                ...humedadData.datos_grafica.map(d => d.fecha),
                ...humedadData.datos_grafica.map(d => d.fecha).reverse()
            ],
            y: [
                ...humedadData.datos_grafica.map(d => d.limite_inferior),
                ...humedadData.datos_grafica.map(d => d.limite_superior).reverse()
            ],
            fill: 'toself',
            fillcolor: isDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.1)',
            line: { color: 'transparent' },
            hoverinfo: 'skip',
            showlegend: true
        };

        return [traceFill, traceLimiteInferior, traceLimiteSuperior, traceReferencia, traceMin, traceMax, traceHumedad];
    };

    // 14. Configuración de datos para gráfica de medidas individuales de temperatura
    const getMedidasTemperaturaData = () => {
        if (!medidasTemperaturaData || !medidasTemperaturaData.medidas || medidasTemperaturaData.medidas.length === 0) {
            return [];
        }

        // Obtener todas las lecturas individuales de temperatura
        const traceMedidas = {
            type: 'scatter',
            mode: 'lines+markers', // ✅ CAMBIO: de 'markers' a 'lines+markers'
            name: 'Medidas individuales',
            x: medidasTemperaturaData.medidas.map(d => d.fecha),
            y: medidasTemperaturaData.medidas.map(d => d.valor),
            line: {
                color: theme.primary,
                width: 2,
                shape: 'spline' // ✅ AGREGADO: línea suavizada
            },
            marker: {
                size: 4, // ✅ REDUCIDO: marcadores más pequeños para línea continua
                color: theme.primary,
                opacity: 0.8
            },
            hovertemplate: 'Fecha: %{x}<br>Temperatura: %{y:.1f}°C<extra></extra>'
        };

        // Línea de temperatura media
        const traceMedia = {
            type: 'scatter',
            mode: 'lines',
            name: 'Media',
            x: [medidasTemperaturaData.medidas[0].fecha, medidasTemperaturaData.medidas[medidasTemperaturaData.medidas.length - 1].fecha],
            y: [medidasTemperaturaData.estadisticas.media, medidasTemperaturaData.estadisticas.media],
            line: {
                color: theme.reference,
                width: 2,
                dash: 'dash'
            },
            hovertemplate: 'Media: %{y:.1f}°C<extra></extra>'
        };

        return [traceMedidas, traceMedia];
    };

    // 15. Configuración de datos para gráfica de medidas individuales de humedad
    const getMedidasHumedadData = () => {
        if (!medidasHumedadData || !medidasHumedadData.medidas || medidasHumedadData.medidas.length === 0) {
            return [];
        }

        // Obtener todas las lecturas individuales de humedad
        const traceMedidas = {
            type: 'scatter',
            mode: 'lines+markers', // ✅ CAMBIO: de 'markers' a 'lines+markers'
            name: 'Medidas individuales',
            x: medidasHumedadData.medidas.map(d => d.fecha),
            y: medidasHumedadData.medidas.map(d => d.valor),
            line: {
                color: theme.primary,
                width: 2,
                shape: 'spline' // ✅ AGREGADO: línea suavizada
            },
            marker: {
                size: 4, // ✅ REDUCIDO: marcadores más pequeños para línea continua
                color: theme.primary,
                opacity: 0.8
            },
            hovertemplate: 'Fecha: %{x}<br>Humedad: %{y:.1f}%<extra></extra>'
        };

        // Línea de humedad media
        const traceMedia = {
            type: 'scatter',
            mode: 'lines',
            name: 'Media',
            x: [medidasHumedadData.medidas[0].fecha, medidasHumedadData.medidas[medidasHumedadData.medidas.length - 1].fecha],
            y: [medidasHumedadData.estadisticas.media, medidasHumedadData.estadisticas.media],
            line: {
                color: theme.reference,
                width: 2,
                dash: 'dash'
            },
            hovertemplate: 'Media: %{y:.1f}%<extra></extra>'
        };

        return [traceMedidas, traceMedia];
    };


    // Renderizar tabla de alertas de temperatura
    // Renderizar tabla de alertas de temperatura
    const renderTablaAlertasTemperatura = () => {
        if (!temperaturaData || !temperaturaData.alertas || temperaturaData.alertas.length === 0) {
            return (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-green-600 dark:text-green-400 font-medium">
                        No se encontraron lecturas fuera de los rangos aceptables en el período seleccionado.
                    </p>
                </div>
            );
        }

        // Determinar qué alertas mostrar según el filtro
        let alertasAMostrar = temperaturaData.alertas;

        if (soloAlertasActivas && temperaturaData.alertas_activas_actuales) {
            // ✅ CORRECCIÓN: Solo mostrar la alerta que está realmente activa
            alertasAMostrar = [];

            // Si hay alerta activa de temperatura baja, mostrar solo esa
            if (temperaturaData.alertas_activas_actuales.temperatura_baja) {
                const alertaBaja = temperaturaData.alertas_activas_actuales.temperatura_baja.inicio;
                alertasAMostrar = [alertaBaja];
            }

            // Si hay alerta activa de temperatura alta, mostrar solo esa  
            if (temperaturaData.alertas_activas_actuales.temperatura_alta) {
                const alertaAlta = temperaturaData.alertas_activas_actuales.temperatura_alta.inicio;
                alertasAMostrar = [alertaAlta];
            }
        }

        // Ordenar alertas por fecha y hora
        const alertasOrdenadas = [...alertasAMostrar].sort((a, b) => {
            const fechaA = new Date(`${a.fecha}T${a.hora}`);
            const fechaB = new Date(`${b.fecha}T${b.hora}`);
            return fechaB - fechaA; // Más recientes primero
        });


        // Calcular estadísticas
        const totalAlertas = temperaturaData.alertas.length;
        const alertasAltas = temperaturaData.alertas.filter(a => a.tipo === 'alta').length;
        const alertasBajas = temperaturaData.alertas.filter(a => a.tipo === 'baja').length;

        // Información sobre alertas activas (si está disponible)
        const hayAlertaActivaBaja = temperaturaData.alertas_activas_actuales?.temperatura_baja !== null;
        const hayAlertaActivaAlta = temperaturaData.alertas_activas_actuales?.temperatura_alta !== null;
        const totalAlertasActivas = (hayAlertaActivaBaja ? 1 : 0) + (hayAlertaActivaAlta ? 1 : 0);

        return (
            <div className="space-y-4">
                {/* Header con estadísticas y controles */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Estadísticas generales */}
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center">
                                <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                                <span className="text-gray-600 dark:text-gray-400">
                                    Temp. Alta: <span className="font-semibold">{alertasAltas}</span>
                                </span>
                            </div>
                            <div className="flex items-center">
                                <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                                <span className="text-gray-600 dark:text-gray-400">
                                    Temp. Baja: <span className="font-semibold">{alertasBajas}</span>
                                </span>
                            </div>
                            <div className="flex items-center">
                                <span className="text-gray-600 dark:text-gray-400">
                                    Total: <span className="font-semibold">{totalAlertas}</span>
                                </span>
                            </div>
                        </div>

                        {/* Indicador de alertas activas */}
                        {(hayAlertaActivaBaja || hayAlertaActivaAlta) && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900 rounded-full">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                                    {totalAlertasActivas} alerta{totalAlertasActivas > 1 ? 's' : ''} activa{totalAlertasActivas > 1 ? 's' : ''}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Checkbox para filtrar solo alertas activas */}
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={soloAlertasActivas}
                                onChange={(e) => setSoloAlertasActivas(e.target.checked)}
                                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                disabled={totalAlertasActivas === 0}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Solo alertas activas
                                {totalAlertasActivas === 0 && (
                                    <span className="text-gray-500 dark:text-gray-500"> (ninguna activa)</span>
                                )}
                            </span>
                        </label>

                        {/* Botón para mostrar/ocultar tabla */}
                        <button
                            onClick={() => setMostrarAlertas(!mostrarAlertas)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <svg
                                className={`w-4 h-4 transform transition-transform ${mostrarAlertas ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            {mostrarAlertas ? 'Ocultar' : 'Ver'} alertas
                            <span className="ml-1 px-2 py-0.5 bg-blue-500 rounded-full text-xs">
                                {soloAlertasActivas ? alertasOrdenadas.length : totalAlertas}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Detalles de alertas activas (si las hay) */}
                {(hayAlertaActivaBaja || hayAlertaActivaAlta) && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div>
                                <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                                    Alertas Activas Detectadas
                                </h4>
                                <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                                    {hayAlertaActivaBaja && (
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                                            <span>
                                                Temperatura BAJA desde {temperaturaData.alertas_activas_actuales.temperatura_baja?.inicio?.fecha} {temperaturaData.alertas_activas_actuales.temperatura_baja?.inicio?.hora}

                                            </span>
                                        </div>
                                    )}
                                    {hayAlertaActivaAlta && (
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                                            <span>
                                                Temperatura ALTA desde {temperaturaData.alertas_activas_actuales.temperatura_alta?.inicio?.fecha} {temperaturaData.alertas_activas_actuales.temperatura_alta?.inicio?.hora}

                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabla desplegable */}
                {mostrarAlertas && (
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        {alertasOrdenadas.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                {soloAlertasActivas
                                    ? "No hay alertas activas en este momento"
                                    : "No se encontraron alertas para mostrar"
                                }
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Fecha y Hora
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Edad (días)
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Medida
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Referencia
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Rango Aceptable
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Desviación
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Tipo de Alerta
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                                    {alertasOrdenadas.map((alerta, index) => {
                                        const esAlta = alerta.tipo === 'alta';
                                        const alertaClass = esAlta
                                            ? 'bg-red-50 dark:bg-red-900 bg-opacity-30 dark:bg-opacity-20'
                                            : 'bg-blue-50 dark:bg-blue-900 bg-opacity-30 dark:bg-opacity-20';

                                        const tipoAlertaClass = esAlta
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-blue-600 dark:text-blue-400';

                                        const esAlertaActiva = soloAlertasActivas || (
                                            (esAlta && hayAlertaActivaAlta &&
                                                alerta.fecha === temperaturaData.alertas_activas_actuales.temperatura_alta?.inicio?.fecha &&
                                                alerta.hora === temperaturaData.alertas_activas_actuales.temperatura_alta?.inicio?.hora) ||
                                            (!esAlta && hayAlertaActivaBaja &&
                                                alerta.fecha === temperaturaData.alertas_activas_actuales.temperatura_baja?.inicio?.fecha &&
                                                alerta.hora === temperaturaData.alertas_activas_actuales.temperatura_baja?.inicio?.hora)
                                        );

                                        return (
                                            <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${alertaClass}`}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {esAlertaActiva ? (
                                                        <div className="flex items-center">
                                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                                                            <span className="text-red-600 dark:text-red-400 font-medium text-xs">ACTIVA</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center">
                                                            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                                                            <span className="text-gray-500 dark:text-gray-400 text-xs">Resuelta</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {alerta.fecha} {alerta.hora}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {alerta.edad_dias}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {alerta.temperatura_medida.toFixed(1)}°C
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-600 dark:text-yellow-400">
                                                    {alerta.temperatura_referencia.toFixed(1)}°C
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {alerta.limite_inferior.toFixed(1)}°C - {alerta.limite_superior.toFixed(1)}°C
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${tipoAlertaClass}`}>
                                                    {alerta.desviacion > 0 ? '+' : ''}{alerta.desviacion.toFixed(1)}°C
                                                    <div className="text-xs">
                                                        ({alerta.desviacion_porcentaje > 0 ? '+' : ''}{alerta.desviacion_porcentaje.toFixed(1)}%)
                                                    </div>
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${tipoAlertaClass}`}>
                                                    {esAlta ? 'Temperatura Alta' : 'Temperatura Baja'}
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        Margen: {alerta.margen_edad.inferior}/{alerta.margen_edad.superior}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}


            </div>
        );
    };

    // Renderizar tabla de alertas de humedad
    // Renderizar tabla de alertas de humedad
    const renderTablaAlertasHumedad = () => {
        if (!humedadData || !humedadData.alertas || humedadData.alertas.length === 0) {
            return (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-green-600 dark:text-green-400 font-medium">
                        No se encontraron lecturas fuera de los rangos aceptables en el período seleccionado.
                    </p>
                </div>
            );
        }

        // Determinar qué alertas mostrar según el filtro
        let alertasAMostrar = humedadData.alertas;

        if (soloAlertasActivas && humedadData.alertas_activas_actuales) {
            // ✅ CORRECCIÓN: Solo mostrar la alerta que está realmente activa
            alertasAMostrar = [];

            // Si hay alerta activa de humedad baja, mostrar solo esa
            if (humedadData.alertas_activas_actuales.humedad_baja) {
                const alertaBaja = humedadData.alertas_activas_actuales.humedad_baja.inicio;
                alertasAMostrar = [alertaBaja];
            }

            // Si hay alerta activa de humedad alta, mostrar solo esa  
            if (humedadData.alertas_activas_actuales.humedad_alta) {
                const alertaAlta = humedadData.alertas_activas_actuales.humedad_alta.inicio;
                alertasAMostrar = [alertaAlta];
            }
        }

        // Ordenar alertas por fecha y hora
        const alertasOrdenadas = [...alertasAMostrar].sort((a, b) => {
            const fechaA = new Date(`${a.fecha}T${a.hora}`);
            const fechaB = new Date(`${b.fecha}T${b.hora}`);
            return fechaB - fechaA; // Más recientes primero
        });

        // Calcular estadísticas
        const totalAlertas = humedadData.alertas.length;
        const alertasAltas = humedadData.alertas.filter(a => a.tipo === 'alta').length;
        const alertasBajas = humedadData.alertas.filter(a => a.tipo === 'baja').length;

        // Información sobre alertas activas (si está disponible)
        const hayAlertaActivaBaja = humedadData.alertas_activas_actuales?.humedad_baja !== null;
        const hayAlertaActivaAlta = humedadData.alertas_activas_actuales?.humedad_alta !== null;
        const totalAlertasActivas = (hayAlertaActivaBaja ? 1 : 0) + (hayAlertaActivaAlta ? 1 : 0);

        return (
            <div className="space-y-4">
                {/* Header con estadísticas y controles */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Estadísticas generales */}
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center">
                                <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                                <span className="text-gray-600 dark:text-gray-400">
                                    Hum. Alta: <span className="font-semibold">{alertasAltas}</span>
                                </span>
                            </div>
                            <div className="flex items-center">
                                <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                                <span className="text-gray-600 dark:text-gray-400">
                                    Hum. Baja: <span className="font-semibold">{alertasBajas}</span>
                                </span>
                            </div>
                            <div className="flex items-center">
                                <span className="text-gray-600 dark:text-gray-400">
                                    Total: <span className="font-semibold">{totalAlertas}</span>
                                </span>
                            </div>
                        </div>

                        {/* Indicador de alertas activas */}
                        {(hayAlertaActivaBaja || hayAlertaActivaAlta) && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900 rounded-full">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                                    {totalAlertasActivas} alerta{totalAlertasActivas > 1 ? 's' : ''} activa{totalAlertasActivas > 1 ? 's' : ''}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Checkbox para filtrar solo alertas activas */}
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={soloAlertasActivas}
                                onChange={(e) => setSoloAlertasActivas(e.target.checked)}
                                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                disabled={totalAlertasActivas === 0}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Solo alertas activas
                                {totalAlertasActivas === 0 && (
                                    <span className="text-gray-500 dark:text-gray-500"> (ninguna activa)</span>
                                )}
                            </span>
                        </label>

                        {/* Botón para mostrar/ocultar tabla */}
                        <button
                            onClick={() => setMostrarAlertas(!mostrarAlertas)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <svg
                                className={`w-4 h-4 transform transition-transform ${mostrarAlertas ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            {mostrarAlertas ? 'Ocultar' : 'Ver'} alertas
                            <span className="ml-1 px-2 py-0.5 bg-blue-500 rounded-full text-xs">
                                {soloAlertasActivas ? alertasOrdenadas.length : totalAlertas}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Detalles de alertas activas (si las hay) */}
                {(hayAlertaActivaBaja || hayAlertaActivaAlta) && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div>
                                <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                                    Alertas Activas Detectadas
                                </h4>
                                <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                                    {hayAlertaActivaBaja && (
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                                            <span>
                                                Humedad BAJA desde {humedadData.alertas_activas_actuales.humedad_baja?.inicio?.fecha} {humedadData.alertas_activas_actuales.humedad_baja?.inicio?.hora}
                                            </span>
                                        </div>
                                    )}
                                    {hayAlertaActivaAlta && (
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                                            <span>
                                                Humedad ALTA desde {humedadData.alertas_activas_actuales.humedad_alta?.inicio?.fecha} {humedadData.alertas_activas_actuales.humedad_alta?.inicio?.hora}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabla desplegable */}
                {mostrarAlertas && (
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        {alertasOrdenadas.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                {soloAlertasActivas
                                    ? "No hay alertas activas en este momento"
                                    : "No se encontraron alertas para mostrar"
                                }
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Fecha y Hora
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Edad (días)
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Medida
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Referencia
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Rango Aceptable
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Desviación
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Tipo de Alerta
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                                    {alertasOrdenadas.map((alerta, index) => {
                                        const esAlta = alerta.tipo === 'alta';
                                        const alertaClass = esAlta
                                            ? 'bg-red-50 dark:bg-red-900 bg-opacity-30 dark:bg-opacity-20'
                                            : 'bg-blue-50 dark:bg-blue-900 bg-opacity-30 dark:bg-opacity-20';

                                        const tipoAlertaClass = esAlta
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-blue-600 dark:text-blue-400';

                                        // ✅ CORRECCIÓN: Determinar si esta alerta específica está activa
                                        const esAlertaActiva = soloAlertasActivas || (
                                            (esAlta && hayAlertaActivaAlta &&
                                                alerta.fecha === humedadData.alertas_activas_actuales.humedad_alta?.inicio?.fecha &&
                                                alerta.hora === humedadData.alertas_activas_actuales.humedad_alta?.inicio?.hora) ||
                                            (!esAlta && hayAlertaActivaBaja &&
                                                alerta.fecha === humedadData.alertas_activas_actuales.humedad_baja?.inicio?.fecha &&
                                                alerta.hora === humedadData.alertas_activas_actuales.humedad_baja?.inicio?.hora)
                                        );

                                        return (
                                            <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${alertaClass}`}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {esAlertaActiva ? (
                                                        <div className="flex items-center">
                                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                                                            <span className="text-red-600 dark:text-red-400 font-medium text-xs">ACTIVA</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center">
                                                            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                                                            <span className="text-gray-500 dark:text-gray-400 text-xs">Resuelta</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {alerta.fecha} {alerta.hora}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {alerta.edad_dias}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {alerta.humedad_medida.toFixed(1)}%
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-600 dark:text-yellow-400">
                                                    {alerta.humedad_referencia.toFixed(1)}%
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {alerta.limite_inferior.toFixed(1)}% - {alerta.limite_superior.toFixed(1)}%
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${tipoAlertaClass}`}>
                                                    {alerta.desviacion > 0 ? '+' : ''}{alerta.desviacion.toFixed(1)}%
                                                    <div className="text-xs">
                                                        ({alerta.desviacion_porcentaje > 0 ? '+' : ''}{alerta.desviacion_porcentaje.toFixed(1)}%)
                                                    </div>
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${tipoAlertaClass}`}>
                                                    {esAlta ? 'Humedad Alta' : 'Humedad Baja'}
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        Rango edad: {alerta.rango_edad}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}


            </div>
        );
    };

    // Renderizar estadísticas de índices
    const renderEstadisticasIndices = () => {
        if (!indicesData || !indicesData.estadisticas) return null;

        const { estadisticas } = indicesData;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Estadísticas IEC */}
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                        Estadísticas IEC
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Promedio</h4>
                            <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                {estadisticas.iec.promedio || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Mínimo</h4>
                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                {estadisticas.iec.minimo || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Máximo</h4>
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">
                                {estadisticas.iec.maximo || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Días</h4>
                            <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                {estadisticas.iec.dias_con_datos || 0}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Estadísticas THI */}
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                        Estadísticas THI
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Promedio</h4>
                            <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                {estadisticas.thi.promedio || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Mínimo</h4>
                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                {estadisticas.thi.minimo || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Máximo</h4>
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">
                                {estadisticas.thi.maximo || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Días</h4>
                            <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                {estadisticas.thi.dias_con_datos || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // 16. Renderizar tarjetas de datos ambientales diarios
    // Función mejorada para renderizar tarjetas de datos ambientales con semicírculos
    // Función mejorada para renderizar tarjetas de datos ambientales con semicírculos
    const renderTarjetasDatosAmbientales = () => {
        if (!datosAmbientalesDiarios) {
            return <p className="text-gray-600 dark:text-gray-400">No hay datos disponibles para la fecha seleccionada.</p>;
        }

        // Verificar si hay un mensaje de error en la respuesta
        if (datosAmbientalesDiarios.mensaje) {
            return <p className="text-amber-600 dark:text-amber-400">{datosAmbientalesDiarios.mensaje}</p>;
        }

        // Verificar si existen las propiedades necesarias
        if (!datosAmbientalesDiarios.lecturas || !datosAmbientalesDiarios.indices || !datosAmbientalesDiarios.camada) {
            return <p className="text-red-600 dark:text-red-400">Los datos recibidos están incompletos. Por favor, intente con otra fecha o dispositivo.</p>;
        }

        const { lecturas, indices } = datosAmbientalesDiarios;

        // Función para obtener el color según el tipo de alerta
        const getAlertColor = (alerta, defaultColor = '#10b981') => {
            if (!alerta) return defaultColor;
            return alerta.tipo === 'alta' ? '#ef4444' : '#3b82f6';
        };

        // Función para obtener el color según el nivel de índice
        const getIndexColor = (nivel) => {
            if (!nivel) return '#10b981';

            switch (nivel.color) {
                case 'green': return '#10b981';
                case 'yellow': return '#f59e0b';
                case 'orange': return '#f97316';
                case 'red': return '#ef4444';
                default: return '#6b7280';
            }
        };

        // Obtener datos de min/max de la API
        const getMinMaxData = (tipo) => {
            switch (tipo) {
                case 'temperatura_ambiente':
                    return {
                        min: lecturas.temperatura.min,
                        max: lecturas.temperatura.max
                    };
                case 'humedad_ambiente':
                    return {
                        min: lecturas.humedad.min,
                        max: lecturas.humedad.max
                    };
                case 'temperatura_suelo':
                    return {
                        min: lecturas.temperatura_suelo.min,
                        max: lecturas.temperatura_suelo.max
                    };
                case 'humedad_suelo':
                    return {
                        min: lecturas.humedad_suelo.min,
                        max: lecturas.humedad_suelo.max
                    };
                default:
                    return { min: null, max: null };
            }
        };

        const tempAmbienteMinMax = getMinMaxData('temperatura_ambiente');
        const humAmbienteMinMax = getMinMaxData('humedad_ambiente');
        const tempSueloMinMax = getMinMaxData('temperatura_suelo');
        const humSueloMinMax = getMinMaxData('humedad_suelo');

        return (
            <div className="space-y-6">
                {/* Semicírculos principales - Temperatura y Humedad Ambiente */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Temperatura Ambiente */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                Temperatura Ambiente
                            </h3>
                            {lecturas.temperatura.alerta && (
                                <div className={`px-3 py-1 text-xs font-bold rounded-full ${lecturas.temperatura.alerta.tipo === 'alta'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    }`}>
                                    {lecturas.temperatura.alerta.tipo === 'alta' ? 'ALTA' : 'BAJA'}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-center mb-4">
                            <SemicirculoGauge
                                valor={lecturas.temperatura.valor}
                                valorMin={tempAmbienteMinMax.min}
                                valorMax={tempAmbienteMinMax.max}
                                minimo={0}
                                maximo={50}
                                unidad="°C"
                                color={getAlertColor(lecturas.temperatura.alerta, '#10b981')}
                                titulo="Rango: 0°C - 50°C"
                                size={180}
                            />
                        </div>

                        <div className="text-center text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div>Lecturas totales: {lecturas.temperatura.total_lecturas}</div>
                            {lecturas.temperatura.alerta && (
                                <div>
                                    <span className={getAlertColor(lecturas.temperatura.alerta) === '#ef4444' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}>
                                        Desviación: {lecturas.temperatura.alerta.desviacion > 0 ? '+' : ''}{lecturas.temperatura.alerta.desviacion}°C
                                        ({lecturas.temperatura.alerta.desviacion_porcentaje > 0 ? '+' : ''}{lecturas.temperatura.alerta.desviacion_porcentaje}%)
                                    </span>
                                    <div className="text-xs">
                                        Referencia: {lecturas.temperatura.alerta.referencia}°C
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Humedad Ambiente */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                Humedad Ambiente
                            </h3>
                            {lecturas.humedad.alerta && (
                                <div className={`px-3 py-1 text-xs font-bold rounded-full ${lecturas.humedad.alerta.tipo === 'alta'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    }`}>
                                    {lecturas.humedad.alerta.tipo === 'alta' ? 'ALTA' : 'BAJA'}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-center mb-4">
                            <SemicirculoGauge
                                valor={lecturas.humedad.valor}
                                valorMin={humAmbienteMinMax.min}
                                valorMax={humAmbienteMinMax.max}
                                minimo={0}
                                maximo={100}
                                unidad="%"
                                color={getAlertColor(lecturas.humedad.alerta, '#10b981')}
                                titulo="Rango: 0% - 100%"
                                size={180}
                            />
                        </div>

                        <div className="text-center text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div>Lecturas totales: {lecturas.humedad.total_lecturas}</div>
                            {lecturas.humedad.alerta && (
                                <div>
                                    <span className={getAlertColor(lecturas.humedad.alerta) === '#ef4444' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}>
                                        Desviación: {lecturas.humedad.alerta.desviacion > 0 ? '+' : ''}{lecturas.humedad.alerta.desviacion}%
                                        ({lecturas.humedad.alerta.desviacion_porcentaje > 0 ? '+' : ''}{lecturas.humedad.alerta.desviacion_porcentaje}%)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tarjetas secundarias - Temperatura y Humedad Suelo */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Temperatura Suelo */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                            Temperatura Suelo
                        </h3>

                        <div className="flex justify-center mb-4">
                            <SemicirculoGauge
                                valor={lecturas.temperatura_suelo.valor}
                                valorMin={tempSueloMinMax.min}
                                valorMax={tempSueloMinMax.max}
                                minimo={0}
                                maximo={50}
                                unidad="°C"
                                color="#10b981"
                                titulo="Rango: 0°C - 50°C"
                                size={150}
                            />
                        </div>

                        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                            Lecturas totales: {lecturas.temperatura_suelo.total_lecturas}
                        </div>
                    </div>

                    {/* Humedad Suelo */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                            Humedad Suelo
                        </h3>

                        <div className="flex justify-center mb-4">
                            <SemicirculoGauge
                                valor={lecturas.humedad_suelo.valor}
                                valorMin={humSueloMinMax.min}
                                valorMax={humSueloMinMax.max}
                                minimo={0}
                                maximo={100}
                                unidad="%"
                                color="#10b981"
                                titulo="Rango: 0% - 100%"
                                size={150}
                            />
                        </div>

                        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                            Lecturas totales: {lecturas.humedad_suelo.total_lecturas}
                        </div>
                    </div>
                </div>

                {/* Índices - IEC y THI */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Índice de Estrés Calórico */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                            Índice de Estrés Calórico (IEC)
                        </h3>

                        <div className="flex justify-center mb-4">
                            <SemicirculoGauge
                                valor={indices.estres_calorico?.valor}
                                minimo={0}
                                maximo={200}
                                unidad=""
                                color={getIndexColor(indices.estres_calorico?.nivel)}
                                titulo="Rango: 0 - 200"
                                size={150}
                            />
                        </div>

                        <div className="text-center">
                            {indices.estres_calorico?.nivel && (
                                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${indices.estres_calorico.nivel.color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                    indices.estres_calorico.nivel.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                        indices.estres_calorico.nivel.color === 'orange' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
                                            indices.estres_calorico.nivel.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                    }`}>
                                    {indices.estres_calorico.nivel.mensaje}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Índice THI */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                            Índice Temperatura-Humedad (THI)
                        </h3>

                        <div className="flex justify-center mb-4">
                            <SemicirculoGauge
                                valor={indices.thi?.valor}
                                minimo={0}
                                maximo={100}
                                unidad=""
                                color={getIndexColor(indices.thi?.nivel)}
                                titulo="Rango: 0 - 100"
                                size={150}
                            />
                        </div>

                        <div className="text-center">
                            {indices.thi?.nivel && (
                                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${indices.thi.nivel.color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                    indices.thi.nivel.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                        indices.thi.nivel.color === 'orange' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
                                            indices.thi.nivel.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                    }`}>
                                    {indices.thi.nivel.mensaje}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabla de información sobre niveles (mantener la existente) */}
                <div className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                        Interpretación de Índices
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tabla IEC */}
                        <div>
                            <h4 className="font-medium mb-2">Índice de Estrés Calórico (°C + % HR)</h4>
                            <table className="min-w-full border border-gray-300 dark:border-gray-700">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-700">
                                        <th className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">Rango</th>
                                        <th className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">Interpretación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                        <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">&lt; 105</td>
                                        <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">Condiciones normales</td>
                                    </tr>
                                    <tr className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                                        <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">&gt; 105 &lt; 120</td>
                                        <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">Alerta: Estrés calórico moderado</td>
                                    </tr>
                                    <tr className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                                        <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">&gt; 120 &lt; 130</td>
                                        <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">Peligro: Estrés calórico alto</td>
                                    </tr>
                                    <tr className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                                        <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">&gt; 130</td>
                                        <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">Emergencia: Estrés calórico extremo</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Tabla THI */}
                        <div>
                            <h4 className="font-medium mb-2">Índice de Temperatura-Humedad (THI)</h4>
                            <table className="min-w-full border border-gray-300 dark:border-gray-700">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-700">
                                        <th className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">Rango</th>
                                        <th className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">Interpretación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                        <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">&lt;= 72</td>
                                        <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">THI normal: Condiciones óptimas</td>
                                    </tr>
                                    <tr className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                                        <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">&gt; 72 &lt;= 79</td>
                                        <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">THI elevado: Alerta</td>
                                    </tr>
                                    <tr className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                                        <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">&gt; 79 &lt;= 88</td>
                                        <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">THI alto: Peligro</td>
                                    </tr>
                                    <tr className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                                        <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">&gt; 88</td>
                                        <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">THI crítico: Emergencia</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // 17. Renderizar tabla de datos de temperatura
    const renderTablaDatosTemperatura = () => {
        if (!temperaturaData || !temperaturaData.datos_grafica || temperaturaData.datos_grafica.length === 0) {
            return <p className="text-gray-600 dark:text-gray-400">No hay datos disponibles</p>;
        }

        // Ordenar datos por fecha descendente
        const datosOrdenados = [...temperaturaData.datos_grafica].sort(
            (a, b) => new Date(b.fecha) - new Date(a.fecha)
        );

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Fecha
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Edad (días)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Temp. Media
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Temp. Mín/Máx
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Temp. Referencia
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Rango Aceptable
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Desviación
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Precisión
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                        {datosOrdenados.map((dato, index) => {
                            // Ensure numerical values for calculations
                            const tempMin = typeof dato.temperatura_min === 'string' ? parseFloat(dato.temperatura_min) : dato.temperatura_min;
                            const tempMax = typeof dato.temperatura_max === 'string' ? parseFloat(dato.temperatura_max) : dato.temperatura_max;

                            // Calcular desviación absoluta y porcentual
                            const desviacion = dato.temperatura_media - dato.temperatura_referencia;
                            const desviacionPorcentaje = (desviacion / dato.temperatura_referencia) * 100;

                            // Determinar si está dentro del rango aceptable
                            const dentroRango = dato.temperatura_media >= dato.limite_inferior &&
                                dato.temperatura_media <= dato.limite_superior;

                            // Calcular precisión (qué tan cerca está del valor de referencia)
                            const precision = 100 - Math.abs(desviacionPorcentaje);

                            // Determinar clases para colorear según la desviación
                            const desviacionClass = dentroRango
                                ? 'text-green-600 dark:text-green-400'
                                : desviacion > 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-blue-600 dark:text-blue-400';

                            // Determinar clase para la precisión
                            let precisionClass = 'text-green-600 dark:text-green-400';
                            if (precision < 95) precisionClass = 'text-yellow-600 dark:text-yellow-400';
                            if (precision < 90) precisionClass = 'text-orange-600 dark:text-orange-400';
                            if (precision < 85) precisionClass = 'text-red-600 dark:text-red-400';

                            return (
                                <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${!dentroRango ? 'bg-red-50 dark:bg-red-900 bg-opacity-30 dark:bg-opacity-20' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                        {dato.fecha}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {dato.edad_dias}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {dato.temperatura_media.toFixed(1)}°C
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {tempMin.toFixed(1)}°C / {tempMax.toFixed(1)}°C
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-600 dark:text-yellow-400">
                                        {dato.temperatura_referencia.toFixed(1)}°C
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {dato.limite_inferior.toFixed(1)}°C - {dato.limite_superior.toFixed(1)}°C
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${desviacionClass}`}>
                                        {desviacion > 0 ? '+' : ''}{desviacion.toFixed(1)}°C
                                        <div className="text-xs">
                                            ({desviacionPorcentaje > 0 ? '+' : ''}{desviacionPorcentaje.toFixed(1)}%)
                                        </div>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${precisionClass}`}>
                                        {precision.toFixed(1)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    // 18. Renderizar tabla de datos de humedad
    const renderTablaDatosHumedad = () => {
        if (!humedadData || !humedadData.datos_grafica || humedadData.datos_grafica.length === 0) {
            return <p className="text-gray-600 dark:text-gray-400">No hay datos disponibles</p>;
        }

        // Ordenar datos por fecha descendente
        const datosOrdenados = [...humedadData.datos_grafica].sort(
            (a, b) => new Date(b.fecha) - new Date(a.fecha)
        );

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Fecha
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Edad (días)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Hum. Media
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Hum. Mín/Máx
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Hum. Referencia
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Rango Aceptable
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Desviación
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Precisión
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                        {datosOrdenados.map((dato, index) => {
                            // Ensure numerical values for calculations
                            const humMin = typeof dato.humedad_min === 'string' ? parseFloat(dato.humedad_min) : dato.humedad_min;
                            const humMax = typeof dato.humedad_max === 'string' ? parseFloat(dato.humedad_max) : dato.humedad_max;

                            // Calcular desviación absoluta y porcentual
                            const desviacion = dato.humedad_media - dato.humedad_referencia;
                            const desviacionPorcentaje = (desviacion / dato.humedad_referencia) * 100;

                            // Determinar si está dentro del rango aceptable
                            const dentroRango = dato.humedad_media >= dato.limite_inferior &&
                                dato.humedad_media <= dato.limite_superior;

                            // Calcular precisión (qué tan cerca está del valor de referencia)
                            const precision = 100 - Math.abs(desviacionPorcentaje);

                            // Determinar clases para colorear según la desviación
                            const desviacionClass = dentroRango
                                ? 'text-green-600 dark:text-green-400'
                                : desviacion > 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-blue-600 dark:text-blue-400';

                            // Determinar clase para la precisión
                            let precisionClass = 'text-green-600 dark:text-green-400';
                            if (precision < 95) precisionClass = 'text-yellow-600 dark:text-yellow-400';
                            if (precision < 90) precisionClass = 'text-orange-600 dark:text-orange-400';
                            if (precision < 85) precisionClass = 'text-red-600 dark:text-red-400';

                            return (
                                <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${!dentroRango ? 'bg-red-50 dark:bg-red-900 bg-opacity-30 dark:bg-opacity-20' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                        {dato.fecha}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {dato.edad_dias}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {dato.humedad_media.toFixed(1)}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {humMin.toFixed(1)}% / {humMax.toFixed(1)}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-600 dark:text-yellow-400">
                                        {dato.humedad_referencia.toFixed(1)}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {dato.limite_inferior.toFixed(1)}% - {dato.limite_superior.toFixed(1)}%
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${desviacionClass}`}>
                                        {desviacion > 0 ? '+' : ''}{desviacion.toFixed(1)}%
                                        <div className="text-xs">
                                            ({desviacionPorcentaje > 0 ? '+' : ''}{desviacionPorcentaje.toFixed(1)}%)
                                        </div>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${precisionClass}`}>
                                        {precision.toFixed(1)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    // 19. Renderizar resumen de estadísticas de medidas individuales de temperatura
    const renderResumenMedidasTemperatura = () => {
        if (!medidasTemperaturaData || !medidasTemperaturaData.estadisticas) return null;

        const { estadisticas } = medidasTemperaturaData;

        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Lecturas</h3>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{estadisticas.total_lecturas}</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Temperatura Media</h3>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{estadisticas.media.toFixed(1)}°C</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Temperatura Mínima</h3>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{estadisticas.minima.toFixed(1)}°C</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Temperatura Máxima</h3>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{estadisticas.maxima.toFixed(1)}°C</p>
                </div>
            </div>
        );
    };

    // 20. Renderizar resumen de estadísticas de medidas individuales de humedad
    const renderResumenMedidasHumedad = () => {
        if (!medidasHumedadData || !medidasHumedadData.estadisticas) return null;

        const { estadisticas } = medidasHumedadData;

        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Lecturas</h3>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{estadisticas.total_lecturas}</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Humedad Media</h3>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{estadisticas.media.toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Humedad Mínima</h3>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{estadisticas.minima.toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Humedad Máxima</h3>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{estadisticas.maxima.toFixed(1)}%</p>
                </div>
            </div>
        );
    };
    return (
        <div className="p-6 max-w-7xl mx-auto">
            {!isEmbedded && (
                <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
                    Monitoreo Ambiental
                </h1>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-100 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {renderNoAccessMessage()}

            {/* Filtros y controles */}
            {!isEmbedded && (
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
                                    setDispositivosData([]);
                                    setSelectedDispositivo(null);
                                    setTemperaturaData(null);
                                    setHumedadData(null);
                                    setDatosAmbientalesDiarios(null);
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
                                    setDispositivosData([]);
                                    setSelectedDispositivo(null);
                                    setTemperaturaData(null);
                                    setHumedadData(null);
                                    setDatosAmbientalesDiarios(null);
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
                                onChange={(e) => {
                                    setSelectedCamada(e.target.value);
                                    setCamadaInfo(null);
                                    setDispositivosData([]);
                                    setSelectedDispositivo(null);
                                    setTemperaturaData(null);
                                    setHumedadData(null);
                                    setDatosAmbientalesDiarios(null);
                                }}
                                disabled={loading || !selectedGranja}
                            >
                                <option value="">-- Seleccione camada --</option>
                                {camadas.map((camada) => (
                                    <option key={camada.id_camada} value={camada.id_camada}>
                                        {camada.nombre_camada}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-wrap gap-3 mt-4">
                        <button
                            onClick={loadDispositivos}
                            disabled={loading || !selectedGranja}
                            className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-500 disabled:text-gray-200"
                        >
                            {loading ? 'Cargando...' : 'Cargar dispositivos'}
                        </button>
                    </div>
                </div>
            )}

            {!isEmbedded && camadaInfo && (
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

            {/* Lista de dispositivos seleccionados */}
            {/* Lista de dispositivos seleccionados */}
            {dispositivosData.length > 0 && (
                <div className="p-6 rounded-lg shadow-md mb-6 bg-white dark:bg-gray-800">
                    <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                        Dispositivos disponibles: {dispositivosData.length}
                    </h2>
                    <div className="mb-4">
                        <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                            Seleccione un dispositivo para analizar
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {dispositivosData.map((disp) => (
                                <div
                                    key={disp.id_dispositivo}
                                    className={`p-3 border rounded cursor-pointer transition-colors
                                 ${selectedDispositivo === disp.id_dispositivo
                                            ? 'bg-blue-100 border-blue-500 dark:bg-blue-900 dark:border-blue-400'
                                            : 'bg-gray-50 border-gray-300 dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                    onClick={() => {
                                        setSelectedDispositivo(disp.id_dispositivo);
                                        setDatosAmbientalesDiarios(null);
                                        setTemperaturaData(null);
                                        setHumedadData(null);
                                        // Resetear estados de alertas
                                        setSoloAlertasActivas(false);
                                        setMostrarAlertas(false);
                                    }}
                                >
                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                        {disp.numero_serie}
                                    </div>
                                    {ubicacionesDispositivos[disp.id_dispositivo] && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {ubicacionesDispositivos[disp.id_dispositivo].granja}
                                            (Nave: {ubicacionesDispositivos[disp.id_dispositivo].nave})
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedDispositivo && (
                        <div className="mt-4 flex flex-col space-y-4">
                            {/* Selector de secciones */}
                            <div className="border-b border-gray-200 dark:border-gray-700">
                                <nav className="flex -mb-px">
                                    <button
                                        onClick={() => setActiveSection('actual')}
                                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeSection === 'actual'
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        Datos Actuales
                                    </button>
                                    <button
                                        onClick={() => setActiveSection('analisis')}
                                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeSection === 'analisis'
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        Análisis por Rango
                                    </button>
                                </nav>
                            </div>

                            {/* Controles específicos según la sección activa */}
                            {activeSection === 'actual' ? (
                                <div>
                                    {/* Selector de fecha para datos actuales */}
                                    <div className="mt-4 flex flex-wrap items-center gap-4">
                                        <div className="flex-grow">
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Fecha para consulta
                                            </label>
                                            <input
                                                type="date"
                                                className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                                value={fechaActual}
                                                onChange={(e) => handleFechaActualChange(e.target.value)}
                                                min={fechaLimites.inicio || undefined}
                                                max={fechaLimites.fin || undefined}
                                                disabled={loading}
                                            />
                                        </div>
                                        <div className="flex-shrink-0">
                                            <button
                                                onClick={fetchDatosAmbientalesDiarios}
                                                disabled={loading}
                                                className="py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-500 disabled:text-gray-200 mt-7"
                                            >
                                                {loading ? 'Cargando...' : 'Consultar datos actuales'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {/* Tabs de selección para análisis */}
                                    <div className="border-b border-gray-200 dark:border-gray-700">
                                        <nav className="flex -mb-px">
                                            <button
                                                onClick={() => setActiveTab('temperatura')}
                                                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'temperatura'
                                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                                    }`}
                                            >
                                                Temperatura
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('humedad')}
                                                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'humedad'
                                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                                    }`}
                                            >
                                                Humedad
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('indices')}
                                                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'indices'
                                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                                    }`}
                                            >
                                                Índices
                                            </button>
                                        </nav>
                                    </div>

                                    {/* Selector de rango de fechas para análisis */}
                                    <div className="mt-4 flex flex-wrap items-center gap-4">
                                        <div className="flex-grow">
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Rango de fechas para análisis
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="date"
                                                    className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                                    value={fechaInicio}
                                                    onChange={(e) => handleFechaInicioChange(e.target.value)}
                                                    min={fechaLimites.inicio || undefined}
                                                    max={fechaLimites.fin ? (fechaLimites.fin < fechaFin ? fechaLimites.fin : fechaFin) : fechaFin}
                                                    disabled={loading}
                                                />
                                                <input
                                                    type="date"
                                                    className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                                    value={fechaFin}
                                                    onChange={(e) => handleFechaFinChange(e.target.value)}
                                                    min={fechaInicio}
                                                    max={fechaLimites.fin || undefined}
                                                    disabled={loading}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <button
                                                onClick={analizarDatosRango}
                                                disabled={loading}
                                                className="py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-500 disabled:text-gray-200 mt-7"
                                            >
                                                {loading ? 'Cargando...' : `Analizar ${activeTab === 'temperatura' ? 'temperatura' : activeTab === 'humedad' ? 'humedad' : 'índices'}`}
                                            </button>
                                        </div>
                                    </div>

                                    {renderQuickDateSelector()}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Sección de Datos Actuales */}
            {activeSection === 'actual' && datosAmbientalesDiarios && (
                <div className="space-y-6">
                    {/* Información del dispositivo y camada */}
                    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                        <div className="flex flex-wrap justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                                    Dispositivo: {datosAmbientalesDiarios.dispositivo.numero_serie}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {datosAmbientalesDiarios.camada.nombre}
                                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-500">
                                        (Tipo de ave: {datosAmbientalesDiarios.camada.tipo_ave}, Edad: {datosAmbientalesDiarios.camada.edad_dias} días)
                                    </span>
                                </p>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Fecha: {datosAmbientalesDiarios.fecha}
                            </div>
                        </div>
                    </div>

                    {/* Tarjetas de datos ambientales */}
                    {renderTarjetasDatosAmbientales()}
                </div>
            )}

            {/* Sección de Análisis por Rango - Pestaña Temperatura */}
            {activeSection === 'analisis' && activeTab === 'temperatura' && temperaturaData && (
                <div className="space-y-6">
                    {/* Información del dispositivo y camada */}
                    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                        <div className="flex flex-wrap justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                                    Dispositivo: {temperaturaData.dispositivo.numero_serie}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {temperaturaData.camada.nombre}
                                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-500">
                                        (Tipo de ave: {temperaturaData.camada.tipo_ave})
                                    </span>
                                </p>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Período: {temperaturaData.periodo.fecha_inicio} a {temperaturaData.periodo.fecha_fin}
                            </div>
                        </div>
                    </div>

                    {/* Gráfica de todas las medidas individuales de temperatura */}
                    {medidasTemperaturaData && (
                        <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                                Todas las medidas de temperatura
                            </h2>
                            {renderResumenMedidasTemperatura()}
                            <div className="h-96">
                                <Plot
                                    data={getMedidasTemperaturaData()}
                                    layout={getMedidasTemperaturaLayout()}
                                    config={baseConfig}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Gráfica principal de temperatura diaria */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Evolución de Temperatura
                        </h2>
                        <div className="h-96">
                            <Plot
                                data={getTemperaturaGraficaData()}
                                layout={getTemperaturaGraficaLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Tabla de datos diarios */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Datos diarios de temperatura
                        </h2>
                        {renderTablaDatosTemperatura()}
                    </div>

                    {/* Tabla de alertas */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Lecturas fuera de rango
                            {temperaturaData.alertas && temperaturaData.alertas.length > 0 && (
                                <span className="ml-2 text-base font-medium text-red-500 dark:text-red-400">
                                    ({temperaturaData.alertas.length})
                                </span>
                            )}
                        </h2>
                        {renderTablaAlertasTemperatura()}
                    </div>
                </div>
            )}

            {/* Sección de Análisis por Rango - Pestaña Humedad */}
            {activeSection === 'analisis' && activeTab === 'humedad' && humedadData && (
                <div className="space-y-6">
                    {/* Información del dispositivo y camada */}
                    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                        <div className="flex flex-wrap justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                                    Dispositivo: {humedadData.dispositivo.numero_serie}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {humedadData.camada.nombre}
                                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-500">
                                        (Tipo de ave: {humedadData.camada.tipo_ave})
                                    </span>
                                </p>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Período: {humedadData.periodo.fecha_inicio} a {humedadData.periodo.fecha_fin}
                            </div>
                        </div>
                    </div>

                    {/* Gráfica de todas las medidas individuales de humedad */}
                    {medidasHumedadData && (
                        <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                                Todas las medidas de humedad
                            </h2>
                            {renderResumenMedidasHumedad()}
                            <div className="h-96">
                                <Plot
                                    data={getMedidasHumedadData()}
                                    layout={getMedidasHumedadLayout()}
                                    config={baseConfig}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Gráfica principal de humedad diaria */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Evolución de Humedad
                        </h2>
                        <div className="h-96">
                            <Plot
                                data={getHumedadGraficaData()}
                                layout={getHumedadGraficaLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Tabla de datos diarios */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Datos diarios de humedad
                        </h2>
                        {renderTablaDatosHumedad()}
                    </div>
                    {/* Tabla de alertas */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Lecturas fuera de rango
                            {humedadData.alertas && humedadData.alertas.length > 0 && (
                                <span className="ml-2 text-base font-medium text-red-500 dark:text-red-400">
                                    ({humedadData.alertas.length})
                                </span>
                            )}
                        </h2>
                        {renderTablaAlertasHumedad()}
                    </div>

                </div>
            )}

            {/* Sección de Análisis por Rango - Pestaña Índices */}
            {activeSection === 'analisis' && activeTab === 'indices' && indicesData && (
                <div className="space-y-6">
                    {/* Información del dispositivo y camada */}
                    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                        <div className="flex flex-wrap justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                                    Dispositivo: {indicesData.dispositivo.numero_serie}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {indicesData.camada.nombre}
                                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-500">
                                        (Tipo de ave: {indicesData.camada.tipo_ave})
                                    </span>
                                </p>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Período: {indicesData.periodo.fecha_inicio} a {indicesData.periodo.fecha_fin}
                            </div>
                        </div>
                    </div>

                    {/* Estadísticas generales */}
                    {renderEstadisticasIndices()}

                    {/* Resumen de niveles por colores */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                            Distribución de Niveles
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Distribución IEC */}
                            <div>
                                <h3 className="text-md font-medium mb-3 text-gray-700 dark:text-gray-300">
                                    Índice de Estrés Calórico (IEC)
                                </h3>
                                <div className="space-y-2">
                                    {indicesData.resumen_niveles.iec && Object.entries(indicesData.resumen_niveles.iec).map(([nivel, count]) => (
                                        <div key={nivel} className="flex items-center justify-between p-2 rounded">
                                            <div className="flex items-center">
                                                <div
                                                    className={`w-4 h-4 rounded mr-3 ${nivel === 'normal' ? 'bg-green-500' :
                                                        nivel === 'moderado' ? 'bg-yellow-500' :
                                                            nivel === 'alto' ? 'bg-orange-500' :
                                                                'bg-red-500'
                                                        }`}
                                                ></div>
                                                <span className="capitalize text-gray-700 dark:text-gray-300">
                                                    {nivel}
                                                </span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-800 dark:text-gray-200 mr-2">
                                                    {count}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    días
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Distribución THI */}
                            <div>
                                <h3 className="text-md font-medium mb-3 text-gray-700 dark:text-gray-300">
                                    Índice Temperatura-Humedad (THI)
                                </h3>
                                <div className="space-y-2">
                                    {indicesData.resumen_niveles.thi && Object.entries(indicesData.resumen_niveles.thi).map(([nivel, count]) => (
                                        <div key={nivel} className="flex items-center justify-between p-2 rounded">
                                            <div className="flex items-center">
                                                <div
                                                    className={`w-4 h-4 rounded mr-3 ${nivel === 'normal' ? 'bg-green-500' :
                                                        nivel === 'moderado' ? 'bg-yellow-500' :
                                                            nivel === 'alto' ? 'bg-orange-500' :
                                                                'bg-red-500'
                                                        }`}
                                                ></div>
                                                <span className="capitalize text-gray-700 dark:text-gray-300">
                                                    {nivel}
                                                </span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-800 dark:text-gray-200 mr-2">
                                                    {count}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    días
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gráfica de IEC */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Evolución del Índice de Estrés Calórico (IEC)
                        </h2>
                        <div className="h-96">
                            <Plot
                                data={getIECGraficaData()}
                                layout={getIECGraficaLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Gráfica de THI */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Evolución del Índice Temperatura-Humedad (THI)
                        </h2>
                        <div className="h-96">
                            <Plot
                                data={getTHIGraficaData()}
                                layout={getTHIGraficaLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Tabla de datos diarios */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Datos diarios de índices
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Fecha
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Edad (días)
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            IEC Media
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            IEC Min/Max
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Nivel IEC
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            THI Media
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            THI Min/Max
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Nivel THI
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Temp./Hum.
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                                    {indicesData.datos_grafica && [...indicesData.datos_grafica].sort(
                                        (a, b) => new Date(b.fecha) - new Date(a.fecha)
                                    ).map((dato, index) => {
                                        // Función para obtener clase CSS según nivel
                                        const getNivelClass = (nivel) => {
                                            if (!nivel) return 'text-gray-500 dark:text-gray-400';
                                            switch (nivel.nivel) {
                                                case 'normal': return 'text-green-600 dark:text-green-400';
                                                case 'moderado': return 'text-yellow-600 dark:text-yellow-400';
                                                case 'alto': return 'text-orange-600 dark:text-orange-400';
                                                case 'critico': return 'text-red-600 dark:text-red-400';
                                                default: return 'text-gray-500 dark:text-gray-400';
                                            }
                                        };

                                        // Determinar si hay problema (no normal)
                                        const hayProblema = (dato.iec_nivel && dato.iec_nivel.nivel !== 'normal') ||
                                            (dato.thi_nivel && dato.thi_nivel.nivel !== 'normal');

                                        return (
                                            <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${hayProblema ? 'bg-amber-50 dark:bg-amber-900 bg-opacity-30 dark:bg-opacity-20' : ''}`}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {dato.fecha}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {dato.edad_dias}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {dato.iec_media ? dato.iec_media.toFixed(1) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {dato.iec_minimo && dato.iec_maximo ?
                                                        `${dato.iec_minimo.toFixed(1)} / ${dato.iec_maximo.toFixed(1)}` : 'N/A'}
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getNivelClass(dato.iec_nivel)}`}>
                                                    <div className="flex items-center">
                                                        <div
                                                            className={`w-3 h-3 rounded-full mr-2 ${dato.iec_nivel?.nivel === 'normal' ? 'bg-green-500' :
                                                                dato.iec_nivel?.nivel === 'moderado' ? 'bg-yellow-500' :
                                                                    dato.iec_nivel?.nivel === 'alto' ? 'bg-orange-500' :
                                                                        dato.iec_nivel?.nivel === 'critico' ? 'bg-red-500' :
                                                                            'bg-gray-400'
                                                                }`}
                                                        ></div>
                                                        <span className="capitalize">
                                                            {dato.iec_nivel?.nivel || 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {dato.thi_media ? dato.thi_media.toFixed(1) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {dato.thi_minimo && dato.thi_maximo ?
                                                        `${dato.thi_minimo.toFixed(1)} / ${dato.thi_maximo.toFixed(1)}` : 'N/A'}
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getNivelClass(dato.thi_nivel)}`}>
                                                    <div className="flex items-center">
                                                        <div
                                                            className={`w-3 h-3 rounded-full mr-2 ${dato.thi_nivel?.nivel === 'normal' ? 'bg-green-500' :
                                                                dato.thi_nivel?.nivel === 'moderado' ? 'bg-yellow-500' :
                                                                    dato.thi_nivel?.nivel === 'alto' ? 'bg-orange-500' :
                                                                        dato.thi_nivel?.nivel === 'critico' ? 'bg-red-500' :
                                                                            'bg-gray-400'
                                                                }`}
                                                        ></div>
                                                        <span className="capitalize">
                                                            {dato.thi_nivel?.nivel || 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    <div className="text-xs">
                                                        T: {dato.temperatura_media ? dato.temperatura_media.toFixed(1) : 'N/A'}°C
                                                    </div>
                                                    <div className="text-xs">
                                                        H: {dato.humedad_media ? dato.humedad_media.toFixed(1) : 'N/A'}%
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Información sobre rangos */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                            Información de Rangos de Índices
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Tabla IEC */}
                            <div>
                                <h3 className="font-medium mb-3 text-gray-700 dark:text-gray-300">
                                    Índice de Estrés Calórico (IEC)
                                </h3>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    Fórmula: Temperatura (°C) + Humedad (%)
                                </div>
                                <table className="min-w-full border border-gray-300 dark:border-gray-700">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-700">
                                            <th className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600 text-left">Rango</th>
                                            <th className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 text-left">Nivel</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                            <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">≤ 105</td>
                                            <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">Normal</td>
                                        </tr>
                                        <tr className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                                            <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">106 - 120</td>
                                            <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">Moderado</td>
                                        </tr>
                                        <tr className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                                            <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">121 - 130</td>
                                            <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">Alto</td>
                                        </tr>
                                        <tr className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                                            <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600"> 130</td>
                                            <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">Crítico</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Tabla THI */}
                            <div>
                                <h3 className="font-medium mb-3 text-gray-700 dark:text-gray-300">
                                    Índice Temperatura-Humedad (THI)
                                </h3>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    Fórmula: (0.8 × T°C) + ((HR% / 100) × (T°C - 14.4)) + 46.4
                                </div>
                                <table className="min-w-full border border-gray-300 dark:border-gray-700">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-700">
                                            <th className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600 text-left">Rango</th>
                                            <th className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 text-left">Nivel</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                            <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">≤ 72</td>
                                            <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">Normal</td>
                                        </tr>
                                        <tr className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                                            <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">73 - 79</td>
                                            <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">Moderado</td>
                                        </tr>
                                        <tr className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                                            <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600">80 - 88</td>
                                            <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">Alto</td>
                                        </tr>
                                        <tr className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                                            <td className="py-2 px-4 border-b border-r border-gray-300 dark:border-gray-600"> 88</td>
                                            <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">Crítico</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}