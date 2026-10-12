const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Crear un nuevo servicio
router.post('/', async (req, res) => {
  const { 
    cliente_id, 
    id_cliente, 
    clienteId, 
    nombre, 
    tarifa_cliente, 
    horas_presupuestadas, 
    horas_contratadas 
  } = req.body;

 
  const idFinalCliente = cliente_id || id_cliente || clienteId;


  const cantidadHoras = Number(horas_contratadas || horas_presupuestadas || 0);


  const { data, error } = await supabase
    .from('servicios')
    .insert([{ 
      cliente_id: idFinalCliente, 
      nombre, 
      tarifa_cliente: parseFloat(tarifa_cliente) || 0, 
      horas_presupuestadas: cantidadHoras,
      horas_contratadas: cantidadHoras
    }])
    .select();
  
  if (error) {
    console.error('Error insertando servicio:', error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({ mensaje: 'Servicio registrado con éxito', servicio: data[0] });
});

module.exports = router;
