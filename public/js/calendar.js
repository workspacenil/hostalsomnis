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

    // Suport per a la tecla 'Escape' per tancar el modal
    if (!this._escapeBound) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
          const modal = document.getElementById('calendar-booking-modal');
          if (modal && modal.style.display !== 'none') {
            this.closeModal();
          }
        }
      });
      this._escapeBound = true;
    }
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
        <div class="calendar-day other-month" onclick="CalendarModule.selectDate('${prevDateStr}')">
          <span class="day-number">${prevDayNum}</span>
          <div class="cal-dots-row"></div>
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
      const isFull = summary.occupiedCount === 6;

      let dotsHtml = '';
      if (isFull) {
        dotsHtml = `<span class="day-badge-ple day-occupancy-pill full-red" title="Ple: 6 de 6 habitacions ocupades">Ple</span>`;
      } else {
        if (summary.occupiedCount > 0) {
          dotsHtml += `<span class="cal-dot occupied" title="${summary.occupiedCount} de 6 hab. ocupades"></span>`;
        }
        if (summary.checkInCount > 0 || summary.checkOutCount > 0) {
          dotsHtml += `<span class="cal-dot movement" title="${summary.checkInCount} arribada/es, ${summary.checkOutCount} sortida/es"></span>`;
        }
      }

      daysHtml += `
        <div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isFull ? 'day-full' : ''}" onclick="CalendarModule.selectDate('${dateStr}')">
          <span class="day-number ${isToday ? 'today-circle' : ''}">${day}</span>
          <div class="cal-dots-row ${isFull ? 'has-ple-badge' : ''}">${dotsHtml}</div>
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
        <div class="calendar-day other-month" onclick="CalendarModule.selectDate('${nextDateStr}')">
          <span class="day-number">${nextDay}</span>
          <div class="cal-dots-row"></div>
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
                  <span class="badge-regim ${b.mealPlan === 'AD' ? 'ad' : 'ne'}" title="${b.mealPlan === 'AD' ? 'AD - Allotjament i Desdejuni' : 'NE - Sense esmorzar'}">${b.mealPlan === 'AD' ? 'AD' : 'NE'}</span>
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
                  📅 Estada: <strong>${checkIn}</strong> al <strong>${checkOut}</strong>
                  ${b.guestsCount ? ` &bull; 👥 <strong>${b.guestsCount} pers.</strong>` : ''}
                </div>
                <div style="font-size: 12px; color: #4B5563; margin-top: 2px;">
                  🍽️ Règim: <strong>${b.mealPlan === 'AD' ? 'AD (Allotjament i Desdejuni)' : 'NE (Sense esmorzar)'}</strong>
                  ${b.totalPrice ? ` &bull; 💶 Total: <strong>${parseFloat(b.totalPrice).toFixed(2)} €</strong>` : (price ? ` &bull; 💶 <strong>${price}</strong>` : '')}
                </div>
                ${guestPhone ? `
                  <div class="guest-contact">
                    📞 Telèfon: <a href="tel:${guestPhone}" style="color: var(--text-main); font-weight: 500; text-decoration: underline;">${guestPhone}</a>
                  </div>
                ` : ''}
                ${(b.guestEmail || b.email) ? `
                  <div class="guest-contact">
                    ✉️ Mail: <a href="mailto:${b.guestEmail || b.email}" style="color: var(--text-main); text-decoration: underline;">${b.guestEmail || b.email}</a>
                  </div>
                ` : ''}
                ${b.dni ? `
                  <div class="guest-contact">
                    🪪 DNI/Passaport: <strong>${b.dni}</strong>
                  </div>
                ` : ''}
                ${b.address ? `
                  <div class="guest-contact">
                    📍 Adreça: <span>${b.address}</span>
                  </div>
                ` : ''}
                ${b.notes ? `
                  <div class="guest-notes" style="font-style: italic; color: #4B5563; font-size: 12px; margin-top: 4px;">
                    📝 ${b.notes}
                  </div>
                ` : ''}
                <button type="button" class="btn btn-mail-confirm" id="cal-btn-copy-mail-${b.id}" onclick="CalendarModule.copyConfirmationMail('${b.id}', this)" style="margin-top: 8px;">📧 Copiar Mail de Confirmació</button>
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
        <div class="calendar-movements-box" id="calendar-movements-box">
          <div class="movements-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Moviments previstos pel dia</span>
            ${daySummary.occupiedCount === 6 ? `<span class="day-occupancy-pill full-red" style="font-size: 11px; padding: 2px 8px; border-radius: 12px;">Ple</span>` : ''}
          </div>
          <div class="movements-list">
            ${itemsList}
          </div>
        </div>
      `;
    } else if (daySummary.occupiedCount === 6) {
      movementsHtml = `
        <div class="calendar-movements-box" id="calendar-movements-box">
          <div class="movements-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Estat del dia</span>
            <span class="day-occupancy-pill full-red" style="font-size: 11px; padding: 2px 8px; border-radius: 12px;">Ple</span>
          </div>
          <div style="font-size: 13px; color: #DC2626; font-weight: 600; padding: 4px 0;">
            Hostal al 100% d'ocupació (6 de 6 habitacions ocupades).
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
            ${daySummary.occupiedCount === 6 ? `
              <span class="summary-pill ple day-occupancy-pill full-red">Ple</span>
            ` : `
              <span class="summary-pill free">${daySummary.freeCount} Lliures</span>
              <span class="summary-pill occupied">${daySummary.occupiedCount} Ocupades</span>
            `}
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

  // Mètodes de gestió de règim, persones i fórmula
  setMealPlan(plan) {
    const input = document.getElementById('cal-modal-mealplan');
    if (input) input.value = plan;
    const btnNe = document.getElementById('btn-pill-ne');
    const btnAd = document.getElementById('btn-pill-ad');
    if (btnNe) btnNe.classList.toggle('active', plan === 'NE');
    if (btnAd) btnAd.classList.toggle('active', plan === 'AD');
    this.recalculatePriceFormula();
  },

  setGuestsCount(count) {
    const input = document.getElementById('cal-modal-guests');
    if (input) input.value = count;
    const btn1 = document.getElementById('btn-pill-pers-1');
    const btn2 = document.getElementById('btn-pill-pers-2');
    if (btn1) btn1.classList.toggle('active', count === 1);
    if (btn2) btn2.classList.toggle('active', count === 2);
    this.recalculatePriceFormula();
  },

  recalculatePriceFormula() {
    const settings = (window.Store && Store.get('settings')) || {};
    const defaultRoomPrice = parseFloat(settings.defaultRoomPrice) || 89;
    const breakfastPricePerPerson = parseFloat(settings.defaultBreakfastPrice) || 8;
    const touristTaxRate = parseFloat(settings.touristTax !== undefined ? settings.touristTax : settings.touristTaxRate) || 0.99;

    const checkInStr = document.getElementById('cal-modal-checkin') ? document.getElementById('cal-modal-checkin').value : '';
    const checkOutStr = document.getElementById('cal-modal-checkout') ? document.getElementById('cal-modal-checkout').value : '';
    const priceInputEl = document.getElementById('cal-modal-price');
    const roomPriceInput = priceInputEl ? parseFloat(priceInputEl.value) : NaN;
    const roomPricePerNight = isNaN(roomPriceInput) ? defaultRoomPrice : roomPriceInput;

    const mealPlanEl = document.getElementById('cal-modal-mealplan');
    const mealPlan = mealPlanEl ? mealPlanEl.value : 'NE';
    const guestsEl = document.getElementById('cal-modal-guests');
    const guestsCount = guestsEl ? (parseInt(guestsEl.value, 10) || 2) : 2;

    let numNights = 1;
    if (checkInStr && checkOutStr) {
      const dIn = this.parseDate(checkInStr);
      const dOut = this.parseDate(checkOutStr);
      const diffTime = dOut.getTime() - dIn.getTime();
      if (diffTime > 0) {
        numNights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
      }
    }

    const roomTotal = roomPricePerNight * numNights;
    const taxTotal = parseFloat((guestsCount * touristTaxRate * numNights).toFixed(2));
    const breakfastTotal = (mealPlan === 'AD') ? parseFloat((guestsCount * breakfastPricePerPerson * numNights).toFixed(2)) : 0;
    const finalTotal = parseFloat((roomTotal + taxTotal + breakfastTotal).toFixed(2));

    this.currentCalculatedTotal = finalTotal;

    const formulaEl = document.getElementById('cal-modal-formula-box');
    if (formulaEl) {
      const taxLabel = `${taxTotal.toFixed(2)}€`;
      const breakfastLabel = (mealPlan === 'AD') ? ` + Esmorzar (${breakfastTotal.toFixed(2)}€)` : '';

      formulaEl.innerHTML = `
        <div class="formula-title">Càlcul visual en temps real:</div>
        <div class="formula-detail" style="font-size: 13.5px; line-height: 1.6; margin-top: 4px;">
          <span>${roomTotal.toFixed(2)}€ habitació</span>
          <span>+</span>
          <span>Taxa turística (${taxLabel})</span>
          ${mealPlan === 'AD' ? `
            <span>+</span>
            <span style="color: #B45309; font-weight: 600;">Esmorzar AD (${breakfastTotal.toFixed(2)}€)</span>
          ` : ''}
          <span>=</span>
          <span style="font-weight: 700; color: #0F172A;">Preu Total: <strong>${finalTotal.toFixed(2)}€</strong></span>
        </div>
        <div class="formula-total-highlight">
          <span>${roomTotal.toFixed(2)}€ + ${taxLabel}${breakfastLabel} =</span>
          <span class="formula-total-amount">${finalTotal.toFixed(2)} €</span>
        </div>
      `;
    }
  },

  // Modal de creació / edició
  openNewBooking(roomId, dateStr) {
    this.currentEditBookingId = null;
    const modal = document.getElementById('calendar-booking-modal');
    if (!modal) return;

    const settings = (window.Store && Store.get('settings')) || {};
    const defaultPrice = settings.defaultRoomPrice || 89;

    document.getElementById('cal-modal-title').textContent = 'Nova Reserva';
    document.getElementById('cal-modal-id').value = '';
    document.getElementById('cal-modal-room').value = roomId || '101';
    document.getElementById('cal-modal-guest').value = '';
    document.getElementById('cal-modal-phone').value = '';
    if (document.getElementById('cal-modal-dni')) document.getElementById('cal-modal-dni').value = '';
    if (document.getElementById('cal-modal-email')) document.getElementById('cal-modal-email').value = '';
    if (document.getElementById('cal-modal-address')) document.getElementById('cal-modal-address').value = '';
    
    // CheckIn seleccionat, CheckOut per defecte l'endemà
    const inDate = dateStr || this.selectedDate || this.formatDateIso(new Date());
    const nextDate = this.parseDate(inDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    document.getElementById('cal-modal-checkin').value = inDate;
    document.getElementById('cal-modal-checkout').value = this.formatDateIso(nextDate);
    document.getElementById('cal-modal-price').value = defaultPrice;
    document.getElementById('cal-modal-notes').value = '';

    // Defaults: SEMPRE 'NE', 2 persones per defecte
    this.setMealPlan('NE');
    this.setGuestsCount(2);

    const delBtn = document.getElementById('cal-modal-delete-btn');
    if (delBtn) delBtn.style.display = 'none';

    modal.style.display = 'flex';
    this.recalculatePriceFormula();
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
    document.getElementById('cal-modal-phone').value = b.guestPhone || b.phone || '';
    if (document.getElementById('cal-modal-dni')) document.getElementById('cal-modal-dni').value = b.dni || b.guestDni || '';
    if (document.getElementById('cal-modal-email')) document.getElementById('cal-modal-email').value = b.guestEmail || b.email || '';
    if (document.getElementById('cal-modal-address')) document.getElementById('cal-modal-address').value = b.guestAddress || b.address || '';
    document.getElementById('cal-modal-checkin').value = b.checkIn || '';
    document.getElementById('cal-modal-checkout').value = b.checkOut || '';
    document.getElementById('cal-modal-price').value = b.price || 89;
    document.getElementById('cal-modal-notes').value = b.notes || '';

    // Règim i persones
    this.setMealPlan(b.mealPlan || 'NE');
    this.setGuestsCount(b.guestsCount || 2);

    const delBtn = document.getElementById('cal-modal-delete-btn');
    if (delBtn) delBtn.style.display = 'inline-block';

    modal.style.display = 'flex';
    this.recalculatePriceFormula();
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
    const dni = document.getElementById('cal-modal-dni') ? document.getElementById('cal-modal-dni').value.trim() : '';
    const email = document.getElementById('cal-modal-email') ? document.getElementById('cal-modal-email').value.trim() : '';
    const address = document.getElementById('cal-modal-address') ? document.getElementById('cal-modal-address').value.trim() : '';
    const checkIn = document.getElementById('cal-modal-checkin').value;
    const checkOut = document.getElementById('cal-modal-checkout').value;
    const price = parseFloat(document.getElementById('cal-modal-price').value) || 89;
    const notes = document.getElementById('cal-modal-notes').value.trim();

    const mealPlanEl = document.getElementById('cal-modal-mealplan');
    const mealPlan = mealPlanEl ? mealPlanEl.value : 'NE';
    const guestsEl = document.getElementById('cal-modal-guests');
    const guestsCount = guestsEl ? (parseInt(guestsEl.value, 10) || 2) : 2;

    if (!guestName || !checkIn || !checkOut) {
      alert('Si us plau, omple el nom de l\'hoste i les dates d\'entrada i sortida.');
      return;
    }

    if (checkOut <= checkIn) {
      alert('La data de sortida ha de ser posterior a la data d\'entrada.');
      return;
    }

    const totalPrice = this.currentCalculatedTotal || price;
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
          phone: guestPhone,
          dni,
          guestDni: dni,
          email,
          guestEmail: email,
          address,
          guestAddress: address,
          checkIn,
          checkOut,
          price: totalPrice,
          totalPrice,
          roomPrice: price,
          mealPlan,
          guestsCount,
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
        phone: guestPhone,
        dni,
        guestDni: dni,
        email,
        guestEmail: email,
        address,
        guestAddress: address,
        checkIn,
        checkOut,
        price: totalPrice,
        totalPrice,
        roomPrice: price,
        mealPlan,
        guestsCount,
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
  },

  submitModalForm() {
    const form = document.getElementById('form-cal-booking');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  },

  copyConfirmationMail(bookingId) {
    let bookingData = null;
    let targetBtn = null;

    if (bookingId) {
      const bookings = (window.Store && Store.get('bookings')) || [];
      bookingData = bookings.find(item => item.id === bookingId);
      targetBtn = document.getElementById(`cal-btn-copy-mail-${bookingId}`) || (window.event && window.event.currentTarget);
    } else {
      targetBtn = document.getElementById('cal-btn-copy-mail');
      const guestName = (document.getElementById('cal-modal-guest') || {}).value || '';
      const room = (document.getElementById('cal-modal-room') || {}).value || '101';
      const checkIn = (document.getElementById('cal-modal-checkin') || {}).value || '';
      const checkOut = (document.getElementById('cal-modal-checkout') || {}).value || '';
      const mealPlan = (document.getElementById('cal-modal-mealplan') || {}).value || 'NE';
      const guestsCount = parseInt((document.getElementById('cal-modal-guests') || {}).value, 10) || 2;
      const dni = (document.getElementById('cal-modal-dni') || {}).value || '';
      const phone = (document.getElementById('cal-modal-phone') || {}).value || '';
      const email = (document.getElementById('cal-modal-email') || {}).value || '';
      const address = (document.getElementById('cal-modal-address') || {}).value || '';
      const notes = (document.getElementById('cal-modal-notes') || {}).value || '';
      const totalPrice = this.currentCalculatedTotal || parseFloat((document.getElementById('cal-modal-price') || {}).value) || 89;

      bookingData = {
        guestName: guestName.trim() || 'Hoste',
        room,
        checkIn,
        checkOut,
        mealPlan,
        guestsCount,
        dni: dni.trim(),
        phone: phone.trim(),
        guestPhone: phone.trim(),
        email: email.trim(),
        guestEmail: email.trim(),
        address: address.trim(),
        notes: notes.trim(),
        totalPrice
      };
    }

    if (!bookingData) return;

    const guest = bookingData.guestName || 'Hoste';
    const room = bookingData.room || '101';
    const checkIn = bookingData.checkIn || '';
    const checkOut = bookingData.checkOut || '';
    const guests = bookingData.guestsCount || 2;
    const mealPlanText = bookingData.mealPlan === 'AD' ? 'AD (Allotjament i Desdejuni / Amb esmorzar)' : 'NE (Sense esmorzar)';
    const total = bookingData.totalPrice ? `${parseFloat(bookingData.totalPrice).toFixed(2)} €` : (bookingData.price ? `${bookingData.price} €` : '');
    const dni = bookingData.dni || bookingData.guestDni || '';
    const phone = bookingData.guestPhone || bookingData.phone || '';
    const email = bookingData.guestEmail || bookingData.email || '';
    const address = bookingData.guestAddress || bookingData.address || '';

    const text = `CONFIRMACIÓ DE RESERVA — HOSTAL SOMNIS

Benvolgut/da ${guest},

Us confirmem la vostra reserva a Hostal Somnis (Súria) amb els següents detalls:

• Hoste: ${guest}
${dni ? `• DNI / Passaport: ${dni}\n` : ''}${phone ? `• Telèfon: ${phone}\n` : ''}${email ? `• Correu electrònic: ${email}\n` : ''}${address ? `• Adreça: ${address}\n` : ''}• Habitació: Habitació ${room}
• Data d'arribada (Check-in): ${checkIn} (a partir de les 13:00h)
• Data de sortida (Check-out): ${checkOut} (fins a les 11:30h)
• Nombre de persones: ${guests} ${guests === 1 ? 'persona' : 'persones'}
• Règim: ${mealPlanText}
• Preu Total Estada: ${total} (taxa turística de 0,99€ per persona i nit inclosa)

El dia d'arribada disposareu de les indicacions i codis d'accés autònom per entrar còmodament i sense presses a l'hora que us convingui. Per a qualsevol consulta podeu contactar amb nosaltres directament.

Moltes gràcies per la vostra confiança!

Cordialment,
Hostal Somnis
C/ Major, 47 — Súria (Barcelona)
Tel. 659 900 549
www.hostalsomnis.com`;

    const handleSuccess = () => {
      if (targetBtn) {
        const origHtml = targetBtn.innerHTML;
        const origColor = targetBtn.style.color;
        const origBg = targetBtn.style.background;
        const origBorder = targetBtn.style.borderColor;

        targetBtn.innerHTML = '✓ Mail copiat al porta-retalls!';
        targetBtn.style.color = '#059669';
        targetBtn.style.background = '#ECFDF5';
        targetBtn.style.borderColor = '#10B981';

        setTimeout(() => {
          targetBtn.innerHTML = origHtml;
          targetBtn.style.color = origColor;
          targetBtn.style.background = origBg;
          targetBtn.style.borderColor = origBorder;
        }, 3000);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(handleSuccess).catch(err => {
        console.warn('Fallback porta-retalls:', err);
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch(e){}
        document.body.removeChild(ta);
        handleSuccess();
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch(e){}
      document.body.removeChild(ta);
      handleSuccess();
    }
  },

  copyModalConfirmationMail(btnEl) {
    this.copyConfirmationMail();
  }
};

window.CalendarModule = CalendarModule;
