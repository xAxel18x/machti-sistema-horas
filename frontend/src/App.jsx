import { useState } from 'react';
import Login from './Login';
import GestionServicios from './GestionServicios';

function App() {
  const [usuario, setUsuario] = useState(null);

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  return (
    <div style={{ padding: 40, fontFamily: 'Arial' }}>
      <h1>Bienvenido, {usuario.nombre}</h1>
      <p>Tu rol es: <strong>{usuario.rol}</strong></p>
      
      <hr style={{ margin: '30px 0' }} />

      {/* 2. Mostramos el formulario en la pantalla */}
      <GestionServicios />

    </div>
  );
}

export default App;
