const ICAL = require('ical.js');

/**
 * Servicio CalDAV para sincronización con Apple iCloud Calendar
 * Documentado para Hostal Somnis (Súria)
 */

class CalDavService {
  constructor() {
    this.baseUrl = 'https://caldav.icloud.com';
  }

  // Genera cabeceras de autorización HTTP Basic
  getAuthHeaders(appleId, appPassword) {
    const cleanPassword = appPassword.replace(/\s+/g, ''); // eliminar espacios si se pegó con guiones o espacios
    const credentials = Buffer.from(`${appleId.trim()}:${cleanPassword}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'User-Agent': 'HostalSomnisApp/1.0 (Windows; es-ES)'
    };
  }

  // Resuelve URLs relativas y respeta redirecciones de partición (pXX-caldav.icloud.com)
  resolveUrl(base, relative) {
    try {
      return new URL(relative, base).toString();
    } catch {
      return relative;
    }
  }

  // Extractor sencillo de etiquetas XML
  extractTagContent(xml, tagName) {
    const regex = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${tagName}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }

  // 1. Probar conexión y obtener calendarios disponibles
  async testConnection(appleId, appPassword) {
    if (!appleId || !appPassword) {
      throw new Error('Debes indicar tu ID de Apple y la Contraseña específica de aplicación.');
    }

    const headers = this.getAuthHeaders(appleId, appPassword);

    // Paso 1: Obtener principal del usuario
    const propfindPrincipal = `<?xml version="1.0" encoding="utf-8" ?>
      <D:propfind xmlns:D="DAV:">
        <D:prop>
          <D:current-user-principal/>
        </D:prop>
      </D:propfind>`;

    const resPrincipal = await fetch(this.baseUrl, {
      method: 'PROPFIND',
      headers: {
        ...headers,
        'Depth': '0',
        'Content-Type': 'application/xml; charset=utf-8'
      },
      body: propfindPrincipal
    });

    if (resPrincipal.status === 401) {
      throw new Error('Autenticación fallida. Revisa tu ID de Apple y asegúrate de usar una "Contraseña específica de app" generada en appleid.apple.com (no tu contraseña habitual).');
    }

    if (!resPrincipal.ok) {
      throw new Error(`Error de conexión con iCloud (código HTTP ${resPrincipal.status})`);
    }

    const principalXml = await resPrincipal.text();
    const principalHref = this.extractTagContent(principalXml, 'href');

    if (!principalHref) {
      throw new Error('No se pudo encontrar el usuario en iCloud.');
    }

    const principalUrl = this.resolveUrl(this.baseUrl, principalHref);

    // Paso 2: Obtener calendar-home-set
    const propfindHomeSet = `<?xml version="1.0" encoding="utf-8" ?>
      <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
        <D:prop>
          <C:calendar-home-set/>
        </D:prop>
      </D:propfind>`;

    const resHomeSet = await fetch(principalUrl, {
      method: 'PROPFIND',
      headers: {
        ...headers,
        'Depth': '0',
        'Content-Type': 'application/xml; charset=utf-8'
      },
      body: propfindHomeSet
    });

    if (!resHomeSet.ok) {
      throw new Error('No se pudo localizar el conjunto de calendarios de iCloud.');
    }

    const homeSetXml = await resHomeSet.text();
    const homeSetHref = this.extractTagContent(homeSetXml, 'href');

    if (!homeSetHref) {
      throw new Error('No se pudo obtener la ruta del almacén de calendarios.');
    }

    const homeSetUrl = this.resolveUrl(principalUrl, homeSetHref);

    // Paso 3: Listar todos los calendarios disponibles
    const propfindCalendars = `<?xml version="1.0" encoding="utf-8" ?>
      <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
        <D:prop>
          <D:displayname/>
          <D:resourcetype/>
        </D:prop>
      </D:propfind>`;

    const resCalendars = await fetch(homeSetUrl, {
      method: 'PROPFIND',
      headers: {
        ...headers,
        'Depth': '1',
        'Content-Type': 'application/xml; charset=utf-8'
      },
      body: propfindCalendars
    });

    if (!resCalendars.ok) {
      throw new Error('Error al listar los calendarios de iCloud.');
    }

    const calendarsXml = await resCalendars.text();
    const calendars = this.parseCalendarsList(homeSetUrl, calendarsXml);

    return {
      success: true,
      message: '¡Conexión con iCloud establecida con éxito!',
      calendars
    };
  }

  // Parsea la lista de colecciones devueltas por CalDAV
  parseCalendarsList(homeSetUrl, xml) {
    const responses = xml.split(/<\/(?:[a-zA-Z0-9_-]+:)?response>/i);
    const calendars = [];

    for (const chunk of responses) {
      if (!chunk.includes('calendar')) continue;

      const href = this.extractTagContent(chunk, 'href');
      const displayName = this.extractTagContent(chunk, 'displayname');

      if (href && displayName) {
        // Filtrar elementos que no son calendarios seleccionables estándar
        if (displayName.toLowerCase() === 'inbox' || displayName.toLowerCase() === 'outbox') continue;

        calendars.push({
          name: displayName,
          url: this.resolveUrl(homeSetUrl, href)
        });
      }
    }

    return calendars;
  }

  // 2. Obtener eventos de iCloud
  async fetchEvents(appleId, appPassword, calendarUrl) {
    if (!calendarUrl) {
      throw new Error('No se ha especificado el calendario de iCloud a sincronizar.');
    }

    const headers = this.getAuthHeaders(appleId, appPassword);

    const reportQuery = `<?xml version="1.0" encoding="utf-8" ?>
      <C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
        <D:prop>
          <D:getetag/>
          <C:calendar-data/>
        </D:prop>
        <C:filter>
          <C:comp-filter name="VCALENDAR">
            <C:comp-filter name="VEVENT" />
          </C:comp-filter>
        </C:filter>
      </C:calendar-query>`;

    const response = await fetch(calendarUrl, {
      method: 'REPORT',
      headers: {
        ...headers,
        'Depth': '1',
        'Content-Type': 'application/xml; charset=utf-8'
      },
      body: reportQuery
    });

    if (!response.ok) {
      throw new Error(`Error al leer eventos de iCloud (HTTP ${response.status})`);
    }

    const xml = await response.text();
    return this.parseCalendarData(xml, calendarUrl);
  }

  // Parsea respuestas CalDAV con datos iCalendar
  parseCalendarData(xml, calendarUrl) {
    const events = [];
    const responses = xml.split(/<\/(?:[a-zA-Z0-9_-]+:)?response>/i);

    for (const chunk of responses) {
      const href = this.extractTagContent(chunk, 'href');
      const calDataRaw = this.extractTagContent(chunk, 'calendar-data');

      if (!calDataRaw) continue;

      // Decodificar entidades XML básicas si existen
      const calData = calDataRaw
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');

      try {
        const jcal = ICAL.parse(calData);
        const comp = new ICAL.Component(jcal);
        const vevents = comp.getAllSubcomponents('vevent');

        for (const vevent of vevents) {
          const event = new ICAL.Event(vevent);
          const uid = event.uid;
          const summary = event.summary || 'Reserva Hostal Somnis';
          const description = event.description || '';
          
          // Extraer fechas YYYY-MM-DD
          const startDate = event.startDate ? event.startDate.toJSDate().toISOString().split('T')[0] : '';
          const endDate = event.endDate ? event.endDate.toJSDate().toISOString().split('T')[0] : '';

          // Intentar parsear detalles de la reserva desde el resumen o descripción
          const guestName = this.extractGuestName(summary, description);
          const room = this.extractRoom(summary, description);

          events.push({
            id: uid,
            icloudUid: uid,
            icloudUrl: href ? this.resolveUrl(calendarUrl, href) : '',
            guestName: guestName || summary,
            room: room || 'Habitación 1 - Doble',
            checkIn: startDate,
            checkOut: endDate,
            summary: summary,
            description: description,
            source: 'icloud'
          });
        }
      } catch (err) {
        console.warn('No se pudo parsear un evento iCal:', err.message);
      }
    }

    return events;
  }

  extractGuestName(summary, description) {
    // Patrones habituales: "Reserva: Juan Pérez (Hab 1)" o "Juan Pérez"
    const matchReserva = summary.match(/(?:Reserva[:\s-]+)?([^(\n\-]+)/i);
    if (matchReserva && matchReserva[1].trim().length > 1) {
      return matchReserva[1].trim();
    }
    const descMatch = description.match(/Huésped[:\s]+([^\n]+)/i);
    if (descMatch) return descMatch[1].trim();
    return summary;
  }

  extractRoom(summary, description) {
    const allText = `${summary} ${description}`;
    const roomMatch = allText.match(/(Habitación\s*\d+|Hab\s*\d+|Doble|Individual|Matrimonial)/i);
    if (roomMatch) return roomMatch[1];
    return 'Habitación 1 - Doble';
  }

  // 3. Crear o actualizar un evento en iCloud
  async saveEvent(appleId, appPassword, calendarUrl, booking) {
    if (!appleId || !appPassword || !calendarUrl) {
      return { synced: false, message: 'iCloud no configurado.' };
    }

    const headers = this.getAuthHeaders(appleId, appPassword);
    const uid = booking.icloudUid || `somnis-${booking.id}`;
    
    // Normalizar fechas: CalDAV iCalendar all-day date formato YYYYMMDD
    const dtstart = booking.checkIn.replace(/-/g, '');
    const dtend = booking.checkOut.replace(/-/g, '');
    const nowIso = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const summary = `Reserva: ${booking.guestName} (${booking.room || 'Habitación'})`;
    const description = [
      `Hostal Somnis - Súria (08260)`,
      `Huésped: ${booking.guestName}`,
      `Habitación: ${booking.room || 'General'}`,
      `Teléfono: ${booking.guestPhone || 'No indicado'}`,
      `Email: ${booking.guestEmail || 'No indicado'}`,
      `Importe total: ${booking.price || '0'} €`,
      `Observaciones: ${booking.notes || 'Ninguna'}`
    ].join('\\n');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hostal Somnis Súria//ES',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${nowIso}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtend}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    // Construir URL del recurso .ics
    const targetUrl = calendarUrl.endsWith('/') ? `${calendarUrl}${uid}.ics` : `${calendarUrl}/${uid}.ics`;

    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'text/calendar; charset=utf-8'
      },
      body: icsContent
    });

    if (!response.ok && response.status !== 201 && response.status !== 204) {
      throw new Error(`Error de sincronización con iCloud (HTTP ${response.status})`);
    }

    return {
      synced: true,
      icloudUid: uid,
      icloudUrl: targetUrl
    };
  }

  // 4. Eliminar evento de iCloud
  async deleteEvent(appleId, appPassword, calendarUrl, icloudUid) {
    if (!appleId || !appPassword || !calendarUrl || !icloudUid) {
      return { deleted: false, message: 'Sin datos suficientes de iCloud.' };
    }

    const headers = this.getAuthHeaders(appleId, appPassword);
    const targetUrl = calendarUrl.endsWith('/') ? `${calendarUrl}${icloudUid}.ics` : `${calendarUrl}/${icloudUid}.ics`;

    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers
    });

    if (!response.ok && response.status !== 404) {
      console.warn(`No se pudo borrar evento en iCloud (HTTP ${response.status})`);
      return { deleted: false };
    }

    return { deleted: true };
  }
}

module.exports = new CalDavService();
