import { useState } from 'react';

export default function GestionServicios() {
  const [nombreCliente, setNombreCliente] = useState('');
  const [mensaje, setMensaje] = useState('');

  const registrarCliente = async (e) => {
    e.preventDefault();
    
    
    const respuesta = await fetch('http://localhost:4000/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombreCliente })
    });

    const data = await respuesta.json();

    if (respuesta.ok) {
      setMensaje('¡Cliente registrado con éxito!');
      setNombreCliente(''); 
    } else {
      setMensaje('Error: ' + data.error);
    }
  };

  return (
    <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #ddd' }}>
      <h2 style={{ color: '#1F4E79' }}>Gestión de Clientes y Servicios (HU004)</h2>
      
      <div style={{ marginBottom: 30, padding: 20, background: '#f9f9f9', borderRadius: 8 }}>
        <h3>1. Registrar Nuevo Cliente</h3>
        <form onSubmit={registrarCliente}>
          <input 
            type="text" 
            placeholder="Nombre de la empresa (Ej. CANVIA)" 
            value={nombreCliente}
            onChange={(e) => setNombreCliente(e.target.value)}
            style={{ padding: 8, width: '300px', marginRight: 10 }}
            required
          />
          <button type="submit" style={{ padding: '9px 15px', background: '#1F4E79', color: 'white', border: 'none', borderRadius: 4 }}>
            Guardar Cliente
          </button>
        </form>
        {mensaje && <p style={{ color: 'green', marginTop: 10, fontWeight: 'bold' }}>{mensaje}</p>}
      </div>
    </div>
  );
}
