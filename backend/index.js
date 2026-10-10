require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// === IMPORTAR RUTAS ORDENADAS ===
const rutasClientes = require('./routes/clientes');

// === USAR LAS RUTAS ===
app.use('/api/clientes', rutasClientes);

// Ruta base de prueba
app.get('/', (req, res) => {
  res.send('Backend MACH TI funcionando');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
