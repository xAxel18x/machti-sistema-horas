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

function sumarUnDia(fechaStr) {
  if (!fechaStr) return fechaActualPeru();
  const [y, m, d] = fechaStr.split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  fecha.setUTCDate(fecha.getUTCDate() + 1);
  return fecha.toISOString().slice(0, 10);
}

function formatearFechaVisual(fechaStr) {
  if (!fechaStr || typeof fechaStr !== 'string') return '';
  const partes = fechaStr.split('-');
  if (partes.length !== 3) return fechaStr;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
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

export default function GestionCostos() {
  const [colaboradores, setColaboradores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [aviso, setAviso] = useState(null);

  // Filtros de búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  // Modal para registrar o actualizar costo (Escenario 1 y 2)
  const [modalRegistroAbierto, setModalRegistroAbierto] = useState(false);
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState(null);
  const [costoHora, setCostoHora] = useState('');
  const [fechaInicio, setFechaInicio] = useState(fechaActualPeru);
  const [guardandoCosto, setGuardandoCosto] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  // Modal para ver histórico (Escenario 2)
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  const [colaboradorHistorial, setColaboradorHistorial] = useState(null);
  const [historialCargando, setHistorialCargando] = useState(false);
  const [historialItems, setHistorialItems] = useState([]);
  const [errorHistorial, setErrorHistorial] = useState('');

  // Fecha mínima permitida para el input date
  const fechaMinimaVigencia = useMemo(() => {
    const hoy = fechaActualPeru();
    if (!colaboradorSeleccionado?.costo_vigente?.fecha_inicio) {
      return hoy;
    }
    const diaSiguienteActual = sumarUnDia(
      colaboradorSeleccionado.costo_vigente.fecha_inicio
    );
    return diaSiguienteActual > hoy ? diaSiguienteActual : hoy;
  }, [colaboradorSeleccionado]);

  // Cargar lista de colaboradores con su costo vigente
  useEffect(() => {
    let activo = true;

    async function cargarColaboradores() {
      setCargando(true);
      setErrorCarga('');

      try {
        const res = await apiFetch('/costos/colaboradores');
        const data = await leerRespuesta(
          res,
          'No se pudieron cargar los colaboradores y sus costos.'
        );

        if (activo) {
          setColaboradores(data.colaboradores || []);
        }
      } catch (err) {
        if (activo) {
          setErrorCarga(err.message);
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarColaboradores();

    return () => {
      activo = false;
    };
  }, [recarga]);

  // Colaboradores filtrados
  const colaboradoresFiltrados = useMemo(() => {
    return colaboradores.filter((c) => {
      const coincideBusqueda =
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.correo.toLowerCase().includes(busqueda.toLowerCase());

      const coincideRol = !filtroRol || c.rol === filtroRol;

      return coincideBusqueda && coincideRol;
    });
  }, [colaboradores, busqueda, filtroRol]);

  // Métricas de costos
  const metricas = useMemo(() => {
    const total = colaboradores.length;
    const conCosto = colaboradores.filter((c) => c.costo_vigente !== null);
    const sinCosto = total - conCosto.length;

    const sumaCostos = conCosto.reduce(
      (acc, c) => acc + Number(c.costo_vigente.costo_hora || 0),
      0
    );

    const promedio = conCosto.length > 0 ? (sumaCostos / conCosto.length).toFixed(2) : '0.00';

    return {
      total,
      conCosto: conCosto.length,
      sinCosto,
      promedio,
    };
  }, [colaboradores]);

  // Abrir modal de asignación o actualización
  function abrirModalRegistro(colaborador) {
    const hoy = fechaActualPeru();
    let fechaSugerida = hoy;

    if (colaborador.costo_vigente) {
      setCostoHora(String(colaborador.costo_vigente.costo_hora));
      const diaSiguiente = sumarUnDia(colaborador.costo_vigente.fecha_inicio);
      fechaSugerida = diaSiguiente > hoy ? diaSiguiente : hoy;
    } else {
      setCostoHora('');
    }

    setColaboradorSeleccionado(colaborador);
    setFechaInicio(fechaSugerida);
    setErrorModal('');
    setModalRegistroAbierto(true);
  }

  function cerrarModalRegistro() {
    if (guardandoCosto) return;
    setModalRegistroAbierto(false);
    setColaboradorSeleccionado(null);
    setCostoHora('');
    setErrorModal('');
  }

  // Guardar costo (Escenario 1 y Escenario 2)
  async function guardarCosto(e) {
    e.preventDefault();
    if (!colaboradorSeleccionado || guardandoCosto) return;

    setErrorModal('');

    const textoCosto = String(costoHora).trim();
    const cantCosto = Number(textoCosto);

    if (
      !/^\d+(?:\.\d{1,2})?$/.test(textoCosto) ||
      !Number.isFinite(cantCosto) ||
      cantCosto <= 0
    ) {
      setErrorModal('Ingresa un costo por hora válido mayor a 0 (ej. 45.00).');
      return;
    }

    if (!fechaInicio) {
      setErrorModal('Selecciona la fecha de inicio de vigencia.');
      return;
    }

    const hoy = fechaActualPeru();
    if (fechaInicio < hoy) {
      setErrorModal(
        `La fecha de inicio no puede ser anterior a hoy (${formatearFechaVisual(hoy)}).`
      );
      return;
    }

    if (
      colaboradorSeleccionado.costo_vigente &&
      fechaInicio <= colaboradorSeleccionado.costo_vigente.fecha_inicio
    ) {
      setErrorModal(
        `La nueva fecha debe ser posterior al inicio de vigencia actual (${formatearFechaVisual(
          colaboradorSeleccionado.costo_vigente.fecha_inicio
        )}).`
      );
      return;
    }

    setGuardandoCosto(true);

    try {
      const res = await apiFetch(`/costos/colaboradores/${colaboradorSeleccionado.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          costo_hora: cantCosto,
          fecha_inicio: fechaInicio,
        }),
      });

      const data = await leerRespuesta(res, 'No se pudo guardar el costo.');

      setAviso({
        tipo: 'ok',
        texto: data.mensaje || 'Costo guardado exitosamente.',
      });

      cerrarModalRegistro();
      setRecarga((v) => v + 1);
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setGuardandoCosto(false);
    }
  }

  // Abrir modal de histórico (Escenario 2)
  async function abrirModalHistorial(colaborador) {
    setColaboradorHistorial(colaborador);
    setModalHistorialAbierto(true);
    setHistorialCargando(true);
    setErrorHistorial('');
    setHistorialItems([]);

    try {
      const res = await apiFetch(`/costos/colaboradores/${colaborador.id}/historial`);
      const data = await leerRespuesta(res, 'No se pudo cargar el historial de costos.');
      setHistorialItems(data.historial || []);
    } catch (err) {
      setErrorHistorial(err.message);
    } finally {
      setHistorialCargando(false);
    }
  }

  function cerrarModalHistorial() {
    setModalHistorialAbierto(false);
    setColaboradorHistorial(null);
    setHistorialItems([]);
    setErrorHistorial('');
  }

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
            <h1>Gestión de costos de personal</h1>
            <p>
              Registra los costos internos por hora de cada colaborador y mantén el histórico
              de vigencias para conocer cuánto le cuesta a MACH TI prestar cada servicio.
            </p>
          </div>

          <button
            type="button"
            className="boton boton--primario"
            onClick={() => {
              setAviso(null);
              setRecarga((v) => v + 1);
            }}
            disabled={cargando}
          >
            {cargando ? 'Cargando…' : 'Actualizar colaboradores'}
          </button>
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

      {/* Tarjetas métricas */}
      <div className="metricas-rejilla">
        <div className="metrica-tarjeta">
          <span className="metrica-tarjeta__titulo">Colaboradores</span>
          <span className="metrica-tarjeta__valor">{metricas.total}</span>
        </div>

        <div className="metrica-tarjeta">
          <span className="metrica-tarjeta__titulo">Con costo vigente</span>
          <span className="metrica-tarjeta__valor" style={{ color: 'var(--ok)' }}>
            {metricas.conCosto}
          </span>
        </div>

        <div className="metrica-tarjeta">
          <span className="metrica-tarjeta__titulo">Sin costo asignado</span>
          <span
            className="metrica-tarjeta__valor"
            style={{ color: metricas.sinCosto > 0 ? '#B25E00' : 'var(--suave)' }}
          >
            {metricas.sinCosto}
          </span>
        </div>

        <div className="metrica-tarjeta">
          <span className="metrica-tarjeta__titulo">Costo promedio / h</span>
          <span className="metrica-tarjeta__valor">S/ {metricas.promedio}</span>
        </div>
      </div>

      {/* Panel de filtros y búsqueda */}
      <section className="panel panel--principal" style={{ marginBottom: '24px' }}>
        <div className="panel__titulo">
          <h2>Filtros y búsqueda</h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          <div className="campo">
            <label htmlFor="busqueda-colaborador">Buscar por nombre o correo</label>
            <input
              id="busqueda-colaborador"
              type="text"
              placeholder="Ej. Consultor, Juan, correo@..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="campo">
            <label htmlFor="filtro-rol-colaborador">Filtrar por rol</label>
            <select
              id="filtro-rol-colaborador"
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
            >
              <option value="">Todos los roles</option>
              <option value="consultor">Consultor</option>
              <option value="pm">Project Manager</option>
            </select>
          </div>
        </div>
      </section>

      {/* Tabla de colaboradores y costos */}
      <section className="panel">
        <div className="panel__titulo">
          <h2>
            Colaboradores de MACH TI ({colaboradoresFiltrados.length})
          </h2>
        </div>

        {cargando ? (
          <p role="status">Cargando colaboradores y costos vigentes…</p>
        ) : errorCarga ? (
          <p className="aviso aviso--error" role="alert">
            {errorCarga}
          </p>
        ) : colaboradoresFiltrados.length === 0 ? (
          <p style={{ color: 'var(--suave)', padding: '24px 0', textAlign: 'center' }}>
            No se encontraron colaboradores con los filtros indicados.
          </p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Rol</th>
                  <th style={{ textAlign: 'right' }}>Costo hora vigente</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Histórico</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {colaboradoresFiltrados.map((colaborador) => {
                  const tieneCosto = colaborador.costo_vigente !== null;

                  return (
                    <tr key={colaborador.id}>
                      <td>
                        <strong style={{ display: 'block', color: 'var(--tinta)' }}>
                          {colaborador.nombre}
                        </strong>
                        <span style={{ fontSize: '12px', color: 'var(--suave)' }}>
                          {colaborador.correo}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`rol ${
                            colaborador.rol === 'pm' ? 'rol--pm' : ''
                          }`}
                          style={{
                            background:
                              colaborador.rol === 'pm'
                                ? 'var(--azul-claro)'
                                : '#EDE7F6',
                            color:
                              colaborador.rol === 'pm'
                                ? 'var(--marino)'
                                : '#5E35B1',
                          }}
                        >
                          {colaborador.rol === 'pm'
                            ? 'Project Manager'
                            : 'Consultor'}
                        </span>
                      </td>

                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '15px',
                          color: tieneCosto ? 'var(--marino)' : 'var(--suave)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {tieneCosto
                          ? `S/ ${Number(
                              colaborador.costo_vigente.costo_hora
                            ).toFixed(2)}`
                          : '—'}
                      </td>

                      <td style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                        {tieneCosto ? (
                          <span>
                            Desde{' '}
                            <strong>
                              {formatearFechaVisual(
                                colaborador.costo_vigente.fecha_inicio
                              )}
                            </strong>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--suave)', fontStyle: 'italic' }}>
                            Sin definir
                          </span>
                        )}
                      </td>

                      <td style={{ whiteSpace: 'nowrap' }}>
                        {tieneCosto ? (
                          <span className="badge-estado badge-estado--aprobado">
                            Vigente
                          </span>
                        ) : (
                          <span className="badge-estado badge-estado--pendiente">
                            Sin costo
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {colaborador.total_historico > 0 ? (
                          <button
                            type="button"
                            className="boton boton--sm boton--contorno"
                            onClick={() => abrirModalHistorial(colaborador)}
                            title="Ver histórico de costos anteriores y vigencias"
                          >
                            🕒 {colaborador.total_historico}{' '}
                            {colaborador.total_historico === 1 ? 'registro' : 'registros'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--suave)' }}>
                            Sin historial
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className={`boton boton--sm ${
                            tieneCosto ? 'boton--contorno' : 'boton--primario'
                          }`}
                          onClick={() => abrirModalRegistro(colaborador)}
                          title={
                            tieneCosto
                              ? 'Actualizar costo y pasar el anterior al histórico'
                              : 'Registrar costo por primera vez'
                          }
                        >
                          {tieneCosto ? 'Actualizar costo' : '+ Asignar costo'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal para Registrar (Escenario 1) o Actualizar Costo (Escenario 2) */}
      {modalRegistroAbierto && colaboradorSeleccionado && (
        <div
          className="modal-fondo"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-costo-titulo"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModalRegistro();
          }}
        >
          <div className="modal-dialogo">
            <header className="modal-cabecera">
              <h2 id="modal-costo-titulo">
                {colaboradorSeleccionado.costo_vigente
                  ? 'Actualizar costo de personal'
                  : 'Registrar costo por hora'}
              </h2>
              <button
                type="button"
                className="modal-cerrar"
                onClick={cerrarModalRegistro}
                disabled={guardandoCosto}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </header>

            <form className="modal-cuerpo" onSubmit={guardarCosto}>
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
                  <strong>Colaborador:</strong> {colaboradorSeleccionado.nombre}
                </p>
                <p>
                  <strong>Correo:</strong> {colaboradorSeleccionado.correo}
                </p>
                <p style={{ marginBottom: 0 }}>
                  <strong>Rol:</strong>{' '}
                  {colaboradorSeleccionado.rol === 'pm'
                    ? 'Project Manager'
                    : 'Consultor'}
                </p>

                {colaboradorSeleccionado.costo_vigente && (
                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px dashed var(--linea-fuerte)',
                      color: 'var(--marino)',
                    }}
                  >
                    <span>
                      Costo vigente actual:{' '}
                      <strong>
                        S/ {Number(colaboradorSeleccionado.costo_vigente.costo_hora).toFixed(2)}/h
                      </strong>{' '}
                      (desde{' '}
                      {formatearFechaVisual(
                        colaboradorSeleccionado.costo_vigente.fecha_inicio
                      )}
                      )
                    </span>
                  </div>
                )}
              </div>

              {colaboradorSeleccionado.costo_vigente && (
                <div
                  style={{
                    background: '#E8F4FD',
                    borderLeft: '4px solid #2196F3',
                    padding: '10px 12px',
                    borderRadius: '4px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    color: '#0D47A1',
                  }}
                >
                  <strong>Regla de histórico:</strong> Al registrar este nuevo
                  costo, el costo anterior se archivará en el histórico y el nuevo costo regirá a
                  partir de la fecha indicada.
                </div>
              )}

              <div className="campo" style={{ marginBottom: '16px' }}>
                <label htmlFor="input-costo-hora">Costo interno por hora (S/)</label>
                <input
                  id="input-costo-hora"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Ej. 45.00"
                  value={costoHora}
                  required
                  disabled={guardandoCosto}
                  onChange={(e) => setCostoHora(e.target.value)}
                />
                <span style={{ fontSize: '12px', color: 'var(--suave)' }}>
                  Monto en soles por hora que le cuesta este colaborador a MACH TI.
                </span>
              </div>

              <div className="campo" style={{ marginBottom: '16px' }}>
                <label htmlFor="input-fecha-vigencia">Fecha de inicio de vigencia</label>
                <input
                  id="input-fecha-vigencia"
                  type="date"
                  min={fechaMinimaVigencia}
                  value={fechaInicio}
                  required
                  disabled={guardandoCosto}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
                <span style={{ fontSize: '12px', color: 'var(--suave)' }}>
                  Mínimo permitido: {formatearFechaVisual(fechaMinimaVigencia)}.
                </span>
              </div>

              {errorModal && (
                <p className="aviso aviso--error" role="alert">
                  {errorModal}
                </p>
              )}

              <div className="modal-acciones">
                <button
                  type="button"
                  className="boton boton--contorno"
                  onClick={cerrarModalRegistro}
                  disabled={guardandoCosto}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="boton boton--primario"
                  disabled={guardandoCosto}
                >
                  {guardandoCosto
                    ? 'Guardando…'
                    : colaboradorSeleccionado.costo_vigente
                    ? 'Actualizar y archivar anterior'
                    : 'Guardar costo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Costos (Escenario 2) */}
      {modalHistorialAbierto && colaboradorHistorial && (
        <div
          className="modal-fondo"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-historial-titulo"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModalHistorial();
          }}
        >
          <div className="modal-dialogo" style={{ maxWidth: '640px' }}>
            <header className="modal-cabecera">
              <h2 id="modal-historial-titulo">
                Historial de costos — {colaboradorHistorial.nombre}
              </h2>
              <button
                type="button"
                className="modal-cerrar"
                onClick={cerrarModalHistorial}
                aria-label="Cerrar modal de historial"
              >
                ✕
              </button>
            </header>

            <div className="modal-cuerpo">
              <p style={{ fontSize: '13px', color: 'var(--suave)', marginBottom: '16px' }}>
                Trazabilidad cronológica de todos los costos por hora asignados a este colaborador.
              </p>

              {historialCargando ? (
                <p role="status">Cargando histórico de costos…</p>
              ) : errorHistorial ? (
                <p className="aviso aviso--error" role="alert">
                  {errorHistorial}
                </p>
              ) : historialItems.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--suave)', padding: '20px 0' }}>
                  No se encontraron registros en el histórico para este colaborador.
                </p>
              ) : (
                <div className="tabla-contenedor">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Periodo de vigencia</th>
                        <th style={{ textAlign: 'right' }}>Costo / h</th>
                        <th>Estado</th>
                        <th>Fecha de registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialItems.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontSize: '13px' }}>
                            {item.vigente ? (
                              <span>
                                <strong>{formatearFechaVisual(item.fecha_inicio)}</strong> —{' '}
                                <em style={{ color: 'var(--ok)', fontWeight: 600 }}>
                                  Actualidad
                                </em>
                              </span>
                            ) : (
                              <span>
                                {formatearFechaVisual(item.fecha_inicio)} —{' '}
                                {formatearFechaVisual(item.fecha_fin) || 'Finalizado'}
                              </span>
                            )}
                          </td>

                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              color: item.vigente ? 'var(--marino)' : 'var(--suave)',
                              fontSize: '14px',
                            }}
                          >
                            S/ {Number(item.costo_hora).toFixed(2)}
                          </td>

                          <td>
                            {item.vigente ? (
                              <span className="badge-estado badge-estado--aprobado">
                                Vigente
                              </span>
                            ) : (
                              <span
                                className="badge-tipo badge-tipo--nofacturable"
                                style={{ background: '#ECEFF1', color: '#546E7A' }}
                              >
                                Histórico
                              </span>
                            )}
                          </td>

                          <td style={{ fontSize: '12px', color: 'var(--suave)' }}>
                            {formatearFechaVisual(item.creado_en?.slice(0, 10))}
                            {item.registrador?.nombre && (
                              <span style={{ display: 'block' }}>
                                por {item.registrador.nombre}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="modal-acciones" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="boton boton--primario"
                  onClick={cerrarModalHistorial}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
