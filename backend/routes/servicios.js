const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Crear un nuevo servicio (POST /api/servicios)
router.post('/', async (req, res) => {
  const { cliente_id, nombre, pm_responsable, tarifa_cliente, horas_presupuestadas } = req.body;
  
  const { data, error } = await supabase.from('servicios').insert([{ 
    cliente_id, 
    nombre, 
    pm_responsable, 
    tarifa_cliente, 
    horas_presupuestadas 
  }]).select();
  
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ mensaje: 'Servicio registrado con éxito', servicio: data[0] });
});

module.exports = router;
