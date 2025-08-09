import React, { useState, useEffect, useCallback } from 'react';
import EmpresaApiService from '../services/EmpresaApiService';
import GranjaApiService from '../services/GranjaApiService';
import DispositivoApiService from '../services/DispositivoApiService';
import CamadaApiService from '../services/CamadaApiService';
import Plot from 'react-plotly.js';
import UsuarioApiService from '../services/UsuarioApiService';
import { useStateContext } from '../contexts/ContextProvider';

export default function MonitoreoLuzView({
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
    const [luzDiaria, setLuzDiaria] = useState(null);
    const [luzRango, setLuzRango] = useState(null);
    const [ubicacionesDispositivos, setUbicacionesDispositivos] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

    // 2. Cargar granjas al cambiar empresa (solo si no está incrustado)
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

    // 3. Cargar camadas al cambiar granja (solo si no está incrustado)
    // 3. Cargar camadas al cambiar granja (solo si no está incrustado) con verificación de acceso
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
        setLuzDiaria(null);
        setLuzRango(null);

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

    // 6. Función para obtener datos de luz para un día específico
    const fetchLuzDiaria = useCallback(async () => {
        if (!selectedDispositivo || !fechaActual) {
            setError('Seleccione un dispositivo y fecha válida.');
            return;
        }

        setLoading(true);
        setError('');
        setLuzDiaria(null);

        try {
            const data = await CamadaApiService.getMonitoreoLuz(
                selectedDispositivo,
                fechaActual,
                fechaActual
            );

            setLuzDiaria(data);
        } catch (error) {
            console.error('Error al obtener datos de luz diaria:', error);
            setError('Error al procesar los datos de luz.');
        } finally {
            setLoading(false);
        }
    }, [selectedDispositivo, fechaActual]);

    // 7. Función para obtener datos de luz en un rango de fechas
    const fetchLuzRango = useCallback(async () => {
        if (!selectedDispositivo || !fechaInicio || !fechaFin) {
            setError('Seleccione un dispositivo y fechas válidas.');
            return;
        }

        setLoading(true);
        setError('');
        setLuzRango(null);

        try {
            const data = await CamadaApiService.getMonitoreoLuz(
                selectedDispositivo,
                fechaInicio,
                fechaFin
            );

            setLuzRango(data);
        } catch (error) {
            console.error('Error al obtener datos de luz por rango:', error);
            setError('Error al procesar los datos de luz.');
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

        // En lugar de llamar a fetchLuzRango directamente, 
        // hacemos la llamada con los nuevos valores directamente
        setLoading(true);
        CamadaApiService.getMonitoreoLuz(
            selectedDispositivo,
            formattedStartDate,  // Usar los valores calculados
            formattedEndDate     // en lugar de los estados que podrían no haberse actualizado
        )
            .then(data => {
                setLuzRango(data);
            })
            .catch(error => {
                console.error('Error al obtener datos de luz por rango:', error);
                setError('Error al procesar los datos de luz.');
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
            luz: '#facc15',    // Amarillo para luz
            oscuridad: '#6366f1' // Azul oscuro para oscuridad
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
            luz: '#eab308',     // Amarillo para luz
            oscuridad: '#475569' // Gris oscuro para oscuridad
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

    const getLuzHeatmapLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Intensidad de Luz por Día y Hora',
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

    const getLuzPorDiaLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Luz diaria',
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
                text: 'Porcentaje de luz (%)',
                font: { size: 14, color: theme.text }
            },
            range: [0, 100]
        }
    });

    const getLuzPorHoraLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Luz por hora',
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
                text: 'Minutos de luz',
                font: { size: 14, color: theme.text }
            },
            range: [0, 60]
        }
    });

    const getLuzContinuaLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Línea de Tiempo de Luz',
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
            ticktext: ['Oscuridad', 'Luz'],
            range: [-0.1, 1.1] // Añadir un poco de espacio arriba y abajo
        },
        // Añadir anotaciones para etiquetar las zonas
        annotations: [
            {
                x: 0.5,
                y: 0.95,
                xref: 'paper',
                yref: 'paper',
                text: 'Períodos de Luz',
                showarrow: false,
                font: {
                    family: 'Arial',
                    size: 12,
                    color: theme.luz
                }
            },
            {
                x: 0.5,
                y: 0.05,
                xref: 'paper',
                yref: 'paper',
                text: 'Períodos de Oscuridad',
                showarrow: false,
                font: {
                    family: 'Arial',
                    size: 12,
                    color: theme.oscuridad
                }
            }
        ],
        // Añadir una línea de referencia entre luz y oscuridad
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

    const getIntensidadLuzLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Intensidad de Luz a lo Largo del Tiempo',
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
                text: 'Nivel de Luz (lux)',
                font: { size: 14, color: theme.text }
            }
        },
        // Añadir una línea de referencia para el umbral de luz
        shapes: [
            {
                type: 'line',
                x0: 0,
                y0: 0.5, // Umbral de luz (esto debe actualizarse dinámicamente)
                x1: 1,
                y1: 0.5,
                xref: 'paper',
                yref: 'y',
                line: {
                    color: theme.accent,
                    width: 1,
                    dash: 'dash'
                }
            }
        ],
        annotations: [
            {
                x: 0.02,
                y: 0.5,
                xref: 'paper',
                yref: 'y',
                text: 'Umbral',
                showarrow: false,
                font: {
                    family: 'Arial',
                    size: 10,
                    color: theme.accent
                },
                bgcolor: theme.paper,
                borderpad: 2
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
            filename: 'grafico_luz',
            height: 500,
            width: 700,
            scale: 1
        }
    };

    // 11. Configuración de datos para gráfica de luz por día
    const getLuzPorDiaData = () => {
        if (!luzRango || !luzRango.resumen_diario || luzRango.resumen_diario.length === 0) {
            return [];
        }

        // Datos de luz
        const traceLuz = {
            type: 'bar',
            name: 'Porcentaje de Luz',
            x: luzRango.resumen_diario.map(d => d.fecha),
            y: luzRango.resumen_diario.map(d => d.porcentaje_luz),
            marker: {
                color: theme.luz
            },
            hovertemplate: 'Fecha: %{x}<br>Luz: %{y:.1f}%<extra></extra>'
        };

        // Datos de oscuridad
        const traceOscuridad = {
            type: 'bar',
            name: 'Porcentaje de Oscuridad',
            x: luzRango.resumen_diario.map(d => d.fecha),
            y: luzRango.resumen_diario.map(d => d.porcentaje_oscuridad),
            marker: {
                color: theme.oscuridad
            },
            hovertemplate: 'Fecha: %{x}<br>Oscuridad: %{y:.1f}%<extra></extra>'
        };

        return [traceLuz, traceOscuridad];
    };

    // 12. Configuración de datos para gráfica de luz por hora
    const getLuzPorHoraData = () => {
        if (!luzRango || !luzRango.luz_por_hora || luzRango.luz_por_hora.length === 0) {
            return [];
        }

        // Ordenar por hora del día
        const datosOrdenados = [...luzRango.luz_por_hora].sort(
            (a, b) => parseInt(a.hora) - parseInt(b.hora)
        );

        // Datos de luz por hora
        const traceLuzPorHora = {
            type: 'bar',
            name: 'Minutos de Luz',
            x: datosOrdenados.map(d => d.hora),
            y: datosOrdenados.map(d => d.minutos_luz),
            marker: {
                color: theme.luz
            },
            hovertemplate: 'Hora: %{x}<br>Luz: %{y:.1f} minutos<br>(%{text}%)<extra></extra>',
            text: datosOrdenados.map(d => d.porcentaje_luz.toFixed(1))
        };

        return [traceLuzPorHora];
    };

    // 13. Configuración de datos para gráfica de luz continua (timeline)
    const getLuzContinuaData = () => {
        if (!luzRango || !luzRango.medidas_filtradas || luzRango.medidas_filtradas.length === 0) {
            return [];
        }

        const medidas = luzRango.medidas_filtradas;
        const umbral = luzRango.configuracion.umbral_lux;

        // Crear puntos para la línea de luz
        const x = [];
        const y = [];

        // Procesar cada medida
        medidas.forEach((medida, index) => {
            // Convertir el valor a un valor binario (0 o 1) según el umbral
            const valorBinario = parseFloat(medida.valor) >= umbral ? 1 : 0;

            // Añadir la medida actual
            x.push(medida.fecha);
            y.push(valorBinario);

            // Añadir un punto nulo para separar segmentos no continuos
            if (index < medidas.length - 1) {
                const horaActual = new Date(medida.fecha);
                const horaSiguiente = new Date(medidas[index + 1].fecha);

                const diffMinutos = (horaSiguiente - horaActual) / (1000 * 60);
                const estadoActual = parseFloat(medida.valor) >= umbral;
                const estadoSiguiente = parseFloat(medidas[index + 1].valor) >= umbral;
                const cambioEstado = estadoActual !== estadoSiguiente;

                if (diffMinutos > 5 || cambioEstado) {
                    x.push(null);
                    y.push(null);
                }
            }
        });

        const traceLuz = {
            type: 'scatter',
            mode: 'lines',
            name: 'Estado de Luz',
            x: x,
            y: y,
            line: {
                color: theme.luz,
                width: 3
            },
            // fill: 'tozeroy',
            // fillcolor: `${theme.luz}10`, // Muy transparente, casi invisible
            hovertemplate: 'Fecha: %{x}<br>Estado: %{text}<extra></extra>',
            text: y.map(val => val === 1 ? 'Luz' : val === 0 ? 'Oscuridad' : '')
        };

        // Devolver solo la línea principal
        return [traceLuz];
    };

    // 14. Configuración de datos para gráfica de intensidad de luz (valores reales)
    const getIntensidadLuzData = () => {
        if (!luzRango || !luzRango.medidas_filtradas || luzRango.medidas_filtradas.length === 0) {
            return [];
        }

        const medidas = luzRango.medidas_filtradas;
        const umbral = luzRango.configuracion.umbral_lux;

        // Datos para la línea de intensidad de luz
        const traceIntensidad = {
            type: 'scatter',
            mode: 'lines',
            name: 'Intensidad de Luz (lux)',
            x: medidas.map(d => d.fecha),
            y: medidas.map(d => parseFloat(d.valor)),
            line: {
                color: theme.luz,
                width: 2
            },
            hovertemplate: 'Fecha: %{x}<br>Intensidad: %{y:.2f} lux<extra></extra>'
        };

        // Actualizar la línea de umbral en el layout
        getIntensidadLuzLayout().shapes[0].y0 = umbral;
        getIntensidadLuzLayout().shapes[0].y1 = umbral;
        getIntensidadLuzLayout().annotations[0].y = umbral;

        // Añadir marcadores para valores altos de luz
        const valoresAltos = medidas
            .filter(d => parseFloat(d.valor) > umbral * 2) // Valores que superan el doble del umbral
            .map(d => ({
                x: d.fecha,
                y: parseFloat(d.valor)
            }));

        const traceValoresAltos = {
            type: 'scatter',
            mode: 'markers',
            name: 'Luz Alta',
            x: valoresAltos.map(d => d.x),
            y: valoresAltos.map(d => d.y),
            marker: {
                color: theme.secondary,
                size: 8
            },
            hovertemplate: 'Fecha: %{x}<br>Intensidad: %{y:.2f} lux<extra></extra>'
        };

        return [traceIntensidad, traceValoresAltos];
    };

    // 15. Configuración de datos para gráfica de luz por día/hora (heatmap)
    const getLuzHeatmapData = () => {
        if (!luzRango || !luzRango.medidas_filtradas || luzRango.medidas_filtradas.length === 0) {
            return [];
        }

        const medidas = luzRango.medidas_filtradas;
        const umbral = luzRango.configuracion.umbral_lux;

        // Crear un objeto para almacenar los datos por día y hora
        const luzPorDiaHora = {};

        // Inicializar el objeto con ceros
        const fechaInicial = new Date(luzRango.periodo.fecha_inicio);
        const fechaFinal = new Date(luzRango.periodo.fecha_fin);
        const diasTotales = Math.ceil((fechaFinal - fechaInicial) / (1000 * 60 * 60 * 24)) + 1;

        for (let i = 0; i < diasTotales; i++) {
            const fecha = new Date(fechaInicial);
            fecha.setDate(fechaInicial.getDate() + i);
            const fechaStr = fecha.toISOString().slice(0, 10);

            luzPorDiaHora[fechaStr] = {};

            for (let hora = 0; hora < 24; hora++) {
                const horaStr = hora.toString().padStart(2, '0');
                luzPorDiaHora[fechaStr][horaStr] = {
                    cantidad: 0,
                    intensidadTotal: 0,
                    intensidadPromedio: 0
                };
            }
        }

        // Procesar cada medida para calcular promedios por hora y día
        medidas.forEach(medida => {
            const fecha = new Date(medida.fecha);
            const fechaStr = fecha.toISOString().slice(0, 10);
            const horaStr = fecha.getHours().toString().padStart(2, '0');
            const valor = parseFloat(medida.valor);

            if (luzPorDiaHora[fechaStr] && luzPorDiaHora[fechaStr][horaStr] !== undefined) {
                luzPorDiaHora[fechaStr][horaStr].cantidad++;
                luzPorDiaHora[fechaStr][horaStr].intensidadTotal += valor;
            }
        });

        // Calcular promedios
        Object.keys(luzPorDiaHora).forEach(fecha => {
            Object.keys(luzPorDiaHora[fecha]).forEach(hora => {
                const datos = luzPorDiaHora[fecha][hora];
                if (datos.cantidad > 0) {
                    datos.intensidadPromedio = datos.intensidadTotal / datos.cantidad;
                }
            });
        });

        // Convertir los datos al formato requerido por el heatmap
        const x = []; // Horas
        const y = []; // Fechas
        const z = []; // Valores de intensidad promedio

        const fechas = Object.keys(luzPorDiaHora).sort();
        const horas = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

        // Para cada fecha, crear una fila de z
        fechas.forEach(fecha => {
            const fila = [];

            horas.forEach(hora => {
                fila.push(luzPorDiaHora[fecha][hora].intensidadPromedio);
            });

            y.push(fecha);
            z.push(fila);
        });

        // Horas para el eje x (0-23)
        horas.forEach(hora => {
            x.push(hora);
        });

        // Datos para el heatmap
        const traceHeatmap = {
            type: 'heatmap',
            x: x,
            y: y,
            z: z,
            colorscale: [
                [0, isDarkMode ? 'rgb(30, 30, 50)' : 'rgb(240, 240, 255)'],
                [0.3, isDarkMode ? 'rgb(180, 180, 100)' : 'rgb(255, 255, 200)'],
                [1, isDarkMode ? 'rgb(250, 220, 40)' : 'rgb(255, 215, 0)']
            ],
            showscale: true,
            colorbar: {
                title: 'Intensidad Luz (lux)',
                tickfont: { color: theme.text }
            },
            hovertemplate: 'Fecha: %{y}<br>Hora: %{x}:00<br>Intensidad media: %{z:.2f} lux<extra></extra>'
        };

        return [traceHeatmap];
    };

    // 16. Para renderizar el selector de fechas rápidas
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

    // 17. Renderizar tarjeta de resumen de luz diaria
    const renderResumenLuzDiaria = () => {
        if (!luzDiaria) {
            return <p className="text-gray-600 dark:text-gray-400">No hay datos disponibles para la fecha seleccionada.</p>;
        }

        // Verificar si hay un mensaje de error en la respuesta
        if (luzDiaria.mensaje) {
            return <p className="text-amber-600 dark:text-amber-400">{luzDiaria.mensaje}</p>;
        }

        const { resumen_luz, configuracion } = luzDiaria;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Tiempo con Luz
                    </h3>
                    <div className="text-3xl font-bold text-yellow-500 dark:text-yellow-400">
                        {resumen_luz.tiempo_formateado}
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <div>Total: {(resumen_luz.tiempo_total_segundos / 3600).toFixed(2)} horas</div>
                    </div>
                </div>

                <div className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Porcentaje de Luz
                    </h3>
                    <div className="text-3xl font-bold text-yellow-500 dark:text-yellow-400">
                        {resumen_luz.porcentaje_luz.toFixed(1)}%
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                            Oscuridad: {resumen_luz.porcentaje_oscuridad.toFixed(1)}%
                        </div>
                    </div>
                </div>

                <div className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Nivel de Luz
                    </h3>
                    <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                        {resumen_luz.promedio_lux.toFixed(2)} lux
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                            Rango: {resumen_luz.minimo_lux.toFixed(2)} - {resumen_luz.maximo_lux.toFixed(2)} lux
                        </div>
                        <div>
                            Umbral: {configuracion.umbral_lux} lux
                        </div>
                    </div>
                </div>

                <div className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Período Analizado
                    </h3>
                    <div className="text-xl font-medium text-gray-800 dark:text-gray-200">
                        {luzDiaria.periodo.fecha_inicio}
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                            {(luzDiaria.periodo.duracion_total_segundos / 3600).toFixed(2)} horas totales
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // 18. Renderizar gráfico de donut para luz diaria
    const renderGraficoDonutLuz = () => {
        if (!luzDiaria || !luzDiaria.resumen_luz) return null;

        const { resumen_luz } = luzDiaria;

        const data = [{
            values: [
                resumen_luz.porcentaje_luz,
                resumen_luz.porcentaje_oscuridad
            ],
            labels: ['Luz', 'Oscuridad'],
            type: 'pie',
            hole: 0.6,
            marker: {
                colors: [theme.luz, theme.oscuridad]
            },
            textinfo: 'label+percent',
            textposition: 'outside',
            automargin: true
        }];

        const layout = {
            ...baseLayout,
            title: {
                text: 'Distribución de Luz y Oscuridad',
                font: { size: 18, color: theme.text }
            },
            showlegend: false,
            margin: { l: 20, r: 20, t: 50, b: 20 },
            annotations: [{
                font: {
                    size: 20,
                    color: theme.luz
                },
                showarrow: false,
                text: `${resumen_luz.porcentaje_luz.toFixed(1)}%`,
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

    // 19. Renderizar gráfico de luz por hora del día (para un día específico)
    const renderGraficoLuzPorHora = () => {
        if (!luzDiaria || !luzDiaria.luz_por_hora) return null;

        // Ordenar por hora
        const horasOrdenadas = [...luzDiaria.luz_por_hora].sort(
            (a, b) => parseInt(a.hora) - parseInt(b.hora)
        );

        const data = [{
            x: horasOrdenadas.map(h => h.hora),
            y: horasOrdenadas.map(h => h.minutos_luz),
            type: 'bar',
            marker: {
                color: theme.luz
            },
            hovertemplate: 'Hora: %{x}<br>Luz: %{y:.1f} minutos<br>(%{text}%)<extra></extra>',
            text: horasOrdenadas.map(h => h.porcentaje_luz.toFixed(1))
        }];

        const layout = {
            ...baseLayout,
            title: {
                text: 'Luz por Hora del Día',
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
                    text: 'Minutos de luz',
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

    // 20. Renderizar gráfico de intensidad de luz para un día específico
    const renderGraficoIntensidadLuzDiaria = () => {
        if (!luzDiaria || !luzDiaria.medidas_filtradas || luzDiaria.medidas_filtradas.length === 0) {
            return null;
        }

        const medidas = luzDiaria.medidas_filtradas;
        const umbral = luzDiaria.configuracion.umbral_lux;

        const data = [{
            type: 'scatter',
            mode: 'lines',
            name: 'Intensidad de Luz (lux)',
            x: medidas.map(m => m.fecha),
            y: medidas.map(m => parseFloat(m.valor)),
            line: {
                color: theme.luz,
                width: 2
            },
            hovertemplate: 'Hora: %{x}<br>Intensidad: %{y:.2f} lux<extra></extra>'
        }];

        // Añadir línea de umbral
        const layout = {
            ...baseLayout,
            title: {
                text: 'Intensidad de Luz a lo Largo del Día',
                font: { size: 18, color: theme.text }
            },
            xaxis: {
                ...baseLayout.xaxis,
                title: {
                    text: 'Hora',
                    font: { size: 14, color: theme.text }
                },
                type: 'date',
                tickformat: '%H:%M',
            },
            yaxis: {
                ...baseLayout.yaxis,
                title: {
                    text: 'Intensidad (lux)',
                    font: { size: 14, color: theme.text }
                }
            },
            shapes: [
                {
                    type: 'line',
                    x0: 0,
                    y0: umbral,
                    x1: 1,
                    y1: umbral,
                    xref: 'paper',
                    yref: 'y',
                    line: {
                        color: theme.secondary,
                        width: 1,
                        dash: 'dash'
                    }
                }
            ],
            annotations: [
                {
                    x: 0.02,
                    y: umbral,
                    xref: 'paper',
                    yref: 'y',
                    text: `Umbral: ${umbral} lux`,
                    showarrow: false,
                    font: {
                        family: 'Arial',
                        size: 10,
                        color: theme.secondary
                    },
                    bgcolor: theme.paper,
                    borderpad: 2
                }
            ]
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

    // 21. Renderizar tabla de períodos de luz para un día específico
    const renderTablaPeriodosLuz = () => {
        if (!luzDiaria || !luzDiaria.periodos_luz || luzDiaria.periodos_luz.length === 0) {
            return (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400">
                        No se encontraron períodos de luz en la fecha seleccionada.
                    </p>
                </div>
            );
        }

        // Ordenar periodos por fecha
        const periodosOrdenados = [...luzDiaria.periodos_luz].sort(
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
                                const hours = Math.floor(seconds / 3600);
                                const minutes = Math.floor((seconds % 3600) / 60);
                                const secs = seconds % 60;
                                return hours > 0
                                    ? `${hours}h ${minutes}m ${secs}s`
                                    : `${minutes}m ${secs}s`;
                            };

                            return (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                        {formatTime(periodo.inicio)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                        {formatTime(periodo.fin)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-600 dark:text-yellow-400">
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

    // 22. Renderizar resumen de luz para rango de fechas
    const renderResumenLuzRango = () => {
        if (!luzRango || !luzRango.resumen_luz) return null;

        const { resumen_luz, configuracion } = luzRango;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tiempo Total de Luz</h3>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{resumen_luz.tiempo_formateado}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {(resumen_luz.tiempo_total_segundos / 3600).toFixed(2)} horas
                    </p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Porcentaje de Luz</h3>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{resumen_luz.porcentaje_luz.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Oscuridad: {resumen_luz.porcentaje_oscuridad.toFixed(1)}%
                    </p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Intensidad Media</h3>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{resumen_luz.promedio_lux.toFixed(2)} lux</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Umbral: {configuracion.umbral_lux} lux
                    </p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Rango de Luz</h3>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{resumen_luz.minimo_lux.toFixed(2)} - {resumen_luz.maximo_lux.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Lecturas procesadas: {luzRango.total_lecturas_procesadas}
                    </p>
                </div>
            </div>
        );
    };

    // 23. Renderizar tabla de resumen diario para rango de fechas
    const renderTablaResumenDiario = () => {
        if (!luzRango || !luzRango.resumen_diario || luzRango.resumen_diario.length === 0) {
            return (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400">
                        No hay datos diarios disponibles para el rango seleccionado.
                    </p>
                </div>
            );
        }

        // Ordenar días por fecha descendente (más reciente primero)
        const diasOrdenados = [...luzRango.resumen_diario].sort(
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
                                Tiempo de Luz
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                % Luz
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                % Oscuridad
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Promedio Lux
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                        {diasOrdenados.map((dia, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                    {new Date(dia.fecha).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-600 dark:text-yellow-400">
                                    {dia.tiempo_luz_formateado}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                    {dia.porcentaje_luz.toFixed(1)}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {dia.porcentaje_oscuridad.toFixed(1)}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {dia.promedio_lux.toFixed(2)} lux
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
                    Monitoreo de Luz
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
                                    setLuzDiaria(null);
                                    setLuzRango(null);
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
                                    setLuzDiaria(null);
                                    setLuzRango(null);
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
                                    setLuzDiaria(null);
                                    setLuzRango(null);
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
                                        setLuzDiaria(null);
                                        setLuzRango(null);
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
                                        Luz Diaria
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
                                                onChange={(e) => setFechaActual(e.target.value)}
                                                disabled={loading}
                                            />
                                        </div>
                                        <div className="flex-shrink-0">
                                            <button
                                                onClick={fetchLuzDiaria}
                                                disabled={loading}
                                                className="py-2 px-4 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-500 disabled:text-gray-200 mt-7"
                                            >
                                                {loading ? 'Cargando...' : 'Consultar luz diaria'}
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
                                                    onChange={(e) => setFechaInicio(e.target.value)}
                                                    max={fechaFin}
                                                    disabled={loading}
                                                />
                                                <input
                                                    type="date"
                                                    className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                                    value={fechaFin}
                                                    onChange={(e) => setFechaFin(e.target.value)}
                                                    min={fechaInicio}
                                                    disabled={loading}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <button
                                                onClick={fetchLuzRango}
                                                disabled={loading}
                                                className="py-2 px-4 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-500 disabled:text-gray-200 mt-7"
                                            >
                                                {loading ? 'Cargando...' : 'Analizar luz'}
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

            {/* Sección de Luz Diaria */}
            {activeSection === 'actual' && luzDiaria && (
                <div className="space-y-6">
                    {/* Información del dispositivo y día seleccionado */}
                    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                        <div className="flex flex-wrap justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                                    Dispositivo: {luzDiaria.dispositivo?.numero_serie}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Análisis de luz para el día: {luzDiaria.periodo?.fecha_inicio}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Resumen de luz diaria */}
                    {renderResumenLuzDiaria()}

                    {/* Gráficos de luz diaria */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                                Distribución de luz
                            </h3>
                            {renderGraficoDonutLuz()}
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                                Luz por hora
                            </h3>
                            {renderGraficoLuzPorHora()}
                        </div>
                    </div>

                    {/* Gráfico de intensidad de luz */}
                    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                            Intensidad de luz a lo largo del día
                        </h3>
                        {renderGraficoIntensidadLuzDiaria()}
                    </div>

                    {/* Tabla de periodos de luz */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Períodos de luz detectados
                        </h3>
                        {renderTablaPeriodosLuz()}
                    </div>
                </div>
            )}

            {/* Sección de Análisis por Rango */}
            {activeSection === 'analisis' && luzRango && (
                <div className="space-y-6">
                    {/* Información del dispositivo y rango */}
                    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                        <div className="flex flex-wrap justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                                    Dispositivo: {luzRango.dispositivo?.numero_serie}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Análisis de luz desde {luzRango.periodo?.fecha_inicio} hasta {luzRango.periodo?.fecha_fin}
                                </p>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Umbral de luz: {luzRango.configuracion?.umbral_lux} lux
                            </div>
                        </div>
                    </div>

                    {/* Resumen de estadísticas para todo el rango */}
                    {renderResumenLuzRango()}

                    {/* Gráficas de análisis por rango */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Evolución de la luz diaria
                        </h3>
                        <div className="h-96">
                            <Plot
                                data={getLuzPorDiaData()}
                                layout={getLuzPorDiaLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Gráfica de luz por hora */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Luz promedio por hora
                        </h3>
                        <div className="h-96">
                            <Plot
                                data={getLuzPorHoraData()}
                                layout={getLuzPorHoraLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Gráfica de intensidad de luz */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Intensidad de luz a lo largo del tiempo
                        </h3>
                        <div className="h-96">
                            <Plot
                                data={getIntensidadLuzData()}
                                layout={getIntensidadLuzLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Gráfica de períodos de luz (timeline) */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Períodos de luz y oscuridad
                        </h3>
                        <div className="h-96">
                            <Plot
                                data={getLuzContinuaData()}
                                layout={getLuzContinuaLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Mapa de calor de luz por hora y día */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Intensidad de luz por día y hora
                        </h3>
                        <div className="h-96">
                            <Plot
                                data={getLuzHeatmapData()}
                                layout={getLuzHeatmapLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Tabla de resumen diario */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Resumen diario de luz
                        </h3>
                        {renderTablaResumenDiario()}
                    </div>
                </div>
            )}
        </div>
    );
}