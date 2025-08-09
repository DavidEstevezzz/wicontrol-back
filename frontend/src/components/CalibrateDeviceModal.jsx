import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faMicrochip,
    faTools,
    faWeight,
    faBalanceScale,
    faSpinner,
    faCheck,
    faExclamationTriangle,
    faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import DispositivoApiService from '../services/DispositivoApiService';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function CalibrateDeviceModal({ isOpen, onClose, onDeviceCalibrated, device }) {
    const { darkMode } = useDarkMode();

    // Estados
    const [loading, setLoading] = useState(false);
    const [waitingDevice, setWaitingDevice] = useState(false);
    const [step, setStep] = useState(1); // Paso actual del proceso de calibración
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [calibrationWeight, setCalibrationWeight] = useState(20); // Peso predeterminado en g
    const [calibrationStatus, setCalibrationStatus] = useState({
        currentStep: 0,
        isCalibrated: false,
        runCalibracion: false,
        errorCalib: 0,
        pesoCalibracion: 0,
        calibrado: 0
    });

    // Referencias para polling
    const pollingInterval = useRef(null);

    // Restablecer el estado cuando cambia el dispositivo
    useEffect(() => {
        if (isOpen && device) {
            setStep(1);
            setError('');
            setSuccess(false);
            setCalibrationWeight(20);
            setWaitingDevice(false);

            // Cargar el estado actual de calibración del dispositivo
            fetchCalibrationStatus();
        }

        // Limpiar polling al cerrar
        return () => {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
                pollingInterval.current = null;
            }
        };
    }, [isOpen, device]);

    // Consultar el estado de calibración del dispositivo
    const fetchCalibrationStatus = async () => {
        if (!device) return;

        try {
            const response = await DispositivoApiService.getCalibrateStep({
                device: device.numero_serie
            });

            if (response.success) {
                const deviceData = response.messages ? JSON.parse(response.messages)[0] : null;

                if (deviceData) {
                    const status = {
                        currentStep: parseInt(deviceData.calibrado || 0),
                        isCalibrated: parseInt(deviceData.calibrado) === 6,
                        runCalibracion: parseInt(deviceData.runCalibracion) === 1,
                        errorCalib: parseInt(deviceData.errorCalib || 0),
                        pesoCalibracion: parseFloat(deviceData.pesoCalibracion || 0),
                        calibrado: parseInt(deviceData.calibrado || 0)
                    };

                    setCalibrationStatus(status);

                    // Verificar errores
                    if (status.errorCalib > 0) {
                        setError(`Error de calibración del dispositivo (código: ${status.errorCalib})`);
                        setWaitingDevice(false);
                        stopPolling();
                    }

                    return status;
                }
            }
        } catch (err) {
            console.error('Error fetching calibration status:', err);
        }

        return null;
    };

    // Función para iniciar polling
    // Función para iniciar polling - CORREGIDA
    const startPolling = (expectedStep) => {
        setWaitingDevice(true);

        pollingInterval.current = setInterval(async () => {
            const status = await fetchCalibrationStatus();

            if (status) {
                if (status.errorCalib > 0) {
                    stopPolling();
                    setWaitingDevice(false);
                    return;
                }

                if (status.calibrado >= expectedStep) {
                    stopPolling();
                    setWaitingDevice(false);

                    if (expectedStep === 2) {
                        setStep(3);  // Paso 2 UI → Paso 3 UI
                    } else if (expectedStep === 4) {
                        setStep(4);  // Paso 3 UI → Paso 4 UI
                    } else if (expectedStep === 6) {
                        // Paso 4 UI → Éxito
                        setStep(5);  // Primero mostrar paso 5
                        setTimeout(() => {
                            setSuccess(true);
                            if (onDeviceCalibrated) {
                                onDeviceCalibrated({
                                    ...device,
                                    calibrado: 6,
                                    runCalibracion: 0,
                                    pesoCalibracion: 0,
                                    errorCalib: 0,
                                    fecha_ultima_calibracion: new Date().toISOString()
                                });
                            }
                        }, 1000); // Esperar 1 segundo antes de mostrar éxito
                    }
                }
            }
        }, 1000);
    };

    // Función para detener polling
    const stopPolling = () => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
    };

    // Función para enviar paso de calibración
    const sendCalibrationStep = async (calibStep, weight = 0) => {
        if (!device || (!device.numero_serie)) {
            setError('No se ha seleccionado ningún dispositivo válido');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await DispositivoApiService.sendCalibrateStep({
                device: device.numero_serie,
                weight: weight,
                step: calibStep
            });

            if (response.success) {
                setLoading(false);
                return true;
            } else {
                setError('Error al enviar paso de calibración: ' + response.messages);
                setLoading(false);
                return false;
            }
        } catch (err) {
            console.error('Error sending calibration step:', err);
            setError('Error de conexión al enviar paso de calibración');
            setLoading(false);
            return false;
        }
    };

    // Función para iniciar el proceso de calibración
    const startCalibration = async () => {
        // Enviar peso = 0 y step = 1 para iniciar
        const success = await sendCalibrationStep(1, 0);

        if (success) {
            setStep(2);
            // Iniciar polling esperando que el dispositivo complete paso 1
            startPolling(2);
        }
    };

    // Función para configurar peso (paso 2)
    const setCalibrationWeightStep = async () => {
        // Enviar el peso configurado
        const success = await sendCalibrationStep(2, calibrationWeight);

        if (success) {
            // El dispositivo debería empezar a calibrar con peso
            // Esperamos que llegue al paso 4
            startPolling(4);
        }
    };

    // Función para quitar peso (paso 4 -> 5)
    const removeWeight = async () => {
        // Enviar step = 5 con peso = 0
        const success = await sendCalibrationStep(5, 0);

        if (success) {
            startPolling(6);

        }
    };

    // Función para cancelar la calibración
    const cancelCalibration = async () => {
        stopPolling();
        setLoading(true);

        try {
            // Reiniciar el proceso de calibración
            await DispositivoApiService.sendCalibrateStep({
                device: device.numero_serie,
                weight: 0,
                step: 0
            });

            onClose();
        } catch (err) {
            console.error('Error canceling calibration:', err);
            setError('Error al cancelar la calibración');
        }

        setLoading(false);
    };

    // Obtener mensaje según el paso actual
    const getStepMessage = () => {
        if (waitingDevice) {
            switch (step) {
                case 2:
                    return 'El dispositivo se está calibrando sin peso. Por favor espere...';
                case 3:
                    return 'El dispositivo se está calibrando con el peso. Por favor espere...';
                case 4:
                    return 'Esperando respuesta del dispositivo...';
                case 5:
                    return 'Finalizando calibración...';
                default:
                    return 'Esperando respuesta del dispositivo...';
            }
        }

        switch (step) {
            case 1:
                return 'Coloque el dispositivo sobre una superficie plana sin ningún peso. Asegúrese de que la balanza esté estable.';
            case 2:
                return 'El dispositivo se está calibrando sin peso. Por favor espere...';
            case 3:
                return 'Coloque el peso de calibración sobre el dispositivo. Por favor ingrese el peso (en g) y pulse "Continuar".';
            case 4:
                return 'Calibración con peso completada. Retire el peso del dispositivo y pulse "Finalizar".';
            case 5:
                return 'Calibración finalizada. El dispositivo está guardando la configuración...';
            default:
                return 'Preparando dispositivo para calibración...';
        }
    };

    // Función para manejar el botón principal según el paso
    const handleMainAction = () => {
        switch (step) {
            case 1:
                startCalibration();
                break;
            case 3:
                if (!waitingDevice) {
                    setCalibrationWeightStep();
                }
                break;
            case 4:
                removeWeight();
                break;
        }
    };

    // Obtener texto del botón según el paso
    const getButtonText = () => {
        if (loading || waitingDevice) {
            return (
                <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    {waitingDevice ? 'Esperando dispositivo...' : 'Procesando...'}
                </>
            );
        }

        switch (step) {
            case 1:
                return 'Iniciar Calibración';
            case 3:
                return 'Continuar con Peso';
            case 4:
                return 'Finalizar Calibración';
            default:
                return 'Continuar';
        }
    };

    // Si el modal no está abierto o no hay dispositivo, no renderizar nada
    if (!isOpen || !device) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center">
            {/* Fondo oscurecido */}
            <div
                className="fixed inset-0 bg-black opacity-50 transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto ${darkMode ? 'dark' : ''}`}>
                {/* Cabecera */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                        <FontAwesomeIcon icon={faTools} className="mr-2 text-blue-600 dark:text-blue-400" />
                        Calibrar Dispositivo: {device.numero_serie || `#${device.id_dispositivo || device.id_instalacion}`}
                    </h2>
                    <button
                        onClick={loading || waitingDevice ? null : onClose}
                        disabled={loading || waitingDevice}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                    >
                        <FontAwesomeIcon icon={faTimes} className="text-xl" />
                    </button>
                </div>

                {/* Contenido del modal */}
                <div className="p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700">
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    {success ? (
                        // Mensaje de éxito cuando la calibración se completa
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400 mb-4">
                                <FontAwesomeIcon icon={faCheck} className="text-3xl" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                                ¡Calibración Completada!
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                El dispositivo ha sido calibrado correctamente y está listo para su uso.
                            </p>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Cerrar
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Información del dispositivo */}
                            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                    <div className="mb-3 md:mb-0">
                                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Estado Actual
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {calibrationStatus.isCalibrated ? (
                                                <span className="text-green-600 dark:text-green-400 font-medium">
                                                    <FontAwesomeIcon icon={faCheck} className="mr-1" />
                                                    Calibrado
                                                </span>
                                            ) : (
                                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                    <FontAwesomeIcon icon={faTools} className="mr-1" />
                                                    Sin Calibrar (Paso: {calibrationStatus.calibrado})
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="mb-3 md:mb-0">
                                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Número de Serie
                                        </h3>
                                        <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                            {device.numero_serie || 'N/A'}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Último Peso Calibrado
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {calibrationStatus.pesoCalibracion ? `${calibrationStatus.pesoCalibracion} g` : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Pasos de calibración */}
                            <div className="mb-6">
                                <div className="flex justify-between mb-4">
                                    {[1, 2, 3, 4, 5].map((stepNum) => (
                                        <div
                                            key={stepNum}
                                            className={`relative flex flex-col items-center w-20 ${step >= stepNum ? '' : 'opacity-40'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${step > stepNum
                                                ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'
                                                : step === stepNum
                                                    ? waitingDevice
                                                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 animate-pulse'
                                                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                }`}>
                                                {step > stepNum ? (
                                                    <FontAwesomeIcon icon={faCheck} />
                                                ) : waitingDevice && step === stepNum ? (
                                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                                ) : (
                                                    stepNum
                                                )}
                                            </div>
                                            <div className="text-xs text-center text-gray-600 dark:text-gray-400">
                                                {stepNum === 1 && 'Inicio'}
                                                {stepNum === 2 && 'Sin Peso'}
                                                {stepNum === 3 && 'Con Peso'}
                                                {stepNum === 4 && 'Quitar Peso'}
                                                {stepNum === 5 && 'Finalizar'}
                                            </div>

                                            {/* Línea de conexión entre pasos */}
                                            {stepNum < 5 && (
                                                <div className={`absolute top-5 left-[60px] w-16 h-[2px] ${step > stepNum
                                                    ? 'bg-green-500 dark:bg-green-400'
                                                    : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Mensaje del paso actual */}
                            <div className={`mb-8 p-4 rounded-lg border ${waitingDevice
                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                }`}>
                                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                                    Paso {step}: {
                                        step === 1 ? 'Preparar Dispositivo' :
                                            step === 2 ? 'Calibración Sin Peso' :
                                                step === 3 ? 'Calibración Con Peso' :
                                                    step === 4 ? 'Retirar Peso' :
                                                        'Completar Calibración'
                                    }
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300">
                                    {getStepMessage()}
                                </p>

                                {/* Input para el peso de calibración (solo en el paso 3 y no esperando) */}
                                {step === 3 && !waitingDevice && (
                                    <div className="mt-4">
                                        <label htmlFor="calibrationWeight" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Peso de Calibración (g)
                                        </label>
                                        <div className="flex items-center">
                                            <input
                                                type="number"
                                                id="calibrationWeight"
                                                value={calibrationWeight}
                                                onChange={(e) => setCalibrationWeight(Math.max(1, parseInt(e.target.value) || 1))}
                                                min="1"
                                                step="1"
                                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-gray-700 text-gray-800 dark:text-white w-24"
                                            />
                                            <span className="ml-2 text-gray-600 dark:text-gray-400">gramos</span>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Ingrese el peso exacto del objeto utilizado para la calibración.
                                        </p>
                                    </div>
                                )}

                                {/* Indicador de espera del dispositivo */}
                                {waitingDevice && (
                                    <div className="mt-4 flex items-center text-amber-600 dark:text-amber-400">
                                        <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                                        <span className="text-sm">Esperando respuesta del dispositivo...</span>
                                    </div>
                                )}

                                {/* Mostrar error de calibración si existe */}
                                {calibrationStatus.errorCalib > 0 && (
                                    <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded">
                                        <p className="text-sm text-red-700 dark:text-red-300">
                                            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                                            Error del dispositivo (código: {calibrationStatus.errorCalib})
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Acciones */}
                            <div className="flex justify-between">
                                <button
                                    onClick={(loading || waitingDevice) ? null : (step === 1 ? onClose : cancelCalibration)}
                                    disabled={loading || waitingDevice}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {step === 1 ? 'Cancelar' : 'Abortar Calibración'}
                                </button>

                                {/* Botón principal solo en pasos donde se requiere acción del usuario */}
                                {[1, 3, 4].includes(step) && !waitingDevice && (
                                    <button
                                        onClick={(loading || waitingDevice) ? null : handleMainAction}
                                        disabled={loading || waitingDevice}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    >
                                        {getButtonText()}
                                        {!loading && !waitingDevice && (
                                            <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                                        )}
                                    </button>
                                )}

                                {/* Mensaje de espera en pasos automáticos */}
                                {(step === 2 || (step === 3 && waitingDevice)) && (
                                    <div className="flex items-center text-amber-600 dark:text-amber-400">
                                        <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                                        <span className="text-sm">Calibrando...</span>
                                    </div>
                                )}
                            </div>

                            {/* Información adicional */}
                            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Información del Proceso
                                </h4>
                                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                    <li>• El dispositivo debe estar conectado y encendido</li>
                                    <li>• La calibración puede tomar hasta 2 minutos</li>
                                    <li>• No mueva el dispositivo durante el proceso</li>
                                    <li>• Use un peso conocido y estable para mejores resultados</li>
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}