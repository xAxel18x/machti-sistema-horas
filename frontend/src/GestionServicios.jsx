import { useState, useEffect } from 'react';
import { apiFetch } from './api';

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
  const [nombreCliente, setNombreCliente] = useState('');
  const [mensajeCliente, setMensajeCliente] = useState('');
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  const [clientes, setClientes] = useState([]);
  const [pms, setPms] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [nuevoServicio, setNuevoServicio] = useState({
    ...SERVICIO_INICIAL,
  });
  const [mensajeServicio, setMensajeServicio] = useState('');
  const [guardandoServicio, setGuardandoServicio] = useState(false);

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

  // Registrar cliente
  const registrarCliente = async (e) => {
    e.preventDefault();

    if (guardandoCliente) return;

    setMensajeCliente('');

    const nombre = nombreCliente.trim();

    if (!nombre) {
      setMensajeCliente('Error: Ingresa el nombre de la empresa.');
      return;
    }

    setGuardandoCliente(true);

    try {
      const res = await apiFetch('/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      });

      await leerRespuesta(res, 'No se pudo registrar el cliente.');

      setNombreCliente('');
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
          'Error: El cliente sí se registró, pero no se pudo actualizar ' +
            'el listado. Recarga la página antes de volver a registrarlo. ' +
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

  // Registrar servicio
  const registrarServicio = async (e) => {
    e.preventDefault();

    if (guardandoServicio) return;

    setMensajeServicio('');

    if (!nuevoServicio.cliente_id) {
      setMensajeServicio(
        'Error: Por favor selecciona un cliente de la lista.'
      );
      return;
    }

    const nombre = nuevoServicio.nombre.trim();

    if (!nombre) {
      setMensajeServicio('Error: Ingresa el nombre del servicio.');
      return;
    }

    if (
      nuevoServicio.tarifa_cliente === '' ||
      nuevoServicio.horas_contratadas === ''
    ) {
      setMensajeServicio(
        'Error: Ingresa la tarifa y las horas contratadas.'
      );
      return;
    }

    const tarifa = Number(nuevoServicio.tarifa_cliente);
    const cantHoras = Number(nuevoServicio.horas_contratadas);

    if (
      !Number.isFinite(tarifa) ||
      !Number.isFinite(cantHoras) ||
      tarifa < 0 ||
      cantHoras < 0
    ) {
      setMensajeServicio(
        'Error: La tarifa y las horas deben ser números válidos no negativos.'
      );
      return;
    }

    if (
      nuevoServicio.fecha_inicio &&
      nuevoServicio.fecha_fin &&
      nuevoServicio.fecha_fin < nuevoServicio.fecha_inicio
    ) {
      setMensajeServicio(
        'Error: La fecha de fin no puede ser anterior a la fecha de inicio.'
      );
      return;
    }

    const payload = {
      nombre,
      fecha_inicio: nuevoServicio.fecha_inicio || null,
      fecha_fin: nuevoServicio.fecha_fin || null,
      tarifa_cliente: tarifa,
      horas_contratadas: cantHoras,
      horas_presupuestadas: cantHoras,
      cliente_id: nuevoServicio.cliente_id,
      pm_responsable: nuevoServicio.pm_responsable || null,
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
    setNuevoServicio((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
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
        {/* PASO 1: CLIENTES */}
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
            <div className="campo">
              <label htmlFor="cliente-nombre">Nombre de la empresa</label>
              <input
                id="cliente-nombre"
                type="text"
                placeholder="Ej. CANVIA"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                disabled={guardandoCliente}
                required
              />
            </div>

            <button
              type="submit"
              className="boton boton--primario"
              disabled={guardandoCliente}
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
                  <li key={cliente.id}>{cliente.nombre}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* PASO 2: SERVICIOS */}
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
                <input
                  id="servicio-nombre"
                  type="text"
                  placeholder="Ej. Soporte Nivel 2"
                  required
                  value={nuevoServicio.nombre}
                  disabled={guardandoServicio}
                  onChange={(e) =>
                    actualizarServicio('nombre', e.target.value)
                  }
                />
              </div>
            </div>

            <div className="campo">
              <label htmlFor="servicio-pm">PM responsable</label>
              <select
                id="servicio-pm"
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
                    min={nuevoServicio.fecha_inicio || undefined}
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
                    min="0"
                    step="0.01"
                    value={nuevoServicio.tarifa_cliente}
                    onChange={(e) =>
                      actualizarServicio('tarifa_cliente', e.target.value)
                    }
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
                    min="0"
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
    </div>
  );
}