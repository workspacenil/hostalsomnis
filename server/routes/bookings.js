const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const caldavService = require('../caldavService');

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
      registerIncome // si la propietaria quiere registrar el ingreso automáticamente
    } = req.body;

    if (!guestName || !checkIn || !checkOut) {
      return res.status(400).json({ success: false, error: 'Nombre de huésped y fechas de entrada y salida son obligatorios.' });
    }

    const newBooking = {
      id: uuidv4(),
      guestName: guestName.trim(),
      guestPhone: guestPhone ? guestPhone.trim() : '',
      guestEmail: guestEmail ? guestEmail.trim() : '',
      room: room || 'Habitación 1 - Doble',
      checkIn,
      checkOut,
      price: parseFloat(price) || 0,
      paymentMethod: paymentMethod || 'Efectivo',
      notes: notes || '',
      status: 'confirmada',
      createdAt: new Date().toISOString(),
      icloudUid: null,
      icloudUrl: null,
      syncedWithIcloud: false
    };

    // Intentar sincronizar con iCloud si está configurado
    const settings = db.getSettings();
    if (settings.icloud && settings.icloud.enabled && settings.icloud.appleId && settings.icloud.appPassword && settings.icloud.calendarUrl) {
      try {
        const syncResult = await caldavService.saveEvent(
          settings.icloud.appleId,
          settings.icloud.appPassword,
          settings.icloud.calendarUrl,
          newBooking
        );
        if (syncResult.synced) {
          newBooking.icloudUid = syncResult.icloudUid;
          newBooking.icloudUrl = syncResult.icloudUrl;
          newBooking.syncedWithIcloud = true;
        }
      } catch (calErr) {
        console.warn('Aviso: la reserva se guardó localmente pero falló el envío a iCloud:', calErr.message);
      }
    }

    // Guardar en la base de datos local
    const bookings = db.getBookings();
    bookings.push(newBooking);
    db.saveBookings(bookings);

    // Si marcó registrar ingreso automáticamente en finanzas
    if (registerIncome && newBooking.price > 0) {
      const finances = db.getFinances();
      finances.unshift({
        id: uuidv4(),
        date: checkIn,
        concept: `Reserva: ${newBooking.guestName} (${newBooking.room})`,
        amount: newBooking.price,
        type: 'ingreso',
        category: 'Alojamiento',
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
      return res.status(404).json({ success: false, error: 'Reserva no encontrada.' });
    }

    const updatedBooking = {
      ...bookings[index],
      ...req.body,
      id: bookings[index].id // mantener ID inmutable
    };

    // Si está conectado con iCloud, actualizar también en iCloud
    const settings = db.getSettings();
    if (settings.icloud && settings.icloud.enabled && settings.icloud.calendarUrl) {
      try {
        await caldavService.saveEvent(
          settings.icloud.appleId,
          settings.icloud.appPassword,
          settings.icloud.calendarUrl,
          updatedBooking
        );
        updatedBooking.syncedWithIcloud = true;
      } catch (calErr) {
        console.warn('Aviso: no se pudo actualizar en iCloud:', calErr.message);
      }
    }

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
      return res.status(404).json({ success: false, error: 'Reserva no encontrada.' });
    }

    // Borrar de iCloud si tenía UID asignado
    const settings = db.getSettings();
    if (settings.icloud && settings.icloud.enabled && (booking.icloudUid || booking.id)) {
      try {
        const uidToDelete = booking.icloudUid || `somnis-${booking.id}`;
        await caldavService.deleteEvent(
          settings.icloud.appleId,
          settings.icloud.appPassword,
          settings.icloud.calendarUrl,
          uidToDelete
        );
      } catch (calErr) {
        console.warn('Aviso: no se pudo borrar de iCloud:', calErr.message);
      }
    }

    const filtered = bookings.filter(b => b.id !== id);
    db.saveBookings(filtered);

    res.json({ success: true, message: 'Reserva eliminada correctamente.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sincronización completa con iCloud
router.post('/sync', async (req, res) => {
  try {
    const settings = db.getSettings();
    if (!settings.icloud || !settings.icloud.enabled || !settings.icloud.calendarUrl) {
      return res.status(400).json({
        success: false,
        error: 'Para sincronizar, primero activa y configura tu cuenta de iCloud en el apartado Ajustes.'
      });
    }

    // 1. Obtener eventos de iCloud
    const remoteEvents = await caldavService.fetchEvents(
      settings.icloud.appleId,
      settings.icloud.appPassword,
      settings.icloud.calendarUrl
    );

    const localBookings = db.getBookings();

    // 2. Integrar eventos de iCloud en local si no existen
    let newImported = 0;
    for (const rEvent of remoteEvents) {
      const exists = localBookings.some(b => b.icloudUid === rEvent.icloudUid || b.id === rEvent.id);
      if (!exists && rEvent.checkIn && rEvent.checkOut) {
        localBookings.push({
          id: rEvent.id || uuidv4(),
          guestName: rEvent.guestName,
          guestPhone: '',
          guestEmail: '',
          room: rEvent.room,
          checkIn: rEvent.checkIn,
          checkOut: rEvent.checkOut,
          price: 0,
          paymentMethod: 'Pendiente',
          notes: rEvent.description || 'Importado desde iCloud Calendar',
          status: 'confirmada',
          createdAt: new Date().toISOString(),
          icloudUid: rEvent.icloudUid,
          icloudUrl: rEvent.icloudUrl,
          syncedWithIcloud: true
        });
        newImported++;
      }
    }

    // 3. Subir a iCloud las reservas locales que aún no estén sincronizadas
    let uploadedCount = 0;
    for (const localB of localBookings) {
      if (!localB.syncedWithIcloud) {
        try {
          const syncResult = await caldavService.saveEvent(
            settings.icloud.appleId,
            settings.icloud.appPassword,
            settings.icloud.calendarUrl,
            localB
          );
          if (syncResult.synced) {
            localB.icloudUid = syncResult.icloudUid;
            localB.icloudUrl = syncResult.icloudUrl;
            localB.syncedWithIcloud = true;
            uploadedCount++;
          }
        } catch (upErr) {
          console.warn('Error subiendo reserva local a iCloud:', upErr.message);
        }
      }
    }

    // Guardar cambios
    db.saveBookings(localBookings);

    // Actualizar fecha de última sincronización
    settings.icloud.lastSync = new Date().toISOString();
    db.saveSettings(settings);

    res.json({
      success: true,
      message: `Sincronización completada. ${newImported} reservas importadas desde iCloud, ${uploadedCount} sincronizadas hacia iCloud.`,
      lastSync: settings.icloud.lastSync,
      bookings: localBookings
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
