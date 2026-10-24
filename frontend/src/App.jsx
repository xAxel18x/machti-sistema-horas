import { useState } from 'react';
import Login from './Login';
import GestionServicios from './GestionServicios';
import MarcaMach from './Marca';

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
          <GestionServicios />
        ) : (
          <section className="sin-acceso" role="alert">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4.5" y="10.5" width="15" height="10" rx="2" stroke="#B3261E" strokeWidth="2" />
              <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="#B3261E" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div>
              <h1>Permisos insuficientes</h1>
              <p>
                Tu rol actual (<strong>{etiquetaRol}</strong>) no cuenta con permisos suficientes
                para gestionar clientes y servicios.
              </p>
              <p>Este módulo está reservado para los roles de gestión de MACH TI.</p>
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