import { useState, useEffect } from 'react';
import Login from './Login';
import GestionServicios from './GestionServicios';
import MarcaMach from './Marca';
import AsignacionConsultores from './AsignacionConsultores';
import RegistroHoras from './RegistroHoras';
import ConsultarHoras from './ConsultarHoras';
import AprobacionHoras from './AprobacionHoras';
import GestionCostos from './GestionCostos';

// Solo para mostrar: el valor guardado en la base de datos no cambia.
const ETIQUETAS_ROL = {
  consultor: 'Consultor',
  pm: 'Project Manager',
  finanzas: 'Finanzas',
};

// Ruta oficial por defecto al iniciar sesión según el rol
const RUTA_POR_DEFECTO = {
  consultor: '/horas',
  pm: '/clientes',
  finanzas: '/costos',
};

// Permisos exclusivos por cada ruta del sistema
const PERMISOS_RUTAS = {
  '/horas': {
    roles: ['consultor'],
    modulo: 'Registro y consulta de horas',
    areaExclusiva: 'Consultores',
  },
  '/clientes': {
    roles: ['pm'],
    modulo: 'Clientes y servicios',
    areaExclusiva: 'Project Managers',
  },
  '/aprobaciones': {
    roles: ['pm'],
    modulo: 'Revisión y aprobación de horas',
    areaExclusiva: 'Project Managers',
  },
  '/costos': {
    roles: ['finanzas'],
    modulo: 'Costos de personal',
    areaExclusiva: 'Finanzas',
  },
};

const CLAVE_SESION = 'machti_usuario_sesion';

function normalizarRuta(pathname = '/') {
  const limpia = pathname.toLowerCase().replace(/\/+$/, '');
  return limpia || '/';
}

function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function AccesoDenegado({ etiquetaRol, rutaIntentada, infoRuta, onVolver }) {
  const nombreModulo = infoRuta ? infoRuta.modulo : rutaIntentada;
  const areaExclusiva = infoRuta ? infoRuta.areaExclusiva : 'personal autorizado';

  return (
    <section
      role="alert"
      style={{
        minHeight: '65vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          maxWidth: '460px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          border: '1px solid #FECACA',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)',
          padding: '32px 28px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <svg
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <span
          style={{
            display: 'inline-block',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#DC2626',
            backgroundColor: '#FEF2F2',
            padding: '4px 12px',
            borderRadius: '9999px',
            marginBottom: '12px',
          }}
        >
          Error 403 — Acceso Restringido
        </span>

        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#0F172A',
            margin: '0 0 10px',
          }}
        >
          Acceso denegado a {nombreModulo}
        </h1>

        <p
          style={{
            fontSize: '14px',
            lineHeight: 1.6,
            color: '#475569',
            margin: '0 0 24px',
          }}
        >
          Tu cuenta actual con rol de <strong>{etiquetaRol}</strong> no tiene
          permisos para ingresar a la sección{' '}
          <code
            style={{
              backgroundColor: '#F1F5F9',
              padding: '2px 6px',
              borderRadius: '4px',
              color: '#0F172A',
            }}
          >
            {rutaIntentada}
          </code>
          . Este módulo es de acceso exclusivo para <strong>{areaExclusiva}</strong>.
        </p>

        <button
          type="button"
          onClick={onVolver}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: '#1E4068',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Volver a mi panel principal
        </button>
      </div>
    </section>
  );
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

