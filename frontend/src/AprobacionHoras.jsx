import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from './api';

const FILTROS_INICIALES = {
  consultor: '',
  servicio: '',
  desde: '',
  hasta: '',
  estado: 'pendiente',
};

function fechaVisual(fecha) {
  if (!fecha) return '—';
  return fecha.split('-').reverse().join('/');
}

function horasVisual(horas) {
  return Number(horas || 0).toFixed(2);
}

async function leerRespuesta(respuesta) {
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new Error(
      datos?.error || 'No se pudo completar la operación.'
    );
  }

  if (datos === null) {
    throw new Error('El servidor devolvió una respuesta inesperada.');
  }

  return datos;
}

// El backend devuelve páginas de 100 registros.
// Se recorren para que el listado y los filtros incluyan todos.
async function consultarTodos() {
  const registros = [];
  let pagina = 1;

  while (true) {
    const respuesta = await apiFetch(
      `/aprobaciones?pagina=${pagina}`
    );

    const datos = await leerRespuesta(respuesta);

    if (!Array.isArray(datos.registros)) {
      throw new Error('No se pudo interpretar el listado de horas.');
    }

    registros.push(...datos.registros);

    if (registros.length >= datos.total) break;

    if (datos.registros.length === 0) {
      throw new Error('No se pudo cargar el listado completo. Actualiza.');
    }

    pagina += 1;
  }

  return registros;
}

