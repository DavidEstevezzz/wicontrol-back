import React, { useState, useMemo, useEffect } from 'react';
import Plot from 'react-plotly.js';

const DistribucionNormalPesos = ({ pesadasRangoData }) => {
  // Estado para el índice del día actual
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  // Estado para controlar si estamos en modo oscuro
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detectar el modo oscuro al inicio y cuando cambie
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

  // Definición de temas claro y oscuro (similar a como se hace en la vista principal)
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
  
  // Verificar si hay datos disponibles
  if (!pesadasRangoData || pesadasRangoData.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded shadow text-center">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
          Distribución de Pesos
        </h3>
        <p className="text-gray-600 dark:text-gray-400">No hay datos disponibles para mostrar</p>
      </div>
    );
  }

  // Ordenar los datos por fecha
  const sortedData = useMemo(() => {
    return [...pesadasRangoData].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [pesadasRangoData]);

  // Datos del día actual
  const currentDay = sortedData[currentDayIndex];
  
  // Función para crear grupos de pesos en intervalos de 2g
  const createWeightGroups = (weights) => {
    if (!weights || weights.length === 0) return [];
    
    // Encontrar min y max para establecer el rango
    const minWeight = Math.floor(Math.min(...weights));
    const maxWeight = Math.ceil(Math.max(...weights));
    
    // Crear buckets con intervalos de 2g
    const buckets = {};
    for (let i = minWeight; i <= maxWeight; i += 2) {
      buckets[i] = 0;
    }
    
    // Contar frecuencias
    weights.forEach(weight => {
      const bucket = Math.floor(weight / 2) * 2; // Redondear al grupo de 2g inferior
      buckets[bucket] = (buckets[bucket] || 0) + 1;
    });
    
    // Convertir a array para Plotly
    return Object.keys(buckets)
      .map(weight => ({
        peso: parseInt(weight),
        frecuencia: buckets[weight]
      }))
      .sort((a, b) => a.peso - b.peso); // Asegurar que los puntos estén ordenados
  };

  // Extraer pesos aceptados del día actual
  const acceptedWeights = useMemo(() => {
    if (!currentDay || !currentDay.pesadas) return [];
    return currentDay.pesadas.map(p => p.valor);
  }, [currentDay]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (acceptedWeights.length === 0) return { mean: 0, stdDev: 0 };
    
    const mean = acceptedWeights.reduce((sum, w) => sum + w, 0) / acceptedWeights.length;
    const variance = acceptedWeights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / acceptedWeights.length;
    const stdDev = Math.sqrt(variance);
    
    return { mean, stdDev };
  }, [acceptedWeights]);

  // Calcular porcentajes dentro de desviaciones estándar
  const stdDevPercentages = useMemo(() => {
    if (acceptedWeights.length === 0) return { oneStdDev: 0, twoStdDev: 0, threeStdDev: 0 };
    
    const { mean, stdDev } = stats;
    
    const oneStdDev = acceptedWeights.filter(w => w >= mean - stdDev && w <= mean + stdDev).length;
    const twoStdDev = acceptedWeights.filter(w => w >= mean - 2 * stdDev && w <= mean + 2 * stdDev).length;
    const threeStdDev = acceptedWeights.filter(w => w >= mean - 3 * stdDev && w <= mean + 3 * stdDev).length;
    
    return {
      oneStdDev: (oneStdDev / acceptedWeights.length * 100).toFixed(1),
      twoStdDev: (twoStdDev / acceptedWeights.length * 100).toFixed(1),
      threeStdDev: (threeStdDev / acceptedWeights.length * 100).toFixed(1)
    };
  }, [acceptedWeights, stats]);

  // Preparar datos para la gráfica
  const chartData = useMemo(() => {
    return createWeightGroups(acceptedWeights);
  }, [acceptedWeights]);

  // Verificar si hay suficientes datos para mostrar la distribución
  if (acceptedWeights.length < 10) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
          Distribución de Pesos
        </h3>
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))}
            disabled={currentDayIndex === 0}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            &lt; Día anterior
          </button>
          <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {new Date(currentDay.fecha).toLocaleDateString('es-ES')}
          </div>
          <button 
            onClick={() => setCurrentDayIndex(Math.min(sortedData.length - 1, currentDayIndex + 1))}
            disabled={currentDayIndex === sortedData.length - 1}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Día siguiente &gt;
          </button>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-400 p-4">
          No hay suficientes datos para generar una distribución estadística para esta fecha.
          Se necesitan al menos 10 pesadas para crear una representación significativa.
        </p>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
          <p>Número de pesadas: {acceptedWeights.length}</p>
          <p>Peso medio: {stats.mean.toFixed(2)} g</p>
          <p>Desviación estándar: {stats.stdDev.toFixed(2)} g</p>
        </div>
      </div>
    );
  }

  // Función de densidad de probabilidad normal
  const normalPDF = (x, mean, stdDev) => {
    return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * 
           Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
  };

  // Crear una curva normal (gaussiana) basada en la media y desviación estándar
  const generateGaussianCurve = () => {
    // Si no hay datos, devolver un array vacío
    if (acceptedWeights.length === 0) return { x: [], y: [] };
    
    // Obtener el rango de valores basado en los datos reales
    const minWeight = Math.min(...acceptedWeights);
    const maxWeight = Math.max(...acceptedWeights);
    
    // Expandir el rango a ±4 desviaciones estándar desde la media
    const start = Math.min(minWeight, stats.mean - 4 * stats.stdDev);
    const end = Math.max(maxWeight, stats.mean + 4 * stats.stdDev);
    
    // Generar puntos para la curva (más puntos = curva más suave)
    const points = 200;
    const step = (end - start) / points;
    
    // Arrays para los valores x e y
    const xValues = [];
    const yValues = [];
    
    // Factor de escala para ajustar la altura de la curva a los datos
    const maxFreq = Math.max(...chartData.map(d => d.frecuencia));
    const scaleFactor = maxFreq / normalPDF(stats.mean, stats.mean, stats.stdDev);
    
    // Generar puntos de la curva
    for (let i = 0; i <= points; i++) {
      const x = start + i * step;
      const y = normalPDF(x, stats.mean, stats.stdDev) * scaleFactor;
      xValues.push(x);
      yValues.push(y);
    }
    
    return { x: xValues, y: yValues };
  };
  
  // Obtener curva gaussiana
  const gaussianCurve = generateGaussianCurve();
  
  // Datos de los puntos unidos por líneas (en lugar del histograma)
  const lineData = {
    type: 'scatter',
    x: chartData.map(d => d.peso),
    y: chartData.map(d => d.frecuencia),
    mode: 'lines+markers',
    name: 'Distribución de Pesos',
    line: {
      color: theme.primary,
      width: 2
    },
    marker: {
      color: theme.primary,
      size: 6
    },
    hovertemplate: 'Peso: %{x} g<br>Frecuencia: %{y}<extra></extra>'
  };
  
  // Datos de la curva normal
  const curveData = {
    type: 'scatter',
    x: gaussianCurve.x,
    y: gaussianCurve.y,
    mode: 'lines',
    name: 'Curva Normal',
    line: {
      color: theme.secondary,
      width: 2
    },
    hovertemplate: 'Peso: %{x:.1f} g<br>Densidad: %{y:.2f}<extra></extra>'
  };
  
  // Combinar todos los datos
  const plotlyData = [
    lineData,
    curveData
  ];

  // Configuración del layout de Plotly
  const plotlyLayout = {
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: theme.text
    },
    paper_bgcolor: theme.paper,
    plot_bgcolor: theme.bg,
    margin: { l: 50, r: 30, t: 40, b: 80 },
    title: {
      text: 'Distribución Normal',
      font: { size: 16, color: theme.text }
    },
    xaxis: {
      title: {
        text: 'Peso (g)',
        font: { size: 13, color: theme.text }
      },
      gridcolor: theme.grid,
      zerolinecolor: theme.axisLine,
      linecolor: theme.axisLine
    },
    yaxis: {
      title: {
        text: 'Frecuencia',
        font: { size: 13, color: theme.text }
      },
      gridcolor: theme.grid,
      zerolinecolor: theme.axisLine,
      linecolor: theme.axisLine
    },
    showlegend: false,
    shapes: [
      // Sombreado para ±1 desviación estándar (68.3%)
      {
        type: 'rect',
        x0: stats.mean - stats.stdDev,
        x1: stats.mean + stats.stdDev,
        y0: 0,
        y1: 1,
        yref: 'paper',
        fillcolor: isDarkMode ? 'rgba(255, 220, 180, 0.2)' : 'rgba(255, 220, 180, 0.4)',
        line: { width: 0 }
      },
      // Sombreado para ±2 desviaciones estándar (95.5%)
      {
        type: 'rect',
        x0: stats.mean - (2 * stats.stdDev),
        x1: stats.mean + (2 * stats.stdDev),
        y0: 0,
        y1: 1,
        yref: 'paper',
        fillcolor: isDarkMode ? 'rgba(255, 240, 220, 0.15)' : 'rgba(255, 240, 220, 0.3)',
        line: { width: 0 }
      },
      // Línea para la media
      {
        type: 'line',
        x0: stats.mean,
        x1: stats.mean,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: {
          color: isDarkMode ? 'white' : 'black',
          width: 1.5
        }
      },
      // Línea para -1 desviación estándar
      {
        type: 'line',
        x0: stats.mean - stats.stdDev,
        x1: stats.mean - stats.stdDev,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: {
          color: isDarkMode ? 'rgba(180, 180, 180, 0.7)' : 'rgba(100, 100, 100, 0.7)',
          width: 1,
          dash: 'dash'
        }
      },
      // Línea para +1 desviación estándar
      {
        type: 'line',
        x0: stats.mean + stats.stdDev,
        x1: stats.mean + stats.stdDev,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: {
          color: isDarkMode ? 'rgba(180, 180, 180, 0.7)' : 'rgba(100, 100, 100, 0.7)',
          width: 1,
          dash: 'dash'
        }
      },
      // Línea para -2 desviación estándar
      {
        type: 'line',
        x0: stats.mean - (2 * stats.stdDev),
        x1: stats.mean - (2 * stats.stdDev),
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: {
          color: isDarkMode ? 'rgba(180, 180, 180, 0.5)' : 'rgba(100, 100, 100, 0.5)',
          width: 1,
          dash: 'dot'
        }
      },
      // Línea para +2 desviación estándar
      {
        type: 'line',
        x0: stats.mean + (2 * stats.stdDev),
        x1: stats.mean + (2 * stats.stdDev),
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: {
          color: isDarkMode ? 'rgba(180, 180, 180, 0.5)' : 'rgba(100, 100, 100, 0.5)',
          width: 1,
          dash: 'dot'
        }
      }
    ],
    annotations: [
      // Anotación para la media
      {
        x: stats.mean,
        y: 1,
        yref: 'paper',
        text: 'x̄',
        showarrow: false,
        font: {
          color: theme.text,
          size: 14
        },
        yshift: -5
      },
    ]
  };

  // Configuración para Plotly
  const plotConfig = {
    responsive: true,
    displayModeBar: false, // Ocultar la barra de herramientas para simplificar
    scrollZoom: true
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
      <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
        Distribución de Pesos - {new Date(currentDay.fecha).toLocaleDateString('es-ES')}
      </h3>

      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))}
          disabled={currentDayIndex === 0}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          &lt; Día anterior
        </button>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="mr-4">Peso medio: <b>{stats.mean.toFixed(1)} g</b></span>
          <span>Desv. estándar: <b>{stats.stdDev.toFixed(1)} g</b></span>
        </div>
        
        <button 
          onClick={() => setCurrentDayIndex(Math.min(sortedData.length - 1, currentDayIndex + 1))}
          disabled={currentDayIndex === sortedData.length - 1}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          Día siguiente &gt;
        </button>
      </div>

      <div className="h-80">
        <Plot
          data={plotlyData}
          layout={plotlyLayout}
          config={plotConfig}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className="mt-4 flex justify-around">
        <div className="text-center">
          <span className="text-sm font-medium">±1σ: <b className="text-blue-600 dark:text-blue-400">{stdDevPercentages.oneStdDev}%</b></span>
          <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">(Teórico: 68,3%)</span>
        </div>
        
        <div className="text-center">
          <span className="text-sm font-medium">±2σ: <b className="text-green-600 dark:text-green-400">{stdDevPercentages.twoStdDev}%</b></span>
          <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">(Teórico: 95,5%)</span>
        </div>
        
        <div className="text-center">
          <span className="text-sm font-medium">Muestras: <b>{acceptedWeights.length}</b></span>
        </div>
      </div>
    </div>
  );
};

export default DistribucionNormalPesos;