import { useState, useEffect } from 'react';
import { apiFetch } from './api';

// Icono
function IconoOjo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const CATALOGO_SERVICIOS = [
  { nombre: 'Soporte Nivel 1 (Helpdesk)', tarifa: 50.00 },
  { nombre: 'Soporte Nivel 2 (Especializado)', tarifa: 80.00 },
  { nombre: 'Consultoría Cloud & DevOps', tarifa: 150.00 },
  { nombre: 'Desarrollo de Software a Medida', tarifa: 120.00 },
  { nombre: 'Auditoría y Seguridad TI', tarifa: 180.00 },
  { nombre: 'Gestión de Infraestructura y Redes', tarifa: 95.00 },
];

const SERVICIO_INICIAL = {
  cliente_id: '',
  nombre: '',
  pm_responsable: '',
  fecha_inicio: '',
  fecha_fin: '',
  tarifa_cliente: '',
  horas_contratadas: '',
};

export default function GestionServicios() {
  const [rucCliente, setRucCliente] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [correoCliente, setCorreoCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  
  const [buscandoRuc, setBuscandoRuc] = useState(false);
  const [mensajeCliente, setMensajeCliente] = useState('');
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  const [clientes, setClientes] = useState([]);
  const [pms, setPms] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [nuevoServicio, setNuevoServicio] = useState({
    ...SERVICIO_INICIAL,
  });
  const [mensajeServicio, setMensajeServicio] = useState('');
  const [guardandoServicio, setGuardandoServicio] = useState(false);

  const hoyStr = new Date().toLocaleDateString('en-CA');

  async function leerRespuesta(res, mensajeError) {
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || data?.message || mensajeError);
    }

    if (data === null) {
      throw new Error('El servidor devolvió una respuesta no válida.');
    }

    return data;
  }

  useEffect(() => {
    let activo = true;

    const cargarDatosIniciales = async () => {
      setCargandoDatos(true);
      setErrorCarga('');

      try {
        const [resClientes, resPms] = await Promise.all([
          apiFetch('/clientes'),
          apiFetch('/servicios/pms'),
        ]);

        const [dataClientes, dataPms] = await Promise.all([
          leerRespuesta(resClientes, 'No se pudieron cargar los clientes.'),
          leerRespuesta(resPms, 'No se pudieron cargar los PMs.'),
        ]);

        if (!Array.isArray(dataClientes) || !Array.isArray(dataPms)) {
          throw new Error('El servidor no devolvió los listados esperados.');
        }

        if (activo) {
          setClientes(dataClientes);
          setPms(dataPms);
        }
      } catch (error) {
        if (activo) {
          setErrorCarga(error.message || 'No se pudieron cargar los datos.');
        }
      } finally {
        if (activo) {
          setCargandoDatos(false);
        }
      }
    };

    cargarDatosIniciales();

    return () => {
      activo = false;
    };
  }, []);

  const buscarRuc = () => {
    const rucLimpio = rucCliente.trim();

    if (rucLimpio.length !== 11) {
      setMensajeCliente('Error: El RUC debe tener exactamente 11 dígitos.');
      return;
    }

    setBuscandoRuc(true);
    setMensajeCliente('');

    apiFetch('/clientes/buscar-ruc/' + rucLimpio)
      .then((res) => leerRespuesta(res, 'No se encontró la empresa con ese RUC.'))
      .then((datos) => {
        setNombreCliente(datos.nombre || '');
        setMensajeCliente('¡Razón social encontrada exitosamente!');
      })
      .catch((err) => {
        setMensajeCliente('Error: ' + (err.message || 'No se pudo obtener la Razón Social.'));
        setNombreCliente('');
      })
      .finally(() => {
        setBuscandoRuc(false);
      });
  };

  const registrarCliente = async (e) => {
    e.preventDefault();

    if (guardandoCliente) return;

    setMensajeCliente('');

    const nombre = nombreCliente.trim();

    if (!nombre) {
      setMensajeCliente('Error: Ingresa el nombre o razón social de la empresa.');
      return;
    }

    setGuardandoCliente(true);

    try {
      const payload = {
        ruc: rucCliente.trim() || null,
        nombre: nombre,
        nombre_comercial: nombreComercial.trim() || null,
        correo: correoCliente.trim() || null,
        telefono: telefonoCliente.trim() || null,
      };

      const res = await apiFetch('/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      await leerRespuesta(res, 'No se pudo registrar el cliente.');

      setRucCliente('');
      setNombreCliente('');
      setNombreComercial('');
      setCorreoCliente('');
      setTelefonoCliente('');
      setMensajeCliente('¡Cliente registrado con éxito!');

      try {
        const resClientes = await apiFetch('/clientes');
        const dataClientes = await leerRespuesta(
          resClientes,
          'No se pudo actualizar la lista de clientes.'
        );

        if (!Array.isArray(dataClientes)) {
          throw new Error('El servidor no devolvió una lista de clientes válida.');
        }

        setClientes(dataClientes);
      } catch (error) {
        setMensajeCliente(
          'Error: El cliente sí se registró, pero no se pudo actualizar el listado. Recarga la página. ' +
            error.message
        );
      }
    } catch (error) {
      setMensajeCliente(
        'Error: ' + (error.message || 'No se pudo registrar el cliente.')
      );
    } finally {
      setGuardandoCliente(false);
    }
  };

  const handleSeleccionServicio = (nombreSeleccionado) => {
    const itemEncontrado = CATALOGO_SERVICIOS.find(
      (s) => s.nombre === nombreSeleccionado
    );

    setNuevoServicio((prev) => ({
      ...prev,
      nombre: nombreSeleccionado,
      tarifa_cliente: itemEncontrado ? itemEncontrado.tarifa.toFixed(2) : '',
    }));
  };

  const registrarServicio = async (e) => {
    e.preventDefault();

    if (guardandoServicio) return;

    setMensajeServicio('');

    if (!nuevoServicio.cliente_id) {
      setMensajeServicio('Error: Por favor selecciona un cliente de la lista.');
      return;
    }

    if (!nuevoServicio.nombre) {
      setMensajeServicio('Error: Selecciona un servicio del catálogo.');
      return;
    }

    if (!nuevoServicio.pm_responsable) {
      setMensajeServicio('Error: Selecciona un PM responsable.');
      return;
    }

    if (!nuevoServicio.fecha_inicio) {
      setMensajeServicio('Error: Ingresa la fecha de inicio del servicio.');
      return;
    }

    if (nuevoServicio.fecha_inicio < hoyStr) {
      setMensajeServicio('Error: La fecha de inicio no puede ser anterior a la fecha actual.');
      return;
    }

    if (nuevoServicio.fecha_fin && nuevoServicio.fecha_fin < nuevoServicio.fecha_inicio) {
      setMensajeServicio('Error: La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    if (
      nuevoServicio.tarifa_cliente === '' ||
      nuevoServicio.horas_contratadas === ''
    ) {
      setMensajeServicio('Error: Ingresa las horas contratadas.');
      return;
    }

    const tarifa = Number(nuevoServicio.tarifa_cliente);
    const cantHoras = Number(nuevoServicio.horas_contratadas);

    if (
      !Number.isFinite(tarifa) ||
      !Number.isFinite(cantHoras) ||
      tarifa <= 0 ||
      cantHoras <= 0
    ) {
      setMensajeServicio(
        'Error: La tarifa y las horas contratadas deben ser números mayores a cero.'
      );
      return;
    }

    const payload = {
      nombre: nuevoServicio.nombre,
      fecha_inicio: nuevoServicio.fecha_inicio,
      fecha_fin: nuevoServicio.fecha_fin || null,
      tarifa_cliente: tarifa,
      horas_contratadas: cantHoras,
      horas_presupuestadas: cantHoras,
      cliente_id: nuevoServicio.cliente_id,
      pm_responsable: nuevoServicio.pm_responsable,
    };

    setGuardandoServicio(true);

    try {
      const res = await apiFetch('/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      await leerRespuesta(res, 'No se pudo registrar el servicio.');

      setMensajeServicio('¡Servicio registrado con éxito!');
      setNuevoServicio({ ...SERVICIO_INICIAL });
    } catch (error) {
      setMensajeServicio(
        'Error: ' + (error.message || 'No se pudo registrar el servicio.')
      );
    } finally {
      setGuardandoServicio(false);
    }
  };

  const actualizarServicio = (campo, valor) => {
    setNuevoServicio((anterior) => {
      const actualizado = { ...anterior, [campo]: valor };
      if (campo === 'fecha_inicio' && actualizado.fecha_fin && actualizado.fecha_fin < valor) {
        actualizado.fecha_fin = '';
      }
      return actualizado;
    });
  };

  const montoEstimado =
    (Number(nuevoServicio.tarifa_cliente) || 0) *
    (Number(nuevoServicio.horas_contratadas) || 0);

  const montoTexto =
    montoEstimado > 0
      ? montoEstimado.toLocaleString('es-PE', {
          style: 'currency',
          currency: 'PEN',
        })
      : '—';

  const esError = (mensaje) => mensaje.startsWith('Error:');

  return (
    <div className="modulo">
      <header className="modulo__cabecera">
        <h1>Clientes y servicios</h1>
        <p>
          Registra a quién le presta servicio MACH TI y bajo qué condiciones.
        </p>
      </header>

      {cargandoDatos && (
        <p role="status">Cargando clientes y PMs…</p>
      )}

      {errorCarga && (
        <p className="aviso aviso--error" role="alert">
          <span aria-hidden="true">✖</span> {errorCarga}
        </p>
      )}

      <div className="modulo__rejilla">
        {/* === PASO 1: CLIENTES === */}
        <section
          className="panel panel--apoyo"
          aria-labelledby="titulo-cliente"
        >
          <div className="panel__titulo">
            <span className="paso" aria-hidden="true">
              1
            </span>
            <h2 id="titulo-cliente">Registrar cliente</h2>
          </div>

          <form className="formulario" onSubmit={registrarCliente}>
            <div className="campo" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="cliente-ruc">RUC de la empresa</label>
                <input
                  id="cliente-ruc"
                  type="text"
                  maxLength="11"
                  placeholder="11 dígitos"
                  value={rucCliente}
                  onChange={(e) => setRucCliente(e.target.value.replace(/\D/g, ''))}
                  disabled={guardandoCliente || buscandoRuc}
                  required
                />
              </div>
              <button
                type="button"
                className="boton boton--secundario"
                onClick={buscarRuc}
                disabled={buscandoRuc || rucCliente.trim().length !== 11}
                style={{ padding: '0.6rem 1rem', height: 'fit-content' }}
              >
                {buscandoRuc ? 'Buscando...' : 'Buscar RUC'}
              </button>
            </div>

            <div className="campo">
              <label htmlFor="cliente-nombre">Razón Social</label>
              <input
                id="cliente-nombre"
                type="text"
                placeholder="Ej. CENCOSUD RETAIL PERU S.A."
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                disabled={guardandoCliente}
                required
              />
            </div>

            <div className="campo">
              <label htmlFor="cliente-comercial">Nombre Comercial / Marca (Opcional)</label>
              <input
                id="cliente-comercial"
                type="text"
                placeholder="Ej. Metro, Wong, Falabella..."
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
                disabled={guardandoCliente}
              />
            </div>

            <div className="rejilla-2" style={{ display: 'flex', gap: '1rem' }}>
              <div className="campo" style={{ flex: 1 }}>
                <label htmlFor="cliente-correo">Correo de contacto</label>
                <input
                  id="cliente-correo"
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={correoCliente}
                  onChange={(e) => setCorreoCliente(e.target.value)}
                  disabled={guardandoCliente}
                  required
                />
              </div>

              <div className="campo" style={{ flex: 1 }}>
                <label htmlFor="cliente-telefono">Teléfono</label>
                <input
                  id="cliente-telefono"
                  type="text"
                  placeholder="Ej. 999888777"
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                  disabled={guardandoCliente}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="boton boton--primario"
              disabled={guardandoCliente}
              style={{ marginTop: '1rem' }}
            >
              {guardandoCliente ? 'Registrando…' : 'Registrar cliente'}
            </button>
          </form>

          {mensajeCliente && (
            <p
              className={`aviso ${
                esError(mensajeCliente) ? 'aviso--error' : 'aviso--ok'
              }`}
              role={esError(mensajeCliente) ? 'alert' : 'status'}
            >
              <span aria-hidden="true">
                {esError(mensajeCliente) ? '✖' : '✔'}
              </span>{' '}
              {mensajeCliente}
            </p>
          )}

          <div className="clientes">
            <div className="clientes__cabecera">
              <h3>Clientes registrados</h3>
              <span className="contador">{clientes.length}</span>
            </div>

            {cargandoDatos ? (
              <p className="clientes__vacio">Cargando clientes…</p>
            ) : clientes.length === 0 ? (
              <p className="clientes__vacio">
                {errorCarga
                  ? 'No se pudo cargar el listado de clientes.'
                  : 'Aún no hay clientes. Registra el primero para poder crear servicios.'}
              </p>
            ) : (
              <ul className="clientes__lista">
                {clientes.map((cliente) => (
                  <li 
                    key={cliente.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '0.45rem 0.25rem',
                      borderBottom: '1px solid #f0f0f0'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                      {cliente.nombre}
                    </span>
                    <button
                      type="button"
                      title="Ver ficha técnica"
                      onClick={() => setClienteSeleccionado(cliente)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        borderRadius: '5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1e3a8a',
                        transition: 'all 0.15s ease-in-out'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e2e8f0';
                        e.currentTarget.style.borderColor = '#94a3b8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                    >
                      <IconoOjo />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* === PASO 2: SERVICIOS === */}
        <section
          className="panel panel--principal"
          aria-labelledby="titulo-servicio"
        >
          <div className="panel__titulo">
            <span className="paso" aria-hidden="true">
              2
            </span>
            <h2 id="titulo-servicio">Registrar servicio</h2>
          </div>

          <form className="formulario" onSubmit={registrarServicio}>
            <div className="rejilla-2">
              <div className="campo">
                <label htmlFor="servicio-cliente">Cliente</label>
                <select
                  id="servicio-cliente"
                  required
                  value={nuevoServicio.cliente_id}
                  disabled={cargandoDatos || guardandoServicio}
                  onChange={(e) =>
                    actualizarServicio('cliente_id', e.target.value)
                  }
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo">
                <label htmlFor="servicio-nombre">Nombre del servicio</label>
                <select
                  id="servicio-nombre"
                  required
                  value={nuevoServicio.nombre}
                  disabled={guardandoServicio}
                  onChange={(e) => handleSeleccionServicio(e.target.value)}
                >
                  <option value="">Selecciona un tipo de servicio</option>
                  {CATALOGO_SERVICIOS.map((item) => (
                    <option key={item.nombre} value={item.nombre}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="campo">
              <label htmlFor="servicio-pm">PM responsable</label>
              <select
                id="servicio-pm"
                required
                value={nuevoServicio.pm_responsable}
                disabled={cargandoDatos || guardandoServicio}
                onChange={(e) =>
                  actualizarServicio('pm_responsable', e.target.value)
                }
              >
                <option value="">Selecciona un PM responsable</option>
                {pms.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.nombre}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="grupo" disabled={guardandoServicio}>
              <legend>Vigencia del servicio</legend>

              <div className="rejilla-2">
                <div className="campo">
                  <label htmlFor="servicio-inicio">Fecha de inicio</label>
                  <input
                    id="servicio-inicio"
                    type="date"
                    required
                    min={hoyStr}
                    value={nuevoServicio.fecha_inicio}
                    onChange={(e) =>
                      actualizarServicio('fecha_inicio', e.target.value)
                    }
                  />
                </div>

                <div className="campo">
                  <label htmlFor="servicio-fin">Fecha de fin</label>
                  <input
                    id="servicio-fin"
                    type="date"
                    min={nuevoServicio.fecha_inicio || hoyStr}
                    value={nuevoServicio.fecha_fin}
                    onChange={(e) =>
                      actualizarServicio('fecha_fin', e.target.value)
                    }
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="grupo" disabled={guardandoServicio}>
              <legend>Condiciones económicas</legend>

              <div className="rejilla-2">
                <div className="campo">
                  <label htmlFor="servicio-tarifa">
                    Tarifa por hora (S/)
                  </label>
                  <input
                    id="servicio-tarifa"
                    type="number"
                    placeholder="0.00"
                    required
                    readOnly
                    style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                    value={nuevoServicio.tarifa_cliente}
                  />
                </div>

                <div className="campo">
                  <label htmlFor="servicio-horas">
                    Horas contratadas
                  </label>
                  <input
                    id="servicio-horas"
                    type="number"
                    placeholder="0"
                    required
                    min="1"
                    step="1"
                    value={nuevoServicio.horas_contratadas}
                    onChange={(e) =>
                      actualizarServicio('horas_contratadas', e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="valor">
                <span className="valor__etiqueta">
                  Valor estimado del servicio (tarifa × horas)
                </span>
                <span className="valor__monto">{montoTexto}</span>
              </div>
            </fieldset>

            <button
              type="submit"
              className="boton boton--primario"
              disabled={guardandoServicio || cargandoDatos}
            >
              {guardandoServicio ? 'Registrando…' : 'Registrar servicio'}
            </button>
          </form>

          {mensajeServicio && (
            <p
              className={`aviso ${
                esError(mensajeServicio) ? 'aviso--error' : 'aviso--ok'
              }`}
              role={esError(mensajeServicio) ? 'alert' : 'status'}
            >
              <span aria-hidden="true">
                {esError(mensajeServicio) ? '✖' : '✔'}
              </span>{' '}
              {mensajeServicio}
            </p>
          )}
        </section>
      </div>

      {/* === MODAL DE DETALLE DEL CLIENTE === */}
      {clienteSeleccionado && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setClienteSeleccionado(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '600' }}>
                Ficha del Cliente
              </h3>
              <button
                type="button"
                onClick={() => setClienteSeleccionado(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '2px 6px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.92rem', color: '#334155' }}>
              <div>
                <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Razón Social</strong>
                <span style={{ fontWeight: '500', color: '#0f172a' }}>{clienteSeleccionado.nombre || '—'}</span>
              </div>

              <div>
                <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre Comercial / Marca</strong>
                <span>{clienteSeleccionado.nombre_comercial || 'No especificado'}</span>
              </div>

              <div>
                <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RUC</strong>
                <span>{clienteSeleccionado.ruc || 'No registrado'}</span>
              </div>

              <div>
                <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correo de contacto</strong>
                <span>{clienteSeleccionado.correo || 'No registrado'}</span>
              </div>

              <div>
                <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teléfono</strong>
                <span>{clienteSeleccionado.telefono || 'No registrado'}</span>
              </div>

              {clienteSeleccionado.creado_en && (
                <div>
                  <strong style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha de registro</strong>
                  <span>
                  {(() => {             
                    const fechaUtcStr = clienteSeleccionado.creado_en.endsWith('Z')
                      ? clienteSeleccionado.creado_en
                      : `${clienteSeleccionado.creado_en}Z`;

                    return new Date(fechaUtcStr).toLocaleString('es-PE', {
                      timeZone: 'America/Lima',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    });
                  })()}
                </span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button
                type="button"
                className="boton boton--primario"
                onClick={() => setClienteSeleccionado(null)}
                style={{ padding: '0.45rem 1.25rem' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
