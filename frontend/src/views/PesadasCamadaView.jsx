import React, { useState, useEffect, useRef } from 'react';
import EmpresaApiService from '../services/EmpresaApiService';
import GranjaApiService from '../services/GranjaApiService';
import CamadaApiService from '../services/CamadaApiService';
import PesoPavosButpremiumApiService from '../services/PesoPavosButpremiumApiService';
import PesoPavosHybridconverterApiService from '../services/PesoPavosHybridconverterApiService';
import PesoPavosNicholasselectApiService from '../services/PesoPavosNicholasselectApiService';
import PesoReproductoresRossApiService from '../services/PesoReproductoresRossApiService';
import PesoBroilersRossApiService from '../services/PesoBroilersRossApiService';
import Plot from 'react-plotly.js'; // Importar Plotly
import DistribucionNormalPesos from '../components/DistribucionNormalPesos';
import UsuarioApiService from '../services/UsuarioApiService';
import { useStateContext } from '../contexts/ContextProvider';

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
        const start = polarToCartesian(x, y, radius, startAngle);
        const end = polarToCartesian(x, y, radius, endAngle);
        const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";
        return [
            "M", start.x, start.y,
            "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y
        ].join(" ");
    };

    // Calcular ángulos correctos para semicírculo (-90° a +90°)
    const anguloInicio = -90; // Lado izquierdo
    const anguloFin = 90;     // Lado derecho

    // Calcular el ángulo del valor principal
    let anguloValor = null;
    if (valor !== null && valor >= minimo && valor <= maximo) {
        const porcentaje = (valor - minimo) / (maximo - minimo);
        anguloValor = anguloInicio + (porcentaje * 180);
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
                    <circle
                        cx={puntoMin.x}
                        cy={puntoMin.y}
                        r="4"
                        fill="#3b82f6"
                        stroke="#fff"
                        strokeWidth="1"
                    />
                )}

                {puntoMax && (
                    <circle
                        cx={puntoMax.x}
                        cy={puntoMax.y}
                        r="4"
                        fill="#ef4444"
                        stroke="#fff"
                        strokeWidth="1"
                    />
                )}

                {/* Línea indicadora del valor actual */}
                {puntoValor && (
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

export default function PesadasCamadaView({
    selectedEmpresa: propSelectedEmpresa,  // Empresa seleccionada desde el dashboard
    selectedGranja: propSelectedGranja,    // Granja seleccionada desde el dashboard
    selectedCamada: propSelectedCamada,    // Camada seleccionada desde el dashboard
    camadaInfo: propCamadaInfo,           // Información de camada desde el dashboard
    isEmbedded = false                    // Indica si está en modo incrustado
}) {

    const { user } = useStateContext();
    // ———————————————————————————————————————————————————
    // Estados originales
    const [empresas, setEmpresas] = useState([]);
    const [granjas, setGranjas] = useState([]);
    const [camadas, setCamadas] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState('');
    const [selectedGranja, setSelectedGranja] = useState('');
    const [selectedCamada, setSelectedCamada] = useState('');
    const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
    const [coef, setCoef] = useState('');
    const [pesadasData, setPesadasData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ———————————————————————————————————————————————————
    // Nuevos estados para rango y dispositivo
    const [dispositivos, setDispositivos] = useState([]);
    const [selectedDisp, setSelectedDisp] = useState('');
    const [fechaInicioRange, setFechaInicioRange] = useState(() => new Date().toISOString().slice(0, 10));
    const [fechaFinRange, setFechaFinRange] = useState(() => new Date().toISOString().slice(0, 10));
    const [pesadasRangoData, setPesadasRangoData] = useState(null);
    const [loadingReference, setLoadingReference] = useState(false);
    const [selectedDeviceForDaily, setSelectedDeviceForDaily] = useState('todos');
    const [availableDevicesForDaily, setAvailableDevicesForDaily] = useState([]);
    const [nivelRestriccion, setNivelRestriccion] = useState('medio'); // 'alto', 'medio', 'bajo'
    const [fechaLimites, setFechaLimites] = useState({
        inicio: null,
        fin: null
    });


    // ———————————————————————————————————————————————————
    // Estados para funcionalidades avanzadas

    // Estado para controlar el tema (claro/oscuro)
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Estados para selección interactiva
    const [selectedPoints, setSelectedPoints] = useState(null);
    const [selectionStats, setSelectionStats] = useState(null);
    const statsRef = useRef(null);

    // Estados para comparación de fechas
    const [comparingDates, setComparingDates] = useState(false);
    const [dateToCompare1, setDateToCompare1] = useState('');
    const [dateToCompare2, setDateToCompare2] = useState('');

    // Estados para pronóstico
    const [showForecast, setShowForecast] = useState(false);
    const [forecastDays, setForecastDays] = useState(5);
    const [showReference, setShowReference] = useState(true);
    const [referenceData, setReferenceData] = useState(null);
    const [camadaInfo, setCamadaInfo] = useState(null);
    const [customProjectionDays, setCustomProjectionDays] = useState(8);
    const [targetWeight, setTargetWeight] = useState('');
    const [weightPrediction, setWeightPrediction] = useState(null);
    const [predictionError, setPredictionError] = useState('');


    const getUniformityEvaluation = (uniformity) => {
        if (uniformity >= 90) return { color: '#3b82f6', text: 'Excelente Uniformidad', range: '90-100%' }; // Azul
        if (uniformity >= 80) return { color: '#10b981', text: 'Buena Uniformidad', range: '80-90%' }; // Verde
        if (uniformity >= 70) return { color: '#f59e0b', text: 'Uniformidad Promedio', range: '70-80%' }; // Amarillo
        if (uniformity >= 60) return { color: '#f97316', text: 'Mala uniformidad', range: '60-70%' }; // Naranja
        if (uniformity >= 50) return { color: '#ef4444', text: 'Muy mala Uniformidad', range: '50-60%' }; // Rojo
        return { color: '#7f1d1d', text: 'Desigualdad', range: '0-50%' }; // Caoba
    };

    const getCoefficientVariationEvaluation = (cv) => {
        if (cv < 6) return { color: '#3b82f6', text: 'Excelente Variabilidad', range: '< 6%' }; // Azul
        if (cv < 8) return { color: '#10b981', text: 'Buena Variabilidad', range: '6-8%' }; // Verde
        if (cv < 10) return { color: '#f59e0b', text: 'Variabilidad Promedio', range: '8-10%' }; // Amarillo
        if (cv < 12) return { color: '#f97316', text: 'Mala Variabilidad', range: '10-12%' }; // Naranja
        if (cv <= 15) return { color: '#ef4444', text: 'Muy mala Variabilidad', range: '12-15%' }; // Rojo
        return { color: '#7f1d1d', text: 'Desigualdad', range: '> 15%' }; // Caoba
    };
    // ———————————————————————————————————————————————————
    // Detectar si la página está en modo oscuro (usando la clase dark de Tailwind)
    useEffect(() => {
        // Función para verificar si el tema actual es oscuro
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setIsDarkMode(isDark);
        };

        // Verificar al inicio
        checkDarkMode();

        // Crear un observador de mutaciones para detectar cambios en las clases
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        // Limpiar observador
        return () => observer.disconnect();
    }, []);

    // Asegurar que propCamadaInfo se sincronice correctamente con camadaInfo
    useEffect(() => {
        if (isEmbedded && propCamadaInfo) {

            // Verificar si la información tiene la estructura esperada
            if (propCamadaInfo.fecha_hora_inicio) {
            } else {
                console.warn('No se encontró fecha_hora_inicio en propCamadaInfo');
            }

            // Actualizar el estado interno con la prop
            setCamadaInfo(propCamadaInfo);
        }
    }, [isEmbedded, propCamadaInfo]);

    // Añadir este useEffect para sincronizar con las props del Dashboard
    useEffect(() => {
        if (isEmbedded) {
            if (propSelectedEmpresa) setSelectedEmpresa(propSelectedEmpresa);
            if (propSelectedGranja) setSelectedGranja(propSelectedGranja);
            if (propSelectedCamada) setSelectedCamada(propSelectedCamada);
            if (propCamadaInfo) setCamadaInfo(propCamadaInfo);

            // Si tenemos una camada seleccionada, cargar dispositivos automáticamente
            if (propSelectedCamada) {
                // Cargar los dispositivos para esta camada
                CamadaApiService.getDispositivosByCamada(propSelectedCamada)
                    .then(data => setDispositivos(data))
                    .catch(() => setError('No se pudieron cargar dispositivos.'));
            }
        }
    }, [propSelectedEmpresa, propSelectedGranja, propSelectedCamada, propCamadaInfo, isEmbedded]);



    // Cargar información de la camada cuando se selecciona
    useEffect(() => {
        // Si estamos en modo "embedded", delegamos en propCamadaInfo
        if (isEmbedded) return;

        // Limpia si no hay camada seleccionada
        if (!selectedCamada) {
            setCamadaInfo(null);
            return;
        }

        // Si hay seleccionada y no viene por prop, carga desde API
        if (!propCamadaInfo) {
            CamadaApiService.getCamadaInfo(selectedCamada)
                .then(data => setCamadaInfo(data))
                .catch(() => setError('No se pudo obtener la información de la camada.'));
        }
    }, [selectedCamada, propCamadaInfo, isEmbedded]);

    useEffect(() => {
        if (camadaInfo) {
            loadReferenceData();
        }
    }, [camadaInfo]);

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

    const extractDevicesFromDailyData = (pesadasData) => {
        if (!pesadasData || !pesadasData.listado_pesos) return [];

        const devices = [...new Set(pesadasData.listado_pesos.map(peso => peso.id_dispositivo))];
        return devices.sort();
    };

    // Actualizar disponibleDevicesForDaily cuando cambien las pesadasData
    useEffect(() => {
        if (pesadasData) {
            const devices = extractDevicesFromDailyData(pesadasData);
            setAvailableDevicesForDaily(devices);

            // Reset selection cuando cambien los datos
            setSelectedDeviceForDaily('todos');
        } else {
            setAvailableDevicesForDaily([]);
            setSelectedDeviceForDaily('todos');
        }
    }, [pesadasData]);

    // Función para filtrar pesadas por dispositivo seleccionado
    const getFilteredDailyPesadas = () => {
        if (!pesadasData || !pesadasData.listado_pesos) return [];

        let filteredPesadas = pesadasData.listado_pesos;

        // Filtrar por dispositivo si está seleccionado
        if (selectedDeviceForDaily !== 'todos') {
            filteredPesadas = filteredPesadas.filter(peso => {
                return String(peso.id_dispositivo) === String(selectedDeviceForDaily);
            });
        }

        // Filtrar valores negativos y menores de 30g
        filteredPesadas = filteredPesadas.filter(peso => {
            const valor = parseFloat(peso.valor);
            return valor >= 30; // Excluir valores negativos y menores de 30g
        });

        // Ordenar por hora más reciente primero
        filteredPesadas.sort((a, b) => {
            return new Date(b.fecha) - new Date(a.fecha);
        });

        return filteredPesadas;

    };

    const getPorcentajeDescarte = (nivel) => {
        switch (nivel) {
            case 'alto': return 30;
            case 'medio': return 25;
            case 'bajo': return 20;
            default: return 25;
        }
    };

    const getNivelDescripcion = (nivel) => {
        switch (nivel) {
            case 'alto': return 'Alto (±30% del peso ideal)';
            case 'medio': return 'Medio (±25% del peso ideal)';
            case 'bajo': return 'Bajo (±20% del peso ideal)';
            default: return 'Medio (±25% del peso ideal)';
        }
    };

    const getNivelColor = (nivel) => {
        switch (nivel) {
            case 'alto': return 'text-red-600 dark:text-red-400';
            case 'medio': return 'text-yellow-600 dark:text-yellow-400';
            case 'bajo': return 'text-green-600 dark:text-green-400';
            default: return 'text-yellow-600 dark:text-yellow-400';
        }
    };

    const getEnhancedCardInfo = () => {
        console.log('=== getEnhancedCardInfo ejecutándose ===');
        console.log('camadaInfo:', camadaInfo);
        console.log('propCamadaInfo:', propCamadaInfo);
        if (!camadaInfo && !propCamadaInfo) return null;

        const infoToUse = camadaInfo || propCamadaInfo;
        let consultedAge = null;
        let pesoObjetivo = null;

        const fallbackAge = resolveConsultedAge();


        // ✅ PRIORIDAD 1: Usar peso_referencia del backend si está disponible
        if (pesadasData && pesadasData.peso_referencia) {

            const backendAge = pesadasData.peso_referencia.edad_dias;
            const isBackendAgeValid = Number.isFinite(backendAge) && backendAge >= 0;

            pesoObjetivo = pesadasData.peso_referencia.valor;
            consultedAge = isBackendAgeValid ? backendAge : fallbackAge;

            console.log('✅ Usando peso_referencia del backend:', {
                peso: pesoObjetivo,
                edad_backend: backendAge,
                edad_utilizada: consultedAge,
                recalculada: !isBackendAgeValid,
                tabla: pesadasData.peso_referencia.tabla_usada,
                sexaje: pesadasData.peso_referencia.sexaje
            });

            if (!isBackendAgeValid) {
                console.warn('⚠️ Edad de backend inválida, usando calculateCamadaAge()', {
                    backendAge,
                    fallbackAge
                });
            }
        }
        // ✅ FALLBACK: Si no hay peso_referencia, usar el método anterior (para rango)
        else {
            consultedAge = fallbackAge;


            // Obtener de referenceData (método anterior)
            if (referenceData && consultedAge !== null) {
                const sexaje = getCamadaSexaje();
                const refData = referenceData.find(d => d.edad === consultedAge);

                if (refData) {
                    switch (sexaje.toLowerCase()) {
                        case 'machos':
                        case 'macho':
                            pesoObjetivo = refData.Machos || refData.machos || refData.macho;
                            break;
                        case 'hembras':
                        case 'hembra':
                            pesoObjetivo = refData.Hembras || refData.hembras || refData.hembra;
                            break;
                        default:
                            pesoObjetivo = refData.Mixto || refData.mixto || refData.Machos || refData.machos || refData.macho;
                            break;
                    }

                    console.log('✅ Usando referenceData (fallback):', {
                        edad: consultedAge,
                        sexaje,
                        pesoObjetivo
                    });
                }
            }
        }

        // Calcular uniformidad
        const filteredStats = getFilteredDailyStats();
        const pesadasAceptadas = getFilteredDailyPesadas().filter(p => p.estado === 'aceptada');
        const uniformidad = calculateUniformityCoefficient(pesadasAceptadas, filteredStats.peso_medio_aceptadas);

        return {
            edad: consultedAge,
            pesoObjetivo: pesoObjetivo || null,
            uniformidad,
            nombreCamada: infoToUse.nombre_camada
        };
    };




    // Función para calcular estadísticas filtradas
    const getFilteredDailyStats = () => {
        const filteredPesadas = getFilteredDailyPesadas();

        if (filteredPesadas.length === 0) {
            return {
                total_pesadas: 0,
                aceptadas: 0,
                rechazadas_homogeneidad: 0,
                peso_medio_global: 0,
                peso_medio_aceptadas: 0,
                coef_variacion: 0,
                tramo_aceptado: { min: null, max: null }
            };
        }

        // ✅ Si está seleccionado "todos los dispositivos", usar los valores del controlador
        if (selectedDeviceForDaily === 'todos') {
            return {
                total_pesadas: pesadasData.total_pesadas || 0,
                aceptadas: pesadasData.aceptadas || 0,
                rechazadas_homogeneidad: pesadasData.rechazadas_homogeneidad || 0,
                peso_medio_global: pesadasData.peso_medio_global || 0,
                peso_medio_aceptadas: pesadasData.peso_medio_aceptadas || 0,
                coef_variacion: pesadasData.coef_variacion || 0,
                tramo_aceptado: pesadasData.tramo_aceptado || { min: null, max: null }
            };
        }

        // ✅ Si hay un dispositivo específico seleccionado, calcular para ese dispositivo
        const aceptadas = filteredPesadas.filter(p => p.estado === 'aceptada');
        const rechazadas = filteredPesadas.filter(p => p.estado === 'rechazada');

        const relevantes = filteredPesadas.filter(p =>
            p.estado === 'aceptada' || p.estado === 'rechazada'
        );

        // Calcular peso medio global sobre las relevantes
        const pesoMedioGlobal = relevantes.length > 0
            ? relevantes.reduce((sum, p) => sum + Number(p.valor), 0) / relevantes.length
            : 0;

        // Calcular peso medio de aceptadas
        const pesoMedioAceptadas = aceptadas.length > 0
            ? aceptadas.reduce((sum, p) => sum + Number(p.valor), 0) / aceptadas.length
            : 0;

        // Calcular coeficiente de variación de las aceptadas filtradas
        let coefVariacion = 0;
        if (aceptadas.length > 1 && pesoMedioAceptadas > 0) {
            const valoresAceptados = aceptadas.map(p => Number(p.valor));

            // Calcular desviación estándar
            const sumaCuadrados = valoresAceptados.reduce((sum, valor) => {
                return sum + Math.pow(valor - pesoMedioAceptadas, 2);
            }, 0);

            const varianza = sumaCuadrados / valoresAceptados.length;
            const desviacionEstandar = Math.sqrt(varianza);

            // Coeficiente de variación = (desviación estándar / media) * 100
            coefVariacion = (desviacionEstandar / pesoMedioAceptadas) * 100;
        }

        // Calcular tramo aceptado
        const coefNum = coef === '' ? null : parseFloat(coef) / 100;
        let tramoAceptado = null;
        if (coefNum !== null) {
            tramoAceptado = {
                min: pesoMedioGlobal * (1 - coefNum),
                max: pesoMedioGlobal * (1 + coefNum)
            };
        }

        return {
            total_pesadas: filteredPesadas.length,
            aceptadas: aceptadas.length,
            rechazadas_homogeneidad: rechazadas.length,
            peso_medio_global: pesoMedioGlobal,
            peso_medio_aceptadas: pesoMedioAceptadas,
            coef_variacion: coefVariacion,
            tramo_aceptado: tramoAceptado
        };
    };

    // ———————————————————————————————————————————————————
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

    useEffect(() => {
        if (!selectedCamada) {
            setDispositivos([]);
            setSelectedDisp('');
            return;
        }

        // Verificar acceso a la granja si no está en modo incrustado
        if (!isEmbedded && user) {
            if (user.usuario_tipo === 'Responsable_Zona' || user.usuario_tipo === 'Ganadero') {
                const granjaEncontrada = granjas.find(g => g.numero_rega === selectedGranja);
                if (!granjaEncontrada) {
                    setError('No tiene acceso a esta granja.');
                    setDispositivos([]);
                    return;
                }
            }
        }

        setLoading(true);
        CamadaApiService.getDispositivosByCamada(selectedCamada)
            .then(data => setDispositivos(data))
            .catch(() => setError('No se pudieron cargar dispositivos.'))
            .finally(() => setLoading(false));
    }, [selectedCamada, isEmbedded, user, granjas, selectedGranja]);

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

    // ———————————————————————————————————————————————————
    // 4. Solicitar pesadas de un día
    const fetchPesadas = async () => {
        if (!selectedCamada || !fecha) {
            setError('Selecciona camada y fecha válidas.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const coefNum = coef === '' ? null : parseFloat(coef) / 100;
            const porcentajeDescarte = getPorcentajeDescarte(nivelRestriccion);

            const data = await CamadaApiService.getPesadas(
                selectedCamada, fecha, coefNum, porcentajeDescarte
            );
            setPesadasData(data);
        } catch {
            setError('Error al obtener las pesadas.');
        } finally {
            setLoading(false);
        }
    };

    // ———————————————————————————————————————————————————
    // 5. Solicitar pesadas de rango
    const fetchPesadasRango = async (inicio = fechaInicioRange, fin = fechaFinRange) => {
        if (!selectedCamada || !selectedDisp || !inicio || !fin) {
            setError('Selecciona camada, dispositivo y rango válidos.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const coefNum = coef === '' ? null : parseFloat(coef) / 100;
            const porcentajeDescarte = getPorcentajeDescarte(nivelRestriccion);

            const response = await CamadaApiService.getPesadasRango(
                selectedCamada,
                selectedDisp,
                inicio,
                fin,
                coefNum,
                porcentajeDescarte
            );

            console.log('Respuesta completa del API:', response);

            // ✅ VERIFICACIÓN CRÍTICA: Extraer los datos correctamente
            if (response && response.datos && Array.isArray(response.datos)) {
                setPesadasRangoData(response.datos);
                console.log('✅ Datos extraídos correctamente:', response.datos);
            } else if (Array.isArray(response)) {
                // Fallback por si el API devuelve directamente el array
                setPesadasRangoData(response);
                console.log('✅ Datos son directamente un array:', response);
            } else {
                console.error('❌ Estructura de respuesta inesperada:', response);
                console.error('❌ Tipo de response:', typeof response);
                console.error('❌ Propiedades de response:', Object.keys(response || {}));

                setPesadasRangoData([]);
                setError('Estructura de datos inesperada del servidor. Revisa la consola para más detalles.');
            }
        } catch (error) {
            console.error('❌ Error al obtener pesadas por rango:', error);
            setError('Error al obtener las pesadas por rango.');
            setPesadasRangoData([]);
        } finally {
            setLoading(false);
        }
    };

    // ———————————————————————————————————————————————————
    // FUNCIONES PARA PRONÓSTICO Y CURVA DE REFERENCIA
    // ———————————————————————————————————————————————————

    // Cargar datos de referencia cuando cambia la información de la camada
    useEffect(() => {
        if (camadaInfo) {
            loadReferenceData();
        }
    }, [camadaInfo]);

    // ✅ FUNCIÓN MEJORADA PARA CORREGIR DATOS USANDO TABLA DE REFERENCIA
    const cleanAndCorrectDataWithReference = (rawData) => {
        if (!rawData || rawData.length <= 2 || !referenceData || !camadaInfo) {
            return rawData;
        }

        const correctedData = [...rawData];
        const sexaje = getCamadaSexaje();

        for (let i = 0; i < correctedData.length; i++) {
            const currentWeight = correctedData[i].peso_medio_aceptadas;
            const currentDate = new Date(correctedData[i].fecha);

            // ✅ DETECTAR DÍAS PROBLEMÁTICOS
            const isProblematic = (
                currentWeight === 0 || // Peso cero
                currentWeight < 30      // Peso sospechosamente bajo
            );

            if (isProblematic && i > 0) {
                // ✅ CALCULAR EDAD DEL LOTE PARA ESE DÍA
                const loteEdad = calculateCamadaAge(currentDate);

                if (loteEdad !== null) {
                    // ✅ BUSCAR CRECIMIENTO ESPERADO EN LA TABLA DE REFERENCIA
                    const refDataToday = referenceData.find(d => d.edad === loteEdad);
                    const refDataYesterday = referenceData.find(d => d.edad === loteEdad - 1);

                    if (refDataToday && refDataYesterday) {
                        // Crecimiento esperado según la tabla
                        const expectedGrowth = refDataToday[sexaje] - refDataYesterday[sexaje];

                        // Peso corregido = peso día anterior + crecimiento esperado
                        const correctedWeight = correctedData[i - 1].peso_medio_aceptadas + expectedGrowth;

                        // ✅ APLICAR CORRECCIÓN
                        correctedData[i] = {
                            ...correctedData[i],
                            peso_medio_aceptadas: Math.round(correctedWeight),
                            is_corrected: true,
                            original_weight: currentWeight,
                            correction_method: 'reference_table',
                            expected_growth: expectedGrowth,
                            lote_edad: loteEdad
                        };


                    } else {
                        // Fallback si no hay datos de referencia para esa edad
                        console.warn(`⚠️ No hay datos de referencia para edad ${loteEdad} días`);

                        // Usar crecimiento conservador del 5%
                        const correctedWeight = correctedData[i - 1].peso_medio_aceptadas * 1.05;

                        correctedData[i] = {
                            ...correctedData[i],
                            peso_medio_aceptadas: Math.round(correctedWeight),
                            is_corrected: true,
                            original_weight: currentWeight,
                            correction_method: 'fallback_5percent'
                        };
                    }
                }
            }
        }

        return correctedData;
    };

    // Cargar los datos de referencia desde la API según la estirpe
    // Cargar los datos de referencia desde la API según la combinación de tipo_ave y estirpe
    const loadReferenceData = async () => {
        try {
            // Si no hay información de la camada, mostrar mensaje y salir
            if (!camadaInfo || !camadaInfo.tipo_estirpe || !camadaInfo.tipo_ave) {
                console.error("No hay información completa de camada, estirpe o tipo de ave");
                setError('No se pudo obtener información completa de la camada.');
                setLoadingReference(false);
                return;
            }

            // Normalizar tipo_ave y tipo_estirpe: convertir a formato camelCase para el nombre del servicio
            const normalizeForServiceName = (str) => {
                // Primero convertir a minúsculas y eliminar espacios extras
                const normalized = str.trim().toLowerCase();

                // Convertir a formato PascalCase (primera letra mayúscula de cada palabra)
                return normalized.split(/\s+/).map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join('');
            };

            // Normalizar para el nombre de la tabla (todo minúsculas, sin espacios)
            const normalizeForTableName = (str) => {
                return str.trim().toLowerCase().replace(/\s+/g, '');
            };

            // let tipoAveServicio = normalizeForServiceName(camadaInfo.tipo_ave);
            //let tipoEstirpeServicio = normalizeForServiceName(camadaInfo.tipo_estirpe);

            let tipoAveTabla = normalizeForTableName(camadaInfo.tipo_ave);
            let tipoEstirpeTabla = normalizeForTableName(camadaInfo.tipo_estirpe);

            // Si la estirpe es cobb, tratarla como ross
            if (tipoEstirpeTabla === 'cobb') {
                tipoEstirpeTabla = 'ross';
                tipoEstirpeServicio = 'Ross';
            }
            //console.log(`Tipo de ave: ${tipoAveServicio}, Tipo de estirpe: ${tipoEstirpeServicio}`);
            // Construir el nombre del servicio y de la tabla
            //const serviceName = `Peso${tipoAveServicio}${tipoEstirpeServicio}ApiService`;
            //const tableName = `tb_peso_${tipoAveTabla}_${tipoEstirpeTabla}`;

            //console.log(`Cargando datos de referencia para: ${serviceName} (${tableName})`);

            setLoadingReference(true);
            setError('');

            let apiService;

            // Intentar obtener el servicio dinámicamente
            try {
                // Verificar si existe el servicio específico para la combinación
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
                    case 'recrias_ross':
                        console.log('✅ Usando PesoReproductoresRossApiService para recrias_ross');

                        apiService = PesoReproductoresRossApiService;
                        break;
                    case 'broilers_ross':
                        apiService = PesoBroilersRossApiService;
                        break;
                    default:
                        console.warn(`⚠️ Usando fallback para: ${tipoAveTabla}_${tipoEstirpeTabla}`);

                        // Si no encontramos un servicio específico, intentar con PesoRossApiService
                        apiService = PesoBroilersRossApiService;
                }

            } catch (error) {
                console.error(`Error al encontrar el servicio para ${tipoAveTabla}_${tipoEstirpeTabla}:`, error);
                setError('No se pudo encontrar un servicio adecuado para los datos de referencia.');
                setLoadingReference(false);
                return;
            }

            // Obtener todos los pesos de referencia
            try {
                const apiData = await apiService.getPesosReferencia();

                // 🔍 DEBUG: Ver qué devuelve exactamente el servicio
                console.log('🔍 DEBUG apiData completo:', apiData);
                console.log('🔍 DEBUG apiData.length:', apiData?.length);
                console.log('🔍 DEBUG primer elemento:', apiData?.[0]);
                console.log('🔍 DEBUG keys del primer elemento:', Object.keys(apiData?.[0] || {}));

                if (!apiData || apiData.length === 0) {
                    console.error('❌ No se recibieron datos de la API');
                    setError('No se encontraron datos de referencia.');
                    setLoadingReference(false);
                    return;
                }

                // Transformar los datos de la API al formato esperado por la aplicación
                const transformedData = apiData.map(item => {
                    console.log('🔍 DEBUG procesando item:', item);
                    console.log('🔍 DEBUG keys disponibles:', Object.keys(item));

                    // ✅ ESTRUCTURA FLEXIBLE: Detectar qué campos están disponibles
                    const id = item.id || item.edad || 0;
                    const edad = item.edad || 0;

                    // ✅ DETECTAR TIPO DE ESTRUCTURA
                    const hasSimpleStructure = (item.hasOwnProperty('macho') || item.hasOwnProperty('hembras')) &&
                        !item.hasOwnProperty('Mixto') &&
                        !item.hasOwnProperty('Machos');

                    const hasComplexStructure = item.hasOwnProperty('Mixto') ||
                        item.hasOwnProperty('Machos') ||
                        item.hasOwnProperty('Hembras');

                    console.log('🔍 DEBUG estructura simple (macho/hembras):', hasSimpleStructure);
                    console.log('🔍 DEBUG estructura compleja (Mixto/Machos/Hembras):', hasComplexStructure);

                    let Mixto = 0, Machos = 0, Hembras = 0;

                    if (hasSimpleStructure) {
                        // ✅ ESTRUCTURA SIMPLE: Solo macho/hembras
                        console.log('📊 Usando estructura SIMPLE');

                        Machos = item.macho || item.machos || 0;
                        Hembras = item.hembras || item.hembra || 0;

                        // Calcular Mixto como promedio de macho y hembras
                        if (Machos > 0 && Hembras > 0) {
                            Mixto = Math.round((Machos + Hembras) / 2);
                        } else if (Machos > 0) {
                            Mixto = Machos;
                        } else if (Hembras > 0) {
                            Mixto = Hembras;
                        }

                        console.log(`📊 Valores extraídos - Machos: ${Machos}, Hembras: ${Hembras}, Mixto calculado: ${Mixto}`);

                    } else if (hasComplexStructure) {
                        // ✅ ESTRUCTURA COMPLEJA: Mixto/Machos/Hembras
                        console.log('📊 Usando estructura COMPLEJA');

                        Mixto = item.mixto || item.Mixto || item.peso_mixto || 0;
                        Machos = item.machos || item.Machos || item.peso_machos || 0;
                        Hembras = item.hembras || item.Hembras || item.peso_hembras || 0;

                        // Si Mixto está vacío pero tenemos Machos/Hembras, calcularlo
                        if (Mixto === 0 && Machos > 0 && Hembras > 0) {
                            Mixto = Math.round((Machos + Hembras) / 2);
                            console.log(`📊 Mixto calculado como promedio: ${Mixto}`);
                        }

                        console.log(`📊 Valores extraídos - Mixto: ${Mixto}, Machos: ${Machos}, Hembras: ${Hembras}`);

                    } else {
                        // ✅ ESTRUCTURA DESCONOCIDA: Intentar múltiples variantes
                        console.log('⚠️ Estructura DESCONOCIDA, intentando variantes...');

                        // Intentar todas las variantes posibles
                        Mixto = item.mixto || item.Mixto || item.peso_mixto || item.mixed || 0;
                        Machos = item.machos || item.Machos || item.peso_machos || item.macho || item.male || 0;
                        Hembras = item.hembras || item.Hembras || item.peso_hembras || item.hembra || item.female || 0;

                        // Calcular Mixto si no existe
                        if (Mixto === 0 && (Machos > 0 || Hembras > 0)) {
                            if (Machos > 0 && Hembras > 0) {
                                Mixto = Math.round((Machos + Hembras) / 2);
                            } else {
                                Mixto = Machos > 0 ? Machos : Hembras;
                            }
                        }

                        console.log(`📊 Valores extraídos (variantes) - Mixto: ${Mixto}, Machos: ${Machos}, Hembras: ${Hembras}`);
                    }

                    // ✅ CREAR OBJETO ESTANDARIZADO
                    const transformedItem = {
                        id: id,
                        edad: edad,
                        Mixto: Mixto,
                        Machos: Machos,
                        Hembras: Hembras
                    };

                    console.log('✅ Item transformado:', transformedItem);

                    return transformedItem;
                });

                // ✅ DEBUG: Mostrar resumen de la transformación
                console.log('📊 RESUMEN DE TRANSFORMACIÓN:');
                console.log(`- Total items procesados: ${transformedData.length}`);
                console.log(`- Primer item: `, transformedData[0]);
                console.log(`- Último item: `, transformedData[transformedData.length - 1]);

                // Verificar que tenemos datos válidos
                const validItems = transformedData.filter(item =>
                    item.edad >= 0 && (item.Mixto > 0 || item.Machos > 0 || item.Hembras > 0)
                );

                console.log(`- Items con datos válidos: ${validItems.length}`);

                if (validItems.length === 0) {
                    console.error('❌ No se encontraron items con datos válidos después de la transformación');
                    setError('Los datos de referencia no contienen información de peso válida.');
                    setLoadingReference(false);
                    return;
                }

                // Asegurar que se incluya una fila para edad -1 con valores 0 (para inicialización)
                if (!transformedData.find(d => d.edad === -1)) {
                    transformedData.unshift({
                        id: 0,
                        edad: -1,
                        Mixto: 0,
                        Machos: 0,
                        Hembras: 0
                    });
                }

                // Ordenar por edad para asegurar consistencia
                transformedData.sort((a, b) => a.edad - b.edad);

                console.log('✅ Datos finales ordenados:', transformedData.slice(0, 5)); // Mostrar los primeros 5

                // Establecer los datos de referencia
                setReferenceData(transformedData);

                // 🔍 DEBUG: Ver datos transformados
                console.log('🔍 DEBUG transformedData:', transformedData);
                console.log('🔍 DEBUG primeros 3 transformados:', transformedData.slice(0, 3));

                // Establecer los datos de referencia
                setReferenceData(transformedData);
                console.log('✅ referenceData establecido correctamente');

            } catch (apiError) {
                console.error('❌ Error al obtener datos de la API:', apiError);
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
        if (!camadaInfo || !camadaInfo.fecha_hora_inicio) {
            console.warn('[calculateCamadaAge] Información de camada incompleta', {
                camadaInfo
            });
            return null;
        }

        // Crear las fechas
        const startDate = new Date(camadaInfo.fecha_hora_inicio);

        // DEPURACIÓN: Mostrar valores antes de normalizar
        console.log('🔍 DEPURACIÓN calculateCamadaAge:');
        console.log('- Fecha inicio original:', camadaInfo.fecha_hora_inicio);
        console.log('- Fecha inicio parseada:', startDate.toString());
        console.log('- Fecha target original:', date);
        console.log('- Fecha target parseada:', targetDate.toString());
        console.log('- Fecha target getTime():', targetDate.getTime());
        console.log('- Fecha inicio getTime():', startDate.getTime());

        // Verificar si las fechas son válidas
        if (isNaN(startDate.getTime()) || isNaN(targetDate.getTime())) {
            console.error('❌ Fechas inválidas detectadas');
            return null;
        }

        // Normalizar ambas fechas a medianoche (00:00:00)
        const normalizedStartDate = new Date(startDate);
        const normalizedTargetDate = new Date(targetDate);

        normalizedStartDate.setHours(0, 0, 0, 0);
        normalizedTargetDate.setHours(0, 0, 0, 0);

        // DEPURACIÓN: Mostrar valores después de normalizar
        console.log('- Fecha inicio normalizada:', normalizedStartDate.toString());
        console.log('- Fecha target normalizada:', normalizedTargetDate.toString());
        console.log('- Diferencia en ms:', normalizedTargetDate.getTime() - normalizedStartDate.getTime());

        // Calcular diferencia en días
        if (isNaN(startDate.getTime())) {
            console.error('[calculateCamadaAge] Fecha de inicio inválida', {
                fecha_hora_inicio: camadaInfo.fecha_hora_inicio
            });
            return null;
        }

        const targetDate = date instanceof Date ? date : new Date(date);
        if (isNaN(targetDate.getTime())) {
            console.error('[calculateCamadaAge] Fecha objetivo inválida', { date });
            return null;
        }

        const diffTime = Math.abs(targetDate - startDate); 
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        console.log('[calculateCamadaAge] Calculando edad de camada', {
            fechaObjetivo: targetDate,
            fechaInicio: startDate,
            edadCalculada: diffDays
        });

        console.log('- Diferencia en días (antes de validar):', diffDays);

        // No permitir edades negativas - si la fecha consultada es anterior al inicio
        const finalAge = Math.max(0, diffDays);

        console.log('- Edad final calculada:', finalAge);
        console.log('---');

        return finalAge;
    };

     const resolveConsultedAge = () => {
        let targetDate = null;

        if (fecha) {
            targetDate = new Date(fecha);
        } else if (pesadasRangoData && pesadasRangoData.length > 0) {
            const lastReading = pesadasRangoData[pesadasRangoData.length - 1];
            targetDate = new Date(lastReading.fecha);
        }

        if (targetDate && !isNaN(targetDate.getTime())) {
            return calculateCamadaAge(targetDate);
        }

        return calculateCamadaAge();
    };


    // Obtener el sexaje de la camada
    const getCamadaSexaje = () => {
        if (!camadaInfo || !camadaInfo.sexaje) return 'Mixto'; // Por defecto

        // Normalizar el valor del sexaje
        const sexaje = camadaInfo.sexaje.trim();

        if (sexaje === 'Machos') return 'Machos';
        if (sexaje === 'Hembras') return 'Hembras';
        return 'Mixto';
    };

    // Función para manejar la selección rápida de fechas
    const handleQuickDateSelection = (option) => {
        if (!selectedDisp) return;

        const today = new Date();
        let startDate, endDate;
        let successMessage = '';

        switch (option) {
            case 'desde-inicio':
                // Usar camadaInfo o propCamadaInfo, lo que esté disponible
                const infoToUse = camadaInfo || propCamadaInfo;

                // Mostrar información de depuración en la consola

                if (!infoToUse) {
                    setError('No se encontró información de la camada');
                    return;
                }

                if (!infoToUse.fecha_hora_inicio) {
                    setError('La fecha de inicio no está disponible en la información de la camada');
                    return;
                }


                // Normalizar la fecha de inicio - manejo más robusto
                try {
                    startDate = new Date(infoToUse.fecha_hora_inicio);

                    // Verificar que la fecha sea válida
                    if (isNaN(startDate.getTime())) {
                        console.error('Fecha inválida:', infoToUse.fecha_hora_inicio);
                        setError('La fecha de inicio de la camada no es válida');
                        return;
                    }

                } catch (error) {
                    console.error('Error al procesar la fecha:', error);
                    setError('Error al procesar la fecha de inicio de la camada');
                    return;
                }

                // Fecha fin será la fecha actual o fecha_hora_final (la que sea menor)
                endDate = today; // Por defecto, usamos la fecha actual

                if (infoToUse.fecha_hora_final) {
                    try {
                        const finalDate = new Date(infoToUse.fecha_hora_final);
                        if (!isNaN(finalDate.getTime())) {
                            endDate = finalDate < today ? finalDate : today;
                        }
                    } catch (error) {
                        console.error('Error al procesar fecha final:', error);
                        // Continuamos con la fecha actual como respaldo
                    }
                }

                successMessage = `Período configurado desde el inicio de la camada (${startDate.toLocaleDateString()})`;
                break;

            case 'ultima-semana':
                // Calcular fecha de hace 7 días
                endDate = today;
                startDate = new Date();
                startDate.setDate(today.getDate() - 7);

                successMessage = `Período configurado para la última semana`;
                break;

            default:
                return;
        }

        // Asegurar que las funciones auxiliares estén definidas
        const formatDateToYYYYMMDD = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const formattedStartDate = formatDateToYYYYMMDD(startDate);
        const formattedEndDate = formatDateToYYYYMMDD(endDate);


        // Actualizar los estados para la UI
        setFechaInicioRange(formattedStartDate);
        setFechaFinRange(formattedEndDate);

        // Limpiar errores previos
        const prevError = error;
        setError(successMessage);

        // Cargar los datos inmediatamente
        fetchPesadasRango(formattedStartDate, formattedEndDate);

        // Restaurar el estado de error después
        setTimeout(() => {
            if (error === successMessage) {
                setError(prevError);
            }
        }, 3000);
    };

    // --------- Validación de fechas ---------
    const handleFechaChange = (newFecha) => {
        if (fechaLimites.inicio && newFecha < fechaLimites.inicio) {
            setError(`❌ La fecha no puede ser anterior al inicio de la camada (${fechaLimites.inicio})`);
            return;
        }
        if (fechaLimites.fin && newFecha > fechaLimites.fin) {
            setError(`❌ La fecha no puede ser posterior al final de la camada (${fechaLimites.fin})`);
            return;
        }
        setFecha(newFecha);
        if (error.startsWith('❌ La fecha')) setError('');
    };

    const handleFechaInicioRangeChange = (newFecha) => {
        if (fechaLimites.inicio && newFecha < fechaLimites.inicio) {
            setError(`❌ La fecha de inicio no puede ser anterior al inicio de la camada (${fechaLimites.inicio})`);
            return;
        }
        if (fechaLimites.fin && newFecha > fechaLimites.fin) {
            setError(`❌ La fecha de inicio no puede ser posterior al final de la camada (${fechaLimites.fin})`);
            return;
        }
        if (fechaFinRange && newFecha > fechaFinRange) {
            setError(`❌ La fecha de inicio no puede ser posterior a la fecha de fin (${fechaFinRange})`);
            return;
        }
        setFechaInicioRange(newFecha);
        if (error.startsWith('❌ La fecha')) setError('');
    };

    const handleFechaFinRangeChange = (newFecha) => {
        if (fechaLimites.inicio && newFecha < fechaLimites.inicio) {
            setError(`❌ La fecha de fin no puede ser anterior al inicio de la camada (${fechaLimites.inicio})`);
            return;
        }
        if (fechaLimites.fin && newFecha > fechaLimites.fin) {
            setError(`❌ La fecha de fin no puede ser posterior al final de la camada (${fechaLimites.fin})`);
            return;
        }
        if (fechaInicioRange && newFecha < fechaInicioRange) {
            setError(`❌ La fecha de fin no puede ser anterior a la fecha de inicio (${fechaInicioRange})`);
            return;
        }
        setFechaFinRange(newFecha);
        if (error.startsWith('❌ La fecha')) setError('');
    };


    // Calcular regresión lineal
    const calculateLinearRegression = (xValues, yValues) => {
        const n = xValues.length;
        if (n <= 1) return null;

        // Convertir fechas a valores numéricos (días desde la primera fecha)
        const startTimestamp = new Date(xValues[0]).getTime();
        const xDays = xValues.map(x => (new Date(x).getTime() - startTimestamp) / (1000 * 60 * 60 * 24));

        // Calcular medias
        const meanX = xDays.reduce((sum, x) => sum + x, 0) / n;
        const meanY = yValues.reduce((sum, y) => sum + y, 0) / n;

        // Calcular pendiente (b) e intercepto (a)
        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < n; i++) {
            numerator += (xDays[i] - meanX) * (yValues[i] - meanY);
            denominator += Math.pow(xDays[i] - meanX, 2);
        }

        const slope = denominator !== 0 ? numerator / denominator : 0;
        const intercept = meanY - slope * meanX;

        // Calcular coeficiente de determinación (R²)
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


    const calculateComparison = () => {


        const lastReading = pesadasRangoData[pesadasRangoData.length - 1];

        const lastDate = new Date(lastReading.fecha);

        // ✅ USAR peso_medio_aceptadas directamente del API
        const lastWeight = lastReading.peso_medio_aceptadas || 0;

        if (lastWeight <= 0) {
            return null;
        }

        const loteEdad = calculateCamadaAge(lastDate);

        if (loteEdad === null) {
            return null;
        }

        const sexaje = getCamadaSexaje();

        const refData = referenceData.find(d => d.edad === loteEdad);

        if (!refData) {
            return null;
        }

        const refWeight = refData[sexaje];

        const deviation = lastWeight - refWeight;
        const deviationPercent = (deviation / refWeight) * 100;

        let status = "En objetivo";
        let statusColor = "text-green-600 dark:text-green-400";

        if (deviationPercent < -5) {
            status = "Por debajo del objetivo";
            statusColor = "text-red-600 dark:text-red-400";
        } else if (deviationPercent > 5) {
            status = "Por encima del objetivo";
            statusColor = "text-blue-600 dark:text-blue-400";
        }

        // ✅ AÑADIR PROYECCIÓN DE FORMA SEGURA
        let projectionData = null;

        try {

            // Buscar datos de referencia para 7 días en el futuro
            const futureAge = loteEdad + 7;

            const futureRefData = referenceData.find(d => d.edad === futureAge);

            if (futureRefData && pesadasRangoData.length >= 2) {

                // Método simple: usar los últimos días para calcular crecimiento promedio
                const recentDays = Math.min(3, pesadasRangoData.length);
                const recentData = pesadasRangoData.slice(-recentDays);

                let totalGrowth = 0;
                let growthCount = 0;

                for (let i = 1; i < recentData.length; i++) {
                    const prevWeight = recentData[i - 1].peso_medio_aceptadas;
                    const currWeight = recentData[i].peso_medio_aceptadas;

                    if (prevWeight > 0 && currWeight > 0) {
                        totalGrowth += (currWeight - prevWeight);
                        growthCount++;
                    }
                }


                if (growthCount > 0) {
                    const avgDailyGrowth = totalGrowth / growthCount;
                    const projectedWeight = lastWeight + (avgDailyGrowth * 7);

                    const futureRefWeight = futureRefData[sexaje];
                    const futureDev = projectedWeight - futureRefWeight;
                    const futureDevPercent = (futureDev / futureRefWeight) * 100;

                    projectionData = {
                        age: futureAge,
                        weight: projectedWeight,
                        reference: futureRefWeight,
                        deviation: futureDev,
                        deviationPercent: futureDevPercent,
                        date: new Date(lastDate.getTime() + (7 * 24 * 60 * 60 * 1000))
                    };

                }
            }
        } catch (projectionError) {
            projectionData = null;
        }

        const result = {
            current: {
                age: loteEdad,
                weight: lastWeight,
                reference: refWeight,
                deviation,
                deviationPercent,
                status,
                statusColor
            },
            projection: projectionData
        };

        return result;
    };


    // Función auxiliar para calcular la comparación con un peso específico
    const calculateComparisonWithWeight = (lastWeight, lastDate) => {
        if (!referenceData || !camadaInfo || lastWeight <= 0) {
            return null;
        }

        // Calcular la edad del lote en esa fecha
        const loteEdad = calculateCamadaAge(lastDate);

        if (loteEdad === null) {
            return null;
        }

        // Obtener el sexaje del lote
        const sexaje = getCamadaSexaje();

        // Buscar el peso de referencia para esa edad
        const refData = referenceData.find(d => d.edad === loteEdad);

        if (!refData) {
            return null;
        }

        // Calcular desviación
        const refWeight = refData[sexaje];
        const deviation = lastWeight - refWeight;
        const deviationPercent = (deviation / refWeight) * 100;

        // Determinar el estado del lote
        let status = "En objetivo";
        let statusColor = "text-green-600 dark:text-green-400";

        if (deviationPercent < -5) {
            status = "Por debajo del objetivo";
            statusColor = "text-red-600 dark:text-red-400";
        } else if (deviationPercent > 5) {
            status = "Por encima del objetivo";
            statusColor = "text-blue-600 dark:text-blue-400";
        }

        // ✅ CALCULAR PROYECCIÓN FUTURA (7 días adelante)
        let projectionData = null;

        // Buscar datos de referencia para 7 días en el futuro
        const futureAge = loteEdad + 7;
        const futureRefData = referenceData.find(d => d.edad === futureAge);

        if (futureRefData) {
            // ✅ ESTIMAR PESO FUTURO USANDO MÚLTIPLES MÉTODOS

            // Método 1: Proyección lineal simple desde datos del rango
            let projectedWeightLinear = lastWeight;
            if (pesadasRangoData.length >= 2) {
                // Calcular tasa de crecimiento promedio de los últimos días
                const recentDays = Math.min(5, pesadasRangoData.length);
                const recentData = pesadasRangoData.slice(-recentDays);

                let totalGrowth = 0;
                let growthCount = 0;

                for (let i = 1; i < recentData.length; i++) {
                    const prevWeight = recentData[i - 1].peso_medio_aceptadas;
                    const currWeight = recentData[i].peso_medio_aceptadas;

                    if (prevWeight > 0 && currWeight > 0) {
                        totalGrowth += (currWeight - prevWeight);
                        growthCount++;
                    }
                }

                const avgDailyGrowth = growthCount > 0 ? totalGrowth / growthCount : 0;
                projectedWeightLinear = lastWeight + (avgDailyGrowth * 7);
            }

            // Método 2: Proyección basada en referencia
            const currentRefWeight = refData[sexaje];
            const futureRefWeight = futureRefData[sexaje];
            const expectedGrowth = futureRefWeight - currentRefWeight;
            const projectedWeightReference = lastWeight + expectedGrowth;

            // Método 3: Combinar ambos métodos (70% observado, 30% referencia)
            const projectedWeight = (projectedWeightLinear * 0.7) + (projectedWeightReference * 0.3);

            // Calcular diferencias con la referencia futura
            const futureDev = projectedWeight - futureRefWeight;
            const futureDevPercent = (futureDev / futureRefWeight) * 100;

            // Crear objeto con los datos de proyección
            projectionData = {
                age: futureAge,
                weight: projectedWeight,
                reference: futureRefWeight,
                deviation: futureDev,
                deviationPercent: futureDevPercent,
                date: new Date(lastDate.getTime() + (7 * 24 * 60 * 60 * 1000)) // +7 días
            };
        }

        return {
            current: {
                age: loteEdad,
                weight: lastWeight,
                reference: refWeight,
                deviation,
                deviationPercent,
                status,
                statusColor
            },
            projection: projectionData
        };
    };

    const calculateUniformityCoefficient = (pesadas, pesoMedio) => {

        // Calcular límites del ±10% del peso medio
        const limiteInferior = pesoMedio * 0.9;  // -10%
        const limiteSuperior = pesoMedio * 1.1;  // +10%


        // Contar animales dentro del rango ±10%
        const animalesDentroRango = pesadas.filter(peso => {
            const valor = parseFloat(peso.valor);
            const estaDentro = valor >= limiteInferior && valor <= limiteSuperior;
            return estaDentro;
        });


        // Calcular porcentaje
        const porcentajeUniformidad = (animalesDentroRango.length / pesadas.length) * 100;


        return porcentajeUniformidad;
    };
    // ———————————————————————————————————————————————————
    // CONFIGURACIÓN DE TEMAS PARA PLOTLY
    // ———————————————————————————————————————————————————

    // Definición de temas claro y oscuro
    const lightTheme = {
        bg: '#ffffff',
        paper: '#f8fafc',
        grid: '#e2e8f0',
        text: '#334155',
        axisLine: '#94a3b8',
        primary: '#3b82f6',
        secondary: '#ef4444',
        accent: '#10b981'
    };

    const darkTheme = {
        bg: '#1e293b',
        paper: '#0f172a',
        grid: '#334155',
        text: '#e2e8f0',
        axisLine: '#64748b',
        primary: '#60a5fa',
        secondary: '#f87171',
        accent: '#34d399'
    };

    // Seleccionar tema basado en el modo
    const theme = isDarkMode ? darkTheme : lightTheme;

    // Configuración común para todos los gráficos de Plotly
    const baseLayout = {
        font: {
            family: 'Inter, system-ui, sans-serif',
            color: theme.text
        },
        paper_bgcolor: theme.paper,
        plot_bgcolor: theme.bg,
        margin: { l: 60, r: 20, t: 40, b: 50 },
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
            font: { color: theme.text }
        }
    };

    // Configuración común para todos los gráficos
    const baseConfig = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToAdd: ['zoom2d', 'pan2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d', 'lasso2d', 'select2d'],
        displaylogo: false,
        scrollZoom: true,
        toImageButtonOptions: {
            format: 'png',
            filename: 'grafico_pesadas',
            height: 500,
            width: 700,
            scale: 1
        }
    };

    // ———————————————————————————————————————————————————
    // FUNCIONES PARA SELECCIÓN INTERACTIVA
    // ———————————————————————————————————————————————————

    // Manejar selecciones en el gráfico scatter
    const handleScatterSelection = (eventData) => {
        if (eventData && eventData.points && eventData.points.length > 0) {
            const points = eventData.points;

            // Extraer valores relevantes
            const pesos = points.map(p => p.y);
            const timestamps = points.map(p => p.x);

            // Cálculo de estadísticas
            const minPeso = Math.min(...pesos);
            const maxPeso = Math.max(...pesos);
            const avgPeso = pesos.reduce((sum, val) => sum + val, 0) / pesos.length;
            const stdDev = Math.sqrt(
                pesos.reduce((sum, val) => sum + Math.pow(val - avgPeso, 2), 0) / pesos.length
            );

            // Ordenar fechas
            const sortedTimestamps = [...timestamps].sort((a, b) => new Date(a) - new Date(b));
            const startTime = new Date(sortedTimestamps[0]);
            const endTime = new Date(sortedTimestamps[sortedTimestamps.length - 1]);

            // Actualizar estados
            setSelectedPoints(points.length);
            setSelectionStats({
                count: points.length,
                minPeso: minPeso.toFixed(1),
                maxPeso: maxPeso.toFixed(1),
                avgPeso: avgPeso.toFixed(1),
                stdDev: stdDev.toFixed(1),
                startTime: startTime.toLocaleTimeString('es-ES'),
                endTime: endTime.toLocaleTimeString('es-ES')
            });

            // Desplazar a la sección de estadísticas
            if (statsRef.current) {
                statsRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    // ———————————————————————————————————————————————————
    // FUNCIONES PARA COMPARACIÓN ENTRE FECHAS
    // ———————————————————————————————————————————————————

    // Manejar la comparación de distribuciones entre fechas
    const handleCompareDistributions = () => {
        if (!dateToCompare1 || !dateToCompare2 || !pesadasRangoData) {
            setError('Selecciona dos fechas válidas para comparar');
            return;
        }

        setComparingDates(true);
    };

    // ———————————————————————————————————————————————————
    // PREPARACIÓN DE DATOS PARA PLOTLY
    // ———————————————————————————————————————————————————

    // 1. Gráfico de línea: Peso medio diario
    const getPesoMedioLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Peso medio diario',
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Fecha',
                font: { size: 14, color: theme.text }
            },
            type: 'date',
            tickformat: '%d/%m'
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'Peso Medio (g)',
                font: { size: 14, color: theme.text }
            }
        }
    });

    const getPesoMedioData = () => {
        if (!pesadasRangoData) return [];

        return [{
            type: 'scatter',
            mode: 'lines+markers',
            x: pesadasRangoData.map(d => new Date(d.fecha)),
            y: pesadasRangoData.map(d => d.peso_medio_aceptadas),
            name: 'Peso medio',
            line: { color: theme.primary, width: 3 },
            marker: {
                color: theme.primary,
                size: 8,
                line: {
                    color: isDarkMode ? theme.bg : 'white',
                    width: 2
                }
            },
            hovertemplate: 'Fecha: %{x|%d/%m/%Y}<br>Peso medio: %{y:.2f} g<extra></extra>'
        }];
    };

    const getUniformityLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Coeficiente de uniformidad diario (%)',
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Fecha',
                font: { size: 14, color: theme.text }
            },
            type: 'date',
            tickformat: '%d/%m'
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'Uniformidad (%)',
                font: { size: 14, color: theme.text }
            },
            range: [0, 100] // Forzar rango de 0 a 100%
        },
        shapes: [
            // Franja verde (por encima del 80%)
            {
                type: 'rect',
                xref: 'paper',
                yref: 'y',
                x0: 0,
                y0: 80,
                x1: 1,
                y1: 100,
                fillcolor: 'rgba(34, 197, 94, 0.1)', // Verde suave
                line: {
                    width: 0
                }
            },
            // Franja roja (por debajo del 80%)
            {
                type: 'rect',
                xref: 'paper',
                yref: 'y',
                x0: 0,
                y0: 0,
                x1: 1,
                y1: 80,
                fillcolor: 'rgba(239, 68, 68, 0.1)', // Rojo suave
                line: {
                    width: 0
                }
            }
        ],
        annotations: [
            // Etiqueta para zona verde
            {
                x: 0.95,
                y: 90,
                xref: 'paper',
                yref: 'y',
                text: 'Zona óptima (>80%)',
                showarrow: false,
                font: {
                    size: 10,
                    color: 'rgba(34, 197, 94, 0.8)'
                },
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                bordercolor: 'rgba(34, 197, 94, 0.5)',
                borderwidth: 1
            },
            // Etiqueta para zona roja
            {
                x: 0.95,
                y: 40,
                xref: 'paper',
                yref: 'y',
                text: 'Zona crítica (<80%)',
                showarrow: false,
                font: {
                    size: 10,
                    color: 'rgba(239, 68, 68, 0.8)'
                },
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                bordercolor: 'rgba(239, 68, 68, 0.5)',
                borderwidth: 1
            }
        ]
    });

    const getUniformityData = () => {
        if (!pesadasRangoData) return [];


        // Calcular uniformidad para cada día
        const uniformityData = pesadasRangoData.map((d, index) => {

            // Debug: Ver qué estados hay disponibles
            if (d.pesadas && d.pesadas.length > 0) {
                const estados = [...new Set(d.pesadas.map(p => p.estado))];

                // Contar por estado
                estados.forEach(estado => {
                    const count = d.pesadas.filter(p => p.estado === estado).length;
                });
            }

            // Intentar diferentes filtros para encontrar pesadas válidas
            let pesadasParaUniformidad = [];

            // Opción 1: Solo aceptadas
            const pesadasAceptadas = d.pesadas?.filter(p => p.estado === 'aceptada') || [];

            // Opción 2: Aceptadas y rechazadas (excluyendo descartadas)
            const pesadasRelevantes = d.pesadas?.filter(p =>
                p.estado === 'aceptada' || p.estado === 'rechazada'
            ) || [];

            // Opción 3: Todas las pesadas
            const todasPesadas = d.pesadas || [];


            // Decidir qué conjunto usar
            if (pesadasAceptadas.length > 0) {
                pesadasParaUniformidad = pesadasAceptadas;
            } else if (pesadasRelevantes.length > 0) {
                pesadasParaUniformidad = pesadasRelevantes;
            } else if (todasPesadas.length > 0) {
                pesadasParaUniformidad = todasPesadas;
            } else {
            }

            // Calcular peso medio para este conjunto
            let pesoMedioParaUniformidad;

            if (pesadasParaUniformidad.length > 0) {
                pesoMedioParaUniformidad = pesadasParaUniformidad.reduce((sum, p) => sum + parseFloat(p.valor), 0) / pesadasParaUniformidad.length;
            } else {
                pesoMedioParaUniformidad = d.peso_medio_aceptadas || 0;
            }

            // Calcular uniformidad
            const uniformidad = calculateUniformityCoefficient(pesadasParaUniformidad, pesoMedioParaUniformidad);

            return {
                fecha: new Date(d.fecha),
                uniformidad: uniformidad
            };
        });

        return [{
            type: 'scatter',
            mode: 'lines+markers',
            x: uniformityData.map(d => d.fecha),
            y: uniformityData.map(d => d.uniformidad),
            name: 'Uniformidad (%)',
            line: {
                color: theme.accent, // Color verde/azul según el tema
                width: 3
            },
            marker: {
                color: theme.accent,
                size: 8,
                line: {
                    color: isDarkMode ? theme.bg : 'white',
                    width: 2
                }
            },
            hovertemplate: 'Fecha: %{x|%d/%m/%Y}<br>Uniformidad: %{y:.1f}%<extra></extra>'
        }];
    };


    // 2. Gráfico de línea: Coeficiente de variación diario
    const getCoefVariacionLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Coeficiente de variación diario (%)',
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Fecha',
                font: { size: 14, color: theme.text }
            },
            type: 'date',
            tickformat: '%d/%m'
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'Coef. Variación (%)',
                font: { size: 14, color: theme.text }
            }
        }
    });



    const getCoefVariacionData = () => {
        if (!pesadasRangoData) return [];

        return [{
            type: 'scatter',
            mode: 'lines+markers',
            x: pesadasRangoData.map(d => new Date(d.fecha)),
            y: pesadasRangoData.map(d => d.coef_variacion),
            name: 'CV (%)',
            line: { color: theme.secondary, width: 3 },
            marker: {
                color: theme.secondary,
                size: 8,
                line: {
                    color: isDarkMode ? theme.bg : 'white',
                    width: 2
                }
            },
            hovertemplate: 'Fecha: %{x|%d/%m/%Y}<br>CV: %{y:.2f}%<extra></extra>'
        }];
    };

    // 3. Gráfico scatter: Todas las pesadas aceptadas
    const getScatterLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Todas las pesadas aceptadas',
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
            rangeslider: {
                visible: true,
                thickness: 0.05,
                bgcolor: isDarkMode ? '#1e293b' : '#f1f5f9',
                bordercolor: theme.axisLine
            }
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'Peso (g)',
                font: { size: 14, color: theme.text }
            }
        },
        dragmode: 'lasso', // Establecer el modo de selección predeterminado a lasso
        showlegend: true,
        annotations: selectedPoints ? [
            {
                x: 0.5,
                y: 1.1,
                xref: 'paper',
                yref: 'paper',
                text: `Has seleccionado ${selectedPoints} punto${selectedPoints !== 1 ? 's' : ''}`,
                showarrow: false,
                font: {
                    family: 'Arial',
                    size: 14,
                    color: theme.text
                },
                bgcolor: theme.paper,
                bordercolor: theme.accent,
                borderwidth: 1,
                borderpad: 4,
                align: 'center'
            }
        ] : []
    });

    const generateExcel = () => {
        // Verificar que tenemos datos para exportar
        if (!pesadasRangoData || pesadasRangoData.length === 0) {
            setError('No hay datos disponibles para exportar');
            return;
        }

        try {
            // Importar la biblioteca XLSX si aún no está importada
            import('xlsx').then(async XLSX => {
                // Para aplicar formatos más avanzados necesitamos ExcelJS
                const ExcelJS = await import('exceljs');
                const workbook = new ExcelJS.Workbook();

                // Configurar las propiedades del documento
                workbook.creator = 'Sistema de Gestión Avícola';
                workbook.lastModifiedBy = 'Usuario del Sistema';
                workbook.created = new Date();
                workbook.modified = new Date();

                // Colores de tema para consistencia
                const colors = {
                    primary: '3B82F6',       // Azul
                    secondary: 'EF4444',     // Rojo
                    accent: '10B981',        // Verde
                    light: 'F8FAFC',         // Gris muy claro
                    lightBlue: 'DBEAFE',     // Azul muy claro
                    lightGreen: 'DCFCE7',    // Verde claro
                    lightRed: 'FEE2E2',      // Rojo claro
                    lightGray: 'E2E8F0',     // Gris claro
                    darkGray: '334155',      // Gris oscuro
                    headerBg: '1E40AF',      // Azul oscuro para encabezados
                    sectionBg: 'DBEAFE',     // Azul claro para secciones
                    positiveBg: 'DCFCE7',    // Verde claro para positivos
                    negativeBg: 'FEE2E2',    // Rojo claro para negativos
                    warningBg: 'FEF9C3'      // Amarillo claro para advertencias
                };

                // --------------------------------------------------
                // HOJA PRINCIPAL: TODAS LAS SECCIONES EN UNA PÁGINA
                // --------------------------------------------------
                const wsMain = workbook.addWorksheet('Informe Completo', {
                    properties: { tabColor: { argb: colors.primary } }
                });

                // Configurar columnas para mejor presentación
                wsMain.columns = [
                    { header: '', key: 'col1', width: 22 },
                    { header: '', key: 'col2', width: 18 },
                    { header: '', key: 'col3', width: 18 },
                    { header: '', key: 'col4', width: 18 },
                    { header: '', key: 'col5', width: 18 },
                    { header: '', key: 'col6', width: 18 },
                    { header: '', key: 'col7', width: 18 },
                    { header: '', key: 'col8', width: 18 }
                ];

                // Función para aplicar estilos a encabezados de sección
                const applySectionHeaderStyles = (row, title, columns = 8) => {
                    row.height = 22;
                    wsMain.mergeCells(`A${row.number}:${String.fromCharCode(64 + columns)}${row.number}`);
                    const cell = row.getCell(1);
                    cell.value = title;
                    cell.font = {
                        name: 'Calibri',
                        size: 12,
                        bold: true,
                        color: { argb: colors.darkGray }
                    };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: colors.sectionBg }
                    };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                };

                // Función para aplicar estilos a una fila de datos
                const applyDataRowStyles = (row, alternate = false) => {
                    row.height = 18;
                    const fillColor = alternate ? colors.light : 'FFFFFF';
                    row.eachCell({ includeEmpty: true }, cell => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: fillColor }
                        };
                    });
                };

                // Función para aplicar estilos a encabezados de tabla
                const applyTableHeaderStyles = (row) => {
                    row.height = 20;
                    row.eachCell({ includeEmpty: true }, cell => {
                        cell.font = {
                            bold: true,
                            color: { argb: 'FFFFFF' }
                        };
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: colors.headerBg }
                        };
                        cell.alignment = {
                            horizontal: 'center',
                            vertical: 'middle'
                        };
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });
                };

                // --------------------------------------------------
                // 1. TÍTULO Y CABECERA DEL INFORME
                // --------------------------------------------------

                // Título principal del informe
                const titleRow = wsMain.addRow(['INFORME DE PESADAS - CONTROL DE PESO DE CAMADAS']);
                titleRow.height = 30;
                wsMain.mergeCells(`A${titleRow.number}:H${titleRow.number}`);
                const titleCell = titleRow.getCell(1);
                titleCell.font = {
                    name: 'Calibri',
                    size: 16,
                    bold: true,
                    color: { argb: 'FFFFFF' }
                };
                titleCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: colors.headerBg }
                };
                titleCell.alignment = {
                    horizontal: 'center',
                    vertical: 'middle'
                };

                // Subtítulo con fecha e información de la camada
                const subtitleRow = wsMain.addRow([`Camada: ${camadaInfo ? camadaInfo.nombre_camada : selectedCamada} | Fecha de generación: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`]);
                subtitleRow.height = 20;
                wsMain.mergeCells(`A${subtitleRow.number}:H${subtitleRow.number}`);
                const subtitleCell = subtitleRow.getCell(1);
                subtitleCell.font = {
                    name: 'Calibri',
                    size: 11,
                    italic: true,
                    color: { argb: colors.darkGray }
                };
                subtitleCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: colors.light }
                };
                subtitleCell.alignment = { horizontal: 'center' };

                // Espacio
                wsMain.addRow([]);

                // --------------------------------------------------
                // 2. INFORMACIÓN DE LA CAMADA
                // --------------------------------------------------

                // Encabezado de la sección
                const camadaHeaderRow = wsMain.addRow(['INFORMACIÓN DE LA CAMADA']);
                applySectionHeaderStyles(camadaHeaderRow, 'INFORMACIÓN DE LA CAMADA');

                // Datos de la camada organizados en una tabla de 2x3
                const camadaInfoRow1 = wsMain.addRow([
                    'Nombre Camada:', camadaInfo ? camadaInfo.nombre_camada : selectedCamada,
                    'Tipo Ave:', camadaInfo ? camadaInfo.tipo_ave : '',
                    'Estirpe:', camadaInfo ? camadaInfo.tipo_estirpe : ''
                ]);
                applyDataRowStyles(camadaInfoRow1);
                camadaInfoRow1.getCell(1).font = { bold: true };
                camadaInfoRow1.getCell(3).font = { bold: true };
                camadaInfoRow1.getCell(5).font = { bold: true };

                const camadaInfoRow2 = wsMain.addRow([
                    'Sexaje:', camadaInfo ? camadaInfo.sexaje : '',
                    'Edad Actual (días):', calculateCamadaAge() || '',
                    'Fecha Inicio:', camadaInfo ? new Date(camadaInfo.fecha_hora_inicio).toLocaleDateString('es-ES') : ''
                ]);
                applyDataRowStyles(camadaInfoRow2, true);
                camadaInfoRow2.getCell(1).font = { bold: true };
                camadaInfoRow2.getCell(3).font = { bold: true };
                camadaInfoRow2.getCell(5).font = { bold: true };

                // Espacio
                wsMain.addRow([]);

                // --------------------------------------------------
                // 3. RESUMEN DE ANÁLISIS Y ESTADO ACTUAL
                // --------------------------------------------------

                // Obtener datos de comparación
                const comparison = calculateComparison();


                if (comparison) {
                    // Encabezado de la sección
                    const analysisHeaderRow = wsMain.addRow(['ESTADO ACTUAL Y COMPARACIÓN CON REFERENCIA']);
                    applySectionHeaderStyles(analysisHeaderRow, 'ESTADO ACTUAL Y COMPARACIÓN CON REFERENCIA');

                    // Determinar el color de fondo según el estado
                    let statusBgColor = colors.lightGreen; // Por defecto (en objetivo)
                    if (comparison.current.status === "Por debajo del objetivo") {
                        statusBgColor = colors.lightRed;
                    } else if (comparison.current.status === "Por encima del objetivo") {
                        statusBgColor = colors.lightBlue;
                    }

                    // Datos de análisis
                    const analysisRow1 = wsMain.addRow([
                        'Estado:', comparison.current.status,
                        'Edad (días):', comparison.current.age,
                        'Peso actual:', `${comparison.current.weight.toFixed(0)} g`,
                        'Peso referencia:', `${comparison.current.reference} g`
                    ]);
                    applyDataRowStyles(analysisRow1);
                    analysisRow1.getCell(1).font = { bold: true };
                    analysisRow1.getCell(3).font = { bold: true };
                    analysisRow1.getCell(5).font = { bold: true };
                    analysisRow1.getCell(7).font = { bold: true };

                    // Colorear la celda de estado
                    analysisRow1.getCell(2).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: statusBgColor }
                    };

                    // Obtener datos de desviación
                    const devValue = comparison.current.deviation;
                    const devPercent = comparison.current.deviationPercent;

                    // Determinar el color para la desviación
                    let devColor = '008000'; // Verde (en objetivo)
                    if (devPercent < -5) {
                        devColor = 'FF0000'; // Rojo (por debajo)
                    } else if (devPercent > 5) {
                        devColor = '0000FF'; // Azul (por encima)
                    }

                    const analysisRow2 = wsMain.addRow([
                        'Desviación:', `${devValue > 0 ? '+' : ''}${devValue.toFixed(0)} g`,
                        'Desviación (%):', `${devPercent > 0 ? '+' : ''}${devPercent.toFixed(1)}%`,
                        'Coef. Variación:', pesadasRangoData.length > 0 ? `${pesadasRangoData[pesadasRangoData.length - 1].coef_variacion.toFixed(1)}%` : 'N/A',
                        '', ''
                    ]);
                    applyDataRowStyles(analysisRow2, true);
                    analysisRow2.getCell(1).font = { bold: true };
                    analysisRow2.getCell(3).font = { bold: true };
                    analysisRow2.getCell(5).font = { bold: true };

                    // Colorear las celdas de desviación
                    analysisRow2.getCell(2).font = { color: { argb: devColor } };
                    analysisRow2.getCell(4).font = { color: { argb: devColor } };
                }

                // Espacio
                wsMain.addRow([]);

                // --------------------------------------------------
                // 4. ANÁLISIS DE CRECIMIENTO Y PROYECCIÓN
                // --------------------------------------------------

                // Encabezado de la sección
                const growthHeaderRow = wsMain.addRow(['ANÁLISIS DE CRECIMIENTO Y PROYECCIÓN']);
                applySectionHeaderStyles(growthHeaderRow, 'ANÁLISIS DE CRECIMIENTO Y PROYECCIÓN');

                // Obtener datos de pronóstico
                const forecastResult = getForecastData();

                // Verificar si hay suficientes datos para análisis
                if (pesadasRangoData.length >= 3) {
                    // Calcular tasa de crecimiento usando regresión lineal
                    const dates = pesadasRangoData.map(d => new Date(d.fecha));
                    const weights = pesadasRangoData.map(d => d.peso_medio_aceptadas);

                    const regression = calculateLinearRegression(
                        dates.map(d => d.toISOString()),
                        weights
                    );

                    if (regression) {
                        // Tasa de crecimiento diario en g/día
                        const dailyGrowthRate = regression.slope;

                        // Último peso registrado
                        const lastWeight = weights[weights.length - 1];

                        // Crecimiento como porcentaje del peso actual
                        const growthPercentage = (dailyGrowthRate / lastWeight) * 100;

                        // Variables para datos de referencia y eficiencia
                        let expectedGrowthRate = null;
                        let avgEfficiency = null;

                        if (camadaInfo && referenceData) {
                            // Calcular la eficiencia como qué tan cerca están los pesos de los de referencia
                            const efficiencies = [];

                            // Obtener el sexaje del lote
                            const sexaje = getCamadaSexaje();

                            // Para cada medición, encontrar el peso de referencia y calcular la eficiencia
                            for (let i = 0; i < pesadasRangoData.length; i++) {
                                const date = dates[i];
                                const actualWeight = weights[i];
                                const age = calculateCamadaAge(date);

                                if (age !== null) {
                                    const refData = referenceData.find(d => d.edad === age);
                                    if (refData) {
                                        const refWeight = refData[sexaje];
                                        // Calcular qué tan cerca está el peso real del peso de referencia (en porcentaje)
                                        const efficiency = (actualWeight / refWeight) * 100;
                                        efficiencies.push(efficiency);
                                    }
                                }
                            }

                            // Calcular la eficiencia promedio
                            if (efficiencies.length > 0) {
                                avgEfficiency = efficiencies.reduce((sum, val) => sum + val, 0) / efficiencies.length;
                            }

                            // Calcular tasa de crecimiento esperada según la referencia
                            const lastDate = dates[dates.length - 1];
                            const loteEdad = calculateCamadaAge(lastDate);

                            if (loteEdad !== null) {
                                const refData = referenceData.find(d => d.edad === loteEdad);
                                const prevData = referenceData.find(d => d.edad === (loteEdad - 1));

                                if (refData && prevData) {
                                    expectedGrowthRate = refData[sexaje] - prevData[sexaje];
                                }
                            }
                        }

                        // Valores para la proyección
                        let projectionData = [];

                        if (forecastResult && forecastResult.forecastValues && forecastResult.forecastValues.length > 0) {
                            // Obtener los primeros 5 días de proyección
                            const numDaysToShow = Math.min(5, forecastResult.forecastValues.length);

                            for (let i = 0; i < numDaysToShow; i++) {
                                projectionData.push({
                                    day: i + 1,
                                    date: forecastResult.forecastDates[i],
                                    weight: forecastResult.forecastValues[i]
                                });
                            }
                        }

                        // Fila 1: Tasas de crecimiento
                        const growthRow1 = wsMain.addRow([
                            'Tasa de crecimiento:', `${dailyGrowthRate.toFixed(1)} g/día`,
                            'Crecimiento relativo:', `${growthPercentage.toFixed(1)}% del peso/día`,
                            'Calidad del ajuste:', `R² = ${regression.rSquared.toFixed(3)}`
                        ]);
                        applyDataRowStyles(growthRow1);
                        growthRow1.getCell(1).font = { bold: true };
                        growthRow1.getCell(3).font = { bold: true };
                        growthRow1.getCell(5).font = { bold: true };

                        // Colorear la celda R² según su valor
                        if (regression.rSquared > 0.8) {
                            growthRow1.getCell(6).font = { color: { argb: '008000' } }; // Verde
                        } else if (regression.rSquared > 0.5) {
                            growthRow1.getCell(6).font = { color: { argb: 'FFA500' } }; // Naranja
                        } else {
                            growthRow1.getCell(6).font = { color: { argb: 'FF0000' } }; // Rojo
                        }

                        // Fila 2: Comparación con referencia (si está disponible)
                        if (expectedGrowthRate !== null && avgEfficiency !== null) {
                            const growthRow2 = wsMain.addRow([
                                'Crecimiento esperado:', `${expectedGrowthRate.toFixed(1)} g/día`,
                                'Eficiencia de crecimiento:', `${avgEfficiency.toFixed(1)}%`,
                                '', ''
                            ]);
                            applyDataRowStyles(growthRow2, true);
                            growthRow2.getCell(1).font = { bold: true };
                            growthRow2.getCell(3).font = { bold: true };

                            // Colorear la celda de eficiencia según su valor
                            let efficiencyColor;
                            if (avgEfficiency > 105) {
                                efficiencyColor = '0000FF'; // Azul (por encima)
                            } else if (avgEfficiency < 95) {
                                efficiencyColor = 'FF0000'; // Rojo (por debajo)
                            } else {
                                efficiencyColor = '008000'; // Verde (en objetivo)
                            }
                            growthRow2.getCell(4).font = { color: { argb: efficiencyColor } };
                        }

                        // Espacio
                        wsMain.addRow([]);

                        // Subencabezado para proyección de próximos días
                        if (projectionData.length > 0) {
                            const projectionHeaderRow = wsMain.addRow(['PROYECCIÓN PARA LOS PRÓXIMOS DÍAS']);
                            projectionHeaderRow.height = 20;
                            wsMain.mergeCells(`A${projectionHeaderRow.number}:H${projectionHeaderRow.number}`);
                            const projectionHeaderCell = projectionHeaderRow.getCell(1);
                            projectionHeaderCell.font = {
                                name: 'Calibri',
                                size: 11,
                                bold: true,
                                color: { argb: colors.darkGray }
                            };
                            projectionHeaderCell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: colors.lightGray }
                            };
                            projectionHeaderCell.alignment = { horizontal: 'center' };

                            // Encabezado de tabla de proyección
                            const projTableHeaderRow = wsMain.addRow([
                                'Día', 'Fecha', 'Peso Proyectado (g)', 'Referencia (g)', 'Diferencia (g)', 'Diferencia (%)', '', ''
                            ]);
                            applyTableHeaderStyles(projTableHeaderRow);

                            // Datos de proyección
                            projectionData.forEach((proj, index) => {
                                // Buscar valor de referencia
                                let refValue = null;
                                let diffValue = null;
                                let diffPercent = null;

                                if (forecastResult.referenceData && forecastResult.referenceData.weights) {
                                    refValue = forecastResult.referenceData.weights[index];
                                    if (refValue) {
                                        diffValue = proj.weight - refValue;
                                        diffPercent = (diffValue / refValue) * 100;
                                    }
                                }

                                const projRow = wsMain.addRow([
                                    `+${proj.day}`,
                                    new Date(proj.date).toLocaleDateString('es-ES'),
                                    proj.weight.toFixed(0),
                                    refValue ? refValue.toFixed(0) : 'N/A',
                                    diffValue ? diffValue.toFixed(0) : 'N/A',
                                    diffPercent ? `${diffPercent.toFixed(1)}%` : 'N/A',
                                    '', ''
                                ]);
                                applyDataRowStyles(projRow, index % 2 === 1);

                                // Centrar algunas celdas
                                [1, 3, 4, 5, 6].forEach(col => {
                                    projRow.getCell(col).alignment = { horizontal: 'center' };
                                });

                                // Colorear celdas de diferencia
                                if (diffPercent !== null) {
                                    let diffColor;
                                    if (diffPercent > 5) {
                                        diffColor = '0000FF'; // Azul (por encima)
                                    } else if (diffPercent < -5) {
                                        diffColor = 'FF0000'; // Rojo (por debajo)
                                    } else {
                                        diffColor = '008000'; // Verde (en objetivo)
                                    }
                                    projRow.getCell(5).font = { color: { argb: diffColor } };
                                    projRow.getCell(6).font = { color: { argb: diffColor } };
                                }
                            });
                        }

                        // Agregar predicción de peso objetivo si está disponible
                        if (weightPrediction) {
                            // Espacio
                            wsMain.addRow([]);

                            // Encabezado de predicción
                            const weightPredHeaderRow = wsMain.addRow(['PREDICCIÓN DE FECHA PARA PESO OBJETIVO']);
                            weightPredHeaderRow.height = 20;
                            wsMain.mergeCells(`A${weightPredHeaderRow.number}:H${weightPredHeaderRow.number}`);
                            const weightPredHeaderCell = weightPredHeaderRow.getCell(1);
                            weightPredHeaderCell.font = {
                                name: 'Calibri',
                                size: 11,
                                bold: true,
                                color: { argb: colors.darkGray }
                            };
                            weightPredHeaderCell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: colors.lightGray }
                            };
                            weightPredHeaderCell.alignment = { horizontal: 'center' };

                            // Fila de predicción
                            const predRow1 = wsMain.addRow([
                                'Peso objetivo:', `${targetWeight} g`,
                                'Días necesarios:', weightPrediction.days,
                                'Fecha estimada:', weightPrediction.date.toLocaleDateString('es-ES')
                            ]);
                            applyDataRowStyles(predRow1);
                            predRow1.getCell(1).font = { bold: true };
                            predRow1.getCell(3).font = { bold: true };
                            predRow1.getCell(5).font = { bold: true };

                            const predRow2 = wsMain.addRow([
                                'Peso proyectado:', `${Math.round(weightPrediction.actualWeight)} g`,
                                'Tipo de estimación:', weightPrediction.isEstimation ? 'Extrapolación' : 'Proyección directa',
                                '', ''
                            ]);
                            applyDataRowStyles(predRow2, true);
                            predRow2.getCell(1).font = { bold: true };
                            predRow2.getCell(3).font = { bold: true };

                            // Estilo especial si es extrapolación
                            if (weightPrediction.isEstimation) {
                                predRow2.getCell(4).font = { italic: true };
                                predRow2.getCell(4).fill = {
                                    type: 'pattern',
                                    pattern: 'solid',
                                    fgColor: { argb: colors.warningBg }
                                };
                            }
                        }
                    }
                }

                // Espacio
                wsMain.addRow([]);

                // --------------------------------------------------
                // 5. TABLA DE DATOS DE PESAJE
                // --------------------------------------------------

                // Encabezado de la sección
                const dataHeaderRow = wsMain.addRow(['RESUMEN DE DATOS DE PESAJE']);
                applySectionHeaderStyles(dataHeaderRow, 'RESUMEN DE DATOS DE PESAJE');

                // Encabezado de la tabla
                const tableHeaderRow = wsMain.addRow([
                    'Fecha', 'Peso Medio (g)', 'Coef. Var. (%)', 'Uniformidad (%)', 'Total Pesadas',
                    'Pesadas (00-06)', 'Pesadas (06-12)', 'Pesadas (12-18)', 'Pesadas (18-24)'
                ]);
                applyTableHeaderStyles(tableHeaderRow);

                // Ordenar los datos por fecha
                const sortedData = [...pesadasRangoData].sort((a, b) =>
                    new Date(a.fecha) - new Date(b.fecha)
                );

                // Añadir cada día de datos
                sortedData.forEach((day, index) => {
                    // Calcular las franjas horarias
                    let franja1 = 0, franja2 = 0, franja3 = 0, franja4 = 0;

                    if (day.pesadas_horarias) {
                        for (let h = 0; h <= 5; h++) {
                            const hora = h.toString().padStart(2, '0');
                            franja1 += day.pesadas_horarias[hora] || 0;
                        }

                        for (let h = 6; h <= 11; h++) {
                            const hora = h.toString().padStart(2, '0');
                            franja2 += day.pesadas_horarias[hora] || 0;
                        }

                        for (let h = 12; h <= 17; h++) {
                            const hora = h.toString().padStart(2, '0');
                            franja3 += day.pesadas_horarias[hora] || 0;
                        }

                        for (let h = 18; h <= 23; h++) {
                            const hora = h.toString().padStart(2, '0');
                            franja4 += day.pesadas_horarias[hora] || 0;
                        }
                    }

                    // Crear la fila
                    const pesadasAceptadas = day.pesadas.filter(p => p.estado === 'aceptada');
                    const uniformidad = calculateUniformityCoefficient(pesadasAceptadas, day.peso_medio_aceptadas);

                    const dataRow = wsMain.addRow([
                        day.fecha,
                        day.peso_medio_aceptadas.toFixed(1),
                        day.coef_variacion.toFixed(1),
                        uniformidad.toFixed(1),
                        day.pesadas.length,
                        franja1,
                        franja2,
                        franja3,
                        franja4
                    ]);
                    applyDataRowStyles(dataRow, index % 2 === 1);

                    // Centrar y formatear ciertas celdas
                    dataRow.getCell(1).alignment = { horizontal: 'center' };
                    dataRow.getCell(2).numFmt = '#,##0.00 "g"';
                    dataRow.getCell(3).numFmt = '0.00 "%"';

                    // Centrar celdas numéricas
                    [3, 4, 5, 6, 7, 8].forEach(col => {
                        dataRow.getCell(col).alignment = { horizontal: 'center' };
                    });
                });

                // --------------------------------------------------
                // 6. PIE DE PÁGINA
                // --------------------------------------------------

                // Espacio
                wsMain.addRow([]);
                wsMain.addRow([]);

                // Pie de página
                const footerRow = wsMain.addRow([`Informe generado automáticamente el ${new Date().toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}`]);
                footerRow.height = 18;
                wsMain.mergeCells(`A${footerRow.number}:H${footerRow.number}`);
                footerRow.getCell(1).font = {
                    name: 'Calibri',
                    size: 9,
                    italic: true,
                    color: { argb: colors.darkGray }
                };
                footerRow.getCell(1).alignment = { horizontal: 'center' };

                // --------------------------------------------------
                // AJUSTES FINALES Y GUARDADO DEL ARCHIVO
                // --------------------------------------------------

                // Establecer algunas propiedades de vista para la hoja
                wsMain.views = [{
                    state: 'normal', // frozen, split
                    showGridLines: true,
                    zoomScale: 100
                }];

                // Ajustar autofilter para la tabla de datos
                if (sortedData.length > 0) {
                    const filterStart = dataHeaderRow.number + 1; // Fila del encabezado de la tabla
                    const filterEnd = filterStart + sortedData.length; // Última fila de datos
                    wsMain.autoFilter = {
                        from: { row: filterStart, column: 1 },
                        to: { row: filterEnd - 1, column: 8 }
                    };
                }

                // Nombre del archivo
                const fileName = `Pesadas_${camadaInfo ? camadaInfo.nombre_camada.replace(/\s+/g, '_') : selectedCamada}_${new Date().toISOString().slice(0, 10)}.xlsx`;

                // Generar archivo y descargar
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.click();

                // Limpiar
                URL.revokeObjectURL(url);

                // Mostrar mensaje de éxito
                const prevError = error;
                setError('Datos exportados con éxito a Excel');

                // Restaurar el estado anterior después de 3 segundos
                setTimeout(() => {
                    if (error === 'Datos exportados con éxito a Excel') {
                        setError(prevError);
                    }
                }, 3000);
            }).catch(err => {
                console.error('Error al cargar las bibliotecas necesarias:', err);
                setError('Error al generar el archivo Excel: No se pudieron cargar las bibliotecas necesarias.');
            });
        } catch (err) {
            console.error('Error al generar Excel:', err);
            setError('Error al generar el archivo Excel: ' + err.message);
        }
    };

    const getScatterData = () => {
        if (!pesadasRangoData) return [];

        return [{
            type: 'scatter',
            mode: 'markers',
            x: pesadasRangoData.flatMap(d =>
                d.pesadas.map(p => new Date(p.fecha))
            ),
            y: pesadasRangoData.flatMap(d =>
                d.pesadas.map(p => p.valor)
            ),
            name: 'Pesadas',
            marker: {
                color: theme.accent,
                size: 8,
                line: {
                    color: isDarkMode ? theme.bg : 'white',
                    width: 1
                },
                opacity: 0.8
            },
            hovertemplate: 'Hora: %{x|%H:%M:%S}<br>Peso: %{y:.2f} g<extra></extra>'
        }];
    };

    const generateExcelPesadasIndividuales = async () => {
        const filteredPesadas = getFilteredDailyPesadas();

        if (!filteredPesadas || filteredPesadas.length === 0) {
            setError('No hay pesadas disponibles para exportar');
            return;
        }

        try {
            const ExcelJS = await import('exceljs');
            const workbook = new ExcelJS.Workbook();

            // Configurar propiedades del documento
            workbook.creator = 'Sistema de Gestión Avícola';
            workbook.created = new Date();

            // Crear hoja de cálculo
            const worksheet = workbook.addWorksheet('Listado de Pesadas');

            // Colores del tema
            const colors = {
                primary: '3B82F6',
                success: '10B981',
                danger: 'EF4444',
                warning: 'F59E0B',
                light: 'F8FAFC',
                dark: '1F2937'
            };

            // ENCABEZADO DEL DOCUMENTO
            const titleRow = worksheet.addRow(['LISTADO DETALLADO DE PESADAS']);
            titleRow.getCell(1).font = { size: 16, bold: true, color: { argb: colors.dark } };
            titleRow.getCell(1).alignment = { horizontal: 'center' };
            worksheet.mergeCells('A1:F1'); // ✅ AMPLIADO: Cambié de E1 a F1 para nueva columna
            titleRow.height = 30;

            // ✅ NUEVO: Obtener información de la granja
            const granjaSeleccionada = granjas.find(g => g.numero_rega === selectedGranja);
            const nombreGranja = granjaSeleccionada ? granjaSeleccionada.nombre : selectedGranja;

            // ✅ NUEVO: Calcular edad de la camada para la fecha consultada
            const fechaConsultada = fecha ? new Date(fecha) : new Date();
            const edadCamada = calculateCamadaAge ? Math.floor(calculateCamadaAge(fechaConsultada) || 0) : null;

            // Información de la camada y granja (MEJORADA)
            worksheet.addRow([]);

            // Primera fila de información
            const infoRow1 = worksheet.addRow([
                'Granja:', nombreGranja,
                '',
                'Camada:', camadaInfo?.nombre_camada || 'N/A',
                ''
            ]);

            // Segunda fila de información
            const infoRow2 = worksheet.addRow([
                'Fecha:', fecha || 'N/A',
                '',
                'Edad camada:', edadCamada ? `${edadCamada} días` : 'N/A',
                ''
            ]);

            // Tercera fila de información
            const infoRow3 = worksheet.addRow([
                'Dispositivo:', selectedDeviceForDaily === 'todos' ? 'Todos los dispositivos' : selectedDeviceForDaily,
                '',
                'Total pesadas:', filteredPesadas.length,
                ''
            ]);

            // Aplicar formato a las filas de información
            [infoRow1, infoRow2, infoRow3].forEach(row => {
                row.getCell(1).font = { bold: true, color: { argb: colors.primary } };
                row.getCell(4).font = { bold: true, color: { argb: colors.primary } };
                row.height = 20;
            });

            worksheet.addRow([]);

            // ENCABEZADOS DE LA TABLA - ✅ NUEVA COLUMNA: Agregada columna "Edad (días)"
            const headerRow = worksheet.addRow(['Dispositivo', 'Peso (g)', 'Edad (días)', 'Hora', 'Estado', 'Observaciones']);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.primary } };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            // DATOS DE LAS PESADAS
            filteredPesadas.forEach((pesada, index) => {
                const fechaPesada = new Date(pesada.fecha);
                const hora = fechaPesada.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                // ✅ NUEVO: Calcular edad específica para esta pesada
                const edadPesada = calculateCamadaAge ? Math.floor(calculateCamadaAge(fechaPesada) || 0) : Math.floor(edadCamada || 0);
                let estadoTexto = '';
                let observaciones = '';
                let colorEstado = colors.dark;

                switch (pesada.estado) {
                    case 'aceptada':
                        estadoTexto = 'Aceptada';
                        colorEstado = colors.success;
                        break;
                    case 'rechazada':
                        estadoTexto = 'Rechazada';
                        observaciones = 'Fuera del coeficiente de homogeneidad';
                        colorEstado = colors.danger;
                        break;
                    case 'descartado':
                        estadoTexto = 'Descartada';
                        observaciones = 'Fuera del rango de peso de referencia';
                        colorEstado = colors.warning;
                        break;
                    default:
                        estadoTexto = pesada.estado || 'Desconocido';
                }

                // ✅ NUEVA FILA: Incluye la edad de la pesada
                const dataRow = worksheet.addRow([
                    pesada.id_dispositivo,
                    parseFloat(pesada.valor).toFixed(1),
                    edadPesada || 0, // Nueva columna de edad
                    hora,
                    estadoTexto,
                    observaciones
                ]);

                // Aplicar formato a la fila
                dataRow.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };

                    if (index % 2 === 1) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.light } };
                    }

                    // Centrar contenido (excepto observaciones)
                    if (colNumber !== 6) { // ✅ ACTUALIZADO: Cambió de 5 a 6 para nueva columna
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }

                    // Color del estado - ✅ ACTUALIZADO: Cambió de columna 4 a 5
                    if (colNumber === 5) {
                        cell.font = { bold: true, color: { argb: colorEstado } };
                    }

                    // Formato del peso
                    if (colNumber === 2) {
                        cell.numFmt = '#,##0.0 "g"';
                    }

                    // ✅ NUEVO: Formato de la edad (columna 3)
                    if (colNumber === 3) {
                        cell.numFmt = '#,##0 "días"';
                    }
                });
            });

            // RESUMEN AL FINAL
            worksheet.addRow([]);
            const resumenRow = worksheet.addRow(['RESUMEN ESTADÍSTICO']);
            resumenRow.getCell(1).font = { size: 14, bold: true, color: { argb: colors.dark } };
            worksheet.mergeCells(`A${resumenRow.number}:F${resumenRow.number}`); // ✅ ACTUALIZADO: Cambió de E a F
            resumenRow.getCell(1).alignment = { horizontal: 'center' };

            const stats = getFilteredDailyStats();
            const aceptadas = filteredPesadas.filter(p => p.estado === 'aceptada').length;
            const rechazadas = filteredPesadas.filter(p => p.estado === 'rechazada').length;
            const descartadas = filteredPesadas.filter(p => p.estado === 'descartado').length;

            // ✅ NUEVO: Resumen con información de granja y edad
            worksheet.addRow(['Granja:', nombreGranja, '', 'Total pesadas:', filteredPesadas.length, '']);
            worksheet.addRow(['Edad promedio:', edadCamada ? `${edadCamada} días` : 'N/A', '', 'Peso medio aceptadas:', `${stats.peso_medio_aceptadas.toFixed(1)} g`, '']);
            worksheet.addRow(['Aceptadas:', aceptadas, '', 'Peso medio global:', `${stats.peso_medio_global.toFixed(1)} g`, '']);
            worksheet.addRow(['Rechazadas:', rechazadas, '', 'Coef. variación:', `${stats.coef_variacion ? stats.coef_variacion.toFixed(1) : '0.0'}%`, '']);
            worksheet.addRow(['Descartadas:', descartadas, '', '', '', '']);

            // ✅ ACTUALIZADO: Ajustar anchos de columna para nueva columna
            worksheet.getColumn(1).width = 15; // Dispositivo
            worksheet.getColumn(2).width = 12; // Peso
            worksheet.getColumn(3).width = 12; // Edad (nueva columna)
            worksheet.getColumn(4).width = 10; // Hora
            worksheet.getColumn(5).width = 12; // Estado
            worksheet.getColumn(6).width = 35; // Observaciones

            // ✅ MEJORADO: Nombre del archivo con granja y edad
            const nombreArchivoGranja = granjaSeleccionada ?
                granjaSeleccionada.nombre.replace(/\s+/g, '_') :
                'Granja';

            const fileName = `Pesadas_${nombreArchivoGranja}_${camadaInfo?.nombre_camada?.replace(/\s+/g, '_') || 'Camada'}_${edadCamada ? `${edadCamada}dias_` : ''}${fecha}_${new Date().toISOString().slice(0, 10)}.xlsx`;

            // Generar archivo y descargar
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();

            URL.revokeObjectURL(url);

            // Mostrar mensaje de éxito
            const prevError = error;
            setError('Listado de pesadas exportado con éxito a Excel');
            setTimeout(() => {
                if (error === 'Listado de pesadas exportado con éxito a Excel') {
                    setError(prevError);
                }
            }, 3000);

        } catch (err) {
            console.error('Error al generar Excel:', err);
            setError('Error al generar el archivo Excel: ' + err.message);
        }
    };


    const getStackedBarChartLayout = () => ({
        ...baseLayout,
        title: {
            text: 'Distribución de pesadas por franja horaria',
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Fecha',
                font: { size: 14, color: theme.text }
            },
            type: 'category',
            tickangle: -45,
            // ✅ NUEVO: Personalizar las etiquetas para incluir total de pesadas
            ticktext: pesadasRangoData ? pesadasRangoData.map(d => {
                const totalPesadas = d.pesadas ? d.pesadas.length : 0;
                return `${d.fecha}<br><span style="font-size: 10px; color: #666;">(${totalPesadas} pesadas)</span>`;
            }) : [],
            tickvals: pesadasRangoData ? pesadasRangoData.map((d, index) => index) : []
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'Nº de pesadas',
                font: { size: 14, color: theme.text }
            }
        },
        barmode: 'stack',
        bargap: 0.2,
        bargroupgap: 0.1,
        margin: {
            l: 60,    // Margen izquierdo
            r: 20,    // Margen derecho
            t: 50,    // Margen superior
            b: 120    // Aumentar el margen inferior para la leyenda (original era ~50)
        },

        // Mover la leyenda más abajo para que no se superponga
        legend: {
            orientation: 'h',    // Horizontal
            y: -0.50,           // Posicionarla más abajo (antes era -0.15)
            yanchor: 'top',     // Anclar desde arriba
            xanchor: 'center',  // Centrar horizontalmente
            x: 0.5,          // Posición horizontal en el centro
            traceorder: 'normal', // Orden normal de trazas
        }
    });

    const getStackedBarChartData = () => {
        if (!pesadasRangoData) return [];

        // Preparar los datos para las barras apiladas
        const fechas = pesadasRangoData.map(d => d.fecha);

        // ✅ NUEVO: Calcular totales por día para los porcentajes
        const totalesPorDia = pesadasRangoData.map(d => {
            return d.pesadas ? d.pesadas.length : 0;
        });

        // ✅ FUNCIÓN AUXILIAR: Calcular datos de franja con porcentajes
        const calcularDatosFranja = (horaInicio, horaFin, nombre) => {
            return pesadasRangoData.map((d, dayIndex) => {
                let count = 0;
                for (let h = horaInicio; h <= horaFin; h++) {
                    const hora = h.toString().padStart(2, '0');
                    count += d.pesadas_horarias[hora] || 0;
                }

                // Calcular porcentaje
                const totalDia = totalesPorDia[dayIndex];
                const porcentaje = totalDia > 0 ? ((count / totalDia) * 100).toFixed(1) : '0.0';

                return {
                    valor: count,
                    porcentaje: porcentaje,
                    fecha: d.fecha
                };
            });
        };

        // Crear un conjunto de datos para cada franja horaria
        const franja1Data = calcularDatosFranja(0, 5, '00-06');
        const franja2Data = calcularDatosFranja(6, 11, '06-12');
        const franja3Data = calcularDatosFranja(12, 17, '12-18');
        const franja4Data = calcularDatosFranja(18, 23, '18-24');

        const franja1 = {
            name: '00-06',
            type: 'bar',
            x: fechas,
            y: franja1Data.map(d => d.valor),
            marker: {
                color: isDarkMode ? '#FF6B6B' : '#FF6B6B', // Rojo
            },
            // ✅ NUEVO: Hover personalizado con porcentajes
            hovertemplate: '<b>Franja 00-06</b><br>' +
                'Fecha: %{x}<br>' +
                'Pesadas: %{y}<br>' +
                'Porcentaje: %{customdata}%<br>' +
                '<extra></extra>',
            customdata: franja1Data.map(d => d.porcentaje)
        };

        const franja2 = {
            name: '06-12',
            type: 'bar',
            x: fechas,
            y: franja2Data.map(d => d.valor),
            marker: {
                color: isDarkMode ? '#FFD166' : '#FFD166', // Amarillo
            },
            hovertemplate: '<b>Franja 06-12</b><br>' +
                'Fecha: %{x}<br>' +
                'Pesadas: %{y}<br>' +
                'Porcentaje: %{customdata}%<br>' +
                '<extra></extra>',
            customdata: franja2Data.map(d => d.porcentaje)
        };

        const franja3 = {
            name: '12-18',
            type: 'bar',
            x: fechas,
            y: franja3Data.map(d => d.valor),
            marker: {
                color: isDarkMode ? '#06D6A0' : '#06D6A0', // Verde
            },
            hovertemplate: '<b>Franja 12-18</b><br>' +
                'Fecha: %{x}<br>' +
                'Pesadas: %{y}<br>' +
                'Porcentaje: %{customdata}%<br>' +
                '<extra></extra>',
            customdata: franja3Data.map(d => d.porcentaje)
        };

        const franja4 = {
            name: '18-24',
            type: 'bar',
            x: fechas,
            y: franja4Data.map(d => d.valor),
            marker: {
                color: isDarkMode ? '#118AB2' : '#118AB2', // Azul
            },
            hovertemplate: '<b>Franja 18-24</b><br>' +
                'Fecha: %{x}<br>' +
                'Pesadas: %{y}<br>' +
                'Porcentaje: %{customdata}%<br>' +
                '<extra></extra>',
            customdata: franja4Data.map(d => d.porcentaje)
        };

        return [franja1, franja2, franja3, franja4];
    };

    // 5. Gráfico de comparación de distribuciones
    const getDistributionComparisonLayout = () => ({
        ...baseLayout,
        title: {
            text: `Comparativa: ${dateToCompare1} vs ${dateToCompare2}`,
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Peso (g)',
                font: { size: 14, color: theme.text }
            },
            type: 'linear'
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'Frecuencia',
                font: { size: 14, color: theme.text }
            }
        },
        barmode: 'overlay',
        bargap: 0.1,
        legend: {
            orientation: 'h',
            y: -0.2
        }
    });

    const getDistributionComparisonData = () => {
        if (!pesadasRangoData || !dateToCompare1 || !dateToCompare2) return [];

        // Encontrar los datos para las fechas seleccionadas
        const data1 = pesadasRangoData.find(d => d.fecha === dateToCompare1);
        const data2 = pesadasRangoData.find(d => d.fecha === dateToCompare2);

        if (!data1 || !data2) return [];

        // Extraer los pesos de cada día
        const weights1 = data1.pesadas.map(p => p.valor);
        const weights2 = data2.pesadas.map(p => p.valor);

        // Crear bins (intervalos) para el histograma
        const allWeights = [...weights1, ...weights2];
        const min = Math.min(...allWeights) - 0.1;
        const max = Math.max(...allWeights) + 0.1;

        // Generar datos para el histograma
        return [
            {
                type: 'histogram',
                x: weights1,
                name: dateToCompare1,
                opacity: 0.6,
                marker: {
                    color: theme.primary,
                },
                xbins: {
                    start: min,
                    end: max,
                    size: (max - min) / 15 // Dividir en aproximadamente 15 bins
                },
                autobinx: false,
                histnorm: 'probability', // Normalizar para facilitar la comparación
            },
            {
                type: 'histogram',
                x: weights2,
                name: dateToCompare2,
                opacity: 0.6,
                marker: {
                    color: theme.secondary,
                },
                xbins: {
                    start: min,
                    end: max,
                    size: (max - min) / 15
                },
                autobinx: false,
                histnorm: 'probability',
            }
        ];
    };

    // 6. Gráfico de pronóstico con curva de referencia
    // Función mejorada para cálculo de pronósticos



    const getForecastData = () => {
        if (!pesadasRangoData || pesadasRangoData.length <= 2) return [];

        const cleanedData = cleanAndCorrectDataWithReference(pesadasRangoData);

        // Obtener fechas y pesos medios reales ordenados cronológicamente
        const sortedData = [...cleanedData].sort((a, b) =>
            new Date(a.fecha) - new Date(b.fecha)
        );

        const dates = sortedData.map(d => new Date(d.fecha));
        const weights = sortedData.map(d => d.peso_medio_aceptadas);

        // Preparar datos originales para el gráfico
        const originalData = {
            type: 'scatter',
            mode: 'markers',
            x: dates,
            y: weights,
            name: 'Datos reales',
            marker: {
                color: theme.primary,
                size: 8,
                line: {
                    color: isDarkMode ? theme.bg : 'white',
                    width: 1
                }
            }
        };

        // Conectar los puntos de datos reales con una línea
        const connectingLine = {
            type: 'scatter',
            mode: 'lines',
            x: dates,
            y: weights,
            name: 'Tendencia actual',
            line: {
                color: theme.primary,
                width: 2,
            },
            showlegend: false
        };

        // === NUEVO ALGORITMO HÍBRIDO ===

        const lastDate = dates[dates.length - 1];
        const lastWeight = weights[weights.length - 1];

        const forecastDates = [];
        const forecastValues = [];


        // FUNCIÓN: Calcular próxima ganancia basada en aceleración histórica
        function calculateAcceleratedGain(historicalWeights, historicalDates) {
            if (historicalWeights.length < 3) {
                // Si no hay suficientes datos, usar la última ganancia
                return historicalWeights[historicalWeights.length - 1] - historicalWeights[historicalWeights.length - 2];
            }

            // 1. Calcular todas las ganancias diarias históricas
            const dailyGains = [];
            for (let i = 1; i < historicalWeights.length; i++) {
                const daysBetween = (historicalDates[i] - historicalDates[i - 1]) / (1000 * 60 * 60 * 24);
                if (daysBetween > 0) {
                    const dailyGain = (historicalWeights[i] - historicalWeights[i - 1]) / daysBetween;
                    dailyGains.push(dailyGain);
                }
            }


            // 2. Detectar aceleración en las ganancias
            if (dailyGains.length >= 3) {
                const accelerations = [];
                for (let i = 1; i < dailyGains.length; i++) {
                    accelerations.push(dailyGains[i] - dailyGains[i - 1]);
                }

                // Calcular aceleración promedio (con más peso a datos recientes)
                let weightedAccelSum = 0;
                let totalWeight = 0;

                accelerations.forEach((accel, index) => {
                    const weight = Math.exp((index + 1) / accelerations.length * 2);
                    weightedAccelSum += accel * weight;
                    totalWeight += weight;
                });

                const averageAcceleration = weightedAccelSum / totalWeight;
                const lastGain = dailyGains[dailyGains.length - 1];


                // Proyectar siguiente ganancia con aceleración
                const nextAcceleratedGain = lastGain + averageAcceleration;


                return Math.max(0, nextAcceleratedGain); // No permitir ganancias negativas
            }

            // Fallback: usar ganancia promedio ponderada
            let weightedSum = 0;
            let totalWeight = 0;

            dailyGains.forEach((gain, index) => {
                const weight = Math.exp((index + 1) / dailyGains.length * 2);
                weightedSum += gain * weight;
                totalWeight += weight;
            });

            return weightedSum / totalWeight;
        }

        // FUNCIÓN: Obtener ganancia esperada de la referencia para una edad específica
        function getReferenceGain(currentAge, sexaje) {
            if (!referenceData || !referenceData.length) return null;

            const currentRefData = referenceData.find(d => d.edad === currentAge);
            const nextRefData = referenceData.find(d => d.edad === currentAge + 1);

            if (currentRefData && nextRefData) {
                const expectedGain = nextRefData[sexaje] - currentRefData[sexaje];
                return expectedGain;
            }

            return null;
        }

        // Preparar array con todos los puntos (reales + pronósticos)
        const allPoints = [...weights];
        const allDates = [...dates];

        // === BUCLE DE PRONÓSTICO DÍA A DÍA ===
        for (let i = 1; i <= forecastDays; i++) {
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + i);

            const currentWeight = allPoints[allPoints.length - 1];


            // 1. CALCULAR GANANCIA ACELERADA basada en histórico
            const acceleratedGain = calculateAcceleratedGain(allPoints, allDates);
            const acceleratedNextWeight = currentWeight + acceleratedGain;


            // 2. OBTENER GANANCIA ESPERADA de la referencia
            let referenceGain = null;
            let referenceNextWeight = null;

            if (referenceData && camadaInfo) {
                const currentAge = calculateCamadaAge(lastDate) + i - 1; // Edad para el día actual del pronóstico
                const sexaje = getCamadaSexaje();

                referenceGain = getReferenceGain(currentAge, sexaje);

                if (referenceGain !== null) {
                    referenceNextWeight = currentWeight + referenceGain;
                }
            }

            // 3. CALCULAR PESO FINAL mediante media ponderada
            let finalWeight;

            if (referenceGain !== null) {
                // === MEDIA PONDERADA ENTRE ACELERADO Y REFERENCIA ===

                // Factores de ponderación (ajustables según necesidad)
                const acceleratedWeight_factor = 0.7;  // 70% peso a datos acelerados
                const referenceWeight_factor = 0.3;    // 30% peso a referencia

                finalWeight = (acceleratedNextWeight * acceleratedWeight_factor) +
                    (referenceNextWeight * referenceWeight_factor);


            } else {
                // Sin referencia disponible, usar solo aceleración
                finalWeight = acceleratedNextWeight;
            }

            // 4. AÑADIR el nuevo punto a nuestros arrays
            allPoints.push(finalWeight);
            allDates.push(nextDate);
            forecastValues.push(finalWeight);
            forecastDates.push(nextDate);

        }


        // Crear la línea de pronóstico
        const forecastLine = {
            type: 'scatter',
            mode: 'lines+markers',
            x: forecastDates,
            y: forecastValues,
            name: 'Pronóstico híbrido',
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


        // Añadir curva de referencia si está habilitada
        if (showReference && referenceData && camadaInfo) {
            const sexaje = getCamadaSexaje();
            const currentAge = calculateCamadaAge(lastDate);

            if (currentAge !== null) {
                const refDates = [];
                const refWeights_ref = [];
                const pastDaysToShow = 7;
                const oldestDate = new Date(Math.min(...dates.map(d => d.getTime())));
                const oldestAge = calculateCamadaAge(oldestDate);
                const startAge = Math.max(0, oldestAge - pastDaysToShow);

                for (let age = startAge; age <= currentAge + forecastDays; age++) {
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
            lastWeight: lastWeight,
            referenceData: showReference && referenceData && camadaInfo ? {
                sexaje: getCamadaSexaje(),
                weights: (() => {
                    // Generar array de pesos de referencia para los días pronosticados
                    const currentAge = calculateCamadaAge(lastDate);
                    const sexaje = getCamadaSexaje();
                    const refWeights = [];


                    if (currentAge !== null) {
                        for (let dayOffset = 1; dayOffset <= forecastDays; dayOffset++) {
                            const futureAge = currentAge + dayOffset;
                            const refData = referenceData.find(d => d.edad === futureAge);

                            if (refData) {
                                refWeights.push(refData[sexaje]);
                            } else {
                                // Si no hay datos para esa edad, usar extrapolación o el último valor
                                if (refWeights.length > 0) {
                                    refWeights.push(refWeights[refWeights.length - 1]);
                                }
                            }
                        }
                    }

                    return refWeights; // Array de números puros [256, 294, 336, 381, 429]
                })()
            } : null
        };
    };

    const getForecastLayout = () => ({
        ...baseLayout,
        title: {
            text: `Pronóstico de peso para los próximos ${forecastDays} días`,
            font: { size: 18, color: theme.text }
        },
        xaxis: {
            ...baseLayout.xaxis,
            title: {
                text: 'Fecha',
                font: { size: 14, color: theme.text }
            },
            type: 'date',
            tickformat: '%d/%m/%Y'
        },
        yaxis: {
            ...baseLayout.yaxis,
            title: {
                text: 'Peso (g)',
                font: { size: 14, color: theme.text }
            }
        },
        legend: {
            x: 0,
            y: 1.1,
            orientation: 'h'
        }
    });

    // ———————————————————————————————————————————————————
    // COMPONENTES JSX PARA FUNCIONALIDADES
    // ———————————————————————————————————————————————————

    // JSX para el selector de comparación entre fechas
    const renderDateComparisonSelector = () => (
        <div className="p-6 bg-white dark:bg-gray-800 rounded shadow mt-8">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                Comparar distribución de pesos entre fechas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                        Primera fecha
                    </label>
                    <select
                        className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                        value={dateToCompare1}
                        onChange={e => setDateToCompare1(e.target.value)}
                    >
                        <option value="">-- Seleccione --</option>
                        {pesadasRangoData && pesadasRangoData.map(d => (
                            <option key={`date1-${d.fecha}`} value={d.fecha}>
                                {d.fecha}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                        Segunda fecha
                    </label>
                    <select
                        className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                        value={dateToCompare2}
                        onChange={e => setDateToCompare2(e.target.value)}
                    >
                        <option value="">-- Seleccione --</option>
                        {pesadasRangoData && pesadasRangoData.map(d => (
                            <option key={`date2-${d.fecha}`} value={d.fecha}>
                                {d.fecha}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-end">
                    <button
                        onClick={handleCompareDistributions}
                        disabled={!dateToCompare1 || !dateToCompare2}
                        className="w-full py-2 px-4 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-500 disabled:text-gray-200"
                    >
                        Comparar distribuciones
                    </button>
                </div>
            </div>

            {comparingDates && (
                <div className="h-80 mt-4">
                    <Plot
                        data={getDistributionComparisonData()}
                        layout={getDistributionComparisonLayout()}
                        config={baseConfig}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            )}

            {comparingDates && (
                <div className="mt-4">
                    <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Análisis comparativo</h4>

                        {(() => {
                            // Encontrar los datos para las fechas seleccionadas
                            const data1 = pesadasRangoData.find(d => d.fecha === dateToCompare1);
                            const data2 = pesadasRangoData.find(d => d.fecha === dateToCompare2);

                            if (!data1 || !data2) return <p>No hay datos suficientes para el análisis</p>;

                            const avgDiff = data2.peso_medio_aceptadas - data1.peso_medio_aceptadas;
                            const cvDiff = data2.coef_variacion - data1.coef_variacion;

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h5 className="font-medium text-gray-700 dark:text-gray-300">Pesos medios:</h5>
                                        <ul className="list-disc pl-5 mt-2 space-y-1">
                                            <li className="text-gray-600 dark:text-gray-400">
                                                {dateToCompare1}: <span className="font-semibold">{data1.peso_medio_aceptadas.toFixed(1)} g</span>
                                            </li>
                                            <li className="text-gray-600 dark:text-gray-400">
                                                {dateToCompare2}: <span className="font-semibold">{data2.peso_medio_aceptadas.toFixed(1)} g</span>
                                            </li>
                                            <li className={avgDiff > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                                Diferencia: <span className="font-semibold">{avgDiff > 0 ? '+' : ''}{avgDiff.toFixed(1)} g</span>
                                                {" "}({((avgDiff / data1.peso_medio_aceptadas) * 100).toFixed(1)}%)
                                            </li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h5 className="font-medium text-gray-700 dark:text-gray-300">Coeficientes de variación:</h5>
                                        <ul className="list-disc pl-5 mt-2 space-y-1">
                                            <li className="text-gray-600 dark:text-gray-400">
                                                {dateToCompare1}: <span className="font-semibold">{data1.coef_variacion.toFixed(1)}%</span>
                                            </li>
                                            <li className="text-gray-600 dark:text-gray-400">
                                                {dateToCompare2}: <span className="font-semibold">{data2.coef_variacion.toFixed(1)}%</span>
                                            </li>
                                            <li className={cvDiff < 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                                Diferencia: <span className="font-semibold">{cvDiff > 0 ? '+' : ''}{cvDiff.toFixed(1)}%</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                            <p>
                                Este análisis te permite comparar las distribuciones de peso entre dos fechas distintas para
                                evaluar cambios en el patrón de crecimiento, homogeneidad del lote y posibles anomalías.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderEnhancedCards = () => {
        const filteredStats = getFilteredDailyStats();
        const enhancedInfo = getEnhancedCardInfo();

        // ✅ EVALUACIONES SEGÚN LA TABLA DE REFERENCIA
        const uniformityEval = getUniformityEvaluation(enhancedInfo?.uniformidad || 0);
        const cvEval = getCoefficientVariationEvaluation(filteredStats.coef_variacion || 0);
        const filteredPesadas = getFilteredDailyPesadas();

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Tarjeta de Total pesadas */}
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total pesadas</p>
                    <p className="mt-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
                        {filteredPesadas.length}
                    </p>
                </div>

                {/* ✅ NUEVA: Tarjeta combinada de Aceptadas y Rechazadas */}
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Aceptadas / Rechazadas</p>
                    <div className="mt-2 flex items-center justify-between">
                        <div className="text-center">
                            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                                {filteredStats.aceptadas}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">Aceptadas</p>
                        </div>
                        <div className="text-gray-400 text-lg">/</div>
                        <div className="text-center">
                            <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                                {filteredStats.rechazadas_homogeneidad}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">Rechazadas</p>
                        </div>
                    </div>
                </div>

                {/* Tarjeta de Peso medio */}
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Peso medio aceptadas</p>
                    <p className="mt-2 text-xl font-semibold text-blue-600 dark:text-blue-400">
                        {filteredStats.peso_medio_aceptadas.toFixed(1)} g
                    </p>
                    {enhancedInfo?.pesoObjetivo && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Objetivo: {enhancedInfo.pesoObjetivo}g
                        </p>
                    )}
                </div>

                {/* Tarjeta de Edad */}
                {enhancedInfo?.edad !== null && (
                    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Edad camada</p>
                        <p className="mt-2 text-xl font-semibold text-purple-600 dark:text-purple-400">
                            {enhancedInfo.edad} días
                        </p>
                    </div>
                )}

                {/* ✅ NUEVA: Tarjeta de Coeficiente de Variación con semicírculo */}
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <SemicirculoGauge
                        valor={parseFloat((filteredStats.coef_variacion || 0).toFixed(1))}
                        minimo={0}
                        maximo={20}
                        unidad="%"
                        color={cvEval.color}
                        titulo="Coef. Variación"
                        size={100}
                    />
                    <div className="text-center mt-2">
                        <p className="text-xs" style={{ color: cvEval.color }}>
                            {cvEval.text}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Rango: {cvEval.range}
                        </p>
                    </div>
                </div>

                {/* Tarjeta de Uniformidad con semicírculo */}
                {enhancedInfo?.uniformidad !== null && (
                    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                        <SemicirculoGauge
                            valor={parseFloat(enhancedInfo.uniformidad.toFixed(1))}
                            minimo={0}
                            maximo={100}
                            unidad="%"
                            color={uniformityEval.color}
                            titulo="Uniformidad"
                            size={100}
                        />
                        <div className="text-center mt-2">
                            <p className="text-xs" style={{ color: uniformityEval.color }}>
                                {uniformityEval.text}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Rango: {uniformityEval.range}
                            </p>
                        </div>
                    </div>
                )}

                {/* Tarjeta de Tramo homogeneidad (solo si hay coeficiente) - ahora ocupa el ancho completo disponible */}
                {coef !== '' && (
                    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow xl:col-span-6 lg:col-span-3 md:col-span-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Tramo homog. aceptado</p>
                        <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                            {filteredStats.tramo_aceptado.min.toFixed(1)} — {filteredStats.tramo_aceptado.max.toFixed(1)} g
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            ±{coef}% del peso medio global
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const renderEnhancedTable = () => {
        const filteredPesadas = getFilteredDailyPesadas();

        return (
            <div className="rounded shadow bg-white dark:bg-gray-800">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        {selectedDeviceForDaily === 'todos'
                            ? `Listado de pesadas totales (${filteredPesadas.length})`
                            : `Pesadas del dispositivo ${selectedDeviceForDaily} (${filteredPesadas.length})`
                        }
                    </h3>
                    <button
                        onClick={generateExcelPesadasIndividuales}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center text-sm"
                        disabled={!filteredPesadas || filteredPesadas.length === 0}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Exportar a Excel
                    </button>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Excluye valores negativos y menores de 30g • Ordenado por hora más reciente
                    </p>
                </div>

                {/* Contenedor con scroll limitado en altura */}
                <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                            <tr>
                                <th className="py-3 px-4 text-left text-gray-800 dark:text-gray-200 font-semibold">
                                    #
                                </th>
                                <th className="py-3 px-4 text-left text-gray-800 dark:text-gray-200 font-semibold">
                                    Dispositivo
                                </th>
                                <th className="py-3 px-4 text-left text-gray-800 dark:text-gray-200 font-semibold">
                                    Peso (g)
                                </th>
                                <th className="py-3 px-4 text-left text-gray-800 dark:text-gray-200 font-semibold">
                                    Fecha y Hora
                                </th>
                                <th className="py-3 px-4 text-left text-gray-800 dark:text-gray-200 font-semibold">
                                    Estado
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredPesadas.map((row, idx) => {
                                let rowClass = 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';
                                let statusClass = '';
                                let statusIcon = '';

                                if (row.estado === 'aceptada') {
                                    rowClass += ' bg-green-50 dark:bg-green-900/20';
                                    statusClass = 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900';
                                    statusIcon = '✓';
                                } else if (row.estado === 'rechazada') {
                                    rowClass += ' bg-red-50 dark:bg-red-900/20';
                                    statusClass = 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900';
                                    statusIcon = '✗';
                                } else if (row.estado === 'descartado') {
                                    rowClass += ' bg-gray-50 dark:bg-gray-700/20';
                                    statusClass = 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700';
                                    statusIcon = '—';
                                }

                                return (
                                    <tr key={`${row.id_dispositivo}-${idx}`} className={rowClass}>
                                        <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400 font-mono">
                                            {idx + 1}
                                        </td>
                                        <td className="py-2 px-4 text-gray-800 dark:text-gray-200">
                                            <span className="font-mono text-sm">
                                                {row.id_dispositivo}
                                            </span>
                                        </td>
                                        <td className="py-2 px-4 text-gray-800 dark:text-gray-200">
                                            <span className="font-semibold">
                                                {Number(row.valor).toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="py-2 px-4 text-gray-800 dark:text-gray-200 text-sm">
                                            {new Date(row.fecha).toLocaleString('es-ES', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit'
                                            })}
                                        </td>
                                        <td className="py-2 px-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                                                <span className="mr-1">{statusIcon}</span>
                                                {row.estado}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Mensaje cuando no hay datos */}
                    {filteredPesadas.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <p>No hay pesadas válidas para mostrar con los filtros seleccionados</p>
                            <p className="text-sm mt-1">Se excluyen valores negativos y menores de 30g</p>
                        </div>
                    )}
                </div>

                {/* Footer con información de scroll */}
                {filteredPesadas.length > 10 && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            ↕ Desplace verticalmente para ver todas las pesadas ({filteredPesadas.length} total válidas)
                        </p>
                    </div>
                )}
            </div>
        );
    };

    // JSX para el componente de pronóstico mejorado
    const renderForecastComponent = () => {

        if (!camadaInfo || !referenceData) {
            return (
                <div className="p-4 text-center text-gray-500">
                    Cargando información de referencia…
                </div>
            );
        }
        // Calcular comparación con referencia
        const comparison = calculateComparison();

        // Obtener el sexaje del lote
        const sexaje = getCamadaSexaje();


        // Nueva función para calcular cuándo se alcanzará un peso específico
        const renderWeightPrediction = () => {
            // Función para calcular en qué día se alcanzará el peso objetivo
            const calculateDaysToWeight = () => {
                if (!targetWeight || isNaN(parseInt(targetWeight)) || parseInt(targetWeight) <= 0) {
                    setPredictionError('Por favor, introduce un peso válido mayor que cero');
                    setWeightPrediction(null);
                    return;
                }

                // Convertir a número
                const weightTarget = parseInt(targetWeight);

                // Obtener los datos de pronóstico
                const forecastResult = getForecastData();
                if (!forecastResult || !forecastResult.forecastValues || forecastResult.forecastValues.length === 0) {
                    setPredictionError('No hay suficientes datos para realizar la predicción');
                    setWeightPrediction(null);
                    return;
                }

                // Obtener el último peso registrado (punto de partida)
                const lastWeight = forecastResult.lastWeight;
                const lastDate = forecastResult.lastDate;

                // Si el peso objetivo ya se ha alcanzado o superado
                if (lastWeight >= weightTarget) {
                    setWeightPrediction({
                        days: 0,
                        date: new Date(lastDate),
                        message: 'El peso objetivo ya se ha alcanzado',
                        exactMatch: false,
                        actualWeight: lastWeight
                    });
                    setPredictionError('');
                    return;
                }

                // Buscar en los valores de pronóstico
                let dayFound = -1;
                let exactMatch = false;
                let closestDay = -1;
                let closestWeight = 0;

                // Recorrer los valores pronosticados para encontrar cuándo se alcanza el peso
                for (let i = 0; i < forecastResult.forecastValues.length; i++) {
                    const projectedWeight = forecastResult.forecastValues[i];

                    // Si encontramos un valor exacto o que supera el objetivo
                    if (projectedWeight >= weightTarget) {
                        dayFound = i + 1; // +1 porque el día 0 es el actual
                        exactMatch = projectedWeight === weightTarget;
                        break;
                    }

                    // Guardar el día más cercano (para usarlo si no se alcanza el objetivo)
                    if (projectedWeight > closestWeight) {
                        closestWeight = projectedWeight;
                        closestDay = i + 1;
                    }
                }

                // Si encontramos el día
                if (dayFound !== -1) {
                    const predictionDate = new Date(lastDate);
                    predictionDate.setDate(lastDate.getDate() + dayFound);

                    setWeightPrediction({
                        days: dayFound,
                        date: predictionDate,
                        message: `Peso objetivo alcanzado en ${dayFound} días`,
                        exactMatch: exactMatch,
                        actualWeight: forecastResult.forecastValues[dayFound - 1]
                    });
                    setPredictionError('');
                }
                // Si no se alcanza en el período pronosticado
                else {
                    // Calcular la tasa de crecimiento diaria promedio usando los últimos valores
                    const lastValues = forecastResult.forecastValues.slice(-3);
                    if (lastValues.length < 2) {
                        setPredictionError('No se puede estimar cuándo se alcanzará este peso');
                        setWeightPrediction(null);
                        return;
                    }

                    // Calcular tasa promedio de crecimiento diario
                    const avgDailyGrowth = (lastValues[lastValues.length - 1] - lastValues[lastValues.length - 2]);

                    // Si la tasa es negativa o demasiado pequeña
                    if (avgDailyGrowth <= 0 || avgDailyGrowth < 1) {
                        setPredictionError('Con la tendencia actual, no se alcanzará el peso objetivo');
                        setWeightPrediction(null);
                        return;
                    }

                    // Calcular días adicionales necesarios
                    const lastPredictedWeight = forecastResult.forecastValues[forecastResult.forecastValues.length - 1];
                    const remainingWeight = weightTarget - lastPredictedWeight;
                    const additionalDays = Math.ceil(remainingWeight / avgDailyGrowth);
                    const totalDays = forecastResult.forecastValues.length + additionalDays;

                    const predictionDate = new Date(lastDate);
                    predictionDate.setDate(lastDate.getDate() + totalDays);

                    // Si es una estimación razonable (menos de 100 días)
                    if (totalDays <= 100) {
                        setWeightPrediction({
                            days: totalDays,
                            date: predictionDate,
                            message: `Peso objetivo estimado en ${totalDays} días (extrapolación)`,
                            exactMatch: false,
                            actualWeight: lastPredictedWeight + (additionalDays * avgDailyGrowth),
                            isEstimation: true
                        });
                        setPredictionError('');
                    } else {
                        setPredictionError('El peso objetivo está demasiado lejos para una estimación confiable');
                        setWeightPrediction(null);
                    }
                }
            };

            return (
                <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border border-blue-100 dark:border-blue-900 mt-4">
                    <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Predicción de fecha según peso objetivo
                    </h5>

                    <div className="flex flex-col space-y-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex-grow">
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Indique el peso objetivo a alcanzar (g)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Ej: 2500"
                                    value={targetWeight}
                                    onChange={(e) => {
                                        setTargetWeight(e.target.value);
                                        // Limpiar resultados anteriores
                                        setWeightPrediction(null);
                                        setPredictionError('');
                                    }}
                                    className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                />
                            </div>

                            <button
                                onClick={calculateDaysToWeight}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                            >
                                Calcular fecha
                            </button>
                        </div>

                        {predictionError && (
                            <div className="bg-red-50 dark:bg-red-900 p-3 rounded text-red-700 dark:text-red-300">
                                <p>{predictionError}</p>
                            </div>
                        )}

                        {weightPrediction && (
                            <div className="bg-green-50 dark:bg-green-900 p-4 rounded">
                                <h6 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                                    Resultado de la predicción
                                </h6>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-gray-700 dark:text-gray-300">
                                            <span className="font-medium">Peso objetivo:</span> {targetWeight} g
                                        </p>
                                        <p className="text-gray-700 dark:text-gray-300">
                                            <span className="font-medium">Días necesarios:</span> {weightPrediction.days}
                                        </p>
                                        {weightPrediction.isEstimation && (
                                            <p className="text-yellow-600 dark:text-yellow-400 text-sm italic mt-1">
                                                * Estimación basada en extrapolación
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-gray-700 dark:text-gray-300">
                                            <span className="font-medium">Fecha estimada:</span> {weightPrediction.date.toLocaleDateString()}
                                        </p>
                                        <p className="text-gray-700 dark:text-gray-300">
                                            <span className="font-medium">Peso proyectado:</span> {Math.round(weightPrediction.actualWeight)} g
                                            {weightPrediction.exactMatch ? ' (exacto)' : ''}
                                        </p>
                                    </div>
                                </div>

                                {weightPrediction.days === 0 ? (
                                    <div className="mt-3 text-sm bg-blue-50 dark:bg-blue-900 p-2 rounded text-blue-700 dark:text-blue-300">
                                        El lote ya ha alcanzado o superado el peso objetivo.
                                    </div>
                                ) : (
                                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                                        Según las proyecciones actuales, el lote alcanzará el peso objetivo de {targetWeight} g
                                        en {weightPrediction.days} días, aproximadamente el {weightPrediction.date.toLocaleDateString()}.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        };

        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded shadow mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Pronóstico de crecimiento
                    </h3>
                    <div className="flex space-x-2">
                        <button
                            onClick={generateExcel}
                            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Exportar a Excel
                        </button>
                        <button
                            onClick={() => setShowForecast(!showForecast)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
                        >
                            {showForecast ? 'Ocultar pronóstico' : 'Mostrar pronóstico'}
                        </button>
                    </div>
                </div>

                {showForecast && (
                    <>
                        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                                    Días a pronosticar:
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="range"
                                        min="1"
                                        max="30"
                                        value={forecastDays}
                                        onChange={(e) => setForecastDays(parseInt(e.target.value))}
                                        className="w-full max-w-md mr-4"
                                    />
                                    <span className="text-gray-800 dark:text-gray-200 w-10 text-center">
                                        {forecastDays}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-end">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={showReference}
                                        onChange={(e) => setShowReference(e.target.checked)}
                                        className="mr-2"
                                    />
                                    <span className="font-medium text-gray-800 dark:text-gray-200">
                                        Mostrar curva de referencia ({sexaje})
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="h-80">
                            <Plot
                                data={getForecastData().graphData}
                                layout={getForecastLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>

                        {comparison && (
                            <div className="mt-6 bg-yellow-50 dark:bg-yellow-900 p-4 rounded">
                                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                                    Comparación con curva de referencia
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    {/* Estado actual */}
                                    <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Estado actual</h5>
                                        <p className={`text-lg font-bold ${comparison.current.statusColor}`}>
                                            {comparison.current.status}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            Edad: {comparison.current.age} días
                                        </p>
                                    </div>

                                    {/* Comparación actual */}
                                    <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Peso actual vs. referencia
                                        </h5>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Actual:</span>
                                            <span className="font-semibold">{comparison.current.weight.toFixed(0)} g</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Referencia:</span>
                                            <span className="font-semibold">{comparison.current.reference} g</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Diferencia:</span>
                                            <span className={`font-semibold ${comparison.current.statusColor}`}>
                                                {comparison.current.deviation > 0 ? '+' : ''}
                                                {comparison.current.deviation.toFixed(0)} g
                                                ({comparison.current.deviationPercent.toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Proyección */}

                                </div>

                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <p>
                                        La comparación con la curva de referencia muestra cómo se está desarrollando el lote en
                                        comparación con el crecimiento esperado para aves {sexaje.toLowerCase()}. La curva de
                                        referencia se basa en la tabla estándar de crecimiento para este tipo de aves.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Valores proyectados */}
                            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                                <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Valores proyectados</h5>
                                <div className="space-y-2">
                                    {(() => {
                                        if (!pesadasRangoData || pesadasRangoData.length <= 1) {
                                            return <p>Datos insuficientes para proyección</p>;
                                        }

                                        // Obtener datos ordenados cronológicamente (igual que en getForecastData)
                                        const sortedData = [...pesadasRangoData].sort((a, b) =>
                                            new Date(a.fecha) - new Date(b.fecha)
                                        );

                                        const dates = sortedData.map(d => new Date(d.fecha));
                                        const weights = sortedData.map(d => d.peso_medio_aceptadas);

                                        // Necesitamos acceder a la última fecha y peso
                                        const lastDate = dates[dates.length - 1];
                                        const lastWeight = weights[weights.length - 1];

                                        // Calcular las tasas de crecimiento diario entre cada par de puntos
                                        const growthRates = [];
                                        for (let i = 1; i < weights.length; i++) {
                                            const daysDiff = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
                                            if (daysDiff > 0) {
                                                const ratePerDay = (weights[i] - weights[i - 1]) / daysDiff;
                                                growthRates.push({
                                                    rate: ratePerDay,
                                                    date: dates[i],
                                                    days: daysDiff
                                                });
                                            }
                                        }

                                        // Determinar tasa de crecimiento ponderada (igual que en getForecastData)
                                        let avgGrowthRate;

                                        if (growthRates.length > 0) {
                                            // Ponderación de tasas recientes
                                            let weightSum = 0;
                                            let weightedRateSum = 0;

                                            for (let i = 0; i < growthRates.length; i++) {
                                                // Mayor peso a datos recientes
                                                const weight = Math.exp(i / 2);
                                                weightSum += weight;
                                                weightedRateSum += growthRates[growthRates.length - 1 - i].rate * weight;
                                            }

                                            avgGrowthRate = weightedRateSum / weightSum;
                                        } else {
                                            // Calcular regresión lineal como respaldo
                                            const regression = calculateLinearRegression(
                                                dates.map(d => d.toISOString()),
                                                weights
                                            );

                                            avgGrowthRate = regression ? regression.slope : 0;
                                        }

                                        // Ajuste de la tasa según edad si tenemos info de la camada (igual que en getForecastData)
                                        let adjustedGrowthRate = avgGrowthRate;

                                        if (camadaInfo && referenceData) {
                                            const currentAge = calculateCamadaAge(lastDate);

                                            if (currentAge !== null) {
                                                // Ajuste basado en la edad
                                                if (currentAge < 7) {
                                                    // Etapa inicial: crecimiento acelerado
                                                    adjustedGrowthRate = avgGrowthRate * 1.05;
                                                } else if (currentAge > 14) {
                                                    // Etapa tardía: crecimiento desacelerado
                                                    adjustedGrowthRate = avgGrowthRate * 0.95;
                                                }
                                            }
                                        }

                                        // Verificar si los datos históricos están alineados con la referencia
                                        let alignmentWithReference = 1.0; // Factor de alineación predeterminado
                                        let useReferenceCurve = false;

                                        if (referenceData && camadaInfo) {
                                            const sexaje = getCamadaSexaje();
                                            const deviations = [];

                                            // Calcular las desviaciones respecto a la referencia para cada punto de datos
                                            for (let i = 0; i < dates.length; i++) {
                                                const age = calculateCamadaAge(dates[i]);
                                                if (age !== null) {
                                                    const refData = referenceData.find(d => d.edad === age);
                                                    if (refData) {
                                                        const refWeight = refData[sexaje];
                                                        const deviation = Math.abs((weights[i] - refWeight) / refWeight);
                                                        deviations.push(deviation);
                                                    }
                                                }
                                            }

                                            // Si tenemos suficientes puntos para comparar con la referencia
                                            if (deviations.length >= 3) {
                                                // Calcular la desviación promedio respecto a la referencia
                                                const avgDeviation = deviations.reduce((sum, val) => sum + val, 0) / deviations.length;

                                                // Calcular especialmente la desviación de los últimos puntos (más importantes)
                                                const recentDeviations = deviations.slice(-3); // últimos 3 puntos
                                                const avgRecentDeviation = recentDeviations.reduce((sum, val) => sum + val, 0) / recentDeviations.length;

                                                // Mismo criterio que en getForecastData para determinar si usar la curva de referencia
                                                if (avgDeviation < 0.05) { // Menos del 5% de desviación
                                                    alignmentWithReference = 0.8; // 80% referencia, 20% observado
                                                    useReferenceCurve = true;
                                                } else if (avgDeviation < 0.10) { // Menos del 10% de desviación
                                                    alignmentWithReference = 0.7; // 70% referencia, 30% observado
                                                    useReferenceCurve = true;
                                                } else if (avgDeviation < 0.15) { // Menos del 15% de desviación
                                                    alignmentWithReference = 0.6; // 60% referencia, 40% observado
                                                    useReferenceCurve = true;
                                                } else if (avgRecentDeviation < 0.10) { // Si al menos los puntos recientes están cerca
                                                    alignmentWithReference = 0.5; // 50% referencia, 50% observado
                                                    useReferenceCurve = true;
                                                }
                                            }
                                        }

                                        // Función para calcular proyecciones usando la misma lógica que en getForecastData
                                        const calculateProjection = (daysAhead) => {
                                            if (useReferenceCurve && referenceData && camadaInfo) {
                                                const sexaje = getCamadaSexaje();
                                                const currentAge = calculateCamadaAge(lastDate);
                                                const futureAge = currentAge + daysAhead;
                                                const refData = referenceData.find(d => d.edad === futureAge);

                                                if (refData) {
                                                    // Peso basado en datos observados (extrapolación lineal simple)
                                                    const observedWeight = lastWeight + (adjustedGrowthRate * daysAhead);

                                                    // Combinar con el peso de referencia según el factor de alineación
                                                    const referenceWeight = refData[sexaje];
                                                    const combinedWeight = (referenceWeight * alignmentWithReference) +
                                                        (observedWeight * (1 - alignmentWithReference));

                                                    return {
                                                        value: combinedWeight,
                                                        refValue: referenceWeight
                                                    };
                                                }
                                            }

                                            // Si no usamos referencia o no hay datos de referencia para esta edad,
                                            // usar la tasa de crecimiento ajustada
                                            const projectedValue = lastWeight + (adjustedGrowthRate * daysAhead);

                                            // Intentar obtener el valor de referencia si existe
                                            let refValue = null;
                                            if (camadaInfo && referenceData) {
                                                const sexaje = getCamadaSexaje();
                                                const loteEdadActual = calculateCamadaAge(lastDate);
                                                const futureAge = loteEdadActual + daysAhead;
                                                const refData = referenceData.find(d => d.edad === futureAge);
                                                if (refData) {
                                                    refValue = refData[sexaje];
                                                }
                                            }

                                            return {
                                                value: projectedValue,
                                                refValue: refValue
                                            };
                                        };

                                        // Mostrar proyecciones para fechas específicas
                                        const forecastResult = getForecastData();
                                        if (!forecastResult || !forecastResult.forecastValues || forecastResult.forecastValues.length === 0) {
                                            return <p>Datos insuficientes para proyección</p>;
                                        }

                                        // Generar los primeros dos días de proyección fijos
                                        const fixedProjectionDays = [1, 2];
                                        const renderedDays = fixedProjectionDays.map(days => {
                                            // Verificar que tenemos suficientes datos para este día
                                            if (days > forecastResult.forecastValues.length) return null;

                                            const projectionDate = new Date(forecastResult.lastDate);
                                            projectionDate.setDate(forecastResult.lastDate.getDate() + days);

                                            // Usar directamente los valores de pronóstico calculados para la gráfica
                                            const predictedValue = forecastResult.forecastValues[days - 1];

                                            // Buscar el valor de referencia si existe
                                            let refValue = null;
                                            if (forecastResult.referenceData && forecastResult.referenceData.weights.length >= days) {
                                                refValue = forecastResult.referenceData.weights[days - 1];
                                            } else if (camadaInfo && referenceData) {
                                                const currentAge = calculateCamadaAge(forecastResult.lastDate);
                                                const futureAge = currentAge + days;
                                                const sexaje = getCamadaSexaje();
                                                const refData = referenceData.find(d => d.edad === futureAge);
                                                if (refData) {
                                                    refValue = refData[sexaje];
                                                }
                                            }

                                            return (
                                                <div key={`proj-${days}`} className="flex flex-col space-y-1">
                                                    <div className="flex justify-between font-semibold text-gray-700 dark:text-gray-300">
                                                        <span>+{days} días ({projectionDate.toLocaleDateString()}):</span>
                                                    </div>
                                                    <div className="flex justify-between pl-4">
                                                        <span className="text-gray-600 dark:text-gray-400">Proyectado:</span>
                                                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                                            {predictedValue.toFixed(0)} g
                                                        </span>
                                                    </div>
                                                    {refValue && (
                                                        <>
                                                            <div className="flex justify-between pl-4">
                                                                <span className="text-gray-600 dark:text-gray-400">Referencia:</span>
                                                                <span className="font-semibold">
                                                                    {refValue} g
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between pl-4">
                                                                <span className="text-gray-600 dark:text-gray-400">Diferencia:</span>
                                                                <span className={`font-semibold ${((predictedValue - refValue) / refValue * 100) > 5
                                                                    ? "text-blue-600 dark:text-blue-400"
                                                                    : ((predictedValue - refValue) / refValue * 100) < -5
                                                                        ? "text-red-600 dark:text-red-400"
                                                                        : "text-green-600 dark:text-green-400"
                                                                    }`}>
                                                                    {predictedValue > refValue ? '+' : ''}
                                                                    {(predictedValue - refValue).toFixed(0)} g
                                                                    ({((predictedValue - refValue) / refValue * 100).toFixed(1)}%)
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        }).filter(Boolean); // Filtrar nulls si hubiera alguno

                                        // Añadir el selector personalizado para día específico
                                        // Asegurarnos de que el valor seleccionado esté dentro del rango disponible
                                        const validCustomDay = Math.min(customProjectionDays, forecastResult.forecastValues.length);
                                        const customDate = new Date(forecastResult.lastDate);
                                        customDate.setDate(forecastResult.lastDate.getDate() + validCustomDay);

                                        // Obtener el valor ya calculado para ese día específico
                                        const customPredictedValue = forecastResult.forecastValues[validCustomDay - 1];

                                        // Buscar el valor de referencia
                                        let customRefValue = null;
                                        if (forecastResult.referenceData && forecastResult.referenceData.weights.length >= validCustomDay) {
                                            customRefValue = forecastResult.referenceData.weights[validCustomDay - 1];
                                        } else if (camadaInfo && referenceData) {
                                            const currentAge = calculateCamadaAge(forecastResult.lastDate);
                                            const futureAge = currentAge + validCustomDay;
                                            const sexaje = getCamadaSexaje();
                                            const refData = referenceData.find(d => d.edad === futureAge);
                                            if (refData) {
                                                customRefValue = refData[sexaje];
                                            }
                                        }

                                        // Añadir el componente con selector numérico para el día específico
                                        renderedDays.push(
                                            <div key="custom-projection" className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex flex-col space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <label className="font-medium text-gray-700 dark:text-gray-300">
                                                            Día específico a proyectar:
                                                        </label>
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="number"
                                                                min="3"
                                                                max={forecastResult.forecastValues.length}
                                                                value={customProjectionDays}
                                                                onChange={(e) => {
                                                                    const newValue = parseInt(e.target.value);
                                                                    setCustomProjectionDays(
                                                                        Math.min(
                                                                            Math.max(3, newValue),
                                                                            forecastResult.forecastValues.length
                                                                        )
                                                                    );
                                                                }}
                                                                className="w-20 p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white text-center"
                                                            />
                                                            <span className="text-gray-700 dark:text-gray-300">días</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between font-semibold text-gray-700 dark:text-gray-300 mt-2 bg-indigo-50 dark:bg-indigo-900 p-2 rounded">
                                                        <span>+{validCustomDay} días ({customDate.toLocaleDateString()}):</span>
                                                    </div>
                                                    <div className="flex justify-between pl-4">
                                                        <span className="text-gray-600 dark:text-gray-400">Proyectado:</span>
                                                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                                            {customPredictedValue.toFixed(0)} g
                                                        </span>
                                                    </div>
                                                    {customRefValue && (
                                                        <>
                                                            <div className="flex justify-between pl-4">
                                                                <span className="text-gray-600 dark:text-gray-400">Referencia:</span>
                                                                <span className="font-semibold">
                                                                    {customRefValue} g
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between pl-4">
                                                                <span className="text-gray-600 dark:text-gray-400">Diferencia:</span>
                                                                <span className={`font-semibold ${((customPredictedValue - customRefValue) / customRefValue * 100) > 5
                                                                    ? "text-blue-600 dark:text-blue-400"
                                                                    : ((customPredictedValue - customRefValue) / customRefValue * 100) < -5
                                                                        ? "text-red-600 dark:text-red-400"
                                                                        : "text-green-600 dark:text-green-400"
                                                                    }`}>
                                                                    {customPredictedValue > customRefValue ? '+' : ''}
                                                                    {(customPredictedValue - customRefValue).toFixed(0)} g
                                                                    ({((customPredictedValue - customRefValue) / customRefValue * 100).toFixed(1)}%)
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );

                                        return renderedDays;
                                    })()}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                                <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Análisis de crecimiento</h5>
                                {(() => {
                                    if (pesadasRangoData.length < 3) {
                                        return (
                                            <p className="text-gray-600 dark:text-gray-400">
                                                Se necesitan al menos 3 puntos de datos para un análisis completo
                                            </p>
                                        );
                                    }

                                    // Calcular tasa de crecimiento diario
                                    const dates = pesadasRangoData.map(d => new Date(d.fecha));
                                    const weights = pesadasRangoData.map(d => d.peso_medio_aceptadas);

                                    const regression = calculateLinearRegression(
                                        dates.map(d => d.toISOString()),
                                        weights
                                    );

                                    if (!regression) return <p>No hay datos suficientes</p>;

                                    // Tasa de crecimiento diario en g/día
                                    const dailyGrowthRate = regression.slope;

                                    // Último peso registrado
                                    const lastWeight = weights[weights.length - 1];

                                    // Crecimiento como porcentaje del peso actual
                                    const growthPercentage = (dailyGrowthRate / lastWeight) * 100;

                                    // Nueva implementación para la eficiencia de crecimiento
                                    // En lugar de comparar las tasas, comparamos directamente los pesos con los de referencia
                                    let growthEfficiency = null;
                                    let expectedGrowthRate = null;
                                    let avgEfficiency = null;

                                    if (camadaInfo && referenceData) {
                                        // Calcular la eficiencia como qué tan cerca están los pesos de los pesos de referencia
                                        const efficiencies = [];

                                        // Obtener el sexaje del lote
                                        const sexaje = getCamadaSexaje();

                                        // Para cada medición, encontrar el peso de referencia y calcular la eficiencia
                                        for (let i = 0; i < pesadasRangoData.length; i++) {
                                            const date = dates[i];
                                            const actualWeight = weights[i];
                                            const age = calculateCamadaAge(date);

                                            if (age !== null) {
                                                const refData = referenceData.find(d => d.edad === age);
                                                if (refData) {
                                                    const refWeight = refData[sexaje];
                                                    // Calcular qué tan cerca está el peso real del peso de referencia (en porcentaje)
                                                    // 100% significa un peso exactamente igual al de referencia
                                                    const efficiency = (actualWeight / refWeight) * 100;
                                                    efficiencies.push(efficiency);
                                                }
                                            }
                                        }

                                        // Calcular la eficiencia promedio
                                        if (efficiencies.length > 0) {
                                            avgEfficiency = efficiencies.reduce((sum, val) => sum + val, 0) / efficiencies.length;
                                        }

                                        // Para mantener compatibilidad, también calculamos la tasa de crecimiento esperada
                                        // según la implementación anterior
                                        const lastDate = dates[dates.length - 1];
                                        const loteEdad = calculateCamadaAge(lastDate);

                                        const currentRef = referenceData.find(d => d.edad === loteEdad)[sexaje];
                                        // peso de referencia del día anterior (o 0 si no existe)
                                        const prevData = referenceData.find(d => d.edad === loteEdad - 1);
                                        const prevRef = prevData ? prevData[sexaje] : 0;

                                        // ahora restamos el día actual menos el anterior
                                        expectedGrowthRate = currentRef - prevRef;
                                    }

                                    return (
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Tasa de crecimiento:
                                                </span>
                                                <span className="font-semibold text-green-600 dark:text-green-400">
                                                    {dailyGrowthRate.toFixed(1)} g/día
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Crecimiento relativo:
                                                </span>
                                                <span className="font-semibold text-green-600 dark:text-green-400">
                                                    {growthPercentage.toFixed(1)}% del peso/día
                                                </span>
                                            </div>

                                            {expectedGrowthRate !== null && (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600 dark:text-gray-400">
                                                            Crecimiento esperado:
                                                        </span>
                                                        <span className="font-semibold">
                                                            {expectedGrowthRate.toFixed(1)} g/día
                                                        </span>
                                                    </div>
                                                    {avgEfficiency !== null && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600 dark:text-gray-400">
                                                                Eficiencia de crecimiento:
                                                            </span>
                                                            <span className={`font-semibold ${avgEfficiency > 105
                                                                ? 'text-blue-600 dark:text-blue-400'
                                                                : avgEfficiency < 95
                                                                    ? 'text-red-600 dark:text-red-400'
                                                                    : 'text-green-600 dark:text-green-400'
                                                                }`}>
                                                                {avgEfficiency.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Calidad del ajuste:
                                                </span>
                                                <span className={`font-semibold ${regression.rSquared > 0.8
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : regression.rSquared > 0.5
                                                        ? 'text-yellow-600 dark:text-yellow-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                    R² = {regression.rSquared.toFixed(3)}
                                                </span>
                                            </div>

                                            {camadaInfo && (
                                                <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600 dark:text-gray-400">
                                                            Camada:
                                                        </span>
                                                        <span className="font-semibold">
                                                            {camadaInfo.nombre_camada}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600 dark:text-gray-400">
                                                            Tipo ave:
                                                        </span>
                                                        <span className="font-semibold">
                                                            {camadaInfo.tipo_ave} {camadaInfo.tipo_estirpe}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600 dark:text-gray-400">
                                                            Sexaje:
                                                        </span>
                                                        <span className="font-semibold">
                                                            {camadaInfo.sexaje}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600 dark:text-gray-400">
                                                            Edad actual:
                                                        </span>
                                                        <span className="font-semibold">
                                                            {calculateCamadaAge()} días
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {camadaInfo && referenceData && (
                                <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm md:col-span-2">
                                    <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Curva de crecimiento</h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        La tabla muestra el peso esperado según la edad para un lote de tipo {getCamadaSexaje().toLowerCase()}.
                                    </p>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead>
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Edad (días)</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Peso estándar (g)</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ganancia diaria (g)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {(() => {
                                                    // Mostrar solo un subconjunto relevante de la tabla de referencia
                                                    const currentAge = calculateCamadaAge();
                                                    const sexaje = getCamadaSexaje();

                                                    // Mostrar desde una semana antes hasta dos semanas después
                                                    const startAge = Math.max(0, currentAge - 7);
                                                    const endAge = currentAge + 14;

                                                    const relevantData = referenceData
                                                        .filter(d => d.edad >= startAge && d.edad <= endAge)
                                                        .sort((a, b) => a.edad - b.edad);

                                                    return relevantData.map((row, index) => {
                                                        // Calcular ganancia diaria
                                                        let gainPerDay = null;
                                                        if (index > 0) {
                                                            gainPerDay = row[sexaje] - relevantData[index - 1][sexaje];
                                                        }

                                                        // Destacar la edad actual
                                                        const isCurrentAge = row.edad === currentAge;
                                                        const rowClass = isCurrentAge
                                                            ? 'bg-blue-50 dark:bg-blue-900'
                                                            : index % 2 === 0
                                                                ? 'bg-gray-50 dark:bg-gray-800'
                                                                : 'bg-white dark:bg-gray-900';

                                                        return (
                                                            <tr key={row.id} className={rowClass}>
                                                                <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                    {row.edad} {isCurrentAge && '(actual)'}
                                                                </td>
                                                                <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                                                                    {row[sexaje]} g
                                                                </td>
                                                                <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                                                                    {gainPerDay !== null ? `+${gainPerDay} g` : '-'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-4">
                            {renderWeightPrediction()}
                        </div>
                    </>
                )}
            </div>

        );
    };

    // ———————————————————————————————————————————————————
    return (
        <div className="p-6 max-w-7xl mx-auto">
            {!isEmbedded && (
                <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
                    Estadísticas de Pesadas por Camada
                </h1>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-100 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {renderNoAccessMessage()}

            {/* — Controles de filtro original — */}
            {!isEmbedded ? (
                // Vista completa cuando no está incrustado
                <div className="p-6 rounded-lg shadow-md mb-6 bg-gray-50 dark:bg-gray-800">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        {/* Empresa */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">Empresa</label>
                            <select
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                value={selectedEmpresa}
                                onChange={e => { setSelectedEmpresa(e.target.value); setPesadasData(null); setPesadasRangoData(null); }}
                                disabled={loading || empresas.length === 0}
                            >
                                <option value="">-- Seleccione --</option>
                                {empresas.map(e => (
                                    <option key={e.id} value={e.id}>
                                        {e.nombre_empresa || e.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Granja - Ocupa 2 columnas para ser más ancho */}
                        <div className="md:col-span-2">
                            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">Granja</label>
                            <select
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                value={selectedGranja}
                                onChange={e => { setSelectedGranja(e.target.value); setPesadasData(null); setPesadasRangoData(null); }}
                                disabled={loading || !selectedEmpresa || granjas.length === 0}
                            >
                                <option value="">-- Seleccione --</option>
                                {granjas.map(g => (
                                    <option key={g.id} value={g.numero_rega}>
                                        {g.nombre} ({g.numero_rega})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Camada */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">Camada</label>
                            <select
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                value={selectedCamada}
                                onChange={e => { setSelectedCamada(e.target.value); setSelectedDisp(''); setPesadasData(null); setPesadasRangoData(null); }}
                                disabled={loading || !selectedGranja}
                            >
                                <option value="">-- Seleccione --</option>
                                {camadas.map(c => (
                                    <option
                                        key={c.id_camada}
                                        value={c.id_camada}
                                        style={{
                                            color: c.fecha_hora_final ? '#dc2626' : 'inherit', // Rojo si está finalizada
                                            fontWeight: c.fecha_hora_final ? 'bold' : 'normal'
                                        }}
                                    >
                                        {c.nombre_camada} {c.fecha_hora_final ? '(Finalizada)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Fecha y Nivel de Restricción */}
                        <div className="grid grid-cols-1 gap-2">
                            <div>
                                <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">Fecha</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                    value={fecha}
                                    onChange={e => handleFechaChange(e.target.value)}
                                    min={fechaLimites.inicio || undefined}
                                    max={fechaLimites.fin || undefined} disabled={loading}
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                                    Nivel restricción
                                </label>
                                <select
                                    className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                    value={nivelRestriccion}
                                    onChange={e => setNivelRestriccion(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="bajo">Alto (±20%)</option>
                                    <option value="medio">Medio (±25%)</option>
                                    <option value="alto">Bajo (±30%)</option>
                                </select>
                            </div>
                        </div>

                        {/* Coeficiente de homogeneidad */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                                Coef. homog. (%)
                            </label>
                            <input
                                type="number"
                                step="1"
                                min="0"
                                max="100"
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                value={coef}
                                onChange={e => setCoef(e.target.value)}
                                disabled={loading}
                                placeholder="Opcional"
                            />
                            {/* Botón de consulta */}
                            <button
                                onClick={fetchPesadas}
                                disabled={loading || !selectedCamada}
                                className="w-full mt-2 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-500 disabled:text-gray-200"
                            >
                                {loading ? 'Cargando...' : 'Consultar'}
                            </button>
                        </div>
                    </div>


                </div>
            ) : (
                // Versión simplificada cuando está incrustado (sin selección de empresa/granja/camada)
                <div className="p-6 rounded-lg shadow-md mb-6 bg-gray-50 dark:bg-gray-800">
                    <div className="mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Seleccione los parámetros para consultar las pesadas de esta camada.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Fecha */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">Fecha</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                value={fecha}
                                onChange={e => handleFechaChange(e.target.value)}
                                min={fechaLimites.inicio || undefined}
                                max={fechaLimites.fin || undefined} disabled={loading}
                            />
                        </div>

                        {/* Nivel de Restricción */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                                Nivel restricción
                            </label>
                            <select
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                value={nivelRestriccion}
                                onChange={e => setNivelRestriccion(e.target.value)}
                                disabled={loading}
                            >
                                <option value="bajo">Alto (±20%)</option>
                                <option value="medio">Medio (±25%)</option>
                                <option value="alto">Bajo (±30%)</option>
                            </select>
                        </div>

                        {/* Coeficiente (%) */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                                Coef. homog. (%)
                            </label>
                            <input
                                type="number"
                                step="1"
                                min="0"
                                max="100"
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                value={coef}
                                onChange={e => setCoef(e.target.value)}
                                disabled={loading}
                                placeholder="Opcional"
                            />
                        </div>

                        {/* Botón */}
                        <div className="flex items-end">
                            <button
                                onClick={fetchPesadas}
                                disabled={loading || !selectedCamada}
                                className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-500 disabled:text-gray-200"
                            >
                                {loading ? 'Cargando...' : 'Consultar pesadas'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* — Resultados diarios — */}
            {pesadasData && (
                <div className="space-y-4">
                    {/* Selector de dispositivos */}
                    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                                    Resultados del día {fecha}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Seleccione un dispositivo específico o vea todos los dispositivos juntos
                                </p>
                            </div>

                            <div className="flex-shrink-0 min-w-64">
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Filtrar por dispositivo:
                                </label>
                                <select
                                    className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                    value={selectedDeviceForDaily}
                                    onChange={(e) => setSelectedDeviceForDaily(e.target.value)}
                                >
                                    <option value="todos">Todos los dispositivos ({availableDevicesForDaily.length})</option>
                                    {availableDevicesForDaily.map(device => {
                                        const devicePesadas = pesadasData.listado_pesos.filter(p => p.id_dispositivo === device);
                                        return (
                                            <option key={device} value={device}>
                                                {device} ({devicePesadas.length} pesadas)
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Resumen estadístico filtrado */}
                    {renderEnhancedCards()}

                    {/* Información del dispositivo seleccionado */}
                    {selectedDeviceForDaily !== 'todos' && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded shadow border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-300">
                                        Dispositivo: {selectedDeviceForDaily}
                                    </h4>
                                    <p className="text-sm text-blue-600 dark:text-blue-400">
                                        Mostrando {getFilteredDailyPesadas().length} pesadas de este dispositivo
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedDeviceForDaily('todos')}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                                >
                                    Ver todos
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tabla de pesos con scroll */}
                    {renderEnhancedTable()}

                    {/* Resumen por dispositivo cuando se muestran todos */}
                    {selectedDeviceForDaily === 'todos' && availableDevicesForDaily.length > 1 && (
                        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                                Resumen por dispositivo
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {availableDevicesForDaily.map(device => {
                                    const devicePesadas = pesadasData.listado_pesos.filter(p => p.id_dispositivo === device);
                                    const aceptadas = devicePesadas.filter(p => p.estado === 'aceptada').length;
                                    const rechazadas = devicePesadas.filter(p => p.estado === 'rechazada').length;
                                    const aceptadasDispositivo = devicePesadas.filter(p => p.estado === 'aceptada');
                                    const pesoMedio = aceptadasDispositivo.length > 0
                                        ? aceptadasDispositivo.reduce((sum, p) => sum + Number(p.valor), 0) / aceptadasDispositivo.length
                                        : 0;

                                    return (
                                        <div
                                            key={device}
                                            className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                                            onClick={() => setSelectedDeviceForDaily(device)}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                                                    {device}
                                                </h4>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    Click para filtrar
                                                </span>
                                            </div>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Total:</span>
                                                    <span className="font-medium">{devicePesadas.length}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Aceptadas:</span>
                                                    <span className="font-medium text-green-600 dark:text-green-400">{aceptadas}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Rechazadas:</span>
                                                    <span className="font-medium text-red-600 dark:text-red-400">{rechazadas}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Peso medio:</span>
                                                    <span className="font-medium">{pesoMedio.toFixed(1)} g</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* — NUEVA SECCIÓN: selector dispositivo + rango fechas — */}
            {selectedCamada && (
                <div className="p-6 rounded-lg shadow-md mb-6 bg-gray-50 dark:bg-gray-800">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                        {isEmbedded
                            ? `Análisis por rango de fechas - ${camadaInfo?.nombre_camada || "Camada seleccionada"}`
                            : "Análisis por Dispositivo y Rango"
                        }
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        {/* Dispositivo */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                                Dispositivo
                            </label>
                            <select
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                value={selectedDisp}
                                onChange={e => setSelectedDisp(e.target.value)}
                                disabled={loading}
                            >
                                <option value="">-- Seleccione --</option>
                                {dispositivos.map(d => (
                                    <option key={d.id_dispositivo} value={d.id_dispositivo}>
                                        {d.numero_serie}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Fecha inicio */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                                Fecha inicio
                            </label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                value={fechaInicioRange}
                                onChange={e => handleFechaInicioRangeChange(e.target.value)}
                                min={fechaLimites.inicio || undefined}
                                max={fechaLimites.fin ? (fechaLimites.fin < fechaFinRange ? fechaLimites.fin : fechaFinRange) : fechaFinRange}
                                disabled={loading}
                            />
                        </div>

                        {/* Fecha fin */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                                Fecha fin
                            </label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                value={fechaFinRange}
                                onChange={e => handleFechaFinRangeChange(e.target.value)}
                                min={fechaInicioRange}
                                max={fechaLimites.fin || undefined}
                                disabled={loading}
                            />
                        </div>

                        {/* Nivel de Restricción */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                                Nivel restricción
                            </label>
                            <select
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                value={nivelRestriccion}
                                onChange={e => setNivelRestriccion(e.target.value)}
                                disabled={loading}
                            >
                                <option value="bajo">Bajo (±20%)</option>
                                <option value="medio">Medio (±25%)</option>
                                <option value="alto">Alto (±30%)</option>
                            </select>
                        </div>

                        {/* Coeficiente */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-800 dark:text-gray-200">
                                Coef. homog. (%)
                            </label>
                            <input
                                type="number"
                                step="1" min="0" max="100"
                                className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                                value={coef}
                                onChange={e => setCoef(e.target.value)}
                                disabled={loading}
                                placeholder="Opcional"
                            />
                        </div>

                        {/* Botón rango */}
                        <div className="flex items-end">
                            <button
                                onClick={() => fetchPesadasRango()}
                                disabled={loading || !selectedDisp}
                                className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-500 disabled:text-gray-200"
                            >
                                {loading ? 'Cargando...' : 'Consultar rango'}
                            </button>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-100 dark:border-blue-800">
                            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Selección rápida de fechas</h3>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => handleQuickDateSelection('desde-inicio')}
                                    // Aquí modificamos la condición para que funcione también con propCamadaInfo
                                    disabled={loading || !selectedDisp || !(camadaInfo || propCamadaInfo)}
                                    className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-500 disabled:text-gray-200 text-sm flex items-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Desde inicio de camada
                                </button>
                                <button
                                    onClick={() => handleQuickDateSelection('ultima-semana')}
                                    disabled={loading || !selectedDisp}
                                    className="py-2 px-4 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-500 disabled:text-gray-200 text-sm flex items-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Última semana
                                </button>
                            </div>
                        </div>

                        {isEmbedded && (
                            <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm rounded">
                                <p>Seleccione un dispositivo y un rango de fechas para analizar el historial de pesadas.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* — GRÁFICAS DEL RANGO (PLOTLY) — */}
            {pesadasRangoData && (
                <div className="space-y-8">
                    {/* Botón de exportación CSV */}

                    <div className="flex justify-end">
                        <button
                            onClick={generateExcel}
                            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Exportar a Excel
                        </button>
                    </div>
                    {/* 1) Peso medio diario */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Peso medio diario
                        </h3>
                        <div className="h-80">
                            <Plot
                                data={getPesoMedioData()}
                                layout={getPesoMedioLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* 2) Coeficiente de variación diario */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Coeficiente de variación diario (%)
                        </h3>
                        <div className="h-80">
                            <Plot
                                data={getCoefVariacionData()}
                                layout={getCoefVariacionLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Coeficiente de uniformidad diario (%)
                        </h3>
                        <div className="h-80">
                            <Plot
                                data={getUniformityData()}
                                layout={getUniformityLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                            <p>
                                El coeficiente de uniformidad indica el porcentaje de animales que tienen un peso
                                dentro del ±10% del peso medio. Valores superiores al 80% (zona verde) indican
                                una buena uniformidad del lote, mientras que valores inferiores (zona roja)
                                sugieren una mayor variabilidad en los pesos.
                            </p>
                        </div>
                    </div>

                    {/* 3) Todas las pesadas aceptadas (scatter) */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Todas las pesadas aceptadas
                        </h3>
                        <div className="h-80">
                            <Plot
                                data={getScatterData()}
                                layout={getScatterLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                                onSelected={handleScatterSelection}
                                onDeselect={() => {
                                    setSelectedPoints(null);
                                    setSelectionStats(null);
                                }}
                            />
                        </div>

                        {/* Panel de estadísticas de selección */}
                        {selectionStats && (
                            <div
                                ref={statsRef}
                                className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg shadow-sm"
                            >
                                <h4 className="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-300">
                                    Estadísticas de selección
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div className="bg-white dark:bg-gray-800 rounded p-3 shadow-sm">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Cantidad de pesadas</span>
                                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{selectionStats.count}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded p-3 shadow-sm">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Peso medio</span>
                                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{selectionStats.avgPeso} g</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded p-3 shadow-sm">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Rango de peso</span>
                                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                            {selectionStats.minPeso} - {selectionStats.maxPeso} g
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded p-3 shadow-sm">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Desviación estándar</span>
                                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{selectionStats.stdDev} g</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded p-3 shadow-sm md:col-span-2">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Período de tiempo</span>
                                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                            {selectionStats.startTime} - {selectionStats.endTime}
                                        </p>
                                    </div>
                                    <div className="md:col-span-2 flex items-center justify-end">
                                        <button
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                                            onClick={() => {
                                                // Aquí podrías añadir funcionalidad para exportar la selección a CSV
                                                alert('Funcionalidad para exportar selección');
                                            }}
                                        >
                                            Exportar selección
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}



                    </div>

                    <DistribucionNormalPesos pesadasRangoData={pesadasRangoData} />

                    {/* 4) Pesadas por franja horaria */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                            Distribución de pesadas por franja horaria
                        </h3>
                        <div className="h-80">
                            <Plot
                                data={getStackedBarChartData()}
                                layout={getStackedBarChartLayout()}
                                config={baseConfig}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                            <p>Esta gráfica muestra la distribución de pesadas por franja horaria para cada día del período seleccionado.
                                Cada color representa una franja horaria específica, lo que permite visualizar patrones de actividad de las aves
                                a lo largo del día y comparar entre diferentes fechas.</p>
                        </div>
                    </div>

                    {/* 5) Comparación entre fechas */}
                    {pesadasRangoData && pesadasRangoData.length > 1 && renderDateComparisonSelector()}

                    {/* 6) Pronóstico de crecimiento */}
                    {pesadasRangoData && pesadasRangoData.length > 1 && renderForecastComponent()}
                </div>
            )}
        </div>
    );
}