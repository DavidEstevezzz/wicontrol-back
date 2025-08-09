import React, { useState, useEffect, useCallback } from 'react';
import EmpresaApiService from '../services/EmpresaApiService';
import GranjaApiService from '../services/GranjaApiService';
import DispositivoApiService from '../services/DispositivoApiService';
import CamadaApiService from '../services/CamadaApiService';
import Plot from 'react-plotly.js';

import UsuarioApiService from '../services/UsuarioApiService';
import { useStateContext } from '../contexts/ContextProvider';


export default function ActividadAvesView({
    selectedEmpresa: propSelectedEmpresa,  // Empresa seleccionada desde el dashboard
    selectedGranja: propSelectedGranja,    // Granja seleccionada desde el dashboard
    selectedCamada: propSelectedCamada,    // Camada seleccionada desde el dashboard
    camadaInfo: propCamadaInfo,           // Información de camada desde el dashboard
    isEmbedded = false                    // Indica si está en modo incrustado
}) {
    const { user } = useStateContext();

    // Estado para gestionar las secciones principales
    const [activeSection, setActiveSection] = useState('actual'); // 'actual' o 'analisis'

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
    const [actividadDiaria, setActividadDiaria] = useState(null);
    const [actividadRango, setActividadRango] = useState(null);
    const [ubicacionesDispositivos, setUbicacionesDispositivos] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
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


    // 1. Cargar empresas (solo si no está incrustado)
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

    // 2. Cargar granjas al cambiar empresa (solo si no está incrustado)
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

    // 3. Cargar camadas al cambiar granja (solo si no está incrustado)
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
        setActividadDiaria(null);
        setActividadRango(null);

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
    // 6. Función para obtener datos de actividad para un día específico
    const fetchActividadDiaria = useCallback(async () => {
        if (!selectedDispositivo || !fechaActual) {
            setError('Seleccione un dispositivo y fecha válida.');
            return;
        }

        setLoading(true);
        setError('');
        setActividadDiaria(null);

        try {
            const data = await CamadaApiService.getMonitoreoActividad(
                selectedDispositivo,
                fechaActual,
                fechaActual
            );

            setActividadDiaria(data);
        } catch (error) {
            console.error('Error al obtener datos de actividad diaria:', error);
            setError('Error al procesar los datos de actividad.');
        } finally {
            setLoading(false);
        }
    }, [selectedDispositivo, fechaActual]);

    // 7. Función para obtener datos de actividad en un rango de fechas
    const fetchActividadRango = useCallback(async () => {
        if (!selectedDispositivo || !fechaInicio || !fechaFin) {
            setError('Seleccione un dispositivo y fechas válidas.');
            return;
        }

        setLoading(true);
        setError('');
        setActividadRango(null);

        try {
            const data = await CamadaApiService.getMonitoreoActividad(
                selectedDispositivo,
                fechaInicio,
                fechaFin
            );

            setActividadRango(data);
        } catch (error) {
            console.error('Error al obtener datos de actividad por rango:', error);
            setError('Error al procesar los datos de actividad.');
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

    // 8. Función para manejar la selección rápida de fechas
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

        // CORRECCIÓN: En lugar de llamar a fetchActividadRango directamente, 
        // hacemos la llamada con los nuevos valores directamente
        setLoading(true);
        CamadaApiService.getMonitoreoActividad(
            selectedDispositivo,
            formattedStartDate,  // Usar los valores calculados
            formattedEndDate     // en lugar de los estados que podrían no haberse actualizado
        )
            .then(data => {
                setActividadRango(data);
            })
            .catch(error => {
                console.error('Error al obtener datos de actividad por rango:', error);
                setError('Error al procesar los datos de actividad.');
            })
            .finally(() => {
                setLoading(false);
            });

        // Restaurar el estado de error después
        setTimeout(() => {
            if (error === successMessage) {
                setError(prevError);
            }
        }, 3000);
    }, [selectedDispositivo, camadaInfo, error]);


    // 9. Definición del tema (claro/oscuro)
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
            actividad: '#4ade80',
            inactividad: '#94a3b8'
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
            actividad: '#22c55e',
            inactividad: '#64748b'
        };

    // 10. Configuración base para gráficas Plotly
    const baseLayout = {
        font: {
            family: 'Inter, system-ui, sans-serif',
            color: theme.text
        },
        paper_bgcolor: theme.paper,
        plot_bgcolor: theme.bg,
        margin: { l: 60, r: 20, t: 40, b: 60 }, // Márgenes ampliados para las etiquetas
        hovermode: 'closest',
        xaxis: {
            gridcolor: theme.grid,
            zerolinecolor: theme.axisLine,
            linecolor: theme.axisLine,
            title: {
                font: { size: 14, color: theme.text }
            }
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
            y: -0.2,
            x: 0.5,
            xanchor: 'center'
        }
    };

    const getActividadHeatmapLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Actividad por Día y Hora',
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Hora del Día',
                font: { size: 14, color: theme.text }
            },
            type: 'category',
            tickvals: Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')),
            ticktext: Array.from({ length: 24 }, (_, i) => `${i}:00`)
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'Fecha',
                font: { size: 14, color: theme.text }
            },
            type: 'category'
        },
        margin: { l: 100, r: 50, t: 50, b: 80 }
    });

    const getActividadPorDiaLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Actividad diaria',
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
                text: 'Porcentaje de actividad (%)',
                font: { size: 14, color: theme.text }
            },
            range: [0, 100]
        }
    });

    const getActividadPorHoraLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Actividad por hora',
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Hora del día',
                font: { size: 14, color: theme.text }
            },
            type: 'category'
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'Minutos de actividad',
                font: { size: 14, color: theme.text }
            },
            range: [0, 60]
        }
    });

    const getActividadContinuaLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Línea de Tiempo de Actividad',
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Fecha y Hora',
                font: { size: 14, color: theme.text }
            },
            type: 'date',
            rangeselector: {
                buttons: [
                    {
                        count: 6,
                        label: '6h',
                        step: 'hour',
                        stepmode: 'backward'
                    },
                    {
                        count: 1,
                        label: '1d',
                        step: 'day',
                        stepmode: 'backward'
                    },
                    {
                        count: 3,
                        label: '3d',
                        step: 'day',
                        stepmode: 'backward'
                    },
                    {
                        step: 'all'
                    }
                ],
                bgcolor: theme.paper,
                activecolor: theme.primary,
                font: { color: theme.text }
            }
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'Estado',
                font: { size: 14, color: theme.text }
            },
            tickvals: [0, 1],
            ticktext: ['Inactivo', 'Activo'],
            range: [-0.1, 1.1] // Añadir un poco de espacio arriba y abajo
        },
        // Añadir anotaciones para etiquetar las zonas
        annotations: [
            {
                x: 0.5,
                y: 0.95,
                xref: 'paper',
                yref: 'paper',
                text: 'Períodos de Actividad',
                showarrow: false,
                font: {
                    family: 'Arial',
                    size: 12,
                    color: theme.actividad
                }
            },
            {
                x: 0.5,
                y: 0.05,
                xref: 'paper',
                yref: 'paper',
                text: 'Períodos de Inactividad',
                showarrow: false,
                font: {
                    family: 'Arial',
                    size: 12,
                    color: theme.inactividad
                }
            }
        ],
        // Añadir una línea de referencia entre actividad e inactividad
        shapes: [
            {
                type: 'line',
                x0: 0,
                y0: 0.5,
                x1: 1,
                y1: 0.5,
                xref: 'paper',
                yref: 'y',
                line: {
                    color: theme.grid,
                    width: 1,
                    dash: 'dash'
                }
            }
        ]
    });
    const baseConfig = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToAdd: ['zoom2d', 'pan2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d'],
        displaylogo: false,
        scrollZoom: true,
        toImageButtonOptions: {
            format: 'png',
            filename: 'grafico_actividad_aves',
            height: 500,
            width: 700,
            scale: 1
        }
    };

    // 11. Configuración de datos para gráfica de actividad por día
    const getActividadPorDiaData = () => {
        if (!actividadRango || !actividadRango.resumen_diario || actividadRango.resumen_diario.length === 0) {
            return [];
        }

        // Datos de actividad
        const traceActividad = {
            type: 'bar',
            name: 'Porcentaje de Actividad',
            x: actividadRango.resumen_diario.map(d => d.fecha),
            y: actividadRango.resumen_diario.map(d => d.porcentaje_actividad),
            marker: {
                color: theme.actividad
            },
            hovertemplate: 'Fecha: %{x}<br>Actividad: %{y:.1f}%<extra></extra>'
        };

        // Datos de inactividad
        const traceInactividad = {
            type: 'bar',
            name: 'Porcentaje de Inactividad',
            x: actividadRango.resumen_diario.map(d => d.fecha),
            y: actividadRango.resumen_diario.map(d => d.porcentaje_inactividad),
            marker: {
                color: theme.inactividad
            },
            hovertemplate: 'Fecha: %{x}<br>Inactividad: %{y:.1f}%<extra></extra>'
        };

        return [traceActividad, traceInactividad];
    };

    // 12. Configuración de datos para gráfica de actividad por hora
    const getActividadPorHoraData = () => {
        if (!actividadRango || !actividadRango.actividad_por_hora || actividadRango.actividad_por_hora.length === 0) {
            return [];
        }

        // Ordenar por hora del día
        const datosOrdenados = [...actividadRango.actividad_por_hora].sort(
            (a, b) => parseInt(a.hora) - parseInt(b.hora)
        );

        // Datos de actividad por hora
        const traceActividadPorHora = {
            type: 'bar',
            name: 'Minutos de Actividad',
            x: datosOrdenados.map(d => d.hora),
            y: datosOrdenados.map(d => d.minutos_actividad),
            marker: {
                color: theme.actividad
            },
            hovertemplate: 'Hora: %{x}<br>Actividad: %{y:.1f} minutos<br>(%{text}%)<extra></extra>',
            text: datosOrdenados.map(d => d.porcentaje.toFixed(1))
        };

        return [traceActividadPorHora];
    };

    // 13. Configuración de datos para gráfica de actividad continua (timeline)
    const getActividadContinuaData = () => {
        if (!actividadRango || !actividadRango.medidas_filtradas || actividadRango.medidas_filtradas.length === 0) {
            return [];
        }

        const medidas = actividadRango.medidas_filtradas;

        // Crear puntos para la línea de actividad
        const x = [];
        const y = [];

        // Procesar cada medida
        medidas.forEach((medida, index) => {
            // Añadir la medida actual
            x.push(medida.fecha);
            y.push(parseInt(medida.valor));

            // Añadir un punto nulo para separar segmentos no continuos
            // (solo si no es el último elemento y hay un cambio de estado)
            if (index < medidas.length - 1) {
                const horaActual = new Date(medida.fecha);
                const horaSiguiente = new Date(medidas[index + 1].fecha);

                // Si hay un salto de más de 5 minutos entre medidas o hay un cambio de estado
                // añadimos un punto nulo para separar la línea
                const diffMinutos = (horaSiguiente - horaActual) / (1000 * 60);
                const cambioEstado = medida.valor !== medidas[index + 1].valor;

                if (diffMinutos > 5 || cambioEstado) {
                    x.push(null);
                    y.push(null);
                }
            }
        });

        // Datos de línea de actividad
        const traceActividad = {
            type: 'scatter',
            mode: 'lines',
            name: 'Estado de Actividad',
            x: x,
            y: y,
            line: {
                color: theme.actividad,
                width: 2
            },
            fill: 'tozeroy',
            fillcolor: `${theme.actividad}60`, // Mayor transparencia
            hovertemplate: 'Fecha: %{x}<br>Estado: %{text}<extra></extra>',
            text: y.map(val => val === 1 ? 'Activo' : val === 0 ? 'Inactivo' : '')
        };

        // Crear una línea sombreada para la zona de actividad
        const traceActividadZona = {
            type: 'scatter',
            mode: 'none',
            name: 'Zona Actividad',
            x: [
                ...medidas.map(d => d.fecha),
                ...medidas.map(d => d.fecha).reverse()
            ],
            y: [
                ...medidas.map(d => d.valor === '1' ? 1 : 0.5),
                ...medidas.map(d => d.valor === '1' ? 0.5 : 0)
            ],
            fill: 'toself',
            fillcolor: `${theme.actividad}20`, // Muy transparente
            line: { color: 'transparent' },
            hoverinfo: 'skip',
            showlegend: false
        };

        return [traceActividadZona, traceActividad];
    };

    // 13.1 Configuración de datos para gráfica de actividad por día/hora (heatmap)
    // 13.1 Configuración de datos para gráfica de actividad por día/hora (heatmap) - CORREGIDA
    const getActividadHeatmapData = () => {
        if (!actividadRango || !actividadRango.medidas_filtradas || actividadRango.medidas_filtradas.length === 0) {
            return [];
        }

        const medidas = actividadRango.medidas_filtradas;

        // Crear un objeto para almacenar los datos por día y hora
        const actividadPorDiaHora = {};

        // Inicializar el objeto con ceros
        const fechaInicial = new Date(actividadRango.periodo.fecha_inicio);
        const fechaFinal = new Date(actividadRango.periodo.fecha_fin);
        const diasTotales = Math.ceil((fechaFinal - fechaInicial) / (1000 * 60 * 60 * 24)) + 1;

        for (let i = 0; i < diasTotales; i++) {
            const fecha = new Date(fechaInicial);
            fecha.setDate(fechaInicial.getDate() + i);
            const fechaStr = fecha.toISOString().slice(0, 10);

            actividadPorDiaHora[fechaStr] = {};

            for (let hora = 0; hora < 24; hora++) {
                const horaStr = hora.toString().padStart(2, '0');
                actividadPorDiaHora[fechaStr][horaStr] = 0;
            }
        }

        // Contar actividad por día y hora
        medidas.forEach(medida => {
            // IMPORTANTE: Comprobamos explícitamente si el valor es '1' o 1
            if (medida.valor === '1' || medida.valor === 1) {
                const fecha = new Date(medida.fecha);
                const fechaStr = fecha.toISOString().slice(0, 10);
                const horaStr = fecha.getHours().toString().padStart(2, '0');

                if (actividadPorDiaHora[fechaStr] && actividadPorDiaHora[fechaStr][horaStr] !== undefined) {
                    actividadPorDiaHora[fechaStr][horaStr]++;
                }
            }
        });

        // Convertir los datos al formato requerido por el heatmap
        const x = []; // Horas
        const y = []; // Fechas
        const z = []; // Valores de actividad

        const fechas = Object.keys(actividadPorDiaHora).sort();
        const horas = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

        // Para cada fecha, crear una fila de z
        fechas.forEach(fecha => {
            const fila = [];

            horas.forEach(hora => {
                fila.push(actividadPorDiaHora[fecha][hora]);
            });

            y.push(fecha);
            z.push(fila);
        });

        // Horas para el eje x (0-23)
        horas.forEach(hora => {
            x.push(hora);
        });

        // Imprimir datos para depuración
        console.log('Datos del heatmap:', {
            totalMedidas: medidas.length,
            medidasActivas: medidas.filter(m => m.valor === '1' || m.valor === 1).length,
            fechas: fechas.length,
            horas: horas.length,
            z: z
        });

        // Datos para el heatmap
        const traceHeatmap = {
            type: 'heatmap',
            x: x,
            y: y,
            z: z,
            colorscale: [
                [0, isDarkMode ? 'rgb(30, 30, 50)' : 'rgb(240, 240, 255)'],
                [0.3, isDarkMode ? 'rgb(60, 90, 180)' : 'rgb(100, 150, 255)'],
                [1, isDarkMode ? 'rgb(20, 180, 120)' : 'rgb(20, 200, 120)']
            ],
            showscale: true,
            colorbar: {
                title: 'Número de Actividades',
                tickfont: { color: theme.text }
            },
            hovertemplate: 'Fecha: %{y}<br>Hora: %{x}:00<br>Actividades: %{z}<extra></extra>'
        };

        return [traceHeatmap];
    };

    // 14. Para renderizar el selector de fechas rápidas
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

    // 15. Renderizar tarjeta de resumen de actividad diaria
    const renderResumenActividadDiaria = () => {
        if (!actividadDiaria) {
            return <p className="text-gray-600 dark:text-gray-400">No hay datos disponibles para la fecha seleccionada.</p>;
        }

        // Verificar si hay un mensaje de error en la respuesta
        if (actividadDiaria.mensaje) {
            return <p className="text-amber-600 dark:text-amber-400">{actividadDiaria.mensaje}</p>;
        }

        const { resumen_actividad } = actividadDiaria;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Tiempo de Actividad
                    </h3>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {resumen_actividad.tiempo_formateado}
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <div>Total: {(resumen_actividad.tiempo_total_segundos / 3600).toFixed(2)} horas</div>
                    </div>
                </div>

                <div className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Porcentaje de Actividad
                    </h3>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {resumen_actividad.porcentaje_actividad.toFixed(1)}%
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                            Inactividad: {resumen_actividad.porcentaje_inactividad.toFixed(1)}%
                        </div>
                    </div>
                </div>

                <div className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Lecturas de Actividad
                    </h3>
                    <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                        {resumen_actividad.lecturas_actividad}
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                            Total lecturas: {resumen_actividad.total_lecturas}
                        </div>
                    </div>
                </div>

                <div className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Período Analizado
                    </h3>
                    <div className="text-xl font-medium text-gray-800 dark:text-gray-200">
                        {actividadDiaria.periodo.fecha_inicio}
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                            {(actividadDiaria.periodo.duracion_total_segundos / 3600).toFixed(2)} horas totales
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // 16. Renderizar gráfico de donut para actividad diaria
    const renderGraficoDonutActividad = () => {
        if (!actividadDiaria || !actividadDiaria.resumen_actividad) return null;

        const { resumen_actividad } = actividadDiaria;

        const data = [{
            values: [
                resumen_actividad.porcentaje_actividad,
                resumen_actividad.porcentaje_inactividad
            ],
            labels: ['Actividad', 'Inactividad'],
            type: 'pie',
            hole: 0.6,
            marker: {
                colors: [theme.actividad, theme.inactividad]
            },
            textinfo: 'label+percent',
            textposition: 'outside',
            automargin: true
        }];

        const layout = {
            ...baseLayout,
            title: {
                text: 'Distribución de Actividad e Inactividad',
                font: { size: 18, color: theme.text }
            },
            showlegend: false,
            margin: { l: 20, r: 20, t: 50, b: 20 },
            annotations: [{
                font: {
                    size: 20,
                    color: theme.actividad
                },
                showarrow: false,
                text: `${resumen_actividad.porcentaje_actividad.toFixed(1)}%`,
                x: 0.5,
                y: 0.5
            }]
        };

        return (
            <div className="h-80">
                <Plot
                    data={data}
                    layout={layout}
                    config={baseConfig}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>
        );
    };

    // 17. Renderizar gráfico de actividad por hora del día (para un día específico)
    const renderGraficoActividadPorHora = () => {
        if (!actividadDiaria || !actividadDiaria.actividad_por_hora) return null;

        // Ordenar por hora
        const horasOrdenadas = [...actividadDiaria.actividad_por_hora].sort(
            (a, b) => parseInt(a.hora) - parseInt(b.hora)
        );

        const data = [{
            x: horasOrdenadas.map(h => h.hora),
            y: horasOrdenadas.map(h => h.minutos_actividad),
            type: 'bar',
            marker: {
                color: theme.actividad
            },
            hovertemplate: 'Hora: %{x}<br>Actividad: %{y:.1f} minutos<br>(%{text}%)<extra></extra>',
            text: horasOrdenadas.map(h => h.porcentaje.toFixed(1))
        }];

        const layout = {
            ...baseLayout,
            title: {
                text: 'Actividad por Hora del Día',
                font: { size: 18, color: theme.text }
            },
            xaxis: {
                ...baseLayout.xaxis,
                title: {
                    text: 'Hora del día',
                    font: { size: 14, color: theme.text }
                },
                type: 'category'
            },
            yaxis: {
                ...baseLayout.yaxis,
                title: {
                    text: 'Minutos de actividad',
                    font: { size: 14, color: theme.text }
                },
                range: [0, 60]
            }
        };

        return (
            <div className="h-80">
                <Plot
                    data={data}
                    layout={layout}
                    config={baseConfig}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>
        );
    };

    // 18. Renderizar tabla de períodos de actividad para un día específico
    const renderTablaPeriodosActividad = () => {
        if (!actividadDiaria || !actividadDiaria.periodos_actividad || actividadDiaria.periodos_actividad.length === 0) {
            return (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400">
                        No se encontraron períodos de actividad en la fecha seleccionada.
                    </p>
                </div>
            );
        }

        // Ordenar periodos por fecha
        const periodosOrdenados = [...actividadDiaria.periodos_actividad].sort(
            (a, b) => new Date(a.inicio) - new Date(b.inicio)
        );

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Inicio
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Fin
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Duración
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                        {periodosOrdenados.map((periodo, index) => {
                            // Formatear fecha para mostrar solo la hora:minutos:segundos
                            const formatTime = (dateStr) => {
                                const date = new Date(dateStr);
                                return date.toLocaleTimeString();
                            };

                            // Calcular duración en formato legible
                            const formatDuration = (seconds) => {
                                const minutes = Math.floor(seconds / 60);
                                const secs = seconds % 60;
                                return `${minutes}m ${secs}s`;
                            };

                            return (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                        {formatTime(periodo.inicio)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                        {formatTime(periodo.fin)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                                        {formatDuration(periodo.duracion_segundos)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    // 19. Renderizar resumen de actividad para rango de fechas
    const renderResumenActividadRango = () => {
        if (!actividadRango || !actividadRango.resumen_actividad) return null;

        const { resumen_actividad } = actividadRango;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tiempo Total de Actividad</h3>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{resumen_actividad.tiempo_formateado}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {(resumen_actividad.tiempo_total_segundos / 3600).toFixed(2)} horas
                    </p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Porcentaje de Actividad</h3>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{resumen_actividad.porcentaje_actividad.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Inactividad: {resumen_actividad.porcentaje_inactividad.toFixed(1)}%
                    </p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Días Analizados</h3>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{actividadRango.dias_con_datos}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(actividadRango.periodo.fecha_inicio).toLocaleDateString()} - {new Date(actividadRango.periodo.fecha_fin).toLocaleDateString()}
                    </p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Lecturas Procesadas</h3>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{actividadRango.total_lecturas_procesadas}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Lecturas de actividad: {resumen_actividad.lecturas_actividad}
                    </p>
                </div>
            </div>
        );
    };

    // 20. Renderizar tabla de resumen diario para rango de fechas
    const renderTablaResumenDiario = () => {
        if (!actividadRango || !actividadRango.resumen_diario || actividadRango.resumen_diario.length === 0) {
            return (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400">
                        No hay datos diarios disponibles para el rango seleccionado.
                    </p>
                </div>
            );
        }

        // Ordenar días por fecha descendente (más reciente primero)
        const diasOrdenados = [...actividadRango.resumen_diario].sort(
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
                                Tiempo de Actividad
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                % Actividad
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                % Inactividad
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Lecturas
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                        {diasOrdenados.map((dia, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                    {new Date(dia.fecha).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                                    {dia.tiempo_actividad_formateado}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                    {dia.porcentaje_actividad.toFixed(1)}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {dia.porcentaje_inactividad.toFixed(1)}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {dia.lecturas_aceptadas} / {dia.lecturas_totales}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {!isEmbedded && (
                <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
                    Monitoreo de Actividad de Aves
                </h1>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-100 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

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
                                    setActividadDiaria(null);
                                    setActividadRango(null);
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
                                    setActividadDiaria(null);
                                    setActividadRango(null);
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
                                    setActividadDiaria(null);
                                    setActividadRango(null);
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

            {/* Lista de dispositivos disponibles */}
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
                                        setActividadDiaria(null);
                                        setActividadRango(null);
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
                                        Actividad Diaria
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
                                                max={fechaLimites.fin || undefined} disabled={loading}
                                            />
                                        </div>
                                        <div className="flex-shrink-0">
                                            <button
                                                onClick={fetchActividadDiaria}
                                                disabled={loading}
                                                className="py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-500 disabled:text-gray-200 mt-7"
                                            >
                                                {loading ? 'Cargando...' : 'Consultar actividad diaria'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
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
                                                onClick={fetchActividadRango}
                                                disabled={loading}
                                                className="py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-500 disabled:text-gray-200 mt-7"
                                            >
                                                {loading ? 'Cargando...' : 'Analizar actividad'}
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

            {/* Sección de Actividad Diaria */}
            {activeSection === 'actual' && actividadDiaria && (
                <div className="space-y-6">
                    {/* Información del dispositivo y día seleccionado */}
                    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                        <div className="flex flex-wrap justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                                    Dispositivo: {actividadDiaria.dispositivo?.numero_serie}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Análisis de actividad para el día: {actividadDiaria.periodo?.fecha_inicio}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Resumen de actividad diaria */}
                    {renderResumenActividadDiaria()}

                    {/* Gráficos de actividad diaria */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                                Distribución de actividad
                            </h3>
                            {renderGraficoDonutActividad()}
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                                Actividad por hora
                            </h3>
                            {renderGraficoActividadPorHora()}
                        </div>
                    </div>

                    {/* Tabla de periodos de actividad */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Períodos de actividad detectados
                        </h3>
                        {renderTablaPeriodosActividad()}
                    </div>
                </div>
            )}

            {/* Sección de Análisis por Rango */}
            {activeSection === 'analisis' && actividadRango && (
                <div className="space-y-6">
                    {/* Información del dispositivo y rango */}
                    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                        <div className="flex flex-wrap justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                                    Dispositivo: {actividadRango.dispositivo?.numero_serie}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Análisis de actividad desde {actividadRango.periodo?.fecha_inicio} hasta {actividadRango.periodo?.fecha_fin}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Resumen de estadísticas para todo el rango */}
                    {renderResumenActividadRango()}

                    {/* Gráficas de análisis por rango */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Evolución de la actividad diaria
                        </h3>
                        <div className="h-96">
                            <Plot
                                data={getActividadPorDiaData()}
                                layout={getActividadPorDiaLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Gráfica de actividad por hora */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Actividad promedio por hora
                        </h3>
                        <div className="h-96">
                            <Plot
                                data={getActividadPorHoraData()}
                                layout={getActividadPorHoraLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Gráfica de períodos de actividad (timeline) - MEJORADA */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Línea de tiempo de actividad
                        </h3>
                        <div className="h-96">
                            <Plot
                                data={getActividadContinuaData()}
                                layout={getActividadContinuaLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>


                    {/* Tabla de resumen diario */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Resumen diario de actividad
                        </h3>
                        {renderTablaResumenDiario()}
                    </div>
                </div>
            )}
        </div>
    );
}