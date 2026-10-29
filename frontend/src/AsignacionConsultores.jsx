import { useEffect, useState } from 'react';
import { apiFetch } from './api';

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

function EquipoServicio({ servicio, consultores }) {
  const [asignaciones, setAsignaciones] = useState([]);
  const [consultorId, setConsultorId] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargarEquipo() {
      try {
        const res = await apiFetch(
          `/servicios/${servicio.id}/consultores`
        );

        const data = await leerRespuesta(
          res,
          'No se pudo cargar el equipo del servicio.'
        );

        if (!Array.isArray(data)) {
          throw new Error('El servidor no devolvió un listado válido.');
        }

        if (activo) {
          setAsignaciones(data);
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

    cargarEquipo();

    return () => {
      activo = false;
    };
  }, [servicio.id]);

  const idsAsignados = new Set(
    asignaciones.map((asignacion) => asignacion.consultor_id)
  );

  const disponibles = consultores.filter(
    (consultor) => !idsAsignados.has(consultor.id)
  );

  async function asignarConsultor(e) {
    e.preventDefault();

    if (guardando || cargando || errorCarga) return;

    setAviso(null);

    const consultorSeleccionado = disponibles.find(
      (consultor) => consultor.id === consultorId
    );

    if (!consultorSeleccionado) {
      setAviso({
        tipo: 'error',
        texto: 'Selecciona un consultor disponible.',
      });
      return;
    }

    setGuardando(true);

    try {
      const res = await apiFetch(
        `/servicios/${servicio.id}/consultores`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consultor_id: consultorId,
          }),
        }
      );

      const data = await leerRespuesta(
        res,
        'No se pudo asignar el consultor.'
      );

      if (!data.asignacion?.id) {
        throw new Error(
          'No se pudo confirmar el resultado. Actualiza los datos antes de reintentar.'
        );
      }

      setAsignaciones((anteriores) => [
        ...anteriores,
        data.asignacion,
      ]);

      setConsultorId('');

      setAviso({
        tipo: 'ok',
        texto: `${consultorSeleccionado.nombre} fue asignado correctamente.`,
      });
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
    <div>
      <div className="panel__titulo">
        <h3>Equipo de {servicio.nombre}</h3>
      </div>

      {cargando ? (
        <p role="status">Cargando consultores asignados…</p>
      ) : errorCarga ? (
        <p className="aviso aviso--error" role="alert">
          {errorCarga} Usa «Actualizar datos» para volver a intentarlo.
        </p>
      ) : (
        <>
          <div className="clientes">
            <div className="clientes__cabecera">
              <h3>Consultores asignados</h3>
              <span className="contador">
                {asignaciones.length}
              </span>
            </div>

            {asignaciones.length === 0 ? (
              <p className="clientes__vacio">
                Este servicio todavía no tiene consultores asignados.
              </p>
            ) : (
              <ul className="clientes__lista">
                {asignaciones.map((asignacion) => (
                  <li key={asignacion.id}>
                    {asignacion.consultor?.nombre ||
                      'Consultor sin nombre disponible'}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            className="formulario"
            onSubmit={asignarConsultor}
            style={{ marginTop: '24px' }}
            aria-busy={guardando}
          >
            <div className="campo">
              <label htmlFor="asignacion-consultor">
                Agregar consultor
              </label>

              <select
                id="asignacion-consultor"
                value={consultorId}
                required
                disabled={guardando || disponibles.length === 0}
                onChange={(e) => {
                  setConsultorId(e.target.value);
                  setAviso(null);
                }}
              >
                <option value="">Selecciona un consultor</option>

                {disponibles.map((consultor) => (
                  <option key={consultor.id} value={consultor.id}>
                    {consultor.nombre}
                  </option>
                ))}
              </select>
            </div>

            {consultores.length === 0 ? (
              <p>No hay usuarios con el rol consultor registrados.</p>
            ) : disponibles.length === 0 ? (
              <p>
                Todos los consultores disponibles ya están asignados
                a este servicio.
              </p>
            ) : null}

            <button
              type="submit"
              className="boton boton--primario"
              disabled={guardando || !consultorId}
            >
              {guardando ? 'Asignando…' : 'Asignar consultor'}
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
        </>
      )}
    </div>
  );
}

export default function AsignacionConsultores() {
  const [servicios, setServicios] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [servicioId, setServicioId] = useState('');
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      try {
        const [resServicios, resConsultores] = await Promise.all([
          apiFetch('/servicios/mis-servicios'),
          apiFetch('/servicios/consultores'),
        ]);

        const [dataServicios, dataConsultores] = await Promise.all([
          leerRespuesta(
            resServicios,
            'No se pudieron cargar tus servicios.'
          ),
          leerRespuesta(
            resConsultores,
            'No se pudieron cargar los consultores.'
          ),
        ]);

        if (
          !Array.isArray(dataServicios) ||
          !Array.isArray(dataConsultores)
        ) {
          throw new Error('El servidor no devolvió los listados esperados.');
        }

        if (activo) {
          setServicios(dataServicios);
          setConsultores(dataConsultores);
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

    cargarDatos();

    return () => {
      activo = false;
    };
  }, [recarga]);

  function actualizarDatos() {
    setServicioId('');
    setServicios([]);
    setConsultores([]);
    setErrorCarga('');
    setCargando(true);
    setRecarga((valor) => valor + 1);
  }

  const servicioSeleccionado = servicios.find(
    (servicio) => servicio.id === servicioId
  );

  return (
    <section
      className="modulo"
      aria-labelledby="titulo-asignaciones"
      style={{ marginTop: '32px' }}
    >
      <header className="modulo__cabecera">
        <h2 id="titulo-asignaciones">Asignación de consultores</h2>
        <p>
          Organiza el equipo de los servicios donde eres PM responsable.
        </p>

        <button
          type="button"
          className="boton boton--primario"
          onClick={actualizarDatos}
          disabled={cargando}
          style={{ marginTop: '12px' }}
        >
          {cargando ? 'Cargando…' : 'Actualizar datos'}
        </button>
      </header>

      {cargando ? (
        <p role="status">Cargando servicios y consultores…</p>
      ) : errorCarga ? (
        <p className="aviso aviso--error" role="alert">
          {errorCarga}
        </p>
      ) : servicios.length === 0 ? (
        <div className="panel">
          <p>
            No tienes servicios donde figures como PM responsable.
            Registra uno y selecciona tu usuario como responsable.
          </p>
          <p>
            Después pulsa «Actualizar datos» para verlo aquí.
          </p>
        </div>
      ) : (
        <div className="modulo__rejilla">
          <section className="panel panel--apoyo">
            <div className="panel__titulo">
              <h3>Seleccionar servicio</h3>
            </div>

            <div className="campo">
              <label htmlFor="asignacion-servicio">
                Tus servicios
              </label>

              <select
                id="asignacion-servicio"
                value={servicioId}
                onChange={(e) => setServicioId(e.target.value)}
              >
                <option value="">Selecciona un servicio</option>

                {servicios.map((servicio) => (
                  <option key={servicio.id} value={servicio.id}>
                    {servicio.nombre}
                    {' — '}
                    {servicio.cliente?.nombre || 'Sin cliente'}
                  </option>
                ))}
              </select>
            </div>

            {servicioSeleccionado && (
              <div className="clientes">
                <p>
                  <strong>Cliente:</strong>{' '}
                  {servicioSeleccionado.cliente?.nombre || 'Sin cliente'}
                </p>

                <p>
                  <strong>Servicio:</strong>{' '}
                  {servicioSeleccionado.nombre}
                </p>

                <p>
                  <strong>Horas contratadas:</strong>{' '}
                  {servicioSeleccionado.horas_contratadas ?? 'Sin definir'}
                </p>
              </div>
            )}
          </section>

          <section className="panel panel--principal">
            {servicioSeleccionado ? (
              <EquipoServicio
                key={servicioSeleccionado.id}
                servicio={servicioSeleccionado}
                consultores={consultores}
              />
            ) : (
              <p>
                Selecciona un servicio para consultar su equipo
                y asignar consultores.
              </p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}