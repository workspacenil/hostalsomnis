const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// Obtener todas las transacciones y resumen financiero
router.get('/', (req, res) => {
  try {
    const transactions = db.getFinances();

    // Ordenar de más reciente a más antigua
    transactions.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    let totalIngresos = 0;
    let totalGastos = 0;

    for (const t of transactions) {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'ingreso') {
        totalIngresos += amt;
      } else if (t.type === 'gasto') {
        totalGastos += amt;
      }
    }

    const balanceNeto = totalIngresos - totalGastos;

    res.json({
      success: true,
      transactions,
      summary: {
        totalIngresos: Number(totalIngresos.toFixed(2)),
        totalGastos: Number(totalGastos.toFixed(2)),
        balanceNeto: Number(balanceNeto.toFixed(2)),
        totalOperaciones: transactions.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Registrar nuevo movimiento (Ingreso o Gasto)
router.post('/', (req, res) => {
  try {
    const { concept, amount, type, date, category, notes } = req.body;

    if (!concept || amount === undefined || amount === null) {
      return res.status(400).json({ success: false, error: 'El concepto y la cantidad son obligatorios.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, error: 'El importe debe ser un número mayor a cero.' });
    }

    if (type !== 'ingreso' && type !== 'gasto') {
      return res.status(400).json({ success: false, error: 'El tipo debe ser "ingreso" o "gasto".' });
    }

    const newTransaction = {
      id: uuidv4(),
      concept: concept.trim(),
      amount: Number(numericAmount.toFixed(2)),
      type, // 'ingreso' | 'gasto'
      category: category ? category.trim() : (type === 'ingreso' ? 'Alojamiento' : 'Gastos Generales'),
      date: date || new Date().toISOString().split('T')[0],
      notes: notes ? notes.trim() : '',
      createdAt: new Date().toISOString()
    };

    const transactions = db.getFinances();
    transactions.unshift(newTransaction);
    db.saveFinances(transactions);

    res.json({ success: true, transaction: newTransaction });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Eliminar un movimiento
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const transactions = db.getFinances();
    const filtered = transactions.filter(t => t.id !== id);

    if (transactions.length === filtered.length) {
      return res.status(404).json({ success: false, error: 'Movimiento no encontrado.' });
    }

    db.saveFinances(filtered);
    res.json({ success: true, message: 'Movimiento eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
