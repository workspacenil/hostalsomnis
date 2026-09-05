const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// Obtener plantillas
router.get('/', (req, res) => {
  try {
    const templates = db.getTemplates();
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Guardar / Actualizar una plantilla
router.post('/', (req, res) => {
  try {
    const { id, title, content, category, language, roomType } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'El título y el contenido son obligatorios.' });
    }

    const templates = db.getTemplates();
    let updatedTemplate;

    if (id) {
      const idx = templates.findIndex(t => t.id === id);
      if (idx !== -1) {
        templates[idx] = {
          ...templates[idx],
          title: title.trim(),
          content: content.trim(),
          category: category || templates[idx].category || 'general',
          language: language || templates[idx].language || 'es',
          roomType: roomType || templates[idx].roomType || 'todas'
        };
        updatedTemplate = templates[idx];
      }
    }

    if (!updatedTemplate) {
      updatedTemplate = {
        id: id || uuidv4(),
        title: title.trim(),
        content: content.trim(),
        category: category || 'general',
        language: language || 'es',
        roomType: roomType || 'todas'
      };
      templates.push(updatedTemplate);
    }

    db.saveTemplates(templates);
    res.json({ success: true, template: updatedTemplate });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Eliminar plantilla
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const templates = db.getTemplates();
    const filtered = templates.filter(t => t.id !== id);

    db.saveTemplates(filtered);
    res.json({ success: true, message: 'Plantilla eliminada correctamente.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
