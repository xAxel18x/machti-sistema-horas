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

// Consultar servicios asignados al consultor autenticado
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

// HU002 - Escenario 1: Consultar horas con filtros por día, semana, cliente o servicio
router.get('/', async (req, res) => {
  const {
    periodo,
    fecha,
    fecha_desde,
    fecha_hasta,
    cliente_id,
    servicio_id,
    estado,
  } = req.query;

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
        creado_en,
        actualizado_en,
        servicio:servicios!inner (
          id,
          nombre,
          cliente_id,
          cliente:clientes!servicios_cliente_id_fkey (
            id,
            nombre
          )
        )
      `)
      .eq('consultor_id', req.usuario.id);

    // Filtro por periodo: día específico o rango semanal
    if (periodo === 'dia' && fecha) {
      if (esFechaValida(fecha)) {
        consulta = consulta.eq('fecha', fecha);
      }
    } else if (periodo === 'semana' && fecha_desde && fecha_hasta) {
      if (esFechaValida(fecha_desde) && esFechaValida(fecha_hasta)) {
        consulta = consulta.gte('fecha', fecha_desde).lte('fecha', fecha_hasta);
      }
    } else {
      if (fecha && esFechaValida(fecha)) {
        consulta = consulta.eq('fecha', fecha);
      }
      if (fecha_desde && esFechaValida(fecha_desde)) {
        consulta = consulta.gte('fecha', fecha_desde);
      }
      if (fecha_hasta && esFechaValida(fecha_hasta)) {
        consulta = consulta.lte('fecha', fecha_hasta);
      }
    }

    // Filtro por cliente
    if (cliente_id && esUUID(cliente_id)) {
      consulta = consulta.eq('servicio.cliente_id', cliente_id);
    }

    // Filtro por servicio
    if (servicio_id && esUUID(servicio_id)) {
      consulta = consulta.eq('servicio_id', servicio_id);
    }

    // Filtro por estado
    if (
      estado &&
      ['pendiente', 'observado', 'aprobado'].includes(
        estado.toLowerCase().trim()
      )
    ) {
      consulta = consulta.eq('estado', estado.toLowerCase().trim());
    }

    // Ordenar de más recientes a más antiguos
    consulta = consulta
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false });

    const { data, error } = await consulta;

    if (error) {
      console.error('Error consultando registros de horas:', error.message);

      return res.status(500).json({
        error: 'No se pudieron consultar los registros de horas.',
      });
    }

    const registros = (data || []).map((registro) => ({
      ...registro,
      servicio: {
        ...registro.servicio,
        actividades: obtenerActividades(registro.servicio?.nombre),
      },
    }));

    return res.status(200).json(registros);
  } catch (error) {
    console.error('Error inesperado consultando horas:', error.message);

    return res.status(500).json({
      error: 'Ocurrió un error al consultar tus horas registradas.',
    });
  }
});

// HU001 - Registrar horas
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

// HU002 - Escenario 2 & Escenario 3: Modificar registro de horas
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { horas, actividad, es_facturable } = req.body || {};

  if (!esUUID(id)) {
    return res.status(400).json({
      error: 'El identificador del registro no es válido.',
    });
  }

  try {
    // 1. Obtener el registro existente del consultor
    const { data: registro, error: errorRegistro } = await supabase
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
        servicio:servicios!inner (
          id,
          nombre
        )
      `)
      .eq('id', id)
      .eq('consultor_id', req.usuario.id)
      .maybeSingle();

    if (errorRegistro) {
      console.error(
        'Error consultando registro para corregir:',
        errorRegistro.message
      );

      return res.status(500).json({
        error: 'No se pudo verificar el registro de horas.',
      });
    }

    if (!registro) {
      return res.status(404).json({
        error: 'El registro no existe o no tienes permiso para modificarlo.',
      });
    }

    // 2. HU002 - Escenario 3: Bloquear modificación si ya fue aprobado
    const estadoActual = (registro.estado || '').toLowerCase().trim();
    if (estadoActual !== 'pendiente') {
      if (estadoActual === 'aprobado') {
        return res.status(400).json({
          error: 'No se puede modificar: Este registro de horas ya fue aprobado por el Project Manager.',
        });
      }
      return res.status(400).json({
        error: `Solo se pueden corregir registros en estado Pendiente. El estado actual es «${registro.estado}».`,
      });
    }

    // 3. Validar horas si se proporcionaron
    let cantidadHoras = Number(registro.horas);
    if (horas !== undefined && horas !== null) {
      const textoHoras = String(horas).trim();

      if (!/^\d+(?:\.\d{1,2})?$/.test(textoHoras)) {
        return res.status(400).json({
          error: 'Las horas deben ser un número con máximo dos decimales.',
        });
      }

      cantidadHoras = Number(textoHoras);

      if (
        !Number.isFinite(cantidadHoras) ||
        cantidadHoras <= 0 ||
        cantidadHoras > 8
      ) {
        return res.status(400).json({
          error: 'Las horas deben ser mayores que cero y no superar 8.',
        });
      }

      // Validar límite diario de 8 horas sumando los otros registros del consultor para esa misma fecha
      const { data: otrosRegistros, error: errorOtros } = await supabase
        .from('registros_horas')
        .select('horas')
        .eq('consultor_id', req.usuario.id)
        .eq('fecha', registro.fecha)
        .neq('id', registro.id);

      if (errorOtros) {
        console.error('Error calculando horas diarias:', errorOtros.message);

        return res.status(500).json({
          error: 'No se pudo verificar el límite diario de horas.',
        });
      }

      const sumaOtrasHoras = (otrosRegistros || []).reduce(
        (acum, r) => acum + Number(r.horas || 0),
        0
      );

      const nuevoTotalDia = sumaOtrasHoras + cantidadHoras;

      if (nuevoTotalDia > 8.0001) {
        const disponibles = Math.max(0, 8 - sumaOtrasHoras);

        return res.status(400).json({
          error: `Superas el límite de 8 horas diarias para la fecha ${registro.fecha}. Horas ya registradas en otras actividades de ese día: ${sumaOtrasHoras}. Máximo disponible para este registro: ${disponibles.toFixed(2)}.`,
        });
      }
    }

    // 4. Validar actividad si se proporcionó
    let actividadFinal = registro.actividad;
    if (actividad !== undefined && actividad !== null) {
      if (typeof actividad !== 'string' || actividad.trim() === '') {
        return res.status(400).json({
          error: 'Debes ingresar una actividad realizada válida.',
        });
      }

      actividadFinal = actividad.trim();
      const permitidas = obtenerActividades(registro.servicio.nombre);

      if (permitidas.length > 0 && !permitidas.includes(actividadFinal)) {
        return res.status(400).json({
          error: 'Selecciona una actividad válida para este servicio.',
        });
      }
    }

    // 5. Facturabilidad
    let facturableFinal = registro.es_facturable;
    if (typeof es_facturable === 'boolean') {
      facturableFinal = es_facturable;
    }

    // 6. Aplicar la actualización
    const ahoraIso = new Date().toISOString();
    const { data: actualizado, error: errorUpdate } = await supabase
      .from('registros_horas')
      .update({
        horas: cantidadHoras,
        actividad: actividadFinal,
        es_facturable: facturableFinal,
        actualizado_en: ahoraIso,
      })
      .eq('id', registro.id)
      .select(`
        id,
        consultor_id,
        servicio_id,
        actividad,
        fecha,
        horas,
        es_facturable,
        estado,
        creado_en,
        actualizado_en,
        servicio:servicios!inner (
          id,
          nombre,
          cliente_id,
          cliente:clientes!servicios_cliente_id_fkey (
            id,
            nombre
          )
        )
      `)
      .single();

    if (errorUpdate) {
      console.error(
        'Error actualizando registro de horas:',
        errorUpdate.message
      );

      return res.status(500).json({
        error: 'No se pudo actualizar el registro de horas.',
      });
    }

    const resultado = {
      ...actualizado,
      servicio: {
        ...actualizado.servicio,
        actividades: obtenerActividades(actualizado.servicio?.nombre),
      },
    };

    return res.status(200).json({
      mensaje: 'Registro de horas actualizado correctamente.',
      registro: resultado,
    });
  } catch (error) {
    console.error('Error inesperado actualizando horas:', error.message);

    return res.status(500).json({
      error: 'Ocurrió un error al actualizar el registro de horas.',
    });
  }
});

