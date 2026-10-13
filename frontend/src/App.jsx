import { useState } from 'react';
import Login from './Login';
import GestionServicios from './GestionServicios';

function App() {
  const [usuario, setUsuario] = useState(null);

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  const rolUsuario = usuario.rol ? usuario.rol.toLowerCase().trim() : '';
  const puedeGestionarServicios = rolUsuario === 'pm' || rolUsuario === 'finanzas';

  return (
    <div style={{ padding: 40, fontFamily: 'Arial' }}>
      
      <div style={{ position: 'relative', textAlign: 'center' }}>
        
        <button 
          onClick={() => setUsuario(null)}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            padding: '8px 16px',
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Cerrar sesión
        </button>

        <h1>Bienvenido, {usuario.nombre}</h1>
        <p>Tu rol es: <strong>{usuario.rol}</strong></p>
      </div>
      
      <hr style={{ margin: '30px 0' }} />

      {puedeGestionarServicios ? (
        <GestionServicios />
      ) : (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #F87171',
          borderRadius: 8,
          padding: 24,
          textAlign: 'center',
          maxWidth: 680,
          margin: '0 auto'
        }}>
          <h3 style={{ color: '#991B1B', margin: '0 0 10px 0' }}>
            Acceso Denegado
          </h3>
          <p style={{ color: '#7F1D1D', margin: 0 }}>
            Tu rol actual (<strong>{usuario.rol}</strong>) no cuenta con permisos suficientes para gestionar clientes y servicios.
          </p>
          <small style={{ color: '#B91C1C', display: 'block', marginTop: 10 }}>
            Este módulo está reservado para los roles de gestión de MACH TI.
          </small>
        </div>
      )}

    </div>
  );
}

export default App;