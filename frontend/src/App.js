import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [status, setStatus] = useState('Verificando conexión...');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responseDetails, setResponseDetails] = useState(null);
  const [requestUrl, setRequestUrl] = useState('');
  const [responseText, setResponseText] = useState('');
  
  useEffect(() => {
    const testConnection = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL;
        const fullUrl = `${apiUrl}/api/controller-test`;
        console.log('URL completa de solicitud:', fullUrl);
        setRequestUrl(fullUrl);
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Respuesta completa:', response);
        
        // Capturar los detalles de la respuesta
        const responseInfo = {
          status: response.status,
          statusText: response.statusText,
          headers: {},
          type: response.type,
          url: response.url,
          redirected: response.redirected
        };
        
        // Convertir los headers a un objeto para visualizarlos
        response.headers.forEach((value, key) => {
          responseInfo.headers[key] = value;
        });
        
        setResponseDetails(responseInfo);
        
        // Guardar el texto de la respuesta para debugging
        const responseClone = response.clone();
        const text = await responseClone.text();
        setResponseText(text);
        
        // Verificar si comienza con <!DOCTYPE para detectar HTML
        if (text.trim().startsWith('<!DOCTYPE')) {
          throw new Error('Recibido HTML en lugar de JSON. Probablemente recibiendo la página de bienvenida de Laravel.');
        }
        
        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Intentar parsear como JSON
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          throw new Error(`Error al parsear JSON: ${parseError.message}`);
        }
        
        setStatus('Conexión exitosa');
        setMessage(data.message || 'Recibidos datos de la API');
        console.log('Datos parseados:', data);
      } catch (err) {
        setStatus('Error de conexión');
        setError(err.message);
        console.error('Error detallado:', err);
      } finally {
        setLoading(false);
      }
    };
    
    testConnection();
  }, []);
  
  return (
    <div className="App">
      <header className="App-header">
        <h1 className="text-3xl font-bold mb-2">WiControl App</h1>
        <p className="text-xl mb-4">Prueba de conexión con la API</p>
        <div className={`p-4 rounded-lg mt-3 max-w-4xl text-left ${
          status === 'Conexión exitosa' 
            ? 'bg-green-100 text-green-800' 
            : status === 'Error de conexión' 
              ? 'bg-red-100 text-red-800' 
              : 'bg-gray-100 text-gray-800'
        }`}>
          <h3 className="text-xl font-semibold mb-2">{status}</h3>
          {loading && <p className="text-gray-600">Cargando...</p>}
          {message && <p className="mb-2"><strong>Mensaje:</strong> {message}</p>}
          {error && (
            <div className="mb-4">
              <p className="text-red-600 font-medium"><strong>Error:</strong> {error}</p>
              <p className="mt-1"><strong>URL solicitada:</strong> {requestUrl}</p>
            </div>
          )}
          
          {responseDetails && (
            <div className="mt-5 border border-gray-300 p-3 rounded-lg">
              <h4 className="text-lg font-medium mb-2">Detalles de la respuesta:</h4>
              <p className="mb-1"><strong>Status:</strong> {responseDetails.status} {responseDetails.statusText}</p>
              <p className="mb-1"><strong>URL:</strong> {responseDetails.url}</p>
              <p className="mb-1"><strong>Tipo:</strong> {responseDetails.type}</p>
              <p className="mb-3"><strong>Redirigido:</strong> {responseDetails.redirected ? 'Sí' : 'No'}</p>
              
              <div>
                <h5 className="font-medium mb-1">Cabeceras:</h5>
                <pre className="bg-gray-100 p-3 rounded text-sm max-h-48 overflow-auto">
                  {JSON.stringify(responseDetails.headers, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {responseText && (
            <div className="mt-5">
              <h4 className="text-lg font-medium mb-2">Contenido de la respuesta:</h4>
              <div className="bg-gray-100 p-3 rounded max-h-72 overflow-auto text-left whitespace-pre-wrap text-xs">
                {responseText.length > 500 
                  ? responseText.substring(0, 500) + '... (respuesta truncada)'
                  : responseText
                }
              </div>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;