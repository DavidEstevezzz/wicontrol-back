import React, { useState, useEffect, useCallback } from 'react';
import EmpresaApiService from '../services/EmpresaApiService';
import GranjaApiService from '../services/GranjaApiService';
import DispositivoApiService from '../services/DispositivoApiService';
import UsuarioApiService from '../services/UsuarioApiService'; // Añadir este import
import Plot from 'react-plotly.js';
import CamadaApiService from '../services/CamadaApiService';
import PesoPavosButpremiumApiService from '../services/PesoPavosButpremiumApiService';
import PesoPavosHybridconverterApiService from '../services/PesoPavosHybridconverterApiService';
import PesoPavosNicholasselectApiService from '../services/PesoPavosNicholasselectApiService';
import PesoReproductoresRossApiService from '../services/PesoReproductoresRossApiService';
import PesoBroilersRossApiService from '../services/PesoBroilersRossApiService';
import { useStateContext } from '../contexts/ContextProvider'; // Importar el contexto para obtener el usuario actual


export default function PesoMedioGranjaView({
    selectedEmpresa: propSelectedEmpresa,  // Empresa seleccionada desde el dashboard
    selectedGranja: propSelectedGranja,    // Granja seleccionada desde el dashboard
    isEmbedded = false                     // Indica si está en modo incrustado
}) {
    // Obtener usuario actual del contexto
    const { user } = useStateContext();

    // Estados para selección y filtros
    const [empresas, setEmpresas] = useState([]);
    const [granjas, setGranjas] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState(propSelectedEmpresa || '');
    const [selectedGranja, setSelectedGranja] = useState(propSelectedGranja || '');
    const [todasGranjas, setTodasGranjas] = useState(false);
    const [fechaInicio, setFechaInicio] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 7); // Inicialmente, 7 días atrás
        return date.toISOString().slice(0, 10);
    });
    const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().slice(0, 10));
    const [coef, setCoef] = useState('');

    // Estados para datos y carga
    const [dispositivosData, setDispositivosData] = useState([]);
    const [pesosMediosData, setPesosMediosData] = useState([]);
    const [ubicacionesDispositivos, setUbicacionesDispositivos] = useState({});
    const [loading, setLoading] = useState(false);
    const [loadingProyeccion, setLoadingProyeccion] = useState(false);
    const [error, setError] = useState('');
    const [mostrarProyeccion, setMostrarProyeccion] = useState(false);
    const [diasProyeccion, setDiasProyeccion] = useState(1);
    const [referenceData, setReferenceData] = useState(null);
    const [camadaInfo, setCamadaInfo] = useState(null);
    const [loadingReference, setLoadingReference] = useState(false);

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
            proyeccion: '#fbbf24'
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
            proyeccion: '#f59e0b'
        };

    useEffect(() => {
        if (isEmbedded) {
            if (propSelectedEmpresa) setSelectedEmpresa(propSelectedEmpresa);
            if (propSelectedGranja) setSelectedGranja(propSelectedGranja);

            // Si tenemos empresa y granja seleccionadas, cargar dispositivos automaticamente
            if (propSelectedEmpresa && propSelectedGranja) {
                loadDispositivos();
            }
        }
    }, [propSelectedEmpresa, propSelectedGranja, isEmbedded]);

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

    // 3. Función para cargar dispositivos de granjas seleccionadas
    const loadDispositivos = useCallback(async () => {
        if ((!selectedGranja && !todasGranjas) || loading) return;

        setLoading(true);
        setError('');

        try {
            let dispositivos = [];

            if (todasGranjas) {
                // Cargar dispositivos solo de las granjas a las que el usuario tiene acceso
                const granjasFiltradas = granjas;

                await Promise.all(
                    granjasFiltradas.map(async (granja) => {
                        const data = await GranjaApiService.getDispositivosActivos(granja.numero_rega);
                        dispositivos = [...dispositivos, ...data.dispositivos];
                    })
                );
            } else {
                // Verificar si el usuario tiene acceso a esta granja específica
                let tieneAcceso = true;

                if (user && !isEmbedded) {
                    // En modo no incrustado, verificar acceso según tipo de usuario
                    if (user.usuario_tipo === 'Responsable_Zona' || user.usuario_tipo === 'Ganadero') {
                        const granjaEncontrada = granjas.find(g => g.numero_rega === selectedGranja);
                        if (!granjaEncontrada) {
                            tieneAcceso = false;
                        }
                    }
                }

                if (tieneAcceso) {
                    const data = await GranjaApiService.getDispositivosActivos(selectedGranja);
                    dispositivos = data.dispositivos;
                } else {
                    throw new Error("No tiene acceso a esta granja.");
                }
            }

            setDispositivosData(dispositivos);

            // Cargar ubicaciones (granja y nave) para cada dispositivo
            const ubicaciones = {};
            await Promise.all(
                dispositivos.map(async (disp) => {
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
    }, [selectedGranja, todasGranjas, granjas, loading, user, isEmbedded]);


    // 4. Función para obtener pesos medios de dispositivos seleccionados
    const fetchPesosMedios = useCallback(async () => {
        if (dispositivosData.length === 0 || !fechaInicio || !fechaFin) {
            setError('Seleccione dispositivos y fechas válidas.');
            return;
        }

        setLoading(true);
        setError('');
        setPesosMediosData([]);

        try {
            const coefNum = coef === '' ? null : parseFloat(coef) / 100;

            // Procesar cada dispositivo para obtener su peso medio
            const resultados = await Promise.all(
                dispositivosData.map(async (disp) => {
                    try {
                        const data = await DispositivoApiService.calcularPesoMedioPorRango(
                            disp.id_dispositivo,
                            fechaInicio,
                            fechaFin,
                            coefNum
                        );

                        // Añadir ubicación al resultado
                        const ubicacion = ubicacionesDispositivos[disp.id_dispositivo] || {
                            granja: 'Desconocida',
                            nave: 'N/A'
                        };

                        return {
                            ...data,
                            nombreDispositivo: `${ubicacion.granja} (${ubicacion.nave})`,
                            id_dispositivo: disp.id_dispositivo
                        };
                    } catch (error) {
                        console.error(`Error al obtener peso medio para dispositivo ${disp.id_dispositivo}:`, error);
                        return null;
                    }
                })
            );

            // Filtrar resultados nulos
            const datosValidos = resultados.filter(Boolean);
            setPesosMediosData(datosValidos);

        } catch (error) {
            console.error('Error al obtener pesos medios:', error);
            setError('Error al procesar los datos de peso medio.');
        } finally {
            setLoading(false);
        }
    }, [dispositivosData, fechaInicio, fechaFin, coef, ubicacionesDispositivos]);

    // 5. Calcular proyección de peso con alineamiento a curva de referencia
    // Cargar los datos de referencia desde la API según la combinación de tipo_ave y estirpe
    const loadReferenceData = async () => {
        try {
            if (!camadaInfo || !camadaInfo.tipo_estirpe || !camadaInfo.tipo_ave) {
                console.error("No hay información completa de camada, estirpe o tipo de ave");
                setLoadingReference(false);
                return;
            }

            const normalizeForServiceName = (str) => {
                const normalized = str.trim().toLowerCase();
                return normalized.split(/\s+/).map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join('');
            };

            const normalizeForTableName = (str) => {
                return str.trim().toLowerCase().replace(/\s+/g, '');
            };

            let tipoAveServicio = normalizeForServiceName(camadaInfo.tipo_ave);
            let tipoEstirpeServicio = normalizeForServiceName(camadaInfo.tipo_estirpe);

            let tipoAveTabla = normalizeForTableName(camadaInfo.tipo_ave);
            let tipoEstirpeTabla = normalizeForTableName(camadaInfo.tipo_estirpe);

            if (tipoEstirpeTabla === 'cobb') {
                tipoEstirpeTabla = 'ross';
                tipoEstirpeServicio = 'Ross';
            }

            setLoadingReference(true);
            setError('');

            let apiService;

            try {
                switch (`${tipoAveTabla}_${tipoEstirpeTabla}`) {
                    case 'pavos_butpremium':
                        apiService = PesoPavosButpremiumApiService;
                        break;
                    case 'pavos_hybridconverter':
                        apiService = PesoPavosHybridconverterApiService;
                        break;
                    case 'pavos_nicholasselect':
                        apiService = PesoPavosNicholasselectApiService;
                        break;
                    case 'reproductores_ross':
                        apiService = PesoReproductoresRossApiService;
                        break;
                    case 'broilers_ross':
                        apiService = PesoBroilersRossApiService;
                        break;
                    default:
                        console.log(`No se encontró un servicio específico para ${tipoAveTabla}_${tipoEstirpeTabla}, usando PesoBroilersRossApiService por defecto`);
                        apiService = PesoBroilersRossApiService;
                }
            } catch (error) {
                console.error(`Error al encontrar el servicio para ${tipoAveTabla}_${tipoEstirpeTabla}:`, error);
                setError('No se pudo encontrar un servicio adecuado para los datos de referencia.');
                setLoadingReference(false);
                return;
            }

            try {
                const apiData = await apiService.getPesosReferencia();

                if (!apiData || apiData.length === 0) {
                    console.error('No se recibieron datos de la API');
                    setError('No se encontraron datos de referencia.');
                    setLoadingReference(false);
                    return;
                }

                const transformedData = apiData.map(item => ({
                    id: item.id || item.edad,
                    edad: item.edad,
                    Mixto: item.mixto || item.Mixto || item.peso_mixto || 0,
                    Machos: item.machos || item.Machos || item.peso_machos || 0,
                    Hembras: item.hembras || item.Hembras || item.peso_hembras || 0
                }));

                if (!transformedData.find(d => d.edad === -1)) {
                    transformedData.unshift({
                        id: 0,
                        edad: -1,
                        Mixto: 0,
                        Machos: 0,
                        Hembras: 0
                    });
                }

                transformedData.sort((a, b) => a.edad - b.edad);
                setReferenceData(transformedData);
                console.log(`Datos de referencia cargados: ${transformedData.length} registros`);
            } catch (apiError) {
                console.error('Error al obtener datos de la API:', apiError);
                setError('Error al cargar los datos de referencia. Consulte la consola para más detalles.');
            }

        } catch (error) {
            console.error('Error general al cargar datos de referencia:', error);
            setError('Error inesperado al cargar los datos de referencia.');
        } finally {
            setLoadingReference(false);
        }
    };

    // Calcular la edad de la camada en días para una fecha específica
    const calculateCamadaAge = (date = new Date()) => {
        if (!camadaInfo || !camadaInfo.fecha_hora_inicio) return null;

        const startDate = new Date(camadaInfo.fecha_hora_inicio);
        const diffTime = Math.abs(date - startDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    // Obtener el sexaje de la camada
    const getCamadaSexaje = () => {
        if (!camadaInfo || !camadaInfo.sexaje) return 'Mixto';

        const sexaje = camadaInfo.sexaje.trim();

        if (sexaje === 'Machos') return 'Machos';
        if (sexaje === 'Hembras') return 'Hembras';
        return 'Mixto';
    };

    // Calcular regresión lineal
    const calculateLinearRegression = (xValues, yValues) => {
        const n = xValues.length;
        if (n <= 1) return null;

        const startTimestamp = new Date(xValues[0]).getTime();
        const xDays = xValues.map(x => (new Date(x).getTime() - startTimestamp) / (1000 * 60 * 60 * 24));

        const meanX = xDays.reduce((sum, x) => sum + x, 0) / n;
        const meanY = yValues.reduce((sum, y) => sum + y, 0) / n;

        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < n; i++) {
            numerator += (xDays[i] - meanX) * (yValues[i] - meanY);
            denominator += Math.pow(xDays[i] - meanX, 2);
        }

        const slope = denominator !== 0 ? numerator / denominator : 0;
        const intercept = meanY - slope * meanX;

        let totalVariation = 0;
        let explainedVariation = 0;
        const predictedY = xDays.map(x => slope * x + intercept);

        for (let i = 0; i < n; i++) {
            totalVariation += Math.pow(yValues[i] - meanY, 2);
            explainedVariation += Math.pow(predictedY[i] - meanY, 2);
        }

        const rSquared = totalVariation !== 0 ? explainedVariation / totalVariation : 0;

        return {
            slope,
            intercept,
            rSquared,
            predict: (dayOffset) => slope * (dayOffset) + intercept,
            startDate: new Date(startTimestamp)
        };
    };

    // Función mejorada para cálculo de pronósticos (copiada exactamente de PesadasCamadaView)
    const getForecastDataForDevice = (dispositivo) => {
        if (!dispositivo.resumen_diario || dispositivo.resumen_diario.length <= 2) return [];

        const sortedData = [...dispositivo.resumen_diario].sort((a, b) =>
            new Date(a.fecha) - new Date(b.fecha)
        );

        const dates = sortedData.map(d => new Date(d.fecha));
        const weights = sortedData.map(d => d.peso_medio);

        const originalData = {
            type: 'scatter',
            mode: 'markers',
            x: dates,
            y: weights,
            name: `${dispositivo.nombreDispositivo} - Datos reales`,
            marker: {
                size: 8,
                line: {
                    color: isDarkMode ? theme.bg : 'white',
                    width: 1
                }
            }
        };

        const connectingLine = {
            type: 'scatter',
            mode: 'lines',
            x: dates,
            y: weights,
            name: `${dispositivo.nombreDispositivo} - Tendencia actual`,
            line: {
                width: 2,
            },
            showlegend: false
        };

        const lastDate = dates[dates.length - 1];
        const lastWeight = weights[weights.length - 1];

        const forecastDates = [];
        const forecastValues = [];

        console.log(`🔢 Iniciando pronóstico híbrido desde ${lastWeight.toFixed(1)}g para ${dispositivo.nombreDispositivo}`);

        function calculateAcceleratedGain(historicalWeights, historicalDates) {
            if (historicalWeights.length < 3) {
                return historicalWeights[historicalWeights.length - 1] - historicalWeights[historicalWeights.length - 2];
            }

            const dailyGains = [];
            for (let i = 1; i < historicalWeights.length; i++) {
                const daysBetween = (historicalDates[i] - historicalDates[i - 1]) / (1000 * 60 * 60 * 24);
                if (daysBetween > 0) {
                    const dailyGain = (historicalWeights[i] - historicalWeights[i - 1]) / daysBetween;
                    dailyGains.push(dailyGain);
                }
            }

            console.log(`📈 Ganancias históricas: ${dailyGains.map(g => g.toFixed(1)).join(', ')} g/día`);

            if (dailyGains.length >= 3) {
                const accelerations = [];
                for (let i = 1; i < dailyGains.length; i++) {
                    accelerations.push(dailyGains[i] - dailyGains[i - 1]);
                }

                let weightedAccelSum = 0;
                let totalWeight = 0;

                accelerations.forEach((accel, index) => {
                    const weight = Math.exp((index + 1) / accelerations.length * 2);
                    weightedAccelSum += accel * weight;
                    totalWeight += weight;
                });

                const averageAcceleration = weightedAccelSum / totalWeight;
                const lastGain = dailyGains[dailyGains.length - 1];

                console.log(`🚀 Aceleración promedio: ${averageAcceleration.toFixed(2)} g/día²`);
                console.log(`📊 Última ganancia: ${lastGain.toFixed(1)} g/día`);

                const nextAcceleratedGain = lastGain + averageAcceleration;

                console.log(`🎯 Próxima ganancia acelerada: ${nextAcceleratedGain.toFixed(1)} g/día`);

                return Math.max(0, nextAcceleratedGain);
            }

            let weightedSum = 0;
            let totalWeight = 0;

            dailyGains.forEach((gain, index) => {
                const weight = Math.exp((index + 1) / dailyGains.length * 2);
                weightedSum += gain * weight;
                totalWeight += weight;
            });

            return weightedSum / totalWeight;
        }

        function getReferenceGain(currentAge, sexaje) {
            if (!referenceData || !referenceData.length) return null;

            const currentRefData = referenceData.find(d => d.edad === currentAge);
            const nextRefData = referenceData.find(d => d.edad === currentAge + 1);

            if (currentRefData && nextRefData) {
                const expectedGain = nextRefData[sexaje] - currentRefData[sexaje];
                console.log(`📖 Ganancia esperada referencia (edad ${currentAge}→${currentAge + 1}): ${expectedGain.toFixed(1)}g`);
                return expectedGain;
            }

            return null;
        }

        const allPoints = [...weights];
        const allDates = [...dates];

        for (let i = 1; i <= diasProyeccion; i++) {
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + i);

            const currentWeight = allPoints[allPoints.length - 1];

            console.log(`\n=== DÍA ${i} DE PRONÓSTICO ===`);
            console.log(`💼 Peso actual: ${currentWeight.toFixed(1)}g`);

            const acceleratedGain = calculateAcceleratedGain(allPoints, allDates);
            const acceleratedNextWeight = currentWeight + acceleratedGain;

            console.log(`🚀 Ganancia acelerada: +${acceleratedGain.toFixed(1)}g → ${acceleratedNextWeight.toFixed(1)}g`);

            let referenceGain = null;
            let referenceNextWeight = null;

            if (referenceData && camadaInfo) {
                const currentAge = calculateCamadaAge(lastDate) + i - 1;
                const sexaje = getCamadaSexaje();

                referenceGain = getReferenceGain(currentAge, sexaje);

                if (referenceGain !== null) {
                    referenceNextWeight = currentWeight + referenceGain;
                    console.log(`📖 Ganancia referencia: +${referenceGain.toFixed(1)}g → ${referenceNextWeight.toFixed(1)}g`);
                }
            }

            let finalWeight;

            if (referenceGain !== null) {
                const acceleratedWeight_factor = 0.7;
                const referenceWeight_factor = 0.3;

                finalWeight = (acceleratedNextWeight * acceleratedWeight_factor) +
                    (referenceNextWeight * referenceWeight_factor);

                console.log(`⚖️  Media ponderada: ${(acceleratedWeight_factor * 100).toFixed(0)}% acelerado + ${(referenceWeight_factor * 100).toFixed(0)}% referencia`);
                console.log(`🎯 Peso final: ${finalWeight.toFixed(1)}g`);

            } else {
                finalWeight = acceleratedNextWeight;
                console.log(`🎯 Peso final (solo acelerado): ${finalWeight.toFixed(1)}g`);
            }

            allPoints.push(finalWeight);
            allDates.push(nextDate);
            forecastValues.push(finalWeight);
            forecastDates.push(nextDate);

            console.log(`✅ Día ${i} completado: ${finalWeight.toFixed(1)}g`);
        }

        const forecastLine = {
            type: 'scatter',
            mode: 'lines+markers',
            x: forecastDates,
            y: forecastValues,
            name: `${dispositivo.nombreDispositivo} - Pronóstico híbrido`,
            line: {
                color: 'rgba(255, 165, 0, 0.8)',
                width: 3
            },
            marker: {
                color: 'rgba(255, 165, 0, 0.9)',
                size: 8,
                symbol: 'circle'
            }
        };

        const data = [originalData, connectingLine, forecastLine];

        if (referenceData && camadaInfo) {
            const sexaje = getCamadaSexaje();
            const currentAge = calculateCamadaAge(lastDate);

            if (currentAge !== null) {
                const refDates = [];
                const refWeights_ref = [];
                const pastDaysToShow = 7;
                const oldestDate = new Date(Math.min(...dates.map(d => d.getTime())));
                const oldestAge = calculateCamadaAge(oldestDate);
                const startAge = Math.max(0, oldestAge - pastDaysToShow);

                for (let age = startAge; age <= currentAge + diasProyeccion; age++) {
                    const refData = referenceData.find(d => d.edad === age);
                    if (refData) {
                        const refDate = new Date(camadaInfo.fecha_hora_inicio);
                        refDate.setDate(refDate.getDate() + age);
                        refDates.push(refDate);
                        refWeights_ref.push(refData[sexaje]);
                    }
                }

                if (refDates.length > 0) {
                    const referenceLine = {
                        type: 'scatter',
                        mode: 'lines',
                        x: refDates,
                        y: refWeights_ref,
                        name: `Referencia ${sexaje}`,
                        line: {
                            color: sexaje === 'Mixto' ? 'rgba(75, 192, 192, 0.8)' :
                                sexaje === 'Machos' ? 'rgba(54, 162, 235, 0.8)' : 'rgba(255, 99, 132, 0.8)',
                            width: 2,
                            dash: 'dot'
                        }
                    };
                    data.push(referenceLine);
                }
            }
        }

        return {
            graphData: data,
            forecastValues: forecastValues,
            forecastDates: forecastDates,
            lastDate: lastDate,
            lastWeight: lastWeight
        };
    };

    // Nueva función calcularProyeccion que reemplaza a la anterior
    const calcularProyeccion = useCallback(async () => {
        if (pesosMediosData.length === 0) {
            setError('No hay datos para realizar proyecciones.');
            return;
        }

        setLoadingProyeccion(true);

        try {
            // Intentar cargar información de la camada para el primer dispositivo
            let camadaInfoEncontrada = null;

            for (const dispositivo of pesosMediosData) {
                try {
                    const camadas = await CamadaApiService.getCamadasByDispositivo(dispositivo.id_dispositivo);
                    if (camadas && camadas.length > 0) {
                        const camadaActiva = camadas.find(c => c.alta === 1) || camadas[0];
                        camadaInfoEncontrada = await CamadaApiService.getCamadaInfo(camadaActiva.id_camada);

                        if (camadaInfoEncontrada) {
                            setCamadaInfo(camadaInfoEncontrada);
                            break;
                        }
                    }
                } catch (error) {
                    console.warn('Error al buscar información de camada:', error);
                }
            }

            // Si tenemos información de camada, cargar datos de referencia
            if (camadaInfoEncontrada) {
                await loadReferenceData();
            }

            // Aplicar proyecciones a cada dispositivo
            const datosConProyeccion = pesosMediosData.map(dispositivo => {
                const datosOrdenados = [...dispositivo.resumen_diario].sort(
                    (a, b) => new Date(a.fecha) - new Date(b.fecha)
                );

                if (datosOrdenados.length < 2) {
                    return {
                        ...dispositivo,
                        proyeccion: []
                    };
                }

                // Usar el algoritmo híbrido de PesadasCamadaView
                const forecastResult = getForecastDataForDevice(dispositivo);

                const proyecciones = [];
                if (forecastResult.forecastValues && forecastResult.forecastDates) {
                    for (let i = 0; i < forecastResult.forecastValues.length; i++) {
                        proyecciones.push({
                            fecha: forecastResult.forecastDates[i].toISOString().split('T')[0],
                            peso_medio: forecastResult.forecastValues[i],
                            es_proyeccion: true
                        });
                    }
                }

                return {
                    ...dispositivo,
                    proyeccion: proyecciones
                };
            });

            setPesosMediosData(datosConProyeccion);
            setMostrarProyeccion(true);

        } catch (error) {
            console.error('Error al calcular proyecciones:', error);
            setError('Error al calcular las proyecciones de peso.');
        } finally {
            setLoadingProyeccion(false);
        }
    }, [pesosMediosData, diasProyeccion, referenceData, camadaInfo]);



    // 7. Configuración base para gráficas Plotly
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

    const baseConfig = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToAdd: ['zoom2d', 'pan2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d'],
        displaylogo: false,
        scrollZoom: true,
        toImageButtonOptions: {
            format: 'png',
            filename: 'grafico_peso_medio_granja',
            height: 500,
            width: 700,
            scale: 1
        }
    };


    // 8. Preparar datos para gráfica de peso medio
    const getPesoMedioData = () => {
        if (!pesosMediosData || pesosMediosData.length === 0) return [];

        // Crear un trace por cada dispositivo
        return pesosMediosData.map(dispositivo => {
            // Datos reales - ORDENAR CRONOLÓGICAMENTE
            const datosReales = dispositivo.resumen_diario
                .map(d => ({
                    fecha: d.fecha,
                    peso: d.peso_medio
                }))
                .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); // ORDENAMIENTO AGREGADO

            // Datos de proyección si existen - ORDENAR CRONOLÓGICAMENTE
            const datosProyeccion = dispositivo.proyeccion ?
                dispositivo.proyeccion
                    .map(p => ({
                        fecha: p.fecha,
                        peso: p.peso_medio
                    }))
                    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)) // ORDENAMIENTO AGREGADO
                : [];

            // Crear trace para datos reales
            const traceReal = {
                type: 'scatter',
                mode: 'lines+markers',
                name: dispositivo.nombreDispositivo,
                x: datosReales.map(d => d.fecha),
                y: datosReales.map(d => d.peso),
                line: {
                    width: 3,
                    shape: 'spline'
                },
                marker: {
                    size: 8,
                    line: {
                        color: isDarkMode ? theme.bg : 'white',
                        width: 1.5
                    }
                },
                hovertemplate: 'Fecha: %{x}<br>Peso medio: %{y:.2f} g<extra>' +
                    dispositivo.nombreDispositivo + '</extra>'
            };

            // Si hay proyección, crear trace adicional
            if (mostrarProyeccion && datosProyeccion.length > 0) {
                const traceProyeccion = {
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: dispositivo.nombreDispositivo + ' (proyección)',
                    x: datosProyeccion.map(d => d.fecha),
                    y: datosProyeccion.map(d => d.peso),
                    line: {
                        width: 2,
                        dash: 'dash',
                        shape: 'spline'
                    },
                    marker: {
                        size: 6,
                        line: {
                            color: isDarkMode ? theme.bg : 'white',
                            width: 1.5
                        }
                    },
                    hovertemplate: 'Fecha: %{x}<br>Peso proyectado: %{y:.2f} g<extra>' +
                        dispositivo.nombreDispositivo + ' (proyección)</extra>'
                };

                return [traceReal, traceProyeccion];
            }

            return traceReal;
        }).flat(); // Aplanar el array para incluir todas las líneas reales y de proyección
    };

    const getPesoMedioLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Evolución del Peso Medio por Granja/Nave',
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
                text: 'Peso Medio (g)',
                font: { size: 14, color: theme.text }
            }
        }
    });

    // Función para renderizar tabla resumen de proyección
    const renderTablaResumenProyeccion = () => {
        if (!mostrarProyeccion || !pesosMediosData || pesosMediosData.length === 0) {
            return null;
        }

        // Filtrar dispositivos que tienen proyecciones
        const dispositivosConProyeccion = pesosMediosData.filter(dispositivo =>
            dispositivo.proyeccion && dispositivo.proyeccion.length > 0
        );

        if (dispositivosConProyeccion.length === 0) {
            return null;
        }

        // Preparar datos para la tabla día a día
        const diasProyectados = [];

        // Crear estructura de días
        for (let dia = 1; dia <= diasProyeccion; dia++) {
            const diaData = {
                dia: dia,
                fecha: null,
                dispositivos: []
            };

            dispositivosConProyeccion.forEach(dispositivo => {
                if (dispositivo.proyeccion && dispositivo.proyeccion[dia - 1]) {
                    const proyeccion = dispositivo.proyeccion[dia - 1];

                    // Obtener último peso real para calcular incremento
                    const datosOrdenados = [...dispositivo.resumen_diario].sort(
                        (a, b) => new Date(a.fecha) - new Date(b.fecha)
                    );
                    const ultimoPesoReal = datosOrdenados[datosOrdenados.length - 1]?.peso_medio || 0;

                    // Obtener peso del día anterior de la proyección (o peso real si es día 1)
                    let pesoAnterior = ultimoPesoReal;
                    if (dia > 1 && dispositivo.proyeccion[dia - 2]) {
                        pesoAnterior = dispositivo.proyeccion[dia - 2].peso_medio;
                    }

                    const incrementoDiario = proyeccion.peso_medio - pesoAnterior;
                    const incrementoTotal = proyeccion.peso_medio - ultimoPesoReal;
                    const incrementoPorcentual = ((incrementoTotal / ultimoPesoReal) * 100);

                    diaData.fecha = proyeccion.fecha;
                    diaData.dispositivos.push({
                        nombre: dispositivo.nombreDispositivo,
                        pesoProyectado: proyeccion.peso_medio,
                        incrementoDiario: incrementoDiario,
                        incrementoTotal: incrementoTotal,
                        incrementoPorcentual: incrementoPorcentual,
                        ultimoPesoReal: ultimoPesoReal
                    });
                }
            });

            if (diaData.dispositivos.length > 0) {
                diasProyectados.push(diaData);
            }
        }

        if (diasProyectados.length === 0) {
            return null;
        }

        // Calcular estadísticas globales por día
        const estadisticasGlobales = diasProyectados.map(dia => {
            const pesos = dia.dispositivos.map(d => d.pesoProyectado);
            const incrementos = dia.dispositivos.map(d => d.incrementoDiario);

            return {
                ...dia,
                pesoPromedio: pesos.reduce((sum, p) => sum + p, 0) / pesos.length,
                incrementoPromedio: incrementos.reduce((sum, i) => sum + i, 0) / incrementos.length,
                pesoMinimo: Math.min(...pesos),
                pesoMaximo: Math.max(...pesos),
                rangoVariacion: Math.max(...pesos) - Math.min(...pesos)
            };
        });

        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded shadow mt-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Resumen de Proyección - Próximos {diasProyeccion} días
                    </h2>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {dispositivosConProyeccion.length} dispositivo{dispositivosConProyeccion.length !== 1 ? 's' : ''} analizados
                    </div>
                </div>


                {/* Tabla detallada por dispositivo */}
                <div>
                    <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Proyección Detallada por Dispositivo
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Dispositivo
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Peso Actual
                                    </th>
                                    {diasProyectados.map(dia => (
                                        <th key={dia.dia} className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Día +{dia.dia}
                                            <div className="text-xs font-normal mt-1">
                                                {new Date(dia.fecha).toLocaleDateString('es-ES', {
                                                    day: '2-digit',
                                                    month: '2-digit'
                                                })}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Incremento Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                                {dispositivosConProyeccion.map((dispositivo, idx) => {
                                    const datosOrdenados = [...dispositivo.resumen_diario].sort(
                                        (a, b) => new Date(a.fecha) - new Date(b.fecha)
                                    );
                                    const ultimoPesoReal = datosOrdenados[datosOrdenados.length - 1]?.peso_medio || 0;
                                    const ultimaProyeccion = dispositivo.proyeccion[dispositivo.proyeccion.length - 1];
                                    const incrementoTotalFinal = ultimaProyeccion ? ultimaProyeccion.peso_medio - ultimoPesoReal : 0;
                                    const incrementoPorcentualFinal = ultimoPesoReal > 0 ? (incrementoTotalFinal / ultimoPesoReal) * 100 : 0;

                                    return (
                                        <tr key={dispositivo.id_dispositivo} className={idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                <div className="truncate max-w-32" title={dispositivo.nombreDispositivo}>
                                                    {dispositivo.nombreDispositivo}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                <div className="font-semibold">{ultimoPesoReal.toFixed(1)} g</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {datosOrdenados[datosOrdenados.length - 1]?.fecha}
                                                </div>
                                            </td>
                                            {diasProyectados.map(dia => {
                                                const dispositivoEnDia = dia.dispositivos.find(d => d.nombre === dispositivo.nombreDispositivo);
                                                if (!dispositivoEnDia) {
                                                    return (
                                                        <td key={dia.dia} className="px-4 py-3 whitespace-nowrap text-sm text-gray-400 dark:text-gray-600 text-center">
                                                            N/A
                                                        </td>
                                                    );
                                                }

                                                return (
                                                    <td key={dia.dia} className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                                        <div className="font-semibold text-blue-600 dark:text-blue-400">
                                                            {dispositivoEnDia.pesoProyectado.toFixed(1)} g
                                                        </div>
                                                        <div className={`text-xs ${dispositivoEnDia.incrementoDiario > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {dispositivoEnDia.incrementoDiario > 0 ? '+' : ''}{dispositivoEnDia.incrementoDiario.toFixed(1)} g
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                <div className={`font-semibold ${incrementoTotalFinal > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {incrementoTotalFinal > 0 ? '+' : ''}{incrementoTotalFinal.toFixed(1)} g
                                                </div>
                                                <div className={`text-xs ${incrementoPorcentualFinal > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    ({incrementoPorcentualFinal > 0 ? '+' : ''}{incrementoPorcentualFinal.toFixed(1)}%)
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Panel de información adicional */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                            Mejor Rendimiento
                        </h4>
                        {(() => {
                            const ultimoDia = estadisticasGlobales[estadisticasGlobales.length - 1];
                            if (!ultimoDia) return <p className="text-sm text-blue-600 dark:text-blue-400">N/A</p>;

                            const mejorDispositivo = ultimoDia.dispositivos.reduce((mejor, actual) =>
                                actual.incrementoPorcentual > mejor.incrementoPorcentual ? actual : mejor
                            );

                            return (
                                <div>
                                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                        {mejorDispositivo.nombre.split(' ')[0]}...
                                    </p>
                                    <p className="text-sm text-blue-600 dark:text-blue-400">
                                        +{mejorDispositivo.incrementoPorcentual.toFixed(1)}% en {diasProyeccion} días
                                    </p>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                            Ganancia Promedio Diaria
                        </h4>
                        <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                            {(() => {
                                const gananciasPromedio = estadisticasGlobales.map(stats => stats.incrementoPromedio);
                                const promedioGeneral = gananciasPromedio.reduce((sum, g) => sum + g, 0) / gananciasPromedio.length;
                                return `+${promedioGeneral.toFixed(1)} g/día`;
                            })()}
                        </p>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                            Dispersión Máxima
                        </h4>
                        <p className="text-lg font-semibold text-yellow-700 dark:text-yellow-300">
                            {(() => {
                                const variacionMaxima = Math.max(...estadisticasGlobales.map(stats => stats.rangoVariacion));
                                return `±${variacionMaxima.toFixed(1)} g`;
                            })()}
                        </p>
                    </div>
                </div>

                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    <p>
                        * Los datos de proyección se basan en el algoritmo híbrido que combina tendencias históricas con curvas de referencia.
                        Las proyecciones son estimaciones y pueden variar según las condiciones reales.
                    </p>
                </div>
            </div>
        );
    };

    // 9. Renderizar tabla de resumen
    const renderTablaResumen = () => {
        if (!pesosMediosData || pesosMediosData.length === 0) {
            return <p className="text-gray-600 dark:text-gray-400">No hay datos disponibles</p>;
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Granja (Nave)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Peso Inicial
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Peso Final
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Incremento
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Tasa diaria
                            </th>
                            {mostrarProyeccion && (
                                <>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Proyección +{diasProyeccion} día{diasProyeccion > 1 ? 's' : ''}
                                    </th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                        {pesosMediosData.map((dispositivo, idx) => {
                            // Obtener datos ordenados cronológicamente
                            const datosOrdenados = [...dispositivo.resumen_diario].sort(
                                (a, b) => new Date(a.fecha) - new Date(b.fecha)
                            );

                            // Si no hay datos suficientes, mostrar mensaje
                            if (datosOrdenados.length < 2) {
                                return (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {dispositivo.nombreDispositivo}
                                        </td>
                                        <td colSpan={mostrarProyeccion ? 5 : 4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            Datos insuficientes para análisis
                                        </td>
                                    </tr>
                                );
                            }

                            // Cálculos para la tabla
                            const primerDato = datosOrdenados[0];
                            const ultimoDato = datosOrdenados[datosOrdenados.length - 1];
                            const pesoInicial = primerDato.peso_medio;
                            const pesoFinal = ultimoDato.peso_medio;
                            const incremento = pesoFinal - pesoInicial;
                            const incrementoPorcentaje = ((incremento / pesoInicial) * 100).toFixed(2);

                            // Calcular días transcurridos
                            const fechaInicial = new Date(primerDato.fecha);
                            const fechaFinal = new Date(ultimoDato.fecha);
                            const diasTranscurridos = Math.round((fechaFinal - fechaInicial) / (1000 * 60 * 60 * 24));

                            // Calcular tasa diaria de crecimiento
                            const tasaDiaria = diasTranscurridos > 0 ?
                                (incremento / diasTranscurridos).toFixed(2) : 'N/A';

                            // Obtener último valor proyectado si existe
                            let pesoProyectado = 'N/A';
                            if (mostrarProyeccion && dispositivo.proyeccion && dispositivo.proyeccion.length > 0) {
                                const ultimaProyeccion = dispositivo.proyeccion[dispositivo.proyeccion.length - 1];
                                pesoProyectado = ultimaProyeccion.peso_medio.toFixed(2);
                            }

                            // Determinar clase CSS para incremento (positivo, negativo, neutro)
                            const incrementoClass = incremento > 0
                                ? 'text-green-600 dark:text-green-400'
                                : incremento < 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-gray-600 dark:text-gray-400';

                            return (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {dispositivo.nombreDispositivo}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {pesoInicial.toFixed(2)} g
                                        <div className="text-xs text-gray-400 dark:text-gray-500">
                                            {primerDato.fecha}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {pesoFinal.toFixed(2)} g
                                        <div className="text-xs text-gray-400 dark:text-gray-500">
                                            {ultimoDato.fecha}
                                        </div>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${incrementoClass}`}>
                                        {incremento > 0 ? '+' : ''}{incremento.toFixed(2)} g
                                        <div className="text-xs font-normal">
                                            ({incremento > 0 ? '+' : ''}{incrementoPorcentaje}%)
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {tasaDiaria !== 'N/A' ? `${tasaDiaria} g/día` : 'N/A'}
                                        <div className="text-xs text-gray-400 dark:text-gray-500">
                                            {diasTranscurridos} día{diasTranscurridos !== 1 ? 's' : ''}
                                        </div>
                                    </td>
                                    {mostrarProyeccion && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-600 dark:text-yellow-400">
                                            {pesoProyectado !== 'N/A' ? (
                                                <>
                                                    {parseFloat(pesoProyectado).toFixed(2)} g
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        +{((parseFloat(pesoProyectado) - pesoFinal) / pesoFinal * 100).toFixed(2)}%
                                                    </div>
                                                </>
                                            ) : 'N/A'}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    // 10. Renderizar gráfica de estadísticas comparativas
    const renderEstadisticasComparativas = () => {
        if (!pesosMediosData || pesosMediosData.length === 0) {
            return null;
        }

        // Calcular estadísticas para cada dispositivo
        const estadisticas = pesosMediosData.map(dispositivo => {
            // Obtener datos ordenados cronológicamente
            const datosOrdenados = [...dispositivo.resumen_diario].sort(
                (a, b) => new Date(a.fecha) - new Date(b.fecha)
            );

            if (datosOrdenados.length < 2) {
                return {
                    nombreDispositivo: dispositivo.nombreDispositivo,
                    incrementoPorcentaje: 0,
                    tasaDiaria: 0,
                    pesoFinal: datosOrdenados.length > 0 ? datosOrdenados[0].peso_medio : 0,
                    suficientesDatos: false
                };
            }

            const primerDato = datosOrdenados[0];
            const ultimoDato = datosOrdenados[datosOrdenados.length - 1];
            const pesoInicial = primerDato.peso_medio;
            const pesoFinal = ultimoDato.peso_medio;
            const incremento = pesoFinal - pesoInicial;
            const incrementoPorcentaje = (incremento / pesoInicial) * 100;

            // Calcular días transcurridos
            const fechaInicial = new Date(primerDato.fecha);
            const fechaFinal = new Date(ultimoDato.fecha);
            const diasTranscurridos = Math.max(1, Math.round((fechaFinal - fechaInicial) / (1000 * 60 * 60 * 24)));

            // Calcular tasa diaria de crecimiento
            const tasaDiaria = incremento / diasTranscurridos;

            return {
                nombreDispositivo: dispositivo.nombreDispositivo,
                incrementoPorcentaje,
                tasaDiaria,
                pesoFinal,
                suficientesDatos: true
            };
        }).filter(e => e.suficientesDatos);

        if (estadisticas.length === 0) {
            return null;
        }

        // Preparar datos para gráficas comparativas
        const datosIncrementoPorcentaje = [{
            type: 'bar',
            x: estadisticas.map(e => e.nombreDispositivo),
            y: estadisticas.map(e => e.incrementoPorcentaje),
            marker: {
                color: estadisticas.map(e => e.incrementoPorcentaje > 0 ? theme.accent : theme.secondary),
                line: {
                    color: isDarkMode ? theme.bg : 'white',
                    width: 1
                }
            },
            hovertemplate: 'Granja/Nave: %{x}<br>Incremento: %{y:.2f}%<extra></extra>'
        }];

        const datosTasaDiaria = [{
            type: 'bar',
            x: estadisticas.map(e => e.nombreDispositivo),
            y: estadisticas.map(e => e.tasaDiaria),
            marker: {
                color: estadisticas.map(e => e.tasaDiaria > 0 ? theme.primary : theme.secondary),
                line: {
                    color: isDarkMode ? theme.bg : 'white',
                    width: 1
                }
            },
            hovertemplate: 'Granja/Nave: %{x}<br>Tasa diaria: %{y:.2f} g/día<extra></extra>'
        }];

        // Configuraciones de layout para gráficas comparativas
        const layoutIncrementoPorcentaje = {
            ...baseLayout,
            title: {
                text: 'Comparativa de Incremento Porcentual',
                font: { size: 16, color: theme.text }
            },
            xaxis: {
                ...baseLayout.xaxis,
                title: {
                    text: 'Granja (Nave)',
                    font: { size: 14, color: theme.text }
                },
                tickangle: -45
            },
            yaxis: {
                ...baseLayout.yaxis,
                title: {
                    text: 'Incremento (%)',
                    font: { size: 14, color: theme.text }
                }
            },
            height: 400
        };

        const layoutTasaDiaria = {
            ...baseLayout,
            title: {
                text: 'Comparativa de Tasa de Crecimiento Diario',
                font: { size: 16, color: theme.text }
            },
            xaxis: {
                ...baseLayout.xaxis,
                title: {
                    text: 'Granja (Nave)',
                    font: { size: 14, color: theme.text }
                },
                tickangle: -45
            },
            yaxis: {
                ...baseLayout.yaxis,
                title: {
                    text: 'Tasa (g/día)',
                    font: { size: 14, color: theme.text }
                }
            },
            height: 400
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                    <Plot
                        data={datosIncrementoPorcentaje}
                        layout={layoutIncrementoPorcentaje}
                        config={baseConfig}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
                <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                    <Plot
                        data={datosTasaDiaria}
                        layout={layoutTasaDiaria}
                        config={baseConfig}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            </div>
        );
    };

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

    // Componente principal
    return (
        <div className="p-6 max-w-7xl mx-auto">
            {!isEmbedded && (
                <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
                    Análisis de Peso Medio por Granja
                </h1>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-100 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {renderNoAccessMessage()}

            {/* Filtros y controles */}
            <div className="p-6 rounded-lg shadow-md mb-6 bg-gray-50 dark:bg-gray-800">
                {/* En modo incrustado no mostramos los selectores de empresa y granja */}
                {!isEmbedded ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                                    setTodasGranjas(false);
                                    setPesosMediosData([]);
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

                        {/* Granja (o todas) */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                                Granja
                            </label>
                            <div className="flex flex-col space-y-2">
                                <select
                                    className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                    value={selectedGranja}
                                    onChange={(e) => {
                                        setSelectedGranja(e.target.value);
                                        setTodasGranjas(false);
                                        setPesosMediosData([]);
                                    }}
                                    disabled={loading || !selectedEmpresa || todasGranjas || granjas.length === 0}
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
                                <label className="flex items-center text-sm">
                                    <input
                                        type="checkbox"
                                        checked={todasGranjas}
                                        onChange={(e) => {
                                            setTodasGranjas(e.target.checked);
                                            if (e.target.checked) {
                                                setSelectedGranja('');
                                            }
                                            setPesosMediosData([]);
                                        }}
                                        disabled={loading || !selectedEmpresa || granjas.length === 0}
                                        className="mr-2"
                                    />
                                    <span className="text-gray-700 dark:text-gray-300">
                                        Seleccionar todas las granjas
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                ) : (
                    // En modo incrustado, mostrar información sobre la granja seleccionada
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                                Análisis de Peso Medio
                            </h3>
                            {selectedGranja && (
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {granjas.find(g => g.numero_rega === selectedGranja)?.nombre || selectedGranja}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Configure los parámetros y haga clic en "Consultar pesos medios" para ver los resultados.
                        </p>
                    </div>
                )}

                {/* Estos filtros siempre se muestran, incluso en modo incrustado */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Fecha inicio y fin */}
                    <div className={isEmbedded ? "md:col-span-1" : ""}>
                        <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                            Rango de fechas
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

                    {/* Coeficiente de homogeneidad */}
                    <div className={isEmbedded ? "md:col-span-1" : ""}>
                        <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                            Coef. homogeneidad (%)
                        </label>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                            value={coef}
                            onChange={(e) => setCoef(e.target.value)}
                            disabled={loading}
                            placeholder="Opcional"
                        />
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-wrap gap-3 mt-4">
                    {/* Solo mostramos este botón cuando no está incrustado */}
                    {!isEmbedded && (
                        <button
                            onClick={loadDispositivos}
                            disabled={loading || (!selectedGranja && !todasGranjas)}
                            className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-500 disabled:text-gray-200"
                        >
                            {loading ? 'Cargando...' : 'Cargar dispositivos'}
                        </button>
                    )}

                    <button
                        onClick={fetchPesosMedios}
                        disabled={loading || dispositivosData.length === 0}
                        className="py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-500 disabled:text-gray-200"
                    >
                        {loading ? 'Cargando...' : 'Consultar pesos medios'}
                    </button>

                    <div className="flex-grow"></div>

                    {/* Controles de proyección - Solo se muestran cuando hay datos */}
                    {pesosMediosData.length > 0 && (
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                                <label className="text-sm text-gray-700 dark:text-gray-300 mr-2">
                                    Proyección:
                                </label>
                                <select
                                    className="p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                    value={diasProyeccion}
                                    onChange={(e) => setDiasProyeccion(parseInt(e.target.value))}
                                    disabled={loading || loadingProyeccion}
                                >
                                    <option value="1">+1 día</option>
                                    <option value="2">+2 días</option>
                                    <option value="3">+3 días</option>
                                    <option value="7">+7 días</option>
                                </select>
                            </div>

                            <button
                                onClick={calcularProyeccion}
                                disabled={loading || loadingProyeccion}
                                className="py-2 px-4 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-500 disabled:text-gray-200"
                            >
                                {loadingProyeccion ? 'Calculando...' : mostrarProyeccion ? 'Actualizar proyección' : 'Calcular proyección'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Lista de dispositivos seleccionados */}
            {dispositivosData.length > 0 && (
                <div className="p-6 rounded-lg shadow-md mb-6 bg-white dark:bg-gray-800">
                    <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                        Dispositivos seleccionados: {dispositivosData.length}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {dispositivosData.map((disp) => (
                            <div
                                key={disp.id_dispositivo}
                                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm"
                            >
                                {disp.numero_serie}
                                {ubicacionesDispositivos[disp.id_dispositivo] && (
                                    <span className="ml-1 text-xs">
                                        ({ubicacionesDispositivos[disp.id_dispositivo].granja})
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Resultados: Gráfica principal */}
            {pesosMediosData.length > 0 && (
                <div className="space-y-6">
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Evolución del Peso Medio
                        </h2>
                        <div className="h-96">
                            <Plot
                                data={getPesoMedioData()}
                                layout={getPesoMedioLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Tabla de resumen */}

                    {renderEstadisticasComparativas()}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Resumen de crecimiento
                        </h2>
                        {renderTablaResumen()}
                    </div>
                    {renderTablaResumenProyeccion()}

                </div>
            )}
        </div>
    );
}