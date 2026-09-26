const express = require('express');
const router = express.Router();
const db = require('../db');
const otaSyncService = require('../otaSyncService');

/**
 * 1. EXPORTACIÓ PÚBLICA D'ICALENDAR (.ics)
 * Booking.com i Airbnb consulten periòdicament aquesta URL per bloquejar dates
 * Format URL: /api/calendar/export/101.ics
 */
router.get('/export/:roomId([0-9]{3})\\.ics', (req, res) => {
  try {
    const roomId = req.params.roomId;
    const bookings = db.getBookings();
    const icsContent = otaSyncService.generateIcalForRoom(roomId, bookings);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="hostal-somnis-hab-${roomId}.ics"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(icsContent);
  } catch (err) {
    res.status(500).send('Error generant calendari iCal: ' + err.message);
  }
});

/**
 * 2. SINCRONITZACIÓ DE RESERVES (IMPORTAR D'AIRBNB I BOOKING.COM)
 * Descarrega els .ics configurats per a cada habitació i actualitza les reserves a la base de dades.
 */
router.post('/sync-ota', async (req, res) => {
  try {
    const settings = db.getSettings();
    const otaConfig = req.body.ota_sync || settings.ota_sync || {};
    const localBookings = db.getBookings();

    let importedCount = 0;
    let updatedCount = 0;
    const errors = [];

    // Recórrer les 6 habitacions
    const rooms = ['101', '102', '201', '202', '301', '302'];

    for (const roomId of rooms) {
      const roomConf = otaConfig[roomId];
      if (!roomConf) continue;

      // Airbnb
      if (roomConf.airbnbUrl && roomConf.airbnbUrl.trim().startsWith('http')) {
        try {
          const events = await otaSyncService.fetchAndParseIcs(roomConf.airbnbUrl, 'airbnb');
          for (const ev of events) {
            const bookingId = `ota-airbnb-${roomId}-${ev.uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
            const existingIdx = localBookings.findIndex(b => b.id === bookingId || (b.otaUid === ev.uid && b.room === roomId));

            if (existingIdx !== -1) {
              // Actualitzar dates si han canviat
              localBookings[existingIdx].checkIn = ev.checkIn;
              localBookings[existingIdx].checkOut = ev.checkOut;
              localBookings[existingIdx].guestName = ev.guestName || 'Reserva Airbnb';
              updatedCount++;
            } else {
              localBookings.push({
                id: bookingId,
                room: roomId,
                guestName: ev.guestName || 'Reserva Airbnb',
                guestPhone: '',
                guestEmail: '',
                checkIn: ev.checkIn,
                checkOut: ev.checkOut,
                price: 0,
                totalPrice: 0,
                mealPlan: 'NE',
                guestsCount: 2,
                notes: 'Importat automàticament des d\'Airbnb',
                status: 'confirmada',
                source: 'airbnb',
                otaUid: ev.uid,
                createdAt: new Date().toISOString()
              });
              importedCount++;
            }
          }
        } catch (err) {
          errors.push(`Habitació ${roomId} (Airbnb): ${err.message}`);
        }
      }

      // Booking.com
      if (roomConf.bookingUrl && roomConf.bookingUrl.trim().startsWith('http')) {
        try {
          const events = await otaSyncService.fetchAndParseIcs(roomConf.bookingUrl, 'booking');
          for (const ev of events) {
            const bookingId = `ota-booking-${roomId}-${ev.uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
            const existingIdx = localBookings.findIndex(b => b.id === bookingId || (b.otaUid === ev.uid && b.room === roomId));

            if (existingIdx !== -1) {
              localBookings[existingIdx].checkIn = ev.checkIn;
              localBookings[existingIdx].checkOut = ev.checkOut;
              localBookings[existingIdx].guestName = ev.guestName || 'Reserva Booking.com';
              updatedCount++;
            } else {
              localBookings.push({
                id: bookingId,
                room: roomId,
                guestName: ev.guestName || 'Reserva Booking.com',
                guestPhone: '',
                guestEmail: '',
                checkIn: ev.checkIn,
                checkOut: ev.checkOut,
                price: 0,
                totalPrice: 0,
                mealPlan: 'NE',
                guestsCount: 2,
                notes: 'Importat automàticament des de Booking.com',
                status: 'confirmada',
                source: 'booking',
                otaUid: ev.uid,
                createdAt: new Date().toISOString()
              });
              importedCount++;
            }
          }
        } catch (err) {
          errors.push(`Habitació ${roomId} (Booking.com): ${err.message}`);
        }
      }
    }

    // Desar
    db.saveBookings(localBookings);

    // Guardar última data de sincronització a configuració
    settings.ota_sync = otaConfig;
    settings.ota_last_sync = new Date().toISOString();
    db.saveSettings(settings);

    res.json({
      success: true,
      message: `Sincronització completada amb èxit! ${importedCount} noves reserves importades, ${updatedCount} actualitzades.`,
      importedCount,
      updatedCount,
      errors: errors.length > 0 ? errors : null,
      lastSync: settings.ota_last_sync,
      bookings: localBookings
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
