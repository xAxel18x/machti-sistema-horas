import { useEffect, useState, useMemo } from 'react';
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

function formatearFechaVisual(fechaStr) {
  if (!fechaStr || typeof fechaStr !== 'string') return '';
  const partes = fechaStr.split('-');
  if (partes.length !== 3) return fechaStr;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obtenerRangoSemana(fechaStr) {
  if (!fechaStr) {
    fechaStr = fechaActualPeru();
  }
  const [y, m, d] = fechaStr.split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  const diaSemana = fecha.getUTCDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana;

  const lunes = new Date(fecha);
  lunes.setUTCDate(fecha.getUTCDate() + offsetLunes);

  const domingo = new Date(lunes);
  domingo.setUTCDate(lunes.getUTCDate() + 6);

  const aIso = (f) => f.toISOString().slice(0, 10);
  return {
    inicio: aIso(lunes),
    fin: aIso(domingo),
    lunesDate: lunes,
    domingoDate: domingo,
  };
}

function cambiarSemana(fechaStr, semanasOffset) {
  const rango = obtenerRangoSemana(fechaStr);
  const nuevaFecha = new Date(rango.lunesDate);
  nuevaFecha.setUTCDate(nuevaFecha.getUTCDate() + semanasOffset * 7);
  return nuevaFecha.toISOString().slice(0, 10);
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

export default function ConsultarHoras({ onIrARegistro }) {
  // Servicios asignados para los dropdowns de filtro
  const [servicios, setServicios] = useState([]);
  const [cargandoServicios, setCargandoServicios] = useState(true);

  // Estados de filtro
  const [tipoPeriodo, setTipoPeriodo] = useState('semana'); // 'todos' | 'dia' | 'semana'
  const [fechaDia, setFechaDia] = useState(fechaActualPeru);
  const [fechaSemana, setFechaSemana] = useState(fechaActualPeru);
  const [clienteId, setClienteId] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Registros de horas
  const [registros, setRegistros] = useState([]);
  const [cargandoRegistros, setCargandoRegistros] = useState(true);
  const [errorRegistros, setErrorRegistros] = useState('');
  const [aviso, setAviso] = useState(null);
  const [recarga, setRecarga] = useState(0);

  // Modal de corrección (Escenario 2)
  const [registroEnEdicion, setRegistroEnEdicion] = useState(null);
  const [horasEdicion, setHorasEdicion] = useState('');
  const [actividadEdicion, setActividadEdicion] = useState('');
  const [noFacturableEdicion, setNoFacturableEdicion] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState('');

  // Cargar servicios asignados para las opciones de filtro
  useEffect(() => {
    let activo = true;

    async function cargarServicios() {
      try {
        const res = await apiFetch('/horas/servicios');
        const data = await leerRespuesta(
          res,
          'No se pudieron cargar tus servicios asignados.'
        );

        if (activo && Array.isArray(data)) {
          setServicios(data);
        }
      } catch (err) {
        console.error('Error cargando servicios para filtro:', err.message);
      } finally {
        if (activo) {
          setCargandoServicios(false);
        }
      }
    }

    cargarServicios();

    return () => {
      activo = false;
    };
  }, []);

  // Lista de clientes únicos de los servicios asignados
  const clientes = useMemo(() => {
    const mapa = new Map();
    for (const serv of servicios) {
      if (serv.cliente?.id) {
        mapa.set(serv.cliente.id, {
          id: serv.cliente.id,
          nombre: serv.cliente.nombre,
        });
      }
    }
    return Array.from(mapa.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es')
    );
  }, [servicios]);

  // Servicios filtrados según el cliente seleccionado
  const serviciosFiltrados = useMemo(() => {
    if (!clienteId) return servicios;
    return servicios.filter((s) => s.cliente?.id === clienteId);
  }, [servicios, clienteId]);

  // Cálculo del rango semanal actual
  const rangoSemana = useMemo(() => {
    return obtenerRangoSemana(fechaSemana);
  }, [fechaSemana]);

  // Cargar registros de horas aplicando los filtros
  useEffect(() => {
    let activo = true;

    async function consultarRegistros() {
      setCargandoRegistros(true);
      setErrorRegistros('');

      try {
        const params = new URLSearchParams();

        if (tipoPeriodo === 'dia' && fechaDia) {
          params.set('periodo', 'dia');
          params.set('fecha', fechaDia);
        } else if (tipoPeriodo === 'semana' && rangoSemana) {
          params.set('periodo', 'semana');
          params.set('fecha_desde', rangoSemana.inicio);
          params.set('fecha_hasta', rangoSemana.fin);
        } else {
          params.set('periodo', 'todos');
        }

        if (clienteId) {
          params.set('cliente_id', clienteId);
        }

        if (servicioId) {
          params.set('servicio_id', servicioId);
        }

        if (filtroEstado) {
          params.set('estado', filtroEstado);
        }

        const queryString = params.toString() ? `?${params.toString()}` : '';
        const res = await apiFetch(`/horas${queryString}`);
        const data = await leerRespuesta(
          res,
          'No se pudieron cargar tus registros de horas.'
        );

        if (!Array.isArray(data)) {
          throw new Error('El servidor no devolvió una lista válida.');
        }

        if (activo) {
          setRegistros(data);
        }
      } catch (err) {
        if (activo) {
          setErrorRegistros(err.message);
        }
      } finally {
        if (activo) {
          setCargandoRegistros(false);
        }
      }
    }

    consultarRegistros();

    return () => {
      activo = false;
    };
  }, [
    tipoPeriodo,
    fechaDia,
    rangoSemana,
    clienteId,
    servicioId,
    filtroEstado,
    recarga,
  ]);

  // Métricas acumuladas de la vista actual
  const metricas = useMemo(() => {
    let total = 0;
    let facturables = 0;
    let noFacturables = 0;

    for (const r of registros) {
      const h = Number(r.horas || 0);
      total += h;
      if (r.es_facturable) {
        facturables += h;
      } else {
        noFacturables += h;
      }
    }

    return {
      total: Number(total.toFixed(2)),
      facturables: Number(facturables.toFixed(2)),
      noFacturables: Number(noFacturables.toFixed(2)),
      conteo: registros.length,
    };
  }, [registros]);

  // Limpiar filtros
  function limpiarFiltros() {
    setTipoPeriodo('todos');
    setFechaDia(fechaActualPeru());
    setFechaSemana(fechaActualPeru());
    setClienteId('');
    setServicioId('');
    setFiltroEstado('');
    setAviso(null);
  }

  // Abrir modal de corrección (Escenario 2 & Escenario 3)
  function abrirModalCorreccion(registro) {
    const estado = (registro.estado || '').toLowerCase().trim();
    if (estado === 'aprobado') {
      setAviso({
        tipo: 'error',
        texto: 'Bloqueado: Este registro de horas ya fue aprobado y no puede ser modificado.',
      });
      return;
    }

    setRegistroEnEdicion(registro);
    setHorasEdicion(String(registro.horas));
    setActividadEdicion(registro.actividad);
    setNoFacturableEdicion(!registro.es_facturable);
    setErrorEdicion('');
  }

  function cerrarModalCorreccion() {
    if (guardandoEdicion) return;
    setRegistroEnEdicion(null);
    setHorasEdicion('');
    setActividadEdicion('');
    setNoFacturableEdicion(false);
    setErrorEdicion('');
  }

  // Guardar corrección (Escenario 2)
  async function guardarCorreccion(e) {
    e.preventDefault();
    if (!registroEnEdicion || guardandoEdicion) return;

    setErrorEdicion('');

    const textoHoras = String(horasEdicion).trim();
    const cantHoras = Number(textoHoras);

    if (
      !/^\d+(?:\.\d{1,2})?$/.test(textoHoras) ||
      !Number.isFinite(cantHoras) ||
      cantHoras <= 0 ||
      cantHoras > 8
    ) {
      setErrorEdicion(
        'Ingresa una cantidad de horas mayor a 0 y hasta 8, con máximo 2 decimales.'
      );
      return;
    }

    const actLimpia = actividadEdicion.trim();
    if (!actLimpia) {
      setErrorEdicion('Debes seleccionar o ingresar la actividad realizada.');
      return;
    }

    setGuardandoEdicion(true);

    try {
      const res = await apiFetch(`/horas/${registroEnEdicion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          horas: cantHoras,
          actividad: actLimpia,
          es_facturable: !noFacturableEdicion,
        }),
      });

      const data = await leerRespuesta(
        res,
        'No se pudo actualizar el registro de horas.'
      );

      if (!data.registro?.id) {
        throw new Error('No se recibió la confirmación del registro actualizado.');
      }

      // Actualizar la lista en memoria
      setRegistros((anteriores) =>
        anteriores.map((item) =>
          item.id === data.registro.id ? data.registro : item
        )
      );

      setAviso({
        tipo: 'ok',
        texto: `Registro del ${formatearFechaVisual(
          data.registro.fecha
        )} actualizado correctamente.`,
      });

      cerrarModalCorreccion();
    } catch (err) {
      setErrorEdicion(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  }

  // Eliminar registro pendiente
  async function eliminarRegistro(registro) {
    const confirmar = window.confirm(
      `¿Deseas eliminar el registro de ${registro.horas} horas en «${registro.actividad}» del ${formatearFechaVisual(
        registro.fecha
      )}?`
    );

    if (!confirmar) return;

    try {
      const res = await apiFetch(`/horas/${registro.id}`, {
        method: 'DELETE',
      });

      await leerRespuesta(res, 'No se pudo eliminar el registro.');

      setRegistros((anteriores) =>
        anteriores.filter((item) => item.id !== registro.id)
      );

      setAviso({
        tipo: 'ok',
        texto: 'Registro eliminado correctamente.',
      });
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err.message,
      });
    }
  }

  // Actividades disponibles para el servicio del registro en edición
  const actividadesParaEdicion = useMemo(() => {
    if (!registroEnEdicion?.servicio) return [];
    if (Array.isArray(registroEnEdicion.servicio.actividades)) {
      return registroEnEdicion.servicio.actividades;
    }
    const serv = servicios.find(
      (s) => s.id === registroEnEdicion.servicio_id
    );
    return Array.isArray(serv?.actividades) ? serv.actividades : [];
  }, [registroEnEdicion, servicios]);

  return (
    <div className="modulo">
      <header className="modulo__cabecera">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h1>Consultar y corregir horas</h1>
            <p>
              Revisa tus horas registradas por periodo, cliente o servicio,
              y corrige los registros pendientes antes de enviarlos a aprobación.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {onIrARegistro && (
              <button
                type="button"
                className="boton boton--contorno"
                onClick={onIrARegistro}
              >
                + Registrar nueva actividad
              </button>
            )}

            <button
              type="button"
              className="boton boton--primario"
              onClick={() => {
                setAviso(null);
                setRecarga((v) => v + 1);
              }}
              disabled={cargandoRegistros}
            >
              {cargandoRegistros ? 'Cargando…' : 'Actualizar registros'}
            </button>
          </div>
        </div>
      </header>

      {aviso && (
        <p
          className={`aviso ${
            aviso.tipo === 'error' ? 'aviso--error' : 'aviso--ok'
          }`}
          role={aviso.tipo === 'error' ? 'alert' : 'status'}
        >
          {aviso.texto}
        </p>
      )}

      {/* Panel de Filtros (Escenario 1) */}
      <section className="panel panel--principal" style={{ marginBottom: '24px' }}>
        <div className="panel__titulo">
          <h2>Filtros de consulta</h2>
        </div>

        <div className="formulario">
          {/* Fila 1: Filtro por Periodo */}
          <div className="campo">
            <label>Filtrar periodo</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`boton boton--sm ${
                  tipoPeriodo === 'semana'
                    ? 'boton--primario'
                    : 'boton--contorno'
                }`}
                onClick={() => setTipoPeriodo('semana')}
              >
                Por semana
              </button>
              <button
                type="button"
                className={`boton boton--sm ${
                  tipoPeriodo === 'dia' ? 'boton--primario' : 'boton--contorno'
                }`}
                onClick={() => setTipoPeriodo('dia')}
              >
                Por día
              </button>
              <button
                type="button"
                className={`boton boton--sm ${
                  tipoPeriodo === 'todos'
                    ? 'boton--primario'
                    : 'boton--contorno'
                }`}
                onClick={() => setTipoPeriodo('todos')}
              >
                Todos los registros
              </button>
            </div>
          </div>

          {/* Subfiltro según periodo seleccionado */}
          {tipoPeriodo === 'dia' && (
            <div className="rejilla-2" style={{ alignItems: 'flex-end' }}>
              <div className="campo">
                <label htmlFor="filtro-dia">Seleccionar día</label>
                <input
                  id="filtro-dia"
                  type="date"
                  value={fechaDia}
                  onChange={(e) => setFechaDia(e.target.value)}
                />
              </div>

              <div>
                <button
                  type="button"
                  className="boton boton--contorno"
                  onClick={() => setFechaDia(fechaActualPeru())}
                >
                  Día de hoy
                </button>
              </div>
            </div>
          )}

          {tipoPeriodo === 'semana' && (
            <div
              style={{
                background: 'var(--fondo)',
                padding: '14px 16px',
                borderRadius: '8px',
                border: '1px solid var(--linea)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--suave)',
                    textTransform: 'uppercase',
                    display: 'block',
                  }}
                >
                  Semana consultada
                </span>
                <strong style={{ fontSize: '16px', color: 'var(--marino)' }}>
                  {formatearFechaVisual(rangoSemana.inicio)} —{' '}
                  {formatearFechaVisual(rangoSemana.fin)}
                </strong>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="boton boton--sm boton--contorno"
                  onClick={() =>
                    setFechaSemana((actual) => cambiarSemana(actual, -1))
                  }
                  title="Semana anterior"
                >
                  ◀ Semana anterior
                </button>

                <button
                  type="button"
                  className="boton boton--sm boton--contorno"
                  onClick={() => setFechaSemana(fechaActualPeru())}
                >
                  Esta semana
                </button>

                <button
                  type="button"
                  className="boton boton--sm boton--contorno"
                  onClick={() =>
                    setFechaSemana((actual) => cambiarSemana(actual, 1))
                  }
                  title="Semana siguiente"
                >
                  Semana siguiente ▶
                </button>
              </div>
            </div>
          )}

          {/* Fila 2: Filtros por Cliente, Servicio y Estado */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            <div className="campo">
              <label htmlFor="filtro-cliente">Cliente</label>
              <select
                id="filtro-cliente"
                value={clienteId}
                onChange={(e) => {
                  setClienteId(e.target.value);
                  setServicioId('');
                }}
                disabled={cargandoServicios}
              >
                <option value="">Todos los clientes</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="filtro-servicio">Servicio</label>
              <select
                id="filtro-servicio"
                value={servicioId}
                onChange={(e) => setServicioId(e.target.value)}
                disabled={cargandoServicios}
              >
                <option value="">Todos los servicios</option>
                {serviciosFiltrados.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                    {s.cliente?.nombre ? ` (${s.cliente.nombre})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="filtro-estado">Estado</label>
              <select
                id="filtro-estado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="observado">Observado</option>
                <option value="aprobado">Aprobado</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="boton boton--contorno boton--sm"
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </section>

      {/* Tarjetas de Métricas de Horas */}
      <div className="metricas-rejilla">
        <div className="metrica-tarjeta">
          <span className="metrica-tarjeta__titulo">Total Horas</span>
          <span className="metrica-tarjeta__valor">{metricas.total} hrs</span>
        </div>

        <div className="metrica-tarjeta">
          <span className="metrica-tarjeta__titulo">Facturables</span>
          <span className="metrica-tarjeta__valor">
            {metricas.facturables} hrs
          </span>
        </div>

        <div className="metrica-tarjeta">
          <span className="metrica-tarjeta__titulo">No Facturables</span>
          <span className="metrica-tarjeta__valor">
            {metricas.noFacturables} hrs
          </span>
        </div>

        <div className="metrica-tarjeta">
          <span className="metrica-tarjeta__titulo">Total Registros</span>
          <span className="metrica-tarjeta__valor">{metricas.conteo}</span>
        </div>
      </div>

      {/* Tabla de Registros (Escenario 1, 2 & 3) */}
      <section className="panel">
        <div className="panel__titulo">
          <h2>Registros encontrados ({registros.length})</h2>
        </div>

        {cargandoRegistros ? (
          <p role="status">Cargando tus registros de horas…</p>
        ) : errorRegistros ? (
          <p className="aviso aviso--error" role="alert">
            {errorRegistros}
          </p>
        ) : registros.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p style={{ color: 'var(--suave)', marginBottom: '16px' }}>
              No se encontraron registros de horas con los filtros seleccionados.
            </p>
            {onIrARegistro && (
              <button
                type="button"
                className="boton boton--primario"
                onClick={onIrARegistro}
              >
                Registrar horas ahora
              </button>
            )}
          </div>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Actividad</th>
                  <th style={{ textAlign: 'right' }}>Horas</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Motivo de observación</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => {
                  const estadoMin = (registro.estado || '').toLowerCase().trim();
                  const esPendiente = estadoMin === 'pendiente';
                  const esAprobado = estadoMin === 'aprobado';

                  return (
                    <tr key={registro.id}>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {formatearFechaVisual(registro.fecha)}
                      </td>
                      <td>
                        {registro.servicio?.cliente?.nombre ||
                          'Sin cliente vinculado'}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {registro.servicio?.nombre || '—'}
                      </td>
                      <td>{registro.actividad}</td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: 'var(--marino)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {Number(registro.horas).toFixed(2)} hrs
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
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
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span
                          className={`badge-estado badge-estado--${estadoMin}`}
                        >
                        {registro.estado}
                        </span>
                      </td>

                      <td style={{
                        minWidth: '180px',
                        maxWidth: '280px',
                        whiteSpace: 'normal',
                        overflowWrap: 'anywhere',
                      }}>
                        {registro.motivo_observacion || '—'}
                      </td>

                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {esPendiente ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              gap: '6px',
                              alignItems: 'center',
                            }}
                          >
                            <button
                              type="button"
                              className="boton boton--sm boton--primario"
                              onClick={() => abrirModalCorreccion(registro)}
                              title="Corregir cantidad de horas o actividad"
                            >
                              Corregir
                            </button>

                            <button
                              type="button"
                              className="boton boton--sm boton--peligro"
                              onClick={() => eliminarRegistro(registro)}
                              title="Eliminar registro"
                            >
                              Eliminar
                            </button>
                          </div>
                        ) : esAprobado ? (
                          <button
                            type="button"
                            className="boton boton--sm boton--contorno"
                            style={{ opacity: 0.7, cursor: 'not-allowed' }}
                            onClick={() =>
                              setAviso({
                                tipo: 'error',
                                texto:
                                  'Bloqueado: Este registro de horas ya fue aprobado y no puede ser modificado.',
                              })
                            }
                            title="Registro aprobado - No editable"
                          >
                            Corregir
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--suave)',
                              fontStyle: 'italic',
                            }}
                          >
                            No editable
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de Corrección (Escenario 2) */}
      {registroEnEdicion && (
        <div
          className="modal-fondo"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-titulo"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModalCorreccion();
          }}
        >
          <div className="modal-dialogo">
            <header className="modal-cabecera">
              <h2 id="modal-titulo">Corregir registro de horas</h2>
              <button
                type="button"
                className="modal-cerrar"
                onClick={cerrarModalCorreccion}
                disabled={guardandoEdicion}
                aria-label="Cerrar ventana"
              >
                ✕
              </button>
            </header>

            <form className="modal-cuerpo" onSubmit={guardarCorreccion}>
              <div
                style={{
                  background: 'var(--fondo)',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--linea)',
                  marginBottom: '16px',
                  fontSize: '13px',
                }}
              >
                <p>
                  <strong>Fecha:</strong>{' '}
                  {formatearFechaVisual(registroEnEdicion.fecha)}
                </p>
                <p>
                  <strong>Cliente:</strong>{' '}
                  {registroEnEdicion.servicio?.cliente?.nombre ||
                    'Sin cliente vinculado'}
                </p>
                <p>
                  <strong>Servicio:</strong>{' '}
                  {registroEnEdicion.servicio?.nombre || '—'}
                </p>
                <p style={{ marginBottom: 0 }}>
                  <strong>Estado:</strong>{' '}
                  <span className="badge-estado badge-estado--pendiente">
                    Pendiente
                  </span>
                </p>
              </div>

              <div className="campo" style={{ marginBottom: '16px' }}>
                <label htmlFor="edicion-actividad">Actividad realizada</label>
                {actividadesParaEdicion.length > 0 ? (
                  <select
                    id="edicion-actividad"
                    value={actividadEdicion}
                    required
                    disabled={guardandoEdicion}
                    onChange={(e) => setActividadEdicion(e.target.value)}
                  >
                    <option value="">Selecciona la actividad</option>
                    {actividadesParaEdicion.map((act) => (
                      <option key={act} value={act}>
                        {act}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="edicion-actividad"
                    type="text"
                    value={actividadEdicion}
                    required
                    disabled={guardandoEdicion}
                    onChange={(e) => setActividadEdicion(e.target.value)}
                    placeholder="Describe la actividad realizada"
                  />
                )}
              </div>

              <div className="campo" style={{ marginBottom: '16px' }}>
                <label htmlFor="edicion-horas">Cantidad de horas</label>
                <input
                  id="edicion-horas"
                  type="number"
                  min="0.01"
                  max="8"
                  step="0.01"
                  value={horasEdicion}
                  required
                  disabled={guardandoEdicion}
                  onChange={(e) => setHorasEdicion(e.target.value)}
                />
                <span style={{ fontSize: '12px', color: 'var(--suave)' }}>
                  Recuerda: Máximo 8 horas por día en total para este consultor.
                </span>
              </div>

              <div className="campo" style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="edicion-nofacturable"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    id="edicion-nofacturable"
                    type="checkbox"
                    checked={noFacturableEdicion}
                    disabled={guardandoEdicion}
                    onChange={(e) =>
                      setNoFacturableEdicion(e.target.checked)
                    }
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
              </div>

              {errorEdicion && (
                <p className="aviso aviso--error" role="alert">
                  {errorEdicion}
                </p>
              )}

              <div className="modal-acciones">
                <button
                  type="button"
                  className="boton boton--contorno"
                  onClick={cerrarModalCorreccion}
                  disabled={guardandoEdicion}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="boton boton--primario"
                  disabled={guardandoEdicion}
                >
                  {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
