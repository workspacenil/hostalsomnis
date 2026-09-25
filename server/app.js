const express = require('express');
const cors = require('cors');
const path = require('path');

const crypto = require('crypto');

const bookingsRouter = require('./routes/bookings');
const financesRouter = require('./routes/finances');
const settingsRouter = require('./routes/settings');
const templatesRouter = require('./routes/templates');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuració de seguretat (sense dependències externes)
const AUTH_SALT = process.env.AUTH_SALT || 'hostal_somnis_suria_salt_2026';
const EXPECTED_HASH = process.env.AUTH_HASH || '7a442fa2731403f2390c1679d37a9dd733f9016e5cca9866542ecb923186ea37';

// Middleware de protecció per a rutes privades
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const tokenHeader = req.headers['x-auth-token'] || req.headers['x-api-key'] || '';
  const tokenQuery = req.query ? req.query.token : '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  const token = bearerToken || tokenHeader || tokenQuery;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Accés no autoritzat. Cal autenticació per accedir a aquesta ruta.'
    });
  }

  if (token === EXPECTED_HASH) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Credencials no vàlides.'
  });
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Ruta d'autenticació per validar contrasenya
app.post('/api/auth/login', (req, res) => {
  const { password, hash } = req.body || {};
  let providedHash = hash;
  if (!providedHash && password) {
    providedHash = crypto.createHash('sha256').update(AUTH_SALT + password).digest('hex');
  }
  if (providedHash === EXPECTED_HASH) {
    return res.json({ success: true, token: EXPECTED_HASH });
  }
  return res.status(401).json({ success: false, error: 'Contrasenya incorrecta' });
});

// Rutas de API protegides
app.use('/api/bookings', requireAuth, bookingsRouter);
app.use('/api/finances', requireAuth, financesRouter);
app.use('/api/settings', requireAuth, settingsRouter);
app.use('/api/templates', requireAuth, templatesRouter);

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
