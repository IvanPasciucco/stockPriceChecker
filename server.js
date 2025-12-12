'use strict';
require('dotenv').config();
const express     = require('express');
const bodyParser  = require('body-parser');
const cors        = require('cors');
const mongoose    = require('mongoose');
const helmet      = require('helmet'); // <--- 1. IMPORTAR HELMET

const apiRoutes         = require('./routes/api.js');
const fccTestingRoutes  = require('./routes/fcctesting.js');
const runner            = require('./test-runner');

const app = express();

// <--- 2. AGREGAR LA CONFIGURACIÓN DE CSP AQUÍ
// Esto le dice al navegador: "Solo carga scripts y estilos si vienen de este mismo servidor"
app.use(helmet.contentSecurityPolicy({
  directives: {
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
  },
}));

app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({origin: '*'})); //For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ... (El resto del código de conexión a DB y rutas sigue igual)
mongoose.connect(process.env.DB)
  .then(() => console.log('Database connected successfully'))
  .catch((err) => console.log('Database connection error: ' + err));

app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

fccTestingRoutes(app);

apiRoutes(app);  
    
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  console.log('Your app is listening on port ' + listener.address().port);
  
  // AGREGA ESTA LÍNEA PARA VER LA VERDAD:
  console.log('EL VALOR DE NODE_ENV ES: ->', process.env.NODE_ENV, '<-');
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