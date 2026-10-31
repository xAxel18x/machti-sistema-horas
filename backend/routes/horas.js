const express = require('express');
const router = express.Router();

const supabase = require('../config/supabase');
const {
  obtenerActividades,
} = require('../config/catalogoActividades');

const esUUID = (valor) => {
  const patron =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return typeof valor === 'string' && patron.test(valor);
};

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


router.get('/servicios', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('consultores_asignados')
      .select(`
        servicio:servicios!consultores_asignados_servicio_id_fkey!inner (
          id,
          nombre,
          fecha_inicio,
          fecha_fin,
          cliente:clientes!servicios_cliente_id_fkey (
            id,
            nombre
          )
        )
      `)
      .eq('consultor_id', req.usuario.id);

    if (error) {
      console.error('Error consultando servicios asignados:', error.message);

      return res.status(500).json({
        error: 'No se pudieron obtener tus servicios asignados.',
      });
    }

    const servicios = (data || [])
      .map((asignacion) => asignacion.servicio)
      .filter(Boolean)
      .map((servicio) => ({
        ...servicio,
        actividades: obtenerActividades(servicio.nombre),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    return res.status(200).json(servicios);
  } catch (error) {
    console.error('Error inesperado consultando servicios:', error.message);

    return res.status(500).json({
      error: 'Ocurrió un error al consultar tus servicios.',
    });
  }
});


router.post('/', async (req, res) => {
  const {
    servicio_id,
    actividad,
    fecha,
    horas,
    es_facturable,
  } = req.body || {};

  if (!esUUID(servicio_id)) {
    return res.status(400).json({
      error: 'Debes seleccionar un servicio válido.',
    });
  }

  if (typeof actividad !== 'string' || actividad.trim() === '') {
    return res.status(400).json({
      error: 'Debes ingresar la actividad realizada.',
    });
  }

  if (!esFechaValida(fecha)) {
    return res.status(400).json({
      error: 'Debes ingresar una fecha válida con formato AAAA-MM-DD.',
    });
  }

  if (typeof horas !== 'number' && typeof horas !== 'string') {
    return res.status(400).json({
      error: 'Debes ingresar una cantidad de horas válida.',
    });
  }

  const textoHoras = String(horas).trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(textoHoras)) {
    return res.status(400).json({
      error: 'Las horas deben ser un número con máximo dos decimales.',
    });
  }

  const cantidadHoras = Number(textoHoras);

  if (
    !Number.isFinite(cantidadHoras) ||
    cantidadHoras <= 0 ||
    cantidadHoras > 8
  ) {
    return res.status(400).json({
      error: 'Las horas deben ser mayores que cero y no superar 8.',
    });
  }

  if (typeof es_facturable !== 'boolean') {
    return res.status(400).json({
      error: 'Debes indicar si la actividad es facturable.',
    });
  }

  try {
    const {
      data: asignacion,
      error: errorAsignacion,
    } = await supabase
      .from('consultores_asignados')
      .select(`
        servicio:servicios!consultores_asignados_servicio_id_fkey!inner (
          id,
          nombre
        )
      `)
      .eq('consultor_id', req.usuario.id)
      .eq('servicio_id', servicio_id)
      .maybeSingle();

    if (errorAsignacion) {
      console.error(
        'Error verificando actividades del servicio:',
        errorAsignacion.message
      );

      return res.status(500).json({
        error: 'No se pudieron verificar las actividades del servicio.',
      });
    }

    if (!asignacion?.servicio) {
      return res.status(403).json({
        error: 'No tienes permiso para registrar horas en este servicio.',
      });
    }

    const actividadesPermitidas = obtenerActividades(
      asignacion.servicio.nombre
    );

    if (actividadesPermitidas.length === 0) {
      return res.status(400).json({
        error:
          'Este servicio todavía no tiene actividades habilitadas. Comunícate con tu PM.',
      });
    }

    if (!actividadesPermitidas.includes(actividad.trim())) {
      return res.status(400).json({
        error: 'Selecciona una actividad válida para este servicio.',
      });
    }

    const { data, error } = await supabase.rpc(
      'registrar_horas_consultor',
      {
        p_consultor_id: req.usuario.id,
        p_servicio_id: servicio_id,
        p_actividad: actividad.trim(),
        p_fecha: fecha,
        p_horas: cantidadHoras,
        p_es_facturable: es_facturable,
      }
    );

    if (error) {
      if (error.code === '22023' || error.code === 'P0001') {
        return res.status(400).json({
          error: error.message,
        });
      }

      if (error.code === '42501') {

        console.error('Registro de horas rechazado:', error.message);

        return res.status(403).json({
          error: 'No tienes permiso para registrar horas en este servicio.',
        });
      }

      if (error.code === '23503') {
        return res.status(400).json({
          error: 'El usuario o el servicio ya no está disponible.',
        });
      }

      console.error('Error registrando horas:', error.message);

      return res.status(500).json({
        error: 'No se pudieron registrar las horas.',
      });
    }

    const registro = Array.isArray(data) ? data[0] : data;

    if (!registro?.id) {
      console.error('La función no devolvió el registro esperado.');

      return res.status(500).json({
        error:
          'No se pudo confirmar el resultado. Revisa los registros antes de reintentar.',
      });
    }

    return res.status(201).json({
      mensaje: 'Horas registradas correctamente.',
      registro,
    });
  } catch (error) {
    console.error('Error inesperado registrando horas:', error.message);

    return res.status(500).json({
      error: 'Ocurrió un error al registrar las horas.',
    });
  }
});

module.exports = router;