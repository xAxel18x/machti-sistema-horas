import { useState } from 'react';
import Login from './Login';
import GestionServicios from './GestionServicios';
import MarcaMach from './Marca';
import AsignacionConsultores from './AsignacionConsultores';
import RegistroHoras from './RegistroHoras';
import ConsultarHoras from './ConsultarHoras';
import AprobacionHoras from './AprobacionHoras';

// Solo para mostrar: el valor guardado en la base de datos no cambia.
const ETIQUETAS_ROL = {
  consultor: 'Consultor',
  pm: 'Project Manager',
  finanzas: 'Finanzas',
};

function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function ModuloConsultor({ usuario }) {
  const [pestana, setPestana] = useState('registro'); // 'registro' | 'consulta'

  return (
    <div>
      <nav className="pestanas" aria-label="Navegación del consultor">
        <button
          type="button"
          className={`pestana ${
            pestana === 'registro' ? 'pestana--activa' : ''
          }`}
          onClick={() => setPestana('registro')}
        >
          Registrar horas
        </button>
        <button
          type="button"
          className={`pestana ${
            pestana === 'consulta' ? 'pestana--activa' : ''
          }`}
          onClick={() => setPestana('consulta')}
        >
          Consultar y corregir horas
        </button>
      </nav>

      {pestana === 'registro' ? (
        <RegistroHoras
          key={usuario.id}
          onVerRegistros={() => setPestana('consulta')}
        />
      ) : (
        <ConsultarHoras
          key={usuario.id}
          onIrARegistro={() => setPestana('registro')}
        />
      )}
    </div>
  );
}

function ModuloPm({ usuario }) {
  const [pestana, setPestana] = useState('gestion');

  return (
    <div>
      <nav className="pestanas" aria-label="Navegación del Project Manager">
        <button
          type="button"
          className={`pestana ${
            pestana === 'gestion' ? 'pestana--activa' : ''
          }`}
          aria-current={pestana === 'gestion' ? 'page' : undefined}
          onClick={() => setPestana('gestion')}
        >
          Clientes y servicios
        </button>

        <button
          type="button"
          className={`pestana ${
            pestana === 'aprobaciones' ? 'pestana--activa' : ''
          }`}
          aria-current={pestana === 'aprobaciones' ? 'page' : undefined}
          onClick={() => setPestana('aprobaciones')}
        >
          Revisar y aprobar horas
        </button>
      </nav>

      {pestana === 'gestion' ? (
        <>
          <GestionServicios />
          <AsignacionConsultores key={usuario.id} />
        </>
      ) : (
        <AprobacionHoras key={usuario.id} />
      )}
    </div>
  );
}

export function VistaPrincipal({ usuario, onSalir }) {
  const rolUsuario = usuario.rol ? usuario.rol.toLowerCase().trim() : '';
  const etiquetaRol = ETIQUETAS_ROL[rolUsuario] || usuario.rol;

  return (
    <div className="app">
      <header className="barra">
        <div className="barra__marca">
          <MarcaMach tamano={28} color="#FFFFFF" />
          <span>MACH TI</span>
        </div>

        <div className="barra__usuario">
          <span className="avatar" aria-hidden="true">{iniciales(usuario.nombre)}</span>
          <div className="barra__datos">
            <span className="barra__nombre">{usuario.nombre}</span>
            <span className="rol">{etiquetaRol}</span>
          </div>
          <button type="button" className="boton boton--contorno" onClick={onSalir}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="contenido">
          {rolUsuario === 'pm' ? (
          <ModuloPm key={usuario.id} usuario={usuario} />
        ) : rolUsuario === 'finanzas' ? (
          <GestionServicios />
        ) : rolUsuario === 'consultor' ? (
          <ModuloConsultor key={usuario.id} usuario={usuario} />
        ) : (
          <section className="sin-acceso" role="alert">
            <div>
              <h1>Permisos insuficientes</h1>
              <p>
                Tu rol actual (<strong>{etiquetaRol}</strong>) no cuenta
                con un módulo habilitado.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function App() {
  const [usuario, setUsuario] = useState(null);

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  return <VistaPrincipal usuario={usuario} onSalir={() => setUsuario(null)} />;
}

export default App;