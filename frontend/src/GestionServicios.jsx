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

  // ---- Solo presentación (no guarda nada) ----
  // Si la API devolviera algo que no es una lista, evitamos que la pantalla se rompa.
  const listaClientes = Array.isArray(clientes) ? clientes : [];
  const listaPms = Array.isArray(pms) ? pms : [];

  const montoEstimado =
    (Number(nuevoServicio.tarifa_cliente) || 0) * (Number(nuevoServicio.horas_contratadas) || 0);
  const montoTexto = montoEstimado > 0
    ? montoEstimado.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })
    : '—';

  const esError = (mensaje) => mensaje.includes('Error');

  return (
    <div className="modulo">
      <header className="modulo__cabecera">
        <h1>Clientes y servicios</h1>
        <p>Registra a quién le presta servicio MACH TI y bajo qué condiciones.</p>
      </header>

      <div className="modulo__rejilla">
        {/* PASO 1: CLIENTES */}
        <section className="panel panel--apoyo" aria-labelledby="titulo-cliente">
          <div className="panel__titulo">
            <span className="paso" aria-hidden="true">1</span>
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
                required
              />
            </div>
            <button type="submit" className="boton boton--primario">
              Registrar cliente
            </button>
          </form>

          {mensajeCliente && (
            <p className="aviso aviso--ok" role="status">
              <span aria-hidden="true">✔</span> {mensajeCliente}
            </p>
          )}

          <div className="clientes">
            <div className="clientes__cabecera">
              <h3>Clientes registrados</h3>
              <span className="contador">{listaClientes.length}</span>
            </div>
            {listaClientes.length === 0 ? (
              <p className="clientes__vacio">
                Aún no hay clientes. Registra el primero para poder crear servicios.
              </p>
            ) : (
              <ul className="clientes__lista">
                {listaClientes.map((cli) => {
                  const idValido = cli.id || cli.id_cliente || cli.cliente_id || cli.uuid;
                  return <li key={idValido}>{cli.nombre || cli.nombre_empresa}</li>;
                })}
              </ul>
            )}
          </div>
        </section>

        {/* PASO 2: SERVICIOS */}
        <section className="panel panel--principal" aria-labelledby="titulo-servicio">
          <div className="panel__titulo">
            <span className="paso" aria-hidden="true">2</span>
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
                  onChange={(e) => setNuevoServicio({ ...nuevoServicio, cliente_id: e.target.value })}
                >
                  <option value="">Selecciona un cliente</option>
                  {listaClientes.map((cli) => {
                    const idValido = cli.id || cli.id_cliente || cli.cliente_id || cli.uuid;
                    return (
                      <option key={idValido} value={idValido}>
                        {cli.nombre || cli.nombre_empresa}
                      </option>
                    );
                  })}
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
                  onChange={(e) => setNuevoServicio({ ...nuevoServicio, nombre: e.target.value })}
                />
              </div>
            </div>

            {/* DESPLEGABLE DE PM RESPONSABLE */}
            <div className="campo">
              <label htmlFor="servicio-pm">PM responsable</label>
              <select
                id="servicio-pm"
                value={nuevoServicio.pm_responsable}
                onChange={(e) => setNuevoServicio({ ...nuevoServicio, pm_responsable: e.target.value })}
              >
                <option value="">Selecciona un PM responsable</option>
                {listaPms.map((pm) => {
                  const pmId = pm.id || pm.uuid || pm.id_usuario;
                  return (
                    <option key={pmId} value={pmId}>
                      {pm.nombre || pm.nombre_completo || pm.email}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* SECCIÓN FECHAS */}
            <fieldset className="grupo">
              <legend>Vigencia del servicio</legend>
              <div className="rejilla-2">
                <div className="campo">
                  <label htmlFor="servicio-inicio">Fecha de inicio</label>
                  <input
                    id="servicio-inicio"
                    type="date"
                    value={nuevoServicio.fecha_inicio}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    onChange={(e) => setNuevoServicio({ ...nuevoServicio, fecha_inicio: e.target.value })}
                  />
                </div>

                <div className="campo">
                  <label htmlFor="servicio-fin">Fecha de fin</label>
                  <input
                    id="servicio-fin"
                    type="date"
                    value={nuevoServicio.fecha_fin}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    onChange={(e) => setNuevoServicio({ ...nuevoServicio, fecha_fin: e.target.value })}
                  />
                </div>
              </div>
            </fieldset>

            {/* CONDICIONES ECONÓMICAS */}
            <fieldset className="grupo">
              <legend>Condiciones económicas</legend>
              <div className="rejilla-2">
                <div className="campo">
                  <label htmlFor="servicio-tarifa">Tarifa por hora (S/)</label>
                  <input
                    id="servicio-tarifa"
                    type="number"
                    placeholder="0.00"
                    required
                    step="0.01"
                    value={nuevoServicio.tarifa_cliente}
                    onChange={(e) => setNuevoServicio({ ...nuevoServicio, tarifa_cliente: e.target.value })}
                  />
                </div>

                <div className="campo">
                  <label htmlFor="servicio-horas">Horas contratadas</label>
                  <input
                    id="servicio-horas"
                    type="number"
                    placeholder="0"
                    required
                    value={nuevoServicio.horas_contratadas}
                    onChange={(e) => setNuevoServicio({ ...nuevoServicio, horas_contratadas: e.target.value })}
                  />
                </div>
              </div>

              <div className="valor">
                <span className="valor__etiqueta">Valor estimado del servicio (tarifa × horas)</span>
                <span className="valor__monto">{montoTexto}</span>
              </div>
            </fieldset>

            <button type="submit" className="boton boton--primario">
              Registrar servicio
            </button>
          </form>

          {mensajeServicio && (
            <p
              className={`aviso ${esError(mensajeServicio) ? 'aviso--error' : 'aviso--ok'}`}
              role={esError(mensajeServicio) ? 'alert' : 'status'}
            >
              <span aria-hidden="true">{esError(mensajeServicio) ? '✖' : '✔'}</span> {mensajeServicio}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}