function ModuloPm({ usuario, rutaActual, onCambiarRuta }) {
  const pestana = rutaActual === '/aprobaciones' ? 'aprobaciones' : 'gestion';

  return (
    <div>
      <nav className="pestanas" aria-label="Navegación del Project Manager">
        <button
          type="button"
          className={`pestana ${
            pestana === 'gestion' ? 'pestana--activa' : ''
          }`}
          aria-current={pestana === 'gestion' ? 'page' : undefined}
          onClick={() => onCambiarRuta('/clientes')}
        >
          Clientes y servicios
        </button>

        <button
          type="button"
          className={`pestana ${
            pestana === 'aprobaciones' ? 'pestana--activa' : ''
          }`}
          aria-current={pestana === 'aprobaciones' ? 'page' : undefined}
          onClick={() => onCambiarRuta('/aprobaciones')}
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

function ModuloFinanzas({ usuario }) {
  return (
    <div>
      <nav className="pestanas" aria-label="Navegación de Finanzas">
        <button
          type="button"
          className="pestana pestana--activa"
          aria-current="page"
        >
          Costos de personal
        </button>
      </nav>

      <GestionCostos key={usuario.id} />
    </div>
  );
}

export function VistaPrincipal({ usuario, rutaActual, onCambiarRuta, onSalir }) {
  const rolUsuario = usuario.rol ? usuario.rol.toLowerCase().trim() : '';
  const etiquetaRol = ETIQUETAS_ROL[rolUsuario] || usuario.rol;
  const rutaBaseRol = RUTA_POR_DEFECTO[rolUsuario];

  // Si el usuario tiene rol válido y entró a la raíz "/", redirigir a su ruta oficial
  useEffect(() => {
    if (rutaBaseRol && rutaActual === '/') {
      onCambiarRuta(rutaBaseRol, true);
    }
  }, [rutaBaseRol, rutaActual, onCambiarRuta]);

  const infoRuta = PERMISOS_RUTAS[rutaActual];
  const tienePermiso = infoRuta ? infoRuta.roles.includes(rolUsuario) : false;

  const renderizarContenido = () => {
    if (!rutaBaseRol) {
      return (
        <section className="sin-acceso" role="alert">
          <div>
            <h1>Permisos insuficientes</h1>
            <p>
              Tu rol actual (<strong>{etiquetaRol}</strong>) no cuenta con un
              módulo habilitado.
            </p>
          </div>
        </section>
      );
    }

    // Mientras redirige de "/" a su ruta por defecto
    if (rutaActual === '/') {
      return null;
    }

    // Si intenta entrar a una URL de otro rol (ej. Consultor o PM entrando a /costos)
    if (!tienePermiso) {
      return (
        <AccesoDenegado
          etiquetaRol={etiquetaRol}
          rutaIntentada={rutaActual}
          infoRuta={infoRuta}
          onVolver={() => onCambiarRuta(rutaBaseRol)}
        />
      );
    }

    if (rolUsuario === 'pm') {
      return (
        <ModuloPm
          key={usuario.id}
          usuario={usuario}
          rutaActual={rutaActual}
          onCambiarRuta={onCambiarRuta}
        />
      );
    }

    if (rolUsuario === 'finanzas') {
      return <ModuloFinanzas key={usuario.id} usuario={usuario} />;
    }

    return <ModuloConsultor key={usuario.id} usuario={usuario} />;
  };

  return (
    <div className="app">
      <header className="barra">
        <div className="barra__marca">
          <MarcaMach tamano={28} color="#FFFFFF" />
          <span>MACH TI</span>
        </div>

        <div className="barra__usuario">
          <span className="avatar" aria-hidden="true">
            {iniciales(usuario.nombre)}
          </span>
          <div className="barra__datos">
            <span className="barra__nombre">{usuario.nombre}</span>
            <span className="rol">{etiquetaRol}</span>
          </div>
          <button
            type="button"
            className="boton boton--contorno"
            onClick={onSalir}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="contenido">{renderizarContenido()}</main>
    </div>
  );
}

function App() {
  const [usuario, setUsuario] = useState(() => {
    try {
      const guardado = sessionStorage.getItem(CLAVE_SESION);
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  });

  const [rutaActual, setRutaActual] = useState(() =>
    normalizarRuta(window.location.pathname)
  );

  useEffect(() => {
    const manejarPopState = () => {
      setRutaActual(normalizarRuta(window.location.pathname));
    };
    window.addEventListener('popstate', manejarPopState);
    return () => window.removeEventListener('popstate', manejarPopState);
  }, []);

  const cambiarRuta = (nuevaRuta, reemplazar = false) => {
    const limpia = normalizarRuta(nuevaRuta);
    if (reemplazar) {
      window.history.replaceState({}, '', limpia);
    } else {
      window.history.pushState({}, '', limpia);
    }
    setRutaActual(limpia);
  };

  const manejarLogin = (datosUsuario) => {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(datosUsuario));
    setUsuario(datosUsuario);
    setRutaActual(normalizarRuta(window.location.pathname));
  };

  const manejarSalir = () => {
    sessionStorage.removeItem(CLAVE_SESION);
    setUsuario(null);
    cambiarRuta('/', true);
  };

  if (!usuario) {
    return <Login onLogin={manejarLogin} />;
  }

  return (
    <VistaPrincipal
      usuario={usuario}
      rutaActual={rutaActual}
      onCambiarRuta={cambiarRuta}
      onSalir={manejarSalir}
    />
  );
}

export default App;
