const supabase = require('../config/supabase');

async function autenticar(req, res, next) {
  const authorization = req.get('Authorization') || '';
  const coincidencia = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!coincidencia) {
    return res.status(401).json({
      error: 'Debes iniciar sesión para realizar esta operación.',
    });
  }

  const token = coincidencia[1];

  try {
    // Verifica el token con Supabase Auth.
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        error: 'La sesión no es válida. Vuelve a iniciar sesión.',
      });
    }

    const { data: perfil, error: errorPerfil } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol')
      .eq('id', data.user.id)
      .maybeSingle();

    if (errorPerfil) {
      console.error('Error consultando perfil:', errorPerfil.message);

      return res.status(500).json({
        error: 'No se pudo verificar el perfil del usuario.',
      });
    }

    if (!perfil) {
      return res.status(403).json({
        error: 'Tu cuenta no tiene un perfil habilitado.',
      });
    }

    req.usuario = perfil;

    return next();
  } catch (error) {
    console.error('Error de autenticación:', error.message);

    return res.status(500).json({
      error: 'No se pudo verificar la sesión.',
    });
  }
}

function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        error: 'Debes iniciar sesión.',
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: 'No tienes permisos para realizar esta operación.',
      });
    }

    return next();
  };
}

module.exports = {
  autenticar,
  permitirRoles,
};