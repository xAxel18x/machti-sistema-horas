const express = require('express');
const router = express.Router();

const supabase = require('../config/supabase');
const {
  MOTIVOS_OBSERVACION,
  esMotivoValido,
} = require('../config/catalogoObservaciones');

function esUUID(valor) {
  return (
    typeof valor === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor)
  );
}

function esFechaValida(valor) {
  if (
    typeof valor !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor) ||
    valor.startsWith('0000-')
  ) {
    return false;
  }

  const fecha = new Date(`${valor}T00:00:00.000Z`);

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
}

function responderError(res, error) {
  console.error('Error en aprobación de horas:', error.message);

  if (error.code === '42501') {
    return res.status(403).json({
      error: 'No tienes permisos para revisar estos registros.',
    });
  }

  if (error.code === '22023') {
    return res.status(400).json({ error: error.message });
  }

  return res.status(500).json({
    error: 'No se pudo completar la operación de revisión.',
  });
}

// El catalogo desplegable
router.get('/motivos', (req, res) => {
  return res.json(MOTIVOS_OBSERVACION);
});

// Consultar registros únicamente de los servicios del PM
router.get('/', async (req, res) => {
  const {
    consultor_id,
    servicio_id,
    fecha_desde,
    fecha_hasta,
    estado,
  } = req.query;

  for (const valor of [consultor_id, servicio_id]) {
    if (valor !== undefined && !esUUID(valor)) {
      return res.status(400).json({
        error: 'El consultor o el servicio seleccionado no es válido.',
      });
    }
  }

  for (const valor of [fecha_desde, fecha_hasta]) {
    if (valor !== undefined && !esFechaValida(valor)) {
      return res.status(400).json({
        error: 'Las fechas deben ser válidas y usar formato AAAA-MM-DD.',
      });
    }
  }

  if (fecha_desde && fecha_hasta && fecha_desde > fecha_hasta) {
    return res.status(400).json({
      error: 'La fecha inicial no puede ser posterior a la final.',
    });
  }

  if (
    estado !== undefined &&
    !['pendiente', 'observado', 'aprobado'].includes(estado)
  ) {
    return res.status(400).json({
      error: 'El estado seleccionado no es válido.',
    });
  }

  const paginaTexto = String(req.query.pagina ?? '1');

  if (!/^[1-9]\d*$/.test(paginaTexto)) {
    return res.status(400).json({
      error: 'La página no es válida.',
    });
  }

  const pagina = Number(paginaTexto);

  if (!Number.isSafeInteger(pagina) || pagina > 1000000) {
    return res.status(400).json({
      error: 'La página no es válida.',
    });
  }

  const tamano = 100;
  const desde = (pagina - 1) * tamano;

  try {
    let consulta = supabase
      .from('registros_horas')
      .select(`
        id,
        consultor_id,
        servicio_id,
        actividad,
        fecha,
        horas,
        es_facturable,
        estado,
        motivo_observacion,
        creado_en,
        actualizado_en,
        consultor:usuarios!consultor_id (
          id,
          nombre
        ),
        servicio:servicios!servicio_id!inner (
          id,
          nombre,
          cliente_id,
          pm_responsable,
          cliente:clientes!cliente_id (
            id,
            nombre
          )
        )
      `, { count: 'exact' })
      .eq('servicio.pm_responsable', req.usuario.id);

    if (consultor_id) {
      consulta = consulta.eq('consultor_id', consultor_id);
    }

    if (servicio_id) {
      consulta = consulta.eq('servicio_id', servicio_id);
    }

    if (fecha_desde) {
      consulta = consulta.gte('fecha', fecha_desde);
    }

    if (fecha_hasta) {
      consulta = consulta.lte('fecha', fecha_hasta);
    }

    if (estado) {
      consulta = consulta.eq('estado', estado);
    }

    const { data, error, count } = await consulta
      .order('fecha', { ascending: false })
      .order('id', { ascending: false })
      .range(desde, desde + tamano - 1);

    if (error) return responderError(res, error);

    return res.json({
      registros: data || [],
      total: count || 0,
      pagina,
      tamano,
    });
  } catch (error) {
    return responderError(res, error);
  }
});

// Escenario 3: aprobar pendientes por consultor y periodo
router.post('/aprobar-periodo', async (req, res) => {
  const {
    consultor_id,
    fecha_desde,
    fecha_hasta,
    servicio_id,
  } = req.body || {};

  if (!esUUID(consultor_id)) {
    return res.status(400).json({
      error: 'Debes seleccionar un consultor válido.',
    });
  }

  if (
    !esFechaValida(fecha_desde) ||
    !esFechaValida(fecha_hasta) ||
    fecha_desde > fecha_hasta
  ) {
    return res.status(400).json({
      error: 'Debes seleccionar un rango de fechas válido.',
    });
  }

  if (servicio_id !== undefined && !esUUID(servicio_id)) {
    return res.status(400).json({
      error: 'El servicio seleccionado no es válido.',
    });
  }

  try {
    const { data: cantidad, error } = await supabase.rpc(
      'revisar_horas_pm',
      {
        p_pm_id: req.usuario.id,
        p_estado: 'aprobado',
        p_consultor_id: consultor_id,
        p_fecha_desde: fecha_desde,
        p_fecha_hasta: fecha_hasta,
        p_servicio_id: servicio_id || null,
      }
    );

    if (error) return responderError(res, error);

    return res.json({
      mensaje: cantidad > 0
        ? `Se aprobaron ${cantidad} registros pendientes.`
        : 'No hay registros pendientes para aprobar en ese periodo.',
      cantidad,
    });
  } catch (error) {
    return responderError(res, error);
  }
});

function revisarIndividual(estadoDestino) {
  return async (req, res) => {
    const { id } = req.params;
    const { motivo, actualizado_en } = req.body || {};

    if (!esUUID(id)) {
      return res.status(400).json({
        error: 'El identificador del registro no es válido.',
      });
    }

    if (
      typeof actualizado_en !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T/.test(actualizado_en) ||
      Number.isNaN(Date.parse(actualizado_en))
    ) {
      return res.status(400).json({
        error: 'Actualiza el listado antes de revisar el registro.',
      });
    }

    if (estadoDestino === 'observado' && !esMotivoValido(motivo)) {
      return res.status(400).json({
        error: 'Selecciona un motivo de observación válido.',
      });
    }

    try {
      const { data: cantidad, error } = await supabase.rpc(
        'revisar_horas_pm',
        {
          p_pm_id: req.usuario.id,
          p_estado: estadoDestino,
          p_registro_id: id,
          p_actualizado_en: actualizado_en,
          p_motivo: estadoDestino === 'observado' ? motivo : null,
        }
      );

      if (error) return responderError(res, error);

      if (cantidad === 0) {
        return res.status(409).json({
          error:
            'El registro cambió, ya no está pendiente o no pertenece a tus servicios. Actualiza el listado.',
        });
      }

      return res.json({
        mensaje: estadoDestino === 'aprobado'
          ? 'Registro aprobado correctamente.'
          : 'Registro observado correctamente.',
        cantidad,
      });
    } catch (error) {
      return responderError(res, error);
    }
  };
}

// Escenario 1
router.post('/:id/aprobar', revisarIndividual('aprobado'));

// Escenario 2
router.post('/:id/observar', revisarIndividual('observado'));

module.exports = router;