// HU002 - Eliminar registro pendiente
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (!esUUID(id)) {
    return res.status(400).json({
      error: 'El identificador del registro no es válido.',
    });
  }

  try {
    const { data: registro, error: errorRegistro } = await supabase
      .from('registros_horas')
      .select('id, consultor_id, estado')
      .eq('id', id)
      .eq('consultor_id', req.usuario.id)
      .maybeSingle();

    if (errorRegistro) {
      console.error(
        'Error verificando registro para eliminar:',
        errorRegistro.message
      );

      return res.status(500).json({
        error: 'No se pudo verificar el registro.',
      });
    }

    if (!registro) {
      return res.status(404).json({
        error: 'El registro no existe o no tienes permiso para eliminarlo.',
      });
    }

    if ((registro.estado || '').toLowerCase().trim() !== 'pendiente') {
      return res.status(400).json({
        error: 'Solo se pueden eliminar registros en estado Pendiente.',
      });
    }

    const { error: errorDelete } = await supabase
      .from('registros_horas')
      .delete()
      .eq('id', registro.id);

    if (errorDelete) {
      console.error('Error eliminando registro de horas:', errorDelete.message);

      return res.status(500).json({
        error: 'No se pudo eliminar el registro de horas.',
      });
    }

    return res.status(200).json({
      mensaje: 'Registro de horas eliminado correctamente.',
    });
  } catch (error) {
    console.error('Error inesperado eliminando horas:', error.message);

    return res.status(500).json({
      error: 'Ocurrió un error al eliminar el registro.',
    });
  }
});

module.exports = router;
