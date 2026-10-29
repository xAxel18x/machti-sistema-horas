const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Función auxiliar para validar si un string es un UUID válido
const esUUID = (str) => {
  const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof str === 'string' && regexUUID.test(str);
};


// Listar los servicios del PM autenticado
router.get('/mis-servicios', async (req, res) => {
  if (req.usuario.rol !== 'pm') {
    return res.status(403).json({
      error: 'Solo un PM puede consultar este listado.',
    });
  }

  try {
    const { data, error } = await supabase
      .from('servicios')
      .select(`
        id,
        nombre,
        cliente_id,
        pm_responsable,
        fecha_inicio,
        fecha_fin,
        horas_contratadas,
        cliente:clientes!servicios_cliente_id_fkey (
          id,
          nombre
        )
      `)
      .eq('pm_responsable', req.usuario.id)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error consultando servicios del PM:', error.message);

      return res.status(500).json({
        error: 'No se pudieron obtener tus servicios.',
      });
    }

    return res.status(200).json(data || []);
  } catch (error) {
    console.error('Error inesperado al listar servicios:', error.message);

    return res.status(500).json({
      error: 'Ocurrió un error al consultar tus servicios.',
    });
  }
});

router.get('/pms', async (req, res) => {
  try {
    // Busca en la tabla 'usuarios' a los que tienen rol 'pm'
    const { data, error } = await supabase
      .from('usuarios') 
      .select('id, nombre, rol') 
      .eq('rol', 'pm');

    if (error) throw error;
    res.status(200).json(data || []);
  } catch (err) {
    console.error('Error cargando PMs:', err);
    res.status(500).json({ error: 'No se pudieron obtener los PMs' });
  }
});


// Crear un nuevo servicio
router.post('/', async (req, res) => {
  const { 
    cliente_id, 
    id_cliente, 
    clienteId, 
    nombre, 
    tarifa_cliente, 
    horas_presupuestadas, 
    horas_contratadas,
    fecha_inicio,
    fecha_fin,
    pm_responsable
  } = req.body;

const tipoTarifa = typeof tarifa_cliente;

if (
  tarifa_cliente === undefined ||
  tarifa_cliente === null ||
  (tipoTarifa !== 'number' && tipoTarifa !== 'string') ||
  (tipoTarifa === 'string' && tarifa_cliente.trim() === '')
) {
  return res.status(400).json({
    error: 'Debes ingresar la tarifa por hora del servicio.',
  });
}

const tarifaValidada = Number(tarifa_cliente);

if (!Number.isFinite(tarifaValidada) || tarifaValidada < 0) {
  return res.status(400).json({
    error: 'La tarifa por hora debe ser un número válido mayor o igual a cero.',
  });
}
  const idFinalCliente = cliente_id || id_cliente || clienteId;
  const cantidadHoras = Number(horas_contratadas || horas_presupuestadas || 0);

  // Si pm_responsable no es un UUID válido enviamos null para no romper Supabase
  const pmUuidFinal = esUUID(pm_responsable) ? pm_responsable : null;

  const { data, error } = await supabase
    .from('servicios')
    .insert([{ 
      cliente_id: idFinalCliente, 
      nombre, 
      tarifa_cliente: tarifaValidada,
      horas_presupuestadas: cantidadHoras,
      horas_contratadas: cantidadHoras,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      pm_responsable: pmUuidFinal
    }])
    .select();
  
  if (error) {
    console.error('Error insertando servicio:', error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({ mensaje: 'Servicio registrado con éxito', servicio: data[0] });
});


async function verificarServicioDelPm(req, res, next) {
  if (req.usuario.rol !== 'pm') {
    return res.status(403).json({
      error: 'Solo un PM puede gestionar las asignaciones.',
    });
  }

  const { servicioId } = req.params;

  if (!esUUID(servicioId)) {
    return res.status(400).json({
      error: 'El identificador del servicio no es válido.',
    });
  }

  try {
    const { data: servicio, error } = await supabase
      .from('servicios')
      .select('id, nombre, pm_responsable')
      .eq('id', servicioId)
      .eq('pm_responsable', req.usuario.id)
      .maybeSingle();

    if (error) {
      console.error('Error verificando servicio:', error.message);

      return res.status(500).json({
        error: 'No se pudo verificar el servicio.',
      });
    }

    if (!servicio) {
      return res.status(404).json({
        error: 'El servicio no existe o no está bajo tu responsabilidad.',
      });
    }

    req.servicio = servicio;

    return next();
  } catch (error) {
    console.error('Error verificando acceso al servicio:', error.message);

    return res.status(500).json({
      error: 'No se pudo verificar el acceso al servicio.',
    });
  }
}


router.get('/consultores', async (req, res) => {
  if (req.usuario.rol !== 'pm') {
    return res.status(403).json({
      error: 'Solo un PM puede consultar los consultores disponibles.',
    });
  }

  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('rol', 'consultor')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error consultando consultores:', error.message);

      return res.status(500).json({
        error: 'No se pudieron obtener los consultores.',
      });
    }

    return res.status(200).json(data || []);
  } catch (error) {
    console.error('Error inesperado consultando consultores:', error.message);

    return res.status(500).json({
      error: 'Ocurrió un error al consultar los consultores.',
    });
  }
});


