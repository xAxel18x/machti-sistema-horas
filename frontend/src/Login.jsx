import { useState } from 'react';
import { supabase } from './supabaseClient';
import MarcaMach from './Marca';

// Decoración del panel izquierdo: una semana de trabajo.
// Cada bloque es una hora registrada y su color indica el estado.
// [horas, estado]
const SEMANA = [
  { dia: 'Lun', bloques: [[6, 'aprobada'], [2, 'nofact']] },
  { dia: 'Mar', bloques: [[8, 'aprobada']] },
  { dia: 'Mié', bloques: [[5, 'aprobada'], [3, 'pendiente']] },
  { dia: 'Jue', bloques: [[2, 'aprobada'], [6, 'pendiente']] },
  { dia: 'Vie', bloques: [[8, 'pendiente']] },
];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('Correo o contraseña incorrectos');
        return;
      }

      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (perfilError) {
        setError('No se encontró el perfil del usuario');
        return;
      }

      onLogin(perfil);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login">
      <section className="login__marca">
        <div className="login__logo">
          <MarcaMach tamano={32} color="#FFFFFF" />
          <span>MACH TI</span>
        </div>

        <div className="login__mensaje">
          <h1>Las horas de tu equipo,<br />a la vista.</h1>
          <p>
            Registro, aprobación y rentabilidad de cada servicio de MACH TI en un solo lugar.
          </p>

          <div className="semana" aria-hidden="true">
            <div className="semana__lienzo">
              {SEMANA.map((d, i) => {
                // Una celda por cada hora; el estado define el color.
                const celdas = d.bloques.flatMap(([horas, estado]) =>
                  Array.from({ length: horas }, () => estado)
                );
                return (
                  <div className="semana__pila" key={d.dia} style={{ '--i': i }}>
                    {celdas.map((estado, k) => (
                      <span
                        key={k}
                        className={`semana__bloque semana__bloque--${estado}`}
                        style={{ '--k': k }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
            <div className="semana__dias">
              {SEMANA.map((d) => (
                <span key={d.dia}>{d.dia}</span>
              ))}
            </div>
          </div>

          <p className="semana__nota" aria-hidden="true">
            Una semana de trabajo: cada bloque es una hora.
          </p>
          <ul className="leyenda" aria-hidden="true">
            <li><i className="muestra muestra--aprobada" />Aprobada</li>
            <li><i className="muestra muestra--pendiente" />Pendiente de aprobación</li>
            <li><i className="muestra muestra--nofact" />No facturable</li>
          </ul>
        </div>

        <p className="login__pie">Sistema de gestión de horas, costos y rentabilidad</p>
      </section>

      <main className="login__zona">
        <form className="login__form" onSubmit={handleLogin}>
          <div className="login__cabecera">
            <h2>Iniciar sesión</h2>
            <p>Entra con tu correo institucional.</p>
          </div>

          <div className="campo">
            <label htmlFor="login-correo">Correo institucional</label>
            <input
              id="login-correo"
              type="email"
              autoComplete="username"
              placeholder="nombre@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="campo">
            <label htmlFor="login-clave">Contraseña</label>
            <input
              id="login-clave"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="aviso aviso--error" role="alert">
              <span aria-hidden="true">✖</span> {error}
            </p>
          )}

          <button type="submit" className="boton boton--primario boton--ancho" disabled={cargando}>
            {cargando ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
      </main>
    </div>
  );
}