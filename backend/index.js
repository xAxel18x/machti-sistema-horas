require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());


const rutasClientes = require('./routes/clientes');
const rutasServicios = require('./routes/servicios'); 


app.use('/api/clientes', rutasClientes);
app.use('/api/servicios', rutasServicios); 


app.get('/', (req, res) => {
  res.send('Backend MACH TI funcionando');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
