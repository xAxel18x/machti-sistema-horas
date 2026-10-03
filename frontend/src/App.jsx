import { useState } from 'react';
import Login from './Login';

function App() {
  const [usuario, setUsuario] = useState(null);

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  return (
    <div style={{ padding: 40, fontFamily: 'Arial' }}>
      <h1>Bienvenido, {usuario.nombre}</h1>
      <p>Tu rol es: <strong>{usuario.rol}</strong></p>
    </div>
  );
}

export default App;