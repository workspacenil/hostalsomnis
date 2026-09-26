const ICAL = require('ical.js');

/**
 * SERVEI DE SINCRONITZACIÓ DE CALENDARIS PER A BOOKING.COM I AIRBNB
 * Format estàndard iCalendar (.ics).
 * Permet importar reserves d'Airbnb i Booking, i exportar l'ocupació d'Hostal Somnis.
 */

class OtaSyncService {
  /**
   * Genera el calendari .ics per a una habitació concreta
   */
  generateIcalForRoom(roomId, bookings) {
    const activeBookings = (bookings || []).filter(b => {
      const st = (b.status || '').toLowerCase();
      if (st === 'cancelada' || st === 'cancel·lada') return false;
      const bRoom = String(b.room || b.roomId || '').trim();
      return bRoom === roomId || bRoom.includes(roomId);
    });

    const nowIso = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hostal Somnis Suria//OTA Sync//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:Hostal Somnis - Habitacio ${roomId}`
    ];

    for (const b of activeBookings) {
      if (!b.checkIn || !b.checkOut) continue;
      const dtstart = b.checkIn.replace(/-/g, '');
      const dtend = b.checkOut.replace(/-/g, '');
      const uid = `hostal-somnis-${b.id}@hostalsomnis.cat`;
      
      let summary = 'Ocupat - Hostal Somnis';
      if (b.source === 'airbnb') summary = 'Reserva Airbnb';
      else if (b.source === 'booking') summary = 'Reserva Booking.com';
      else if (b.guestName) summary = `Reserva: ${b.guestName}`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${nowIso}`);
      lines.push(`SUMMARY:${summary}`);
      lines.push(`DESCRIPTION:Reserva per a Habitacio ${roomId} a Hostal Somnis`);
      lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
      lines.push(`DTEND;VALUE=DATE:${dtend}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /**
   * Descarrega i analitza un fitxer .ics des d'una URL (Airbnb o Booking.com)
   */
  async fetchAndParseIcs(url, defaultSource = 'ota') {
    if (!url || !url.trim().startsWith('http')) return [];

    const response = await fetch(url.trim(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HostalSomnisCalendarSync/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`No s'ha pogut descarregar el calendari (HTTP ${response.status})`);
    }

    const icsText = await response.text();
    return this.parseIcsText(icsText, defaultSource);
  }

  /**
   * Analitza el text en format .ics utilitzant ical.js amb fallback regex
   */
  parseIcsText(icsText, defaultSource = 'ota') {
    const events = [];
    if (!icsText || !icsText.includes('BEGIN:VCALENDAR')) return events;

    try {
      const jcal = ICAL.parse(icsText);
      const comp = new ICAL.Component(jcal);
      const vevents = comp.getAllSubcomponents('vevent');

      for (const vevent of vevents) {
        const event = new ICAL.Event(vevent);
        const uid = event.uid || `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const summary = event.summary || 'Reserva OTA';
        const description = event.description || '';

        // Formatar dates YYYY-MM-DD
        let checkIn = '';
        let checkOut = '';

        if (event.startDate) {
          const d = event.startDate.toJSDate();
          checkIn = d.toISOString().split('T')[0];
        }
        if (event.endDate) {
          const d = event.endDate.toJSDate();
          checkOut = d.toISOString().split('T')[0];
        }

        if (checkIn && checkOut) {
          // Detectar font: Airbnb o Booking.com
          let source = defaultSource;
          const lowerText = `${summary} ${description}`.toLowerCase();
          if (lowerText.includes('airbnb')) {
            source = 'airbnb';
          } else if (lowerText.includes('booking')) {
            source = 'booking';
          }

          let guestName = summary;
          if (source === 'airbnb') {
            guestName = summary.includes('Not available') || summary.includes('Reserved') ? 'Reserva Airbnb' : summary;
          } else if (source === 'booking') {
            guestName = summary.includes('CLOSED') ? 'Reserva Booking.com' : summary;
          }

          events.push({
            uid,
            checkIn,
            checkOut,
            summary,
            description,
            guestName: guestName || (source === 'airbnb' ? 'Reserva Airbnb' : 'Reserva Booking.com'),
            source
          });
        }
      }
    } catch (err) {
      console.warn('Error amb ical.js, provant mètode de seguretat regex:', err.message);
      // Fallback simple amb regex per VEVENT
      const vEventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi;
      let match;
      while ((match = vEventRegex.exec(icsText)) !== null) {
        const block = match[1];
        const uidMatch = block.match(/UID:([^\r\n]+)/i);
        const dtstartMatch = block.match(/DTSTART(?:;VALUE=DATE)?:([0-9]{8})/i);
        const dtendMatch = block.match(/DTEND(?:;VALUE=DATE)?:([0-9]{8})/i);
        const summaryMatch = block.match(/SUMMARY:([^\r\n]+)/i);

        if (dtstartMatch && dtendMatch) {
          const s = dtstartMatch[1];
          const e = dtendMatch[1];
          const checkIn = `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
          const checkOut = `${e.substring(0, 4)}-${e.substring(4, 6)}-${e.substring(6, 8)}`;
          const uid = uidMatch ? uidMatch[1].trim() : `regex-${Date.now()}-${Math.random()}`;
          const summary = summaryMatch ? summaryMatch[1].trim() : 'Reserva';
          
          let source = defaultSource;
          if (summary.toLowerCase().includes('airbnb') || block.toLowerCase().includes('airbnb')) source = 'airbnb';
          else if (summary.toLowerCase().includes('booking') || block.toLowerCase().includes('booking')) source = 'booking';

          events.push({
            uid,
            checkIn,
            checkOut,
            summary,
            guestName: source === 'airbnb' ? 'Reserva Airbnb' : (source === 'booking' ? 'Reserva Booking.com' : summary),
            source
          });
        }
      }
    }

    return events;
  }
}

module.exports = new OtaSyncService();
