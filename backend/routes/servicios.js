const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Función auxiliar para validar si un string es un UUID válido
const esUUID = (str) => {
  const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof str === 'string' && regexUUID.test(str);
};

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

  const idFinalCliente = cliente_id || id_cliente || clienteId;
  const cantidadHoras = Number(horas_contratadas || horas_presupuestadas || 0);

  // Si pm_responsable no es un UUID válido (ej. "Luis Pérez"), enviamos null para no romper Supabase
  const pmUuidFinal = esUUID(pm_responsable) ? pm_responsable : null;

  const { data, error } = await supabase
    .from('servicios')
    .insert([{ 
      cliente_id: idFinalCliente, 
      nombre, 
      tarifa_cliente: parseFloat(tarifa_cliente) || 0, 
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

module.exports = router;