router.get(
  '/:servicioId/consultores',
  verificarServicioDelPm,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('consultores_asignados')
        .select(`
          id,
          servicio_id,
          consultor_id,
          consultor:usuarios!consultores_asignados_consultor_id_fkey (
            id,
            nombre
          )
        `)
        .eq('servicio_id', req.servicio.id)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error consultando asignaciones:', error.message);

        return res.status(500).json({
          error: 'No se pudieron obtener los consultores asignados.',
        });
      }

      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error inesperado consultando asignaciones:', error.message);

      return res.status(500).json({
        error: 'Ocurrió un error al consultar las asignaciones.',
      });
    }
  }
);


router.post(
  '/:servicioId/consultores',
  verificarServicioDelPm,
  async (req, res) => {
    const { consultor_id } = req.body || {};

    if (!esUUID(consultor_id)) {
      return res.status(400).json({
        error: 'Debes seleccionar un consultor válido.',
      });
    }

    try {
      const { data: consultor, error: errorConsultor } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('id', consultor_id)
        .eq('rol', 'consultor')
        .maybeSingle();

      if (errorConsultor) {
        console.error('Error verificando consultor:', errorConsultor.message);

        return res.status(500).json({
          error: 'No se pudo verificar el consultor.',
        });
      }

      if (!consultor) {
        return res.status(400).json({
          error: 'El usuario seleccionado no existe o no tiene rol consultor.',
        });
      }

      const { data: asignacion, error: errorAsignacion } = await supabase
        .from('consultores_asignados')
        .insert({
          servicio_id: req.servicio.id,
          consultor_id: consultor.id,
          costo_interno_hora: null,
        })
        .select('id, servicio_id, consultor_id')
        .single();

      if (errorAsignacion) {
        
        if (errorAsignacion.code === '23505') {
          return res.status(409).json({
            error: 'Este consultor ya está asignado al servicio.',
          });
        }

        if (errorAsignacion.code === '23503') {
          return res.status(400).json({
            error: 'El servicio o el consultor ya no está disponible.',
          });
        }

        console.error('Error guardando asignación:', errorAsignacion.message);

        return res.status(500).json({
          error: 'No se pudo asignar el consultor.',
        });
      }

      return res.status(201).json({
        mensaje: 'Consultor asignado correctamente.',
        asignacion: {
          ...asignacion,
          consultor,
        },
      });
    } catch (error) {
      console.error('Error inesperado al asignar consultor:', error.message);

      return res.status(500).json({
        error: 'Ocurrió un error al asignar el consultor.',
      });
    }
  }
);

module.exports = router;
