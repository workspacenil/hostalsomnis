const express = require('express');
const cors = require('cors');
const path = require('path');

const bookingsRouter = require('./routes/bookings');
const financesRouter = require('./routes/finances');
const settingsRouter = require('./routes/settings');
const templatesRouter = require('./routes/templates');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rutas de API
app.use('/api/bookings', bookingsRouter);
app.use('/api/finances', financesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/templates', templatesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Hostal Somnis Súria',
    timestamp: new Date().toISOString()
  });
});

// Redirigir cualquier otra petición al frontend principal
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('\n======================================================');
  console.log('   HOSTAL SOMNIS - APLICACIÓN DE GESTIÓN (SÚRIA)     ');
  console.log('======================================================');
  console.log(`✓ Servidor iniciado correctamente en el puerto ${PORT}`);
  console.log(`✓ Puedes abrir la aplicación en tu navegador en:`);
  console.log(`  >>> http://localhost:${PORT} <<<`);
  console.log('======================================================\n');
});
