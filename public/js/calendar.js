/**
 * MÒDUL DE CALENDARI - HOSTAL SOMNIS (SÚRIA)
 * Visualització d'ocupació per dia i gestió de les 6 habitacions reals.
 * 101, 102, 201, 202, 301, 302.
 * Especialment dissenyat per a la mare: molt clar, gran, senzill i robust.
 */

const CalendarModule = {
  viewDate: null,     // Data de referència del mes que s'està visualitzant (Date)
  selectedDate: null, // Data seleccionada en format 'YYYY-MM-DD'
  currentEditBookingId: null,

  // Les 6 habitacions reals de Hostal Somnis (Súria)
  ROOMS: [
    { id: '101', name: 'Habitació 101', floor: 1, floorLabel: '1a Planta' },
    { id: '102', name: 'Habitació 102', floor: 1, floorLabel: '1a Planta' },
    { id: '201', name: 'Habitació 201', floor: 2, floorLabel: '2a Planta' },
    { id: '202', name: 'Habitació 202', floor: 2, floorLabel: '2a Planta' },
    { id: '301', name: 'Habitació 301', floor: 3, floorLabel: '3a Planta' },
    { id: '302', name: 'Habitació 302', floor: 3, floorLabel: '3a Planta' }
  ],

  MONTH_NAMES: [
    'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
    'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'
  ],

  DAY_NAMES_WEEKDAY: ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'],

  DAY_NAMES_FULL: [
    'Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'
  ],

  init() {
    const today = new Date();
    this.viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.selectedDate = this.formatDateIso(today);
  },

  formatDateIso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  parseDate(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  },

  formatDateLongReadable(dateStr) {
    if (!dateStr) return '';
    const date = this.parseDate(dateStr);
    const dayOfWeek = this.DAY_NAMES_FULL[date.getDay()];
    const dayNum = date.getDate();
    const month = this.MONTH_NAMES[date.getMonth()].toLowerCase();
    const year = date.getFullYear();
    return `${dayOfWeek}, ${dayNum} de ${month} de ${year}`;
  },

  prevMonth() {
    if (!this.viewDate) this.init();
    this.viewDate.setMonth(this.viewDate.getMonth() - 1);
    this.render();
  },

  nextMonth() {
    if (!this.viewDate) this.init();
    this.viewDate.setMonth(this.viewDate.getMonth() + 1);
    this.render();
  },

  goToToday() {
    const today = new Date();
    this.viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.selectedDate = this.formatDateIso(today);
    this.render();
  },

  selectDate(dateStr) {
    this.selectedDate = dateStr;
    const d = this.parseDate(dateStr);
    if (this.viewDate && (d.getMonth() !== this.viewDate.getMonth() || d.getFullYear() !== this.viewDate.getFullYear())) {
      this.viewDate = new Date(d.getFullYear(), d.getMonth(), 1);
    }
    this.render();
  },

  // Coincidència tolerant d'habitacions per número o nom
  matchesRoom(booking, roomId) {
    if (!booking) return false;
    const bRoom = String(booking.room || booking.roomId || '').trim();
    if (bRoom === roomId) return true;
    if (bRoom.includes(roomId)) return true;

    const legacyMap = {
      'hab-1': '101', 'hab-2': '102', 'hab-3': '201', 'hab-4': '202',
      'Habitación 1': '101', 'Habitación 2': '102', 'Habitación 3': '201', 'Habitación 4': '202'
    };
    for (const [legacy, mapped] of Object.entries(legacyMap)) {
      if (mapped === roomId && bRoom.includes(legacy)) return true;
    }
    return false;
  },

  // Consulta l'estat d'una habitació en una data determinada
  getRoomStatusForDate(roomId, dateStr, bookings) {
    const activeBookings = bookings.filter(b => {
      const st = (b.status || '').toLowerCase();
      return st !== 'cancelada' && st !== 'cancel·lada' && this.matchesRoom(b, roomId);
    });

    // Dorm aquella nit: dateStr >= checkIn && dateStr < checkOut
    const staying = activeBookings.find(b => dateStr >= b.checkIn && dateStr < b.checkOut);

    // Entrada avui
    const checkIn = activeBookings.find(b => b.checkIn === dateStr);

    // Sortida avui
    const checkOut = activeBookings.find(b => b.checkOut === dateStr);

    return {
      isOccupied: Boolean(staying),
      booking: staying || null,
      isCheckIn: Boolean(checkIn),
      checkInBooking: checkIn || null,
      isCheckOut: Boolean(checkOut),
      checkOutBooking: checkOut || null
    };
  },

  // Resum general del dia
  getDaySummary(dateStr, bookings) {
    let occupiedCount = 0;
    let checkInCount = 0;
    let checkOutCount = 0;
    const movementItems = [];

    this.ROOMS.forEach(room => {
      const status = this.getRoomStatusForDate(room.id, dateStr, bookings);
      if (status.isOccupied) occupiedCount++;
      if (status.isCheckIn) {
        checkInCount++;
        movementItems.push({
          type: 'in',
          room: room.name,
          guestName: status.checkInBooking.guestName || 'Hoste',
          phone: status.checkInBooking.guestPhone || '',
          bookingId: status.checkInBooking.id
        });
      }
      if (status.isCheckOut) {
        checkOutCount++;
        movementItems.push({
          type: 'out',
          room: room.name,
          guestName: status.checkOutBooking.guestName || 'Hoste',
          phone: status.checkOutBooking.guestPhone || '',
          bookingId: status.checkOutBooking.id
        });
      }
    });

    return {
      occupiedCount,
      freeCount: this.ROOMS.length - occupiedCount,
      checkInCount,
      checkOutCount,
      hasMovement: occupiedCount > 0 || checkInCount > 0 || checkOutCount > 0,
      movementItems
    };
  },

  render() {
    if (!this.viewDate) this.init();

    const bookings = (window.Store && Store.get('bookings')) || [];
    const todayStr = this.formatDateIso(new Date());

    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    const monthName = this.MONTH_NAMES[month];

    // Actualitzar títol del mes
    const titleEl = document.getElementById('calendar-month-title');
    if (titleEl) {
      titleEl.innerHTML = `${monthName} <span style="font-weight: 400; color: var(--text-muted);">${year}</span>`;
    }

    // Càlcul de columnes i dies
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDateOfMonth = new Date(year, month + 1, 0).getDate();
    const lastDateOfPrevMonth = new Date(year, month, 0).getDate();

    // Dl = 0, Dt = 1, ..., Dg = 6
    let startDayCol = firstDayOfMonth.getDay() - 1;
    if (startDayCol < 0) startDayCol = 6;

    let daysHtml = '';

    // Dies buits / mes anterior
    for (let i = startDayCol - 1; i >= 0; i--) {
      const prevDayNum = lastDateOfPrevMonth - i;
      const prevDate = new Date(year, month - 1, prevDayNum);
      const prevDateStr = this.formatDateIso(prevDate);
      daysHtml += `
        <div class="calendar-day empty" onclick="CalendarModule.selectDate('${prevDateStr}')" style="cursor: pointer; opacity: 0.35;">
          <div class="calendar-day-header">
            <span class="day-number">${prevDayNum}</span>
          </div>
        </div>
      `;
    }

    // Dies del mes
    for (let day = 1; day <= lastDateOfMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dateStr = this.formatDateIso(dateObj);
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === this.selectedDate;
      const summary = this.getDaySummary(dateStr, bookings);

      let movementDotHtml = '';
      if (summary.checkInCount > 0 && summary.checkOutCount > 0) {
        movementDotHtml = `<span class="day-movement-dot in-out" title="${summary.checkInCount} check-in / ${summary.checkOutCount} check-out">⇅</span>`;
      } else if (summary.checkInCount > 0) {
        movementDotHtml = `<span class="day-movement-dot in" title="${summary.checkInCount} arribada/es">↓</span>`;
      } else if (summary.checkOutCount > 0) {
        movementDotHtml = `<span class="day-movement-dot out" title="${summary.checkOutCount} sortida/es">↑</span>`;
      }

      let occupancyPillHtml = '';
      if (summary.occupiedCount > 0) {
        occupancyPillHtml = `
          <span class="day-occupancy-pill ${summary.occupiedCount === 6 ? 'full' : ''}">
            ${summary.occupiedCount} hab.
          </span>
        `;
      }

      daysHtml += `
        <div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" onclick="CalendarModule.selectDate('${dateStr}')">
          <div class="calendar-day-header">
            <span class="day-number">${day}</span>
            ${isToday ? '<span class="day-today-tag">Avui</span>' : ''}
          </div>
          <div class="calendar-day-footer">
            ${occupancyPillHtml}
            ${movementDotHtml}
          </div>
        </div>
      `;
    }

    // Dies posteriors
    const totalRendered = startDayCol + lastDateOfMonth;
    const remainingCols = (7 - (totalRendered % 7)) % 7;
    for (let nextDay = 1; nextDay <= remainingCols; nextDay++) {
      const nextDate = new Date(year, month + 1, nextDay);
      const nextDateStr = this.formatDateIso(nextDate);
      daysHtml += `
        <div class="calendar-day empty" onclick="CalendarModule.selectDate('${nextDateStr}')" style="cursor: pointer; opacity: 0.35;">
          <div class="calendar-day-header">
            <span class="day-number">${nextDay}</span>
          </div>
        </div>
      `;
    }

    const gridEl = document.getElementById('calendar-days-grid');
    if (gridEl) {
      gridEl.innerHTML = daysHtml;
    }

    // Renderitzar el detall de les 6 habitacions
    const detailEl = document.getElementById('calendar-day-detail');
    if (detailEl) {
      detailEl.innerHTML = this.renderSelectedDayDetail(this.selectedDate, bookings, todayStr);
    }
  },

  renderSelectedDayDetail(dateStr, bookings, todayStr) {
    const isToday = dateStr === todayStr;
    const longDateText = this.formatDateLongReadable(dateStr);
    const daySummary = this.getDaySummary(dateStr, bookings);

    // Agrupades per plantes
    const floors = [
      { floor: 1, title: '1a Planta', rooms: this.ROOMS.filter(r => r.floor === 1) },
      { floor: 2, title: '2a Planta', rooms: this.ROOMS.filter(r => r.floor === 2) },
      { floor: 3, title: '3a Planta', rooms: this.ROOMS.filter(r => r.floor === 3) }
    ];

    let floorsHtml = '';

    floors.forEach(fl => {
      let roomsCardsHtml = '';

      fl.rooms.forEach(room => {
        const status = this.getRoomStatusForDate(room.id, dateStr, bookings);

        if (status.isOccupied) {
          const b = status.booking;
          const guestName = b.guestName || 'Hoste';
          const guestPhone = b.guestPhone || '';
          const checkIn = b.checkIn || '';
          const checkOut = b.checkOut || '';
          const price = b.price ? `${b.price} €` : '';

          let badgesHtml = '';
          if (status.isCheckIn) {
            badgesHtml += `<span class="action-tag in">📥 Arribada (Check-in) avui</span>`;
          }
          if (status.checkOutBooking && status.checkOutBooking.id !== b.id) {
            badgesHtml += `<span class="action-tag out">📤 Sortida prèvia: ${status.checkOutBooking.guestName || 'Hoste'}</span>`;
          }

          roomsCardsHtml += `
            <div class="room-status-card occupied">
              <div class="room-card-top">
                <div class="room-card-title">
                  <span class="room-num-badge">${room.id}</span>
                  <span class="room-name-text">${room.name}</span>
                </div>
                <span class="status-tag occupied">OCUPADA</span>
              </div>

              <div class="room-card-body">
                <div class="guest-name">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); display: inline-block; vertical-align: middle; margin-right: 4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  ${guestName}
                </div>
                <div class="booking-dates">
                  Estada: <strong>${checkIn}</strong> al <strong>${checkOut}</strong>
                  ${price ? ` &bull; <strong>${price}</strong>` : ''}
                </div>
                ${guestPhone ? `
                  <div class="guest-contact">
                    Telèfon: <a href="tel:${guestPhone}" style="color: var(--text-main); font-weight: 500; text-decoration: underline;">${guestPhone}</a>
                  </div>
                ` : ''}
                ${b.notes ? `
                  <div class="guest-notes" style="font-style: italic; color: #4B5563; font-size: 12px; margin-top: 4px;">
                    📝 ${b.notes}
                  </div>
                ` : ''}
              </div>

              <div class="room-card-footer">
                ${badgesHtml || '<span></span>'}
                <button type="button" class="btn-room-action" onclick="CalendarModule.openEditBooking('${b.id}')">
                  Veure / Modificar
                </button>
              </div>
            </div>
          `;
        } else {
          // LLIURE
          let outBadge = '';
          if (status.isCheckOut && status.checkOutBooking) {
            outBadge = `
              <span class="action-tag out">📤 Sortida (Check-out) avui: ${status.checkOutBooking.guestName || 'Hoste'}</span>
            `;
          }

          roomsCardsHtml += `
            <div class="room-status-card free">
              <div class="room-card-top">
                <div class="room-card-title">
                  <span class="room-num-badge free">${room.id}</span>
                  <span class="room-name-text">${room.name}</span>
                </div>
                <span class="status-tag free">LLIURE</span>
              </div>

              <div class="room-card-body">
                <div class="free-message">
                  ✓ Disponible per allotjar
                </div>
              </div>

              <div class="room-card-footer">
                ${outBadge || '<span></span>'}
                <button type="button" class="btn-room-action new" onclick="CalendarModule.openNewBooking('${room.id}', '${dateStr}')">
                  + Nova Reserva
                </button>
              </div>
            </div>
          `;
        }
      });

      floorsHtml += `
        <div class="floor-section">
          <div class="floor-header">${fl.title}</div>
          <div class="floor-rooms-grid">
            ${roomsCardsHtml}
          </div>
        </div>
      `;
    });

    // Llista de moviments
    let movementsHtml = '';
    if (daySummary.movementItems.length > 0) {
      const itemsList = daySummary.movementItems.map(item => `
        <div class="movement-item ${item.type}">
          <strong>${item.type === 'in' ? '📥 Arribada (Check-in)' : '📤 Sortida (Check-out)'}</strong>:
          ${item.room} — <strong>${item.guestName}</strong>
          ${item.phone ? `<span class="movement-phone">(${item.phone})</span>` : ''}
        </div>
      `).join('');

      movementsHtml = `
        <div class="calendar-movements-box">
          <div class="movements-title">Moviments previstos pel dia</div>
          <div class="movements-list">
            ${itemsList}
          </div>
        </div>
      `;
    }

    return `
      <div class="calendar-detail-header">
        <div>
          <div class="detail-date-title">
            <span>${longDateText}</span>
            ${isToday ? '<span class="badge-avui">Avui</span>' : ''}
          </div>
          <div class="detail-summary-line">
            <span class="summary-pill free">${daySummary.freeCount} Lliures</span>
            <span class="summary-pill occupied">${daySummary.occupiedCount} Ocupades</span>
            ${daySummary.checkInCount > 0 ? `<span class="summary-pill total" style="background: #ECFDF5; color: #059669; font-weight: 600;">${daySummary.checkInCount} check-in</span>` : ''}
            ${daySummary.checkOutCount > 0 ? `<span class="summary-pill total" style="background: #FFFBEB; color: #B45309; font-weight: 600;">${daySummary.checkOutCount} check-out</span>` : ''}
          </div>
        </div>
      </div>

      ${movementsHtml}

      <div class="calendar-floors-container">
        ${floorsHtml}
      </div>
    `;
  },

  // Modal de creació / edició
  openNewBooking(roomId, dateStr) {
    this.currentEditBookingId = null;
    const modal = document.getElementById('calendar-booking-modal');
    if (!modal) return;

    document.getElementById('cal-modal-title').textContent = 'Nova Reserva';
    document.getElementById('cal-modal-id').value = '';
    document.getElementById('cal-modal-room').value = roomId || '101';
    document.getElementById('cal-modal-guest').value = '';
    document.getElementById('cal-modal-phone').value = '';
    
    // CheckIn seleccionat, CheckOut per defecte l'endemà
    const inDate = dateStr || this.selectedDate || this.formatDateIso(new Date());
    const nextDate = this.parseDate(inDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    document.getElementById('cal-modal-checkin').value = inDate;
    document.getElementById('cal-modal-checkout').value = this.formatDateIso(nextDate);
    document.getElementById('cal-modal-price').value = '';
    document.getElementById('cal-modal-notes').value = '';
    
    const delBtn = document.getElementById('cal-modal-delete-btn');
    if (delBtn) delBtn.style.display = 'none';

    modal.style.display = 'flex';
  },

  openEditBooking(bookingId) {
    const bookings = (window.Store && Store.get('bookings')) || [];
    const b = bookings.find(item => item.id === bookingId);
    if (!b) return;

    this.currentEditBookingId = bookingId;
    const modal = document.getElementById('calendar-booking-modal');
    if (!modal) return;

    document.getElementById('cal-modal-title').textContent = `Modificar Reserva - ${b.guestName || 'Hoste'}`;
    document.getElementById('cal-modal-id').value = b.id;

    // Normalitzar id habitació
    let matchedRoomId = '101';
    for (const r of this.ROOMS) {
      if (this.matchesRoom(b, r.id)) {
        matchedRoomId = r.id;
        break;
      }
    }
    document.getElementById('cal-modal-room').value = matchedRoomId;
    document.getElementById('cal-modal-guest').value = b.guestName || '';
    document.getElementById('cal-modal-phone').value = b.guestPhone || '';
    document.getElementById('cal-modal-checkin').value = b.checkIn || '';
    document.getElementById('cal-modal-checkout').value = b.checkOut || '';
    document.getElementById('cal-modal-price').value = b.price || '';
    document.getElementById('cal-modal-notes').value = b.notes || '';

    const delBtn = document.getElementById('cal-modal-delete-btn');
    if (delBtn) delBtn.style.display = 'inline-block';

    modal.style.display = 'flex';
  },

  closeModal() {
    const modal = document.getElementById('calendar-booking-modal');
    if (modal) modal.style.display = 'none';
    this.currentEditBookingId = null;
  },

  saveModalBooking(e) {
    if (e && e.preventDefault) e.preventDefault();

    const id = document.getElementById('cal-modal-id').value;
    const roomId = document.getElementById('cal-modal-room').value;
    const guestName = document.getElementById('cal-modal-guest').value.trim();
    const guestPhone = document.getElementById('cal-modal-phone').value.trim();
    const checkIn = document.getElementById('cal-modal-checkin').value;
    const checkOut = document.getElementById('cal-modal-checkout').value;
    const price = parseFloat(document.getElementById('cal-modal-price').value) || 0;
    const notes = document.getElementById('cal-modal-notes').value.trim();

    if (!guestName || !checkIn || !checkOut) {
      alert('Si us plau, omple el nom de l\'hoste i les dates d\'entrada i sortida.');
      return;
    }

    if (checkOut <= checkIn) {
      alert('La data de sortida ha de ser posterior a la data d\'entrada.');
      return;
    }

    const bookings = (window.Store && Store.get('bookings')) || [];

    if (id) {
      // Modificar existent
      const idx = bookings.findIndex(b => b.id === id);
      if (idx !== -1) {
        bookings[idx] = {
          ...bookings[idx],
          room: roomId,
          guestName,
          guestPhone,
          checkIn,
          checkOut,
          price,
          notes,
          status: 'confirmada'
        };
      }
    } else {
      // Nova reserva
      const newBooking = {
        id: 'res-' + Date.now(),
        room: roomId,
        guestName,
        guestPhone,
        checkIn,
        checkOut,
        price,
        notes,
        status: 'confirmada',
        createdAt: new Date().toISOString()
      };
      bookings.push(newBooking);
    }

    if (window.Store) {
      Store.set('bookings', bookings);
    }

    this.closeModal();
    this.render();
  },

  deleteCurrentBooking() {
    if (!this.currentEditBookingId) return;

    if (!confirm('Segur que vols eliminar aquesta reserva?')) {
      return;
    }

    let bookings = (window.Store && Store.get('bookings')) || [];
    bookings = bookings.filter(b => b.id !== this.currentEditBookingId);

    if (window.Store) {
      Store.set('bookings', bookings);
    }

    this.closeModal();
    this.render();
  }
};

window.CalendarModule = CalendarModule;
