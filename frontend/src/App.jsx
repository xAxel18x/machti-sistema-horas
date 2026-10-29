import { useState } from 'react';
import Login from './Login';
import GestionServicios from './GestionServicios';
import MarcaMach from './Marca';
import AsignacionConsultores from './AsignacionConsultores';
import RegistroHoras from './RegistroHoras';

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

export function VistaPrincipal({ usuario, onSalir }) {
  const rolUsuario = usuario.rol ? usuario.rol.toLowerCase().trim() : '';
  const puedeGestionarServicios = rolUsuario === 'pm' || rolUsuario === 'finanzas';
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
        {puedeGestionarServicios ? (
          <>
            <GestionServicios />

            {rolUsuario === 'pm' && (
              <AsignacionConsultores key={usuario.id} />
            )}
          </>
        ) : rolUsuario === 'consultor' ? (
          <RegistroHoras key={usuario.id} />
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