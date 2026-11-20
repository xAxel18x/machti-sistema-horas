const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');

const FALLBACK_FILE = path.join(__dirname, '../data/costos_colaboradores.json');

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

// Funciones para almacenamiento de respaldo (si la tabla aún no se ejecuta en Supabase)
function asegurarDirectorioData() {
  const dir = path.dirname(FALLBACK_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function leerCostosFallback() {
  try {
    asegurarDirectorioData();
    if (!fs.existsSync(FALLBACK_FILE)) {
      return [];
    }
    const contenido = fs.readFileSync(FALLBACK_FILE, 'utf8');
    return JSON.parse(contenido || '[]');
  } catch (err) {
    console.error('Error leyendo archivo fallback de costos:', err.message);
    return [];
  }
}

function guardarCostosFallback(datos) {
  try {
    asegurarDirectorioData();
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(datos, null, 2), 'utf8');
  } catch (err) {
    console.error('Error guardando archivo fallback de costos:', err.message);
  }
}

// -----------------------------------------------------------------------------
// GET /api/costos/colaboradores
// Listar colaboradores con su costo actual vigente y cantidad de registros en el histórico
// -----------------------------------------------------------------------------
router.get('/colaboradores', async (req, res) => {
  try {
    // 1. Obtener colaboradores (consultores y PMs)
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol')
      .in('rol', ['consultor', 'pm'])
      .order('nombre', { ascending: true });

    if (errorUsuarios) {
      console.error('Error obteniendo usuarios colaboradores:', errorUsuarios.message);
      return res.status(500).json({ error: 'No se pudieron consultar los colaboradores.' });
    }

    // 2. Intentar consultar costos desde Supabase
    let todosCostos = [];
    let usandoFallback = false;

    const { data: costosDb, error: errorCostos } = await supabase
      .from('costos_colaboradores')
      .select('*')
      .order('fecha_inicio', { ascending: false });

    if (errorCostos) {
      if (errorCostos.code === 'PGRST205') {
        // La tabla aún no existe en Supabase; usar respaldo local
        usandoFallback = true;
        todosCostos = leerCostosFallback();
      } else {
        console.error('Error consultando costos en Supabase:', errorCostos.message);
        return res.status(500).json({ error: 'Error al consultar los costos de personal.' });
      }
    } else {
      todosCostos = costosDb || [];
    }

    // 3. Mapear cada colaborador con su costo vigente e histórico
    const resultado = (usuarios || []).map((colaborador) => {
      const historicoColaborador = todosCostos.filter(
        (c) => c.colaborador_id === colaborador.id
      );

      // El vigente es el marcado con vigente = true o el más reciente activo
      const costoVigente = historicoColaborador.find((c) => c.vigente === true) || null;

      return {
        id: colaborador.id,
        nombre: colaborador.nombre,
        correo: colaborador.correo,
        rol: colaborador.rol,
        costo_vigente: costoVigente
          ? {
              id: costoVigente.id,
              costo_hora: Number(costoVigente.costo_hora),
              fecha_inicio: costoVigente.fecha_inicio,
              fecha_fin: costoVigente.fecha_fin,
              vigente: costoVigente.vigente,
              creado_en: costoVigente.creado_en,
            }
          : null,
        total_historico: historicoColaborador.length,
      };
    });

    return res.status(200).json({
      colaboradores: resultado,
      usando_fallback: usandoFallback,
    });
  } catch (error) {
    console.error('Error inesperado listando costos de colaboradores:', error.message);
    return res.status(500).json({ error: 'Ocurrió un error al obtener los colaboradores.' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/costos/colaboradores/:colaboradorId/historial
// HU005 Escenario 2: Consultar el histórico completo de costos de un colaborador
// -----------------------------------------------------------------------------
router.get('/colaboradores/:colaboradorId/historial', async (req, res) => {
  const { colaboradorId } = req.params;

  if (!esUUID(colaboradorId)) {
    return res.status(400).json({ error: 'El identificador del colaborador no es válido.' });
  }

  try {
    // 1. Verificar colaborador
    const { data: colaborador, error: errorColaborador } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (errorColaborador) {
      return res.status(500).json({ error: 'Error verificando colaborador.' });
    }

    if (!colaborador) {
      return res.status(404).json({ error: 'El colaborador no existe.' });
    }

    // 2. Consultar histórico de costos
    let historial = [];

    const { data: costosDb, error: errorCostos } = await supabase
      .from('costos_colaboradores')
      .select(`
        id,
        colaborador_id,
        costo_hora,
        fecha_inicio,
        fecha_fin,
        vigente,
        registrado_por,
        creado_en,
        registrador:usuarios!registrado_por (
          id,
          nombre
        )
      `)
      .eq('colaborador_id', colaboradorId)
      .order('fecha_inicio', { ascending: false })
      .order('creado_en', { ascending: false });

    if (errorCostos) {
      if (errorCostos.code === 'PGRST205') {
        const todos = leerCostosFallback();
        historial = todos
          .filter((c) => c.colaborador_id === colaboradorId)
          .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));
      } else {
        console.error('Error consultando historial en Supabase:', errorCostos.message);
        return res.status(500).json({ error: 'Error al consultar el historial de costos.' });
      }
    } else {
      historial = costosDb || [];
    }

    return res.status(200).json({
      colaborador,
      historial,
    });
  } catch (error) {
    console.error('Error inesperado consultando historial:', error.message);
    return res.status(500).json({ error: 'Ocurrió un error al consultar el historial.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/costos/colaboradores/:colaboradorId
// HU005 Escenario 1: Registrar costo por hora definiendo vigencia
// HU005 Escenario 2: Mantener histórico al actualizar (conserva anterior y activa nuevo)
// -----------------------------------------------------------------------------
router.post('/colaboradores/:colaboradorId', async (req, res) => {
  const { colaboradorId } = req.params;
  const { costo_hora, fecha_inicio } = req.body || {};

  if (!esUUID(colaboradorId)) {
    return res.status(400).json({ error: 'El identificador del colaborador no es válido.' });
  }

  // Validación de costo
  if (costo_hora === undefined || costo_hora === null) {
    return res.status(400).json({ error: 'Debes ingresar el costo por hora.' });
  }

  const textoCosto = String(costo_hora).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(textoCosto)) {
    return res.status(400).json({
      error: 'El costo por hora debe ser un número válido mayor a cero con hasta dos decimales.',
    });
  }

  const cantidadCosto = Number(textoCosto);
  if (!Number.isFinite(cantidadCosto) || cantidadCosto <= 0) {
    return res.status(400).json({
      error: 'El costo por hora debe ser un número positivo mayor que cero.',
    });
  }

  // Validación de fecha de inicio de vigencia
  if (!esFechaValida(fecha_inicio)) {
    return res.status(400).json({
      error: 'Debes ingresar una fecha de vigencia válida con formato AAAA-MM-DD.',
    });
  }

  try {
    // 1. Verificar que el colaborador exista en la tabla usuarios
    const { data: colaborador, error: errorColaborador } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (errorColaborador) {
      console.error('Error verificando colaborador:', errorColaborador.message);
      return res.status(500).json({ error: 'Error al verificar el colaborador.' });
    }

    if (!colaborador) {
      return res.status(404).json({ error: 'El colaborador no existe en el sistema.' });
    }

    const ahoraIso = new Date().toISOString();
    let esHistorico = false;
    let costoGuardado = null;

    // 2. Intentar en Supabase
    const { data: costoVigenteActual, error: errorConsultaVigente } = await supabase
      .from('costos_colaboradores')
      .select('id, costo_hora, fecha_inicio, fecha_fin, vigente')
      .eq('colaborador_id', colaboradorId)
      .eq('vigente', true)
      .maybeSingle();

    if (errorConsultaVigente && errorConsultaVigente.code !== 'PGRST205') {
      console.error('Error buscando costo vigente:', errorConsultaVigente.message);
      return res.status(500).json({ error: 'Error al verificar el costo vigente actual.' });
    }

    if (!errorConsultaVigente) {
      // Supabase está disponible
      // Escenario 2: Si ya tiene un costo vigente, archivarlo en el histórico
      if (costoVigenteActual) {
        esHistorico = true;

        // Calcular fecha_fin del costo anterior: día anterior al nuevo inicio
        const [y, m, d] = fecha_inicio.split('-').map(Number);
        const fechaAnt = new Date(Date.UTC(y, m - 1, d));
        fechaAnt.setUTCDate(fechaAnt.getUTCDate() - 1);
        const fechaFinAnterior = fechaAnt.toISOString().slice(0, 10);

        const { error: errorArchivar } = await supabase
          .from('costos_colaboradores')
          .update({
            vigente: false,
            fecha_fin: fechaFinAnterior < costoVigenteActual.fecha_inicio
              ? fecha_inicio
              : fechaFinAnterior,
            actualizado_en: ahoraIso,
          })
          .eq('id', costoVigenteActual.id);

        if (errorArchivar) {
          console.error('Error archivando costo anterior:', errorArchivar.message);
          return res.status(500).json({ error: 'No se pudo actualizar el histórico del costo.' });
        }
      }

      // Escenario 1 y 2: Insertar el nuevo costo vigente
      const { data: nuevoCosto, error: errorInsert } = await supabase
        .from('costos_colaboradores')
        .insert({
          colaborador_id: colaboradorId,
          costo_hora: cantidadCosto,
          fecha_inicio,
          fecha_fin: null,
          vigente: true,
          registrado_por: req.usuario.id,
          creado_en: ahoraIso,
          actualizado_en: ahoraIso,
        })
        .select()
        .single();

      if (errorInsert) {
        console.error('Error insertando nuevo costo:', errorInsert.message);
        return res.status(500).json({ error: 'No se pudo guardar el costo del colaborador.' });
      }

      costoGuardado = nuevoCosto;

      // Sincronizar consultores_asignados para que refleje el costo actualizado
      await supabase
        .from('consultores_asignados')
        .update({ costo_interno_hora: cantidadCosto })
        .eq('consultor_id', colaboradorId);

    } else {
      // Modo Fallback si la tabla aún no se creó en Supabase
      const todosCostos = leerCostosFallback();
      const costoAnteriorIndex = todosCostos.findIndex(
        (c) => c.colaborador_id === colaboradorId && c.vigente === true
      );

      if (costoAnteriorIndex >= 0) {
        esHistorico = true;
        const costoAnterior = todosCostos[costoAnteriorIndex];

        const [y, m, d] = fecha_inicio.split('-').map(Number);
        const fechaAnt = new Date(Date.UTC(y, m - 1, d));
        fechaAnt.setUTCDate(fechaAnt.getUTCDate() - 1);
        const fechaFinAnterior = fechaAnt.toISOString().slice(0, 10);

        todosCostos[costoAnteriorIndex] = {
          ...costoAnterior,
          vigente: false,
          fecha_fin: fechaFinAnterior < costoAnterior.fecha_inicio
            ? fecha_inicio
            : fechaFinAnterior,
          actualizado_en: ahoraIso,
        };
      }

      const crypto = require('crypto');
      costoGuardado = {
        id: crypto.randomUUID(),
        colaborador_id: colaboradorId,
        costo_hora: cantidadCosto,
        fecha_inicio,
        fecha_fin: null,
        vigente: true,
        registrado_por: req.usuario.id,
        registrador: { id: req.usuario.id, nombre: req.usuario.nombre },
        creado_en: ahoraIso,
        actualizado_en: ahoraIso,
      };

      todosCostos.push(costoGuardado);
      guardarCostosFallback(todosCostos);

      // Intentar sincronizar en consultores_asignados
      try {
        await supabase
          .from('consultores_asignados')
          .update({ costo_interno_hora: cantidadCosto })
          .eq('consultor_id', colaboradorId);
      } catch (errSync) {
        console.warn('Sync opcional no aplicado:', errSync.message);
      }
    }

    return res.status(201).json({
      mensaje: esHistorico
        ? `Nuevo costo de S/ ${cantidadCosto.toFixed(2)}/h activado. El costo anterior se conservó en el histórico.`
        : `Costo inicial de S/ ${cantidadCosto.toFixed(2)}/h registrado exitosamente.`,
      costo: costoGuardado,
      es_actualizacion_historico: esHistorico,
    });
  } catch (error) {
    console.error('Error inesperado guardando costo:', error.message);
    return res.status(500).json({ error: 'Ocurrió un error al registrar el costo.' });
  }
});

module.exports = router;