export default function AprobacionHoras() {
  const [registros, setRegistros] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [aviso, setAviso] = useState(null);
  const [registroObservado, setRegistroObservado] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [errorObservacion, setErrorObservacion] = useState('');

  const dialogo = useRef(null);
  const ocupado = useRef(false);
  const solicitudCarga = useRef(0);

    const cargar = useCallback(async (mostrarCarga = true) => {
    const solicitud = ++solicitudCarga.current;

    if (mostrarCarga) {
      setCargando(true);
    }

    setErrorCarga('');

    try {
      const [listado, catalogo] = await Promise.all([
        consultarTodos(),
        apiFetch('/aprobaciones/motivos').then(leerRespuesta),
      ]);

      if (solicitud !== solicitudCarga.current) return;

      if (!Array.isArray(catalogo)) {
        throw new Error('No se pudo cargar el catálogo de motivos.');
      }

      setRegistros(listado);
      setMotivos(catalogo);
    } catch (error) {
      if (solicitud === solicitudCarga.current) {
        setErrorCarga(error.message);
      }
    } finally {
      if (solicitud === solicitudCarga.current) {
        setCargando(false);
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();

    return () => {
      solicitudCarga.current += 1;
    };
  }, [cargar]);

    const consultores = useMemo(() => {
    const opciones = new Map();

    registros.forEach((registro) => {
      const correspondeAlServicio =
        !filtros.servicio ||
        registro.servicio_id === filtros.servicio;

      if (correspondeAlServicio && registro.consultor?.id) {
        opciones.set(
          registro.consultor.id,
          registro.consultor.nombre
        );
      }
    });

    return [...opciones].sort((a, b) =>
      a[1].localeCompare(b[1], 'es')
    );
  }, [registros, filtros.servicio]);

  const servicios = useMemo(() => {
    const opciones = new Map();

    registros.forEach((registro) => {
      if (registro.servicio?.id) {
        const servicio = registro.servicio;

        opciones.set(
          servicio.id,
          `${servicio.cliente?.nombre || 'Sin cliente'} — ${servicio.nombre}`
        );
      }
    });

    return [...opciones].sort((a, b) =>
      a[1].localeCompare(b[1], 'es')
    );
  }, [registros]);

  const fechasInvertidas = Boolean(
    filtros.desde &&
    filtros.hasta &&
    filtros.desde > filtros.hasta
  );

  // Filtros comunes al listado y a la aprobación por periodo.
  const registrosDelFiltro = useMemo(() => {
    if (fechasInvertidas) return [];

    return registros.filter((registro) => (
      (!filtros.consultor ||
        registro.consultor_id === filtros.consultor) &&
      (!filtros.servicio ||
        registro.servicio_id === filtros.servicio) &&
      (!filtros.desde || registro.fecha >= filtros.desde) &&
      (!filtros.hasta || registro.fecha <= filtros.hasta)
    ));
  }, [registros, filtros, fechasInvertidas]);

  const visibles = registrosDelFiltro.filter((registro) => (
    !filtros.estado || registro.estado === filtros.estado
  ));

  const pendientesPeriodo = registrosDelFiltro.filter(
    (registro) => registro.estado === 'pendiente'
  );

  const horasListado = visibles.reduce(
    (total, registro) => total + Number(registro.horas),
    0
  );

  const periodoCompleto = Boolean(
    filtros.consultor &&
    filtros.desde &&
    filtros.hasta &&
    !fechasInvertidas
  );

  const bloqueado = cargando || trabajando || Boolean(errorCarga);

    function cambiarFiltro(campo, valor) {
    setFiltros((actuales) => ({
      ...actuales,
      [campo]: valor,
      ...(campo === 'servicio' ? { consultor: '' } : {}),
    }));

    setAviso(null);
  }

  async function aprobarRegistro(registro) {
    if (ocupado.current || bloqueado) return;

    const confirmado = window.confirm(
      `¿Aprobar ${horasVisual(registro.horas)} horas de ` +
      `${registro.consultor?.nombre || 'este consultor'}, ` +
      `correspondientes al ${fechaVisual(registro.fecha)}?\n\n` +
      'El consultor ya no podrá modificar este registro.'
    );

    if (!confirmado) return;

    ocupado.current = true;
    setTrabajando(true);
    setAviso(null);

    try {
      const respuesta = await apiFetch(
        `/aprobaciones/${registro.id}/aprobar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actualizado_en: registro.actualizado_en,
          }),
        }
      );

      const datos = await leerRespuesta(respuesta);

      setAviso({ tipo: 'ok', texto: datos.mensaje });
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message });
    } finally {
      await cargar(false);
      ocupado.current = false;
      setTrabajando(false);
    }
  }

  function abrirObservacion(registro) {
    if (bloqueado || ocupado.current) return;

    setRegistroObservado(registro);
    setMotivo('');
    setErrorObservacion('');
    dialogo.current.showModal();
  }

  async function guardarObservacion(evento) {
    evento.preventDefault();

    if (!registroObservado || ocupado.current) return;

    if (!motivos.includes(motivo)) {
      setErrorObservacion('Selecciona un motivo de observación.');
      return;
    }

    ocupado.current = true;
    setTrabajando(true);
    setErrorObservacion('');
    setAviso(null);

    try {
      const respuesta = await apiFetch(
        `/aprobaciones/${registroObservado.id}/observar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            motivo,
            actualizado_en: registroObservado.actualizado_en,
          }),
        }
      );

      const datos = await leerRespuesta(respuesta);

      dialogo.current.close();
      setAviso({ tipo: 'ok', texto: datos.mensaje });

      await cargar(false);
    } catch (error) {
      setErrorObservacion(error.message);
    } finally {
      ocupado.current = false;
      setTrabajando(false);
    }
  }

  async function aprobarPeriodo() {
    if (
      ocupado.current ||
      bloqueado ||
      !periodoCompleto ||
      pendientesPeriodo.length === 0
    ) {
      return;
    }

    const nombreConsultor = consultores.find(
      ([id]) => id === filtros.consultor
    )?.[1];

    const nombreServicio = servicios.find(
      ([id]) => id === filtros.servicio
    )?.[1];

    const confirmado = window.confirm(
      `Consultor: ${nombreConsultor}\n` +
      `Periodo: ${fechaVisual(filtros.desde)} al ` +
      `${fechaVisual(filtros.hasta)}\n` +
      `Servicio: ${nombreServicio || 'Todos bajo tu responsabilidad'}\n\n` +
      `Se encontraron ${pendientesPeriodo.length} registros pendientes.\n` +
      'Se aprobarán los pendientes que existan al ejecutar la operación. ' +
      'Los observados y aprobados no se modificarán.\n\n' +
      '¿Continuar?'
    );

    if (!confirmado) return;

    ocupado.current = true;
    setTrabajando(true);
    setAviso(null);

    try {
      const cuerpo = {
        consultor_id: filtros.consultor,
        fecha_desde: filtros.desde,
        fecha_hasta: filtros.hasta,
      };

      if (filtros.servicio) {
        cuerpo.servicio_id = filtros.servicio;
      }

      const respuesta = await apiFetch(
        '/aprobaciones/aprobar-periodo',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cuerpo),
        }
      );

      const datos = await leerRespuesta(respuesta);

      setAviso({ tipo: 'ok', texto: datos.mensaje });
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message });
    } finally {
      await cargar(false);
      ocupado.current = false;
      setTrabajando(false);
    }
  }

  return (
    <section className="hu003">
      <header className="hu003__cabecera">
        <div>
          <h1>Revisar y aprobar horas</h1>
          <p>
            Revisa las horas de los servicios bajo tu responsabilidad.
          </p>
        </div>

        <button
          type="button"
          className="boton boton--primario"
          disabled={cargando || trabajando}
          onClick={() => {
            setAviso(null);
            cargar();
          }}
        >
          {cargando ? 'Actualizando…' : 'Actualizar registros'}
        </button>
      </header>

      {aviso && (
        <p
          className={`aviso aviso--${aviso.tipo}`}
          role={aviso.tipo === 'error' ? 'alert' : 'status'}
        >
          {aviso.texto}
        </p>
      )}

      {errorCarga && (
        <p className="aviso aviso--error" role="alert">
          {errorCarga}
        </p>
      )}

      <section className="hu003__panel">
        <h2>Filtros de revisión</h2>

        <div className="hu003__filtros">
          <div className="campo">
            <label htmlFor="pm-consultor">Consultor</label>
            <select
              id="pm-consultor"
              value={filtros.consultor}
              disabled={bloqueado}
              onChange={(e) =>
                cambiarFiltro('consultor', e.target.value)
              }
            >
              <option value="">Todos los consultores</option>
              {consultores.map(([id, nombre]) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="pm-servicio">Cliente y servicio</label>
            <select
              id="pm-servicio"
              value={filtros.servicio}
              disabled={bloqueado}
              onChange={(e) =>
                cambiarFiltro('servicio', e.target.value)
              }
            >
              <option value="">Todos mis servicios</option>
              {servicios.map(([id, nombre]) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="pm-desde">Desde</label>
            <input
              id="pm-desde"
              type="date"
              value={filtros.desde}
              disabled={bloqueado}
              onChange={(e) =>
                cambiarFiltro('desde', e.target.value)
              }
            />
          </div>

          <div className="campo">
            <label htmlFor="pm-hasta">Hasta</label>
            <input
              id="pm-hasta"
              type="date"
              value={filtros.hasta}
              disabled={bloqueado}
              onChange={(e) =>
                cambiarFiltro('hasta', e.target.value)
              }
            />
          </div>

          <div className="campo">
            <label htmlFor="pm-estado">Estado</label>
            <select
              id="pm-estado"
              value={filtros.estado}
              disabled={bloqueado}
              onChange={(e) =>
                cambiarFiltro('estado', e.target.value)
              }
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="observado">Observado</option>
              <option value="aprobado">Aprobado</option>
            </select>
          </div>
        </div>

        {fechasInvertidas && (
          <p className="aviso aviso--error" role="alert">
            La fecha inicial no puede ser posterior a la final.
          </p>
        )}

        <div className="hu003__acciones">
          <button
            type="button"
            className="boton boton--contorno"
            disabled={bloqueado}
            onClick={() => {
              setFiltros({ ...FILTROS_INICIALES });
              setAviso(null);
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      <section className="hu003__panel">
        <h2>Aprobar por periodo</h2>

        <p className="hu003__ayuda">
          Selecciona un consultor y ambas fechas en los filtros.
          Se aprobarán únicamente sus registros pendientes.
          El servicio seleccionado también limita esta operación;
          el filtro de estado solo afecta al listado.
        </p>

        <div className="hu003__acciones">
          <span>
            {periodoCompleto
              ? `${pendientesPeriodo.length} registros pendientes encontrados`
              : 'Selecciona consultor, fecha inicial y fecha final'}
          </span>

          <button
            type="button"
            className="boton boton--primario"
            disabled={
              bloqueado ||
              !periodoCompleto ||
              pendientesPeriodo.length === 0
            }
            onClick={aprobarPeriodo}
          >
            Aprobar por periodo
          </button>
        </div>
      </section>

      <section className="hu003__panel" aria-busy={cargando}>
        <h2>Registros encontrados ({visibles.length})</h2>

        {cargando ? (
          <p role="status">Cargando registros…</p>
        ) : errorCarga ? (
          <p>Actualiza el listado para volver a consultar.</p>
        ) : visibles.length === 0 ? (
          <p>No hay registros para los filtros seleccionados.</p>
        ) : (
          <>
            <p className="hu003__ayuda">
              Total del listado: {horasVisual(horasListado)} horas.
            </p>

            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Consultor</th>
                    <th>Cliente / Servicio</th>
                    <th>Actividad</th>
                    <th>Horas</th>
                    <th>Tipo</th>
                    <th>Estado / Motivo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {visibles.map((registro) => (
                    <tr key={registro.id}>
                      <td>{fechaVisual(registro.fecha)}</td>
                      <td>{registro.consultor?.nombre || '—'}</td>
                      <td>
                        <strong>
                          {registro.servicio?.cliente?.nombre || '—'}
                        </strong>
                        <br />
                        {registro.servicio?.nombre || '—'}
                      </td>
                      <td>{registro.actividad}</td>
                      <td>{horasVisual(registro.horas)}</td>
                      <td>
                        <span
                          className={`badge-tipo ${
                            registro.es_facturable
                              ? 'badge-tipo--facturable'
                              : 'badge-tipo--nofacturable'
                          }`}
                        >
                          {registro.es_facturable
                            ? 'Facturable'
                            : 'No facturable'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge-estado badge-estado--${registro.estado}`}
                        >
                          {registro.estado}
                        </span>

                        {registro.motivo_observacion && (
                          <p className="hu003__motivo">
                            {registro.motivo_observacion}
                          </p>
                        )}
                      </td>
                      <td>
                        {registro.estado === 'pendiente' ? (
                          <div className="hu003__acciones-fila">
                            <button
                              type="button"
                              className="boton boton--sm boton--primario"
                              disabled={bloqueado}
                              onClick={() => aprobarRegistro(registro)}
                            >
                              Aprobar
                            </button>

                            <button
                              type="button"
                              className="boton boton--sm boton--contorno"
                              disabled={bloqueado || motivos.length === 0}
                              onClick={() => abrirObservacion(registro)}
                            >
                              Observar
                            </button>
                          </div>
                        ) : (
                          <span className="hu003__ayuda">Revisado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <dialog
        ref={dialogo}
        className="hu003__dialogo"
        aria-labelledby="hu003-titulo-observacion"
        onCancel={(evento) => {
          if (ocupado.current) evento.preventDefault();
        }}
        onClose={() => {
          setRegistroObservado(null);
          setMotivo('');
          setErrorObservacion('');
        }}
      >
        <header className="modal-cabecera">
          <h2 id="hu003-titulo-observacion">Observar registro</h2>

          <button
            type="button"
            className="modal-cerrar"
            aria-label="Cerrar observación"
            disabled={trabajando}
            onClick={() => dialogo.current.close()}
          >
            ×
          </button>
        </header>

        <form className="modal-cuerpo" onSubmit={guardarObservacion}>
          <p className="hu003__ayuda">
            {registroObservado?.consultor?.nombre} —{' '}
            {fechaVisual(registroObservado?.fecha)}
          </p>

          <p className="hu003__ayuda">
            {registroObservado?.actividad}
          </p>

          <div className="campo">
            <label htmlFor="pm-motivo">Motivo de observación</label>
            <select
              id="pm-motivo"
              required
              value={motivo}
              disabled={trabajando}
              onChange={(e) => setMotivo(e.target.value)}
            >
              <option value="">Selecciona un motivo</option>
              {motivos.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </div>

          <p className="hu003__ayuda">
            El consultor podrá ver este motivo al consultar sus horas.
          </p>

          {errorObservacion && (
            <p className="aviso aviso--error" role="alert">
              {errorObservacion}
            </p>
          )}

          <div className="modal-acciones">
            <button
              type="button"
              className="boton boton--contorno"
              disabled={trabajando}
              onClick={() => dialogo.current.close()}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="boton boton--primario"
              disabled={trabajando || !motivo}
            >
              {trabajando ? 'Guardando…' : 'Guardar observación'}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}