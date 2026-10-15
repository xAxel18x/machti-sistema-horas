import { useState, useEffect } from 'react';

export default function GestionServicios() {
  const [nombreCliente, setNombreCliente] = useState('');
  const [mensajeCliente, setMensajeCliente] = useState('');
  
  // Estados para Servicios
  const [clientes, setClientes] = useState([]); 
  const [pms, setPms] = useState([]); // Estado para la lista de PMs
  const [nuevoServicio, setNuevoServicio] = useState({
    cliente_id: '',
    nombre: '',
    pm_responsable: '',
    fecha_inicio: '',
    fecha_fin: '',
    tarifa_cliente: '',
    horas_contratadas: ''
  });
  const [mensajeServicio, setMensajeServicio] = useState('');

  // Cargar clientes y PMs al iniciar el componente
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        // Cargar Clientes
        const resClientes = await fetch('http://localhost:4000/api/clientes');
        const dataClientes = await resClientes.json();
        setClientes(dataClientes);

        // Cargar PMs
        const resPms = await fetch('http://localhost:4000/api/servicios/pms');
        if (resPms.ok) {
          const dataPms = await resPms.json();
          setPms(dataPms);
        }
      } catch (err) {
        console.error("Error cargando datos iniciales", err);
      }
    };
    cargarDatosIniciales();
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
      fecha_inicio: nuevoServicio.fecha_inicio || null,
      fecha_fin: nuevoServicio.fecha_fin || null,
      tarifa_cliente: tarifa,
      horas_contratadas: cantHoras,
      horas_presupuestadas: cantHoras,
      id_cliente: nuevoServicio.cliente_id,
      cliente_id: nuevoServicio.cliente_id,
      pm_responsable: nuevoServicio.pm_responsable || null
    };

    const res = await fetch('http://localhost:4000/api/servicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setMensajeServicio('¡Servicio registrado con éxito!');
      setNuevoServicio({ 
        cliente_id: '', 
        nombre: '', 
        pm_responsable: '', 
        fecha_inicio: '', 
        fecha_fin: '', 
        tarifa_cliente: '', 
        horas_contratadas: '' 
      });
    } else {
      const errorData = await res.json();
      setMensajeServicio('Error: ' + (errorData.error || errorData.message || 'No se pudo guardar el servicio.'));
    }
  };

  const inputStyle = {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #94A3B8',
    fontSize: '14px',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: '4px',
    display: 'block'
  };

  return (
    <div style={{ maxWidth: '680px', width: '100%', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          filter: opacity(0.6);
        }
      `}</style>

      {/* CONTENEDOR PRINCIPAL */}
      <div style={{ background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', padding: '28px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>

        {/* PASO 1: CLIENTES */}
        <div style={{ position: 'relative', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '14px', padding: '20px', marginBottom: '28px', paddingTop: '24px' }}>
          <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#2563EB', color: '#FFFFFF', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', boxShadow: '0 2px 5px rgba(37,99,235,0.3)' }}>
            1
          </div>

          <h3 style={{ fontSize: '17px', fontWeight: '800', textAlign: 'center', color: '#0F172A', margin: '0 0 16px 0' }}>
            1. Registrar Nuevo Cliente
          </h3>

          <form onSubmit={registrarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Nombre de la empresa</label>
              <input 
                type="text" 
                placeholder="Nombre de la empresa (Ej. CANVIA)" 
                value={nombreCliente} 
                onChange={(e) => setNombreCliente(e.target.value)}
                style={inputStyle} 
                required 
              />
            </div>
            <button type="submit" style={{ padding: '11px', background: '#1D4ED8', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>
              Guardar Cliente
            </button>
          </form>

          {mensajeCliente && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: '#16A34A', marginTop: '12px', fontSize: '13px', fontWeight: '700' }}>
              <span>✔</span> {mensajeCliente}
            </div>
          )}
        </div>

        {/* PASO 2: SERVICIOS */}
        <div style={{ position: 'relative', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '14px', padding: '20px', paddingTop: '24px' }}>
          <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#16A34A', color: '#FFFFFF', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', boxShadow: '0 2px 5px rgba(22,163,74,0.3)' }}>
            2
          </div>

          <h3 style={{ fontSize: '17px', fontWeight: '800', textAlign: 'center', color: '#0F172A', margin: '0 0 16px 0' }}>
            2. Registrar Nuevo Servicio a Cliente
          </h3>

          <form onSubmit={registrarServicio} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Cliente</label>
                <select 
                  required 
                  value={nuevoServicio.cliente_id} 
                  onChange={(e) => setNuevoServicio({...nuevoServicio, cliente_id: e.target.value})}
                  style={inputStyle}
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
              </div>

              <div>
                <label style={labelStyle}>Nombre del Servicio</label>
                <input 
                  type="text" 
                  placeholder="Ej. Soporte Nivel 2" 
                  required
                  value={nuevoServicio.nombre} 
                  onChange={(e) => setNuevoServicio({...nuevoServicio, nombre: e.target.value})}
                  style={inputStyle} 
                />
              </div>
            </div>

            {/*DESPLEGABLE DE PM RESPONSABLE */}
            <div>
              <label style={labelStyle}>PM Responsable</label>
              <select 
                value={nuevoServicio.pm_responsable} 
                onChange={(e) => setNuevoServicio({...nuevoServicio, pm_responsable: e.target.value})}
                style={inputStyle}
              >
                <option value="">-- Selecciona un PM Responsable --</option>
                {pms.map(pm => {
                  const pmId = pm.id || pm.uuid || pm.id_usuario;
                  return (
                    <option key={pmId} value={pmId}>
                      {pm.nombre || pm.nombre_completo || pm.email}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* SECCIÓN FECHAS*/}
            <div style={{ background: '#E2E8F0', padding: '14px', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Fecha Inicio</label>
                <input 
                  type="date" 
                  value={nuevoServicio.fecha_inicio} 
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  onChange={(e) => setNuevoServicio({...nuevoServicio, fecha_inicio: e.target.value})}
                  style={{ ...inputStyle, cursor: 'pointer' }} 
                />
              </div>

              <div>
                <label style={labelStyle}>Fecha Fin</label>
                <input 
                  type="date" 
                  value={nuevoServicio.fecha_fin} 
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  onChange={(e) => setNuevoServicio({...nuevoServicio, fecha_fin: e.target.value})}
                  style={{ ...inputStyle, cursor: 'pointer' }} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Tarifa por hora (S/)</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  required 
                  step="0.01"
                  value={nuevoServicio.tarifa_cliente} 
                  onChange={(e) => setNuevoServicio({...nuevoServicio, tarifa_cliente: e.target.value})}
                  style={inputStyle} 
                />
              </div>

              <div>
                <label style={labelStyle}>Horas contratadas</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  required
                  value={nuevoServicio.horas_contratadas} 
                  onChange={(e) => setNuevoServicio({...nuevoServicio, horas_contratadas: e.target.value})}
                  style={inputStyle} 
                />
              </div>
            </div>

            <button type="submit" style={{ padding: '12px', background: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', marginTop: '6px' }}>
              Guardar Servicio
            </button>
          </form>

          {mensajeServicio && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: mensajeServicio.includes('Error') ? '#DC2626' : '#16A34A', marginTop: '12px', fontSize: '13px', fontWeight: '700' }}>
              <span>{mensajeServicio.includes('Error') ? '✖' : '✔'}</span> {mensajeServicio}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
