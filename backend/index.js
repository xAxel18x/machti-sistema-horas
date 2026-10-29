require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { autenticar, permitirRoles } = require('./middleware/auth');
const rutasClientes = require('./routes/clientes');
const rutasServicios = require('./routes/servicios');
const rutasHoras = require('./routes/horas');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend MACH TI funcionando');
});

app.get('/api/me', autenticar, (req, res) => {
  res.json(req.usuario);
});

app.use(
  '/api/clientes',
  autenticar,
  permitirRoles('pm', 'finanzas'),
  rutasClientes
);

app.use(
  '/api/servicios',
  autenticar,
  permitirRoles('pm', 'finanzas'),
  rutasServicios
);

app.use(
  '/api/horas',
  autenticar,
  permitirRoles('consultor'),
  rutasHoras
);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});