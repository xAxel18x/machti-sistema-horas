const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');


router.post('/', async (req, res) => {
  const { nombre } = req.body;
  const { data, error } = await supabase.from('clientes').insert([{ nombre }]).select();
  
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ mensaje: 'Cliente creado', cliente: data[0] });
});


router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('clientes').select('*');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});


module.exports = router;
