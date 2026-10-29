import { useEffect, useState } from 'react';
import { apiFetch } from './api';

function fechaActualPeru() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const obtener = (tipo) =>
    partes.find((parte) => parte.type === tipo).value;

  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
}

function claveCliente(servicio) {
  return servicio.cliente?.id || 'sin-cliente';
}

function mostrarFecha(fecha) {
  return fecha.split('-').reverse().join('/');
}

async function leerRespuesta(res, mensajeError) {
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || mensajeError);
  }

  if (data === null) {
    throw new Error('El servidor devolvió una respuesta no válida.');
  }

  return data;
}

export default function RegistroHoras() {
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [recarga, setRecarga] = useState(0);

  const [clienteId, setClienteId] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [actividad, setActividad] = useState('');
  const [fecha, setFecha] = useState(fechaActualPeru);
  const [horas, setHoras] = useState('');
  const [noFacturable, setNoFacturable] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [ultimoRegistro, setUltimoRegistro] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargarServicios() {
      try {
        const res = await apiFetch('/horas/servicios');

        const data = await leerRespuesta(
          res,
          'No se pudieron cargar tus servicios asignados.'
        );

        if (!Array.isArray(data)) {
          throw new Error('El servidor no devolvió una lista válida.');
        }

        if (activo) {
          setServicios(data);
        }
      } catch (error) {
        if (activo) {
          setErrorCarga(error.message);
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarServicios();

    return () => {
      activo = false;
    };
  }, [recarga]);

  const clientes = Array.from(
    new Map(
      servicios.map((servicio) => [
        claveCliente(servicio),
        {
          id: claveCliente(servicio),
          nombre: servicio.cliente?.nombre || 'Sin cliente vinculado',
        },
      ])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const serviciosDelCliente = servicios.filter(
    (servicio) => claveCliente(servicio) === clienteId
  );

  const servicioSeleccionado = serviciosDelCliente.find(
    (servicio) => servicio.id === servicioId
  );

  function actualizarServicios() {
    if (guardando) return;

    setClienteId('');
    setServicioId('');
    setServicios([]);
    setErrorCarga('');
    setAviso(null);
    setCargando(true);
    setRecarga((valor) => valor + 1);
  }

  async function registrarHoras(e) {
    e.preventDefault();

    if (guardando || cargando || errorCarga) return;

    setAviso(null);

    if (!servicioSeleccionado) {
      setAviso({
        tipo: 'error',
        texto: 'Selecciona un cliente y uno de sus servicios asignados.',
      });
      return;
    }

    const actividadLimpia = actividad.trim();

    if (!actividadLimpia) {
      setAviso({
        tipo: 'error',
        texto: 'Describe la actividad realizada.',
      });
      return;
    }

    if (!fecha) {
      setAviso({
        tipo: 'error',
        texto: 'Selecciona la fecha del trabajo realizado.',
      });
      return;
    }

    const textoHoras = horas.trim();
    const cantidadHoras = Number(textoHoras);

    if (
      !/^\d+(?:\.\d{1,2})?$/.test(textoHoras) ||
      !Number.isFinite(cantidadHoras) ||
      cantidadHoras <= 0 ||
      cantidadHoras > 8
    ) {
      setAviso({
        tipo: 'error',
        texto:
          'Ingresa una cantidad mayor que cero y de hasta 8 horas, con máximo dos decimales.',
      });
      return;
    }

    setGuardando(true);

    try {
      const res = await apiFetch('/horas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicio_id: servicioSeleccionado.id,
          actividad: actividadLimpia,
          fecha,
          horas: cantidadHoras,
          es_facturable: !noFacturable,
        }),
      });

      const data = await leerRespuesta(
        res,
        'No se pudieron registrar las horas.'
      );

      if (!data.registro?.id) {
        throw new Error(
          'No se pudo confirmar el resultado. Revisa los registros antes de reintentar.'
        );
      }

      setUltimoRegistro({
        ...data.registro,
        nombreServicio: servicioSeleccionado.nombre,
        nombreCliente:
          servicioSeleccionado.cliente?.nombre || 'Sin cliente vinculado',
      });

      setAviso({
        tipo: 'ok',
        texto: 'Horas registradas correctamente. Estado: Pendiente.',
      });


      setActividad('');
      setHoras('');
      setNoFacturable(false);
    } catch (error) {
      setAviso({
        tipo: 'error',
        texto: error.message,
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modulo">
      <header className="modulo__cabecera">
        <h1>Registrar horas</h1>
        <p>
          Registra el trabajo realizado en los servicios que tienes asignados.
        </p>

        <button
          type="button"
          className="boton boton--primario"
          onClick={actualizarServicios}
          disabled={cargando || guardando}
          style={{ marginTop: '12px' }}
        >
          {cargando ? 'Cargando…' : 'Actualizar servicios'}
        </button>
      </header>

      {cargando ? (
        <p role="status">Cargando tus servicios asignados…</p>
      ) : errorCarga ? (
        <p className="aviso aviso--error" role="alert">
          {errorCarga} Pulsa «Actualizar servicios» para volver a intentarlo.
        </p>
      ) : servicios.length === 0 ? (
        <section className="panel">
          <h2>Aún no tienes servicios asignados</h2>
          <p>
            Tu PM debe asignarte a un servicio antes de que puedas registrar
            horas. Después pulsa «Actualizar servicios».
          </p>
        </section>
      ) : (
        <div className="modulo__rejilla">
          <section className="panel panel--apoyo">
            <div className="panel__titulo">
              <h2>Tu registro diario</h2>
            </div>

            <p>
              Puedes registrar hasta <strong>8 horas por día</strong>,
              sumando todos tus servicios.
            </p>

            <p>
              Las actividades no facturables también cuentan para ese límite.
            </p>

            <p>
              Cada registro se guarda con estado <strong>Pendiente</strong>.
            </p>

            <p>
              Usa horas decimales: <strong>1.5</strong> equivale a
              1 hora y 30 minutos.
            </p>

            {ultimoRegistro && (
              <div className="clientes">
                <h3>Último registro guardado</h3>

                <p>
                  <strong>Cliente:</strong>{' '}
                  {ultimoRegistro.nombreCliente}
                </p>

                <p>
                  <strong>Servicio:</strong>{' '}
                  {ultimoRegistro.nombreServicio}
                </p>

                <p>
                  <strong>Actividad:</strong>{' '}
                  {ultimoRegistro.actividad}
                </p>

                <p>
                  <strong>Fecha:</strong>{' '}
                  {mostrarFecha(ultimoRegistro.fecha)}
                </p>

                <p>
                  <strong>Horas:</strong> {ultimoRegistro.horas}
                </p>

                <p>
                  <strong>Tipo:</strong>{' '}
                  {ultimoRegistro.es_facturable
                    ? 'Facturable'
                    : 'No facturable'}
                </p>

                <p>
                  <strong>Estado:</strong> Pendiente
                </p>
              </div>
            )}
          </section>

          <section className="panel panel--principal">
            <div className="panel__titulo">
              <h2>Nueva actividad</h2>
            </div>

            <form
              className="formulario"
              onSubmit={registrarHoras}
              aria-busy={guardando}
            >
              <div className="rejilla-2">
                <div className="campo">
                  <label htmlFor="horas-cliente">Cliente</label>

                  <select
                    id="horas-cliente"
                    value={clienteId}
                    required
                    disabled={guardando}
                    onChange={(e) => {
                      setClienteId(e.target.value);
                      setServicioId('');
                      setAviso(null);
                    }}
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
                  <label htmlFor="horas-servicio">Servicio</label>

                  <select
                    id="horas-servicio"
                    value={servicioId}
                    required
                    disabled={guardando || !clienteId}
                    onChange={(e) => {
                      setServicioId(e.target.value);
                      setAviso(null);
                    }}
                  >
                    <option value="">
                      {clienteId
                        ? 'Selecciona un servicio'
                        : 'Primero selecciona un cliente'}
                    </option>

                    {serviciosDelCliente.map((servicio) => (
                      <option key={servicio.id} value={servicio.id}>
                        {servicio.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="campo">
                <label htmlFor="horas-actividad">Actividad realizada</label>

                <textarea
                  id="horas-actividad"
                  rows={4}
                  placeholder="Ej. Atención de incidencias y soporte a usuarios"
                  value={actividad}
                  required
                  disabled={guardando}
                  onChange={(e) => {
                    setActividad(e.target.value);
                    setAviso(null);
                  }}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px',
                    border: '1px solid #AABBD0',
                    borderRadius: '6px',
                    font: 'inherit',
                    color: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div className="rejilla-2">
                <div className="campo">
                  <label htmlFor="horas-fecha">Fecha del trabajo</label>

                  <input
                    id="horas-fecha"
                    type="date"
                    value={fecha}
                    required
                    disabled={guardando}
                    onChange={(e) => {
                      setFecha(e.target.value);
                      setAviso(null);
                    }}
                  />
                </div>

                <div className="campo">
                  <label htmlFor="horas-cantidad">Cantidad de horas</label>

                  <input
                    id="horas-cantidad"
                    type="number"
                    min="0.01"
                    max="8"
                    step="0.01"
                    placeholder="Ej. 1.5"
                    value={horas}
                    required
                    disabled={guardando}
                    onChange={(e) => {
                      setHoras(e.target.value);
                      setAviso(null);
                    }}
                  />
                </div>
              </div>

              <fieldset className="grupo" disabled={guardando}>
                <legend>Facturabilidad</legend>

                <label
                  htmlFor="horas-no-facturable"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    id="horas-no-facturable"
                    type="checkbox"
                    checked={noFacturable}
                    onChange={(e) => {
                      setNoFacturable(e.target.checked);
                      setAviso(null);
                    }}
                    style={{
                      width: '18px',
                      height: '18px',
                      margin: 0,
                      flexShrink: 0,
                      accentColor: '#214F79',
                    }}
                  />
                  Actividad no facturable
                </label>

                <p style={{ marginBottom: 0 }}>
                  {noFacturable
                    ? 'Estas horas se registrarán como no facturables.'
                    : 'Estas horas se registrarán como facturables.'}
                </p>
              </fieldset>

              <button
                type="submit"
                className="boton boton--primario"
                disabled={guardando || !servicioSeleccionado}
              >
                {guardando ? 'Guardando…' : 'Registrar horas'}
              </button>
            </form>

            {aviso && (
              <p
                className={`aviso ${
                  aviso.tipo === 'error'
                    ? 'aviso--error'
                    : 'aviso--ok'
                }`}
                role={aviso.tipo === 'error' ? 'alert' : 'status'}
              >
                {aviso.texto}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}