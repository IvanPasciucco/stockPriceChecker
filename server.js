'use strict';
require('dotenv').config();
const express     = require('express');
const bodyParser  = require('body-parser');
const cors        = require('cors');
const mongoose    = require('mongoose');
const helmet      = require('helmet'); // Importar Helmet al principio

const apiRoutes         = require('./routes/api.js');
const fccTestingRoutes  = require('./routes/fcctesting.js');
const runner            = require('./test-runner');

const app = express();

// --- SEGURIDAD ---
// 1. Ocultar "X-Powered-By: Express"
app.use(helmet.hidePoweredBy());

// 2. Configurar Content Security Policy (CSP)
// FreeCodeCamp requiere que solo se permitan scripts/estilos propios ('self')
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
  }
}));

// --- CONEXIÓN BASE DE DATOS ---
mongoose.connect(process.env.DB)
  .then(() => console.log('Base de datos conectada exitosamente'))
  .catch((err) => console.log('Error de conexión a BD: ', err));

// --- CONFIGURACIÓN ---
app.use('/public', express.static(process.cwd() + '/public'));
app.use(cors({origin: '*'})); // Requerido para los tests de FCC

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- RUTAS ---
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

fccTestingRoutes(app);
apiRoutes(app);  

// 404 Handler
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// Start Server
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  if(process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch(e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 3500);
  }
});

module.exports = app;