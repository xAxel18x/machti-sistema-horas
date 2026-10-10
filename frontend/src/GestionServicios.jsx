import { useState, useEffect } from 'react';

export default function GestionServicios() {

  const [nombreCliente, setNombreCliente] = useState('');
  const [mensajeCliente, setMensajeCliente] = useState('');
  
  // Estados para Servicios
  const [clientes, setClientes] = useState([]); 
  const [nuevoServicio, setNuevoServicio] = useState({
    cliente_id: '', nombre: '', pm_responsable: '', tarifa_cliente: '', horas_presupuestadas: ''
  });
  const [mensajeServicio, setMensajeServicio] = useState('');

 
  useEffect(() => {
    fetch('http://localhost:4000/api/clientes')
      .then(res => res.json())
      .then(data => setClientes(data))
      .catch(err => console.error("Error cargando clientes", err));
  }, []);

  // Función Guardar Cliente
  const registrarCliente = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:4000/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombreCliente })
    });
    if (res.ok) {
      setMensajeCliente('¡Cliente registrado con éxito!');
      setNombreCliente('');
      // Recargar lista de clientes
      const nuevosClientes = await fetch('http://localhost:4000/api/clientes').then(r => r.json());
      setClientes(nuevosClientes);
    }
  };

  // Función Guardar Servicio
  const registrarServicio = async (e) => {
    e.preventDefault();

    const res = await fetch('http://localhost:4000/api/servicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoServicio)
    });
    if (res.ok) {
      setMensajeServicio('¡Servicio registrado con éxito!');
      setNuevoServicio({ cliente_id: '', nombre: '', pm_responsable: '', tarifa_cliente: '', horas_presupuestadas: '' });
    } else {
      const errorData = await res.json();
      setMensajeServicio('Error: ' + errorData.error);
    }
  };

  return (
    <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #ddd' }}>
      <h2 style={{ color: '#1F4E79' }}>Gestión de Clientes y Servicios (HU004)</h2>
      
      {/* 1. SECCIÓN CLIENTES */}
      <div style={{ marginBottom: 30, padding: 20, background: '#f9f9f9', borderRadius: 8 }}>
        <h3>1. Registrar Nuevo Cliente</h3>
        <form onSubmit={registrarCliente}>
          <input type="text" placeholder="Nombre de la empresa (Ej. CANVIA)" 
            value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)}
            style={{ padding: 8, width: '300px', marginRight: 10 }} required />
          <button type="submit" style={{ padding: '9px 15px', background: '#1F4E79', color: 'white', border: 'none', borderRadius: 4 }}>
            Guardar Cliente
          </button>
        </form>
        {mensajeCliente && <p style={{ color: 'green', marginTop: 10 }}>{mensajeCliente}</p>}
      </div>

      {/* 2. SECCIÓN SERVICIOS */}
      <div style={{ padding: 20, background: '#eef2f5', borderRadius: 8 }}>
        <h3>2. Registrar Nuevo Servicio a un Cliente</h3>
        <form onSubmit={registrarServicio} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
          
          <select required value={nuevoServicio.cliente_id} 
            onChange={(e) => setNuevoServicio({...nuevoServicio, cliente_id: e.target.value})}
            style={{ padding: 8 }}>
            <option value="">-- Selecciona un Cliente --</option>
            {clientes.map(cli => (
              <option key={cli.id} value={cli.id}>{cli.nombre}</option>
            ))}
          </select>

          <input type="text" placeholder="Nombre del Servicio (Ej. Soporte Nivel 2)" required
            value={nuevoServicio.nombre} onChange={(e) => setNuevoServicio({...nuevoServicio, nombre: e.target.value})}
            style={{ padding: 8 }} />

          <input type="number" placeholder="Tarifa por hora ($)" required step="0.01"
            value={nuevoServicio.tarifa_cliente} onChange={(e) => setNuevoServicio({...nuevoServicio, tarifa_cliente: e.target.value})}
            style={{ padding: 8 }} />

          <input type="number" placeholder="Horas presupuestadas" required
            value={nuevoServicio.horas_presupuestadas} onChange={(e) => setNuevoServicio({...nuevoServicio, horas_presupuestadas: e.target.value})}
            style={{ padding: 8 }} />

          <button type="submit" style={{ padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: 4, fontWeight: 'bold' }}>
            Guardar Servicio
          </button>
        </form>
        {mensajeServicio && <p style={{ color: mensajeServicio.includes('Error') ? 'red' : 'green', marginTop: 10 }}>{mensajeServicio}</p>}
      </div>

    </div>
  );
}
