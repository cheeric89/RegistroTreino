import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app'; // Asegúrate de que el nombre del archivo coincida exactamente (app.jsx o App.jsx)
import './styles.css';   // Esto conecta tus estilos

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);