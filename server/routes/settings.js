const express = require('express');
const router = express.Router();
const db = require('../db');
const caldavService = require('../caldavService');

// Obtener configuración actual
router.get('/', (req, res) => {
  try {
    const settings = db.getSettings();
    // Devolvemos la configuración (si hay contraseña, podemos enmascararla o indicarla para edición)
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Guardar configuración
router.post('/', (req, res) => {
  try {
    const current = db.getSettings();
    const updated = {
      ...current,
      ...req.body
    };

    // Si viene actualización de iCloud, conservar la contraseña si vino vacía y ya existía
    if (req.body.icloud) {
      updated.icloud = {
        ...current.icloud,
        ...req.body.icloud
      };
      if (!req.body.icloud.appPassword && current.icloud && current.icloud.appPassword) {
        updated.icloud.appPassword = current.icloud.appPassword;
      }
    }

    db.saveSettings(updated);
    res.json({ success: true, message: 'Configuración guardada correctamente.', settings: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Probar conexión directa con iCloud
router.post('/test-icloud', async (req, res) => {
  try {
    const { appleId, appPassword } = req.body;
    const settings = db.getSettings();

    const idToUse = appleId || (settings.icloud ? settings.icloud.appleId : '');
    const passToUse = appPassword || (settings.icloud ? settings.icloud.appPassword : '');

    if (!idToUse || !passToUse) {
      return res.status(400).json({
        success: false,
        error: 'Debes proporcionar tu correo de ID de Apple y la Contraseña de aplicación de 16 caracteres.'
      });
    }

    const result = await caldavService.testConnection(idToUse, passToUse);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
