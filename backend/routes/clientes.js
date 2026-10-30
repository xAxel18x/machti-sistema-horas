const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Endpoint puente para consultar RUC
router.get('/buscar-ruc/:ruc', async (req, res) => {
  const { ruc } = req.params;

  if (!ruc || ruc.length !== 11) {
    return res.status(400).json({ error: 'El RUC debe tener 11 dígitos.' });
  }

  try {
    const respuesta = await fetch(`https://api.apis.net.pe/v1/ruc?numero=${ruc}`);
    
    if (!respuesta.ok) {
      return res.status(404).json({ error: 'No se encontró la empresa con ese RUC.' });
    }

    const data = await respuesta.json();
    return res.json({
      nombre: data.nombre || data.razonSocial || '',
      ruc: data.numero || ruc,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error al conectar con el servicio de SUNAT.' });
  }
});

// Guardar cliente
router.post('/', async (req, res) => {
  const { ruc, nombre, nombre_comercial, correo, telefono } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre o razón social es obligatorio.' });
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert([
      {
        ruc: ruc || null,
        nombre: nombre.trim(),
        nombre_comercial: nombre_comercial ? nombre_comercial.trim() : null,
        correo: correo || null,
        telefono: telefono || null,
      },
    ])
    .select();

  if (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Este RUC ya se encuentra registrado.' });
    }
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({ mensaje: 'Cliente creado con éxito', cliente: data[0] });
});

// Obtener clientes
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('clientes').select('*');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;
