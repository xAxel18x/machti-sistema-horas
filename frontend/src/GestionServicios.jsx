import { useState, useEffect } from 'react';

export default function GestionServicios() {
  const [nombreCliente, setNombreCliente] = useState('');
  const [mensajeCliente, setMensajeCliente] = useState('');
  
  // Estados para Servicios
  const [clientes, setClientes] = useState([]); 
  const [nuevoServicio, setNuevoServicio] = useState({
    cliente_id: '', nombre: '', tarifa_cliente: '', horas_contratadas: ''
  });
  const [mensajeServicio, setMensajeServicio] = useState('');

  // Cargar clientes al iniciar
  useEffect(() => {
    const obtenerClientes = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/clientes');
        const data = await res.json();
        setClientes(data);
      } catch (err) {
        console.error("Error cargando clientes", err);
      }
    };
    obtenerClientes();
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
      
      const resClientes = await fetch('http://localhost:4000/api/clientes');
      const dataClientes = await resClientes.json();
      setClientes(dataClientes);
    }
  };

  // Función Guardar Servicio
  const registrarServicio = async (e) => {
    e.preventDefault();

    if (!nuevoServicio.cliente_id) {
      setMensajeServicio('Error: Por favor selecciona un cliente de la lista.');
      return;
    }

    const cantHoras = Number(nuevoServicio.horas_contratadas) || 0;
    const tarifa = Number(nuevoServicio.tarifa_cliente) || 0;

    const payload = {
      nombre: nuevoServicio.nombre,
      tarifa_cliente: tarifa,
      horas_contratadas: cantHoras,
      horas_presupuestadas: cantHoras,
      id_cliente: nuevoServicio.cliente_id,
      cliente_id: nuevoServicio.cliente_id
    };

    const res = await fetch('http://localhost:4000/api/servicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setMensajeServicio('¡Servicio registrado con éxito!');
      setNuevoServicio({ cliente_id: '', nombre: '', tarifa_cliente: '', horas_contratadas: '' });
    } else {
      const errorData = await res.json();
      setMensajeServicio('Error: ' + (errorData.error || errorData.message || 'No se pudo guardar el servicio.'));
    }
  };

  return (
    <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #ddd' }}>
      <h2 style={{ color: '#1F4E79' }}>Gestión de Clientes y Servicios</h2>
      
      {/* 1. SECCIÓN CLIENTES */}
      <div style={{ marginBottom: 30, padding: 20, background: '#f9f9f9', borderRadius: 8 }}>
        <h3>1. Registrar Nuevo Cliente</h3>
        <form onSubmit={registrarCliente}>
          <input 
            type="text" 
            placeholder="Nombre de la empresa" 
            value={nombreCliente} 
            onChange={(e) => setNombreCliente(e.target.value)}
            style={{ padding: 8, width: '300px', marginRight: 10 }} 
            required 
          />
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
          
          <select 
            required 
            value={nuevoServicio.cliente_id} 
            onChange={(e) => setNuevoServicio({...nuevoServicio, cliente_id: e.target.value})}
            style={{ padding: 8 }}
          >
            <option value="">-- Selecciona un Cliente --</option>
            {clientes.map(cli => {
              const idValido = cli.id || cli.id_cliente || cli.cliente_id || cli.uuid;
              return (
                <option key={idValido} value={idValido}>
                  {cli.nombre || cli.nombre_empresa}
                </option>
              );
            })}
          </select>

          <input 
            type="text" 
            placeholder="Nombre del Servicio (Ej. Soporte Nivel 2)" 
            required
            value={nuevoServicio.nombre} 
            onChange={(e) => setNuevoServicio({...nuevoServicio, nombre: e.target.value})}
            style={{ padding: 8 }} 
          />

          <input 
            type="number" 
            placeholder="Tarifa por hora (S/)" 
            required 
            step="0.01"
            value={nuevoServicio.tarifa_cliente} 
            onChange={(e) => setNuevoServicio({...nuevoServicio, tarifa_cliente: e.target.value})}
            style={{ padding: 8 }} 
          />

          <input 
            type="number" 
            placeholder="Horas contratadas" 
            required
            value={nuevoServicio.horas_contratadas} 
            onChange={(e) => setNuevoServicio({...nuevoServicio, horas_contratadas: e.target.value})}
            style={{ padding: 8 }} 
          />

          <button type="submit" style={{ padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: 4, fontWeight: 'bold' }}>
            Guardar Servicio
          </button>
        </form>
        {mensajeServicio && (
          <p style={{ color: mensajeServicio.includes('Error') ? 'red' : 'green', marginTop: 10 }}>
            {mensajeServicio}
          </p>
        )}
      </div>

    </div>
  );
}
