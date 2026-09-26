const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// Obtener todas las reservas
router.get('/', (req, res) => {
  try {
    const bookings = db.getBookings();
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Crear nueva reserva
router.post('/', async (req, res) => {
  try {
    const {
      guestName,
      guestPhone,
      guestEmail,
      room,
      checkIn,
      checkOut,
      price,
      notes,
      paymentMethod,
      mealPlan,
      guestsCount,
      bedType,
      source,
      registerIncome
    } = req.body;

    if (!guestName || !checkIn || !checkOut) {
      return res.status(400).json({ success: false, error: 'Nom d\'hoste i dates d\'entrada i sortida són obligatòries.' });
    }

    const newBooking = {
      id: uuidv4(),
      guestName: guestName.trim(),
      guestPhone: guestPhone ? guestPhone.trim() : '',
      guestEmail: guestEmail ? guestEmail.trim() : '',
      room: room || '101',
      checkIn,
      checkOut,
      price: parseFloat(price) || 0,
      totalPrice: parseFloat(price) || 0,
      paymentMethod: paymentMethod || 'Efectiu',
      mealPlan: mealPlan || 'NE',
      guestsCount: guestsCount || 2,
      bedType: bedType || 'individual',
      notes: notes || '',
      status: 'confirmada',
      source: source || 'directe',
      createdAt: new Date().toISOString()
    };

    // Guardar a la base de dades local
    const bookings = db.getBookings();
    bookings.push(newBooking);
    db.saveBookings(bookings);

    // Si ha marcat registrar ingrés automàticament a finances
    if (registerIncome && newBooking.price > 0) {
      const finances = db.getFinances();
      finances.unshift({
        id: uuidv4(),
        date: checkIn,
        concept: `Reserva: ${newBooking.guestName} (Hab ${newBooking.room})`,
        amount: newBooking.price,
        type: 'ingreso',
        category: 'Allotjament',
        bookingId: newBooking.id,
        createdAt: new Date().toISOString()
      });
      db.saveFinances(finances);
    }

    res.json({ success: true, booking: newBooking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Actualizar reserva
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bookings = db.getBookings();
    const index = bookings.findIndex(b => b.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Reserva no trobada.' });
    }

    const updatedBooking = {
      ...bookings[index],
      ...req.body,
      id: bookings[index].id // mantenir ID immutable
    };

    bookings[index] = updatedBooking;
    db.saveBookings(bookings);

    res.json({ success: true, booking: updatedBooking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Eliminar reserva
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bookings = db.getBookings();
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Reserva no trobada.' });
    }

    const filtered = bookings.filter(b => b.id !== id);
    db.saveBookings(filtered);

    res.json({ success: true, message: 'Reserva eliminada correctament.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
