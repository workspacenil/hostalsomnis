const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener configuración actual
router.get('/', (req, res) => {
  try {
    const settings = db.getSettings();
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

    if (req.body.ota_sync) {
      updated.ota_sync = {
        ...current.ota_sync,
        ...req.body.ota_sync
      };
    }

    db.saveSettings(updated);
    res.json({ success: true, message: 'Configuració desada correctament.', settings: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
