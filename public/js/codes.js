/**
 * MÓDULO DE CÒDIGS (CHECK-IN) - HOSTAL SOMNIS
 */

const CodesModule = {
  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    const numericInputs = [
      { id: 'codigos-porta', max: 6 },
      { id: 'codigos-caixa-codi', max: 4 }
    ];

    numericInputs.forEach(({ id, max }) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          // Solo números y limitar longitud máxima
          e.target.value = e.target.value.replace(/\D/g, '').slice(0, max);
          this.generateText();
        });
      }
    });

    const otherInputs = ['codigos-idioma', 'codigos-caixa-num', 'codigos-limpieza'];
    otherInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.generateText());
        el.addEventListener('change', () => this.generateText());
      }
    });

    const habContainer = document.getElementById('habitaciones-container');
    if (habContainer) {
      habContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('habitacion-select')) {
          this.generateText();
        }
      });
    }
  },

  addRoom() {
    const container = document.getElementById('habitaciones-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'habitacion-row';
    row.style.cssText = 'display: flex; gap: 8px; align-items: center;';
    row.innerHTML = `
      <select class="form-select habitacion-select" style="flex: 1;">
        <option value="101">Habitació 101</option>
        <option value="102">Habitació 102</option>
        <option value="201" selected>Habitació 201</option>
        <option value="202">Habitació 202</option>
        <option value="301">Habitació 301</option>
        <option value="302">Habitació 302</option>
      </select>
      <button type="button" class="btn" style="color: var(--danger); border: 1px solid var(--border-color); padding: 6px 12px; font-weight: bold; border-radius: 4px;" title="Eliminar habitació" onclick="this.parentElement.remove(); CodesModule.generateText();">✕</button>
    `;

    container.appendChild(row);
    this.generateText();
  },

  render() {
    this.generateText();
  },

  getFloorText(lang, floorNum) {
    const floors = {
      ca: { '1': '1a planta', '2': '2a planta', '3': '3a planta' },
      es: { '1': '1a planta', '2': '2a planta', '3': '3a planta' },
      en: { '1': '1st floor', '2': '2nd floor', '3': '3rd floor' },
      fr: { '1': 'Etage 1', '2': 'Etage 2', '3': 'Etage 3' }
    };
    return floors[lang][floorNum] || '';
  },
  
  getCleaningText(lang) {
    const texts = {
      ca: '\n\nIMPORTANT: Si cal que netegin l\'habitació, penjar el cartell verd.',
      es: '\n\nIMPORTANTE: Si desean la limpieza de la habitación, colgar el cartel verde.',
      en: '\n\nIf you would like your room to be cleaned, please hang the green sign.',
      fr: '\n\nIMPORTANT : Si vous souhaitez que la chambre soit nettoyée, veuillez accrocher l\'écriteau vert.'
    };
    return texts[lang] || '';
  },

  getBreakfastText(lang, tipo, inicio, fin) {
    if (tipo === 'ofrecer') {
      const drafts = {
        ca: `\n\n[OFRECER ESMORZAR: De ${inicio} a ${fin}] Pendent de text...`,
        es: `\n\n[OFRECER DESAYUNO: De ${inicio} a ${fin}] Pendiente de texto...`,
        en: `\n\n[OFFER BREAKFAST: From ${inicio} to ${fin}] Pending text...`,
        fr: `\n\n[PROPOSER PETIT-DÉJ: De ${inicio} à ${fin}] Texte en attente...`
      };
      return drafts[lang] || drafts['ca'];
    } else {
      const drafts = {
        ca: `\n\n[RECORDAR ESMORZAR INCLÒS: De ${inicio} a ${fin}] Pendent de text...`,
        es: `\n\n[RECORDAR DESAYUNO INCLUIDO: De ${inicio} a ${fin}] Pendiente de texto...`,
        en: `\n\n[REMIND INCLUDED BREAKFAST: From ${inicio} to ${fin}] Pending text...`,
        fr: `\n\n[RAPPELER PETIT-DÉJ INCLUS: De ${inicio} à ${fin}] Texte en attente...`
      };
      return drafts[lang] || drafts['ca'];
    }
  },

  generateText() {
    const lang = document.getElementById('codigos-idioma').value || 'ca';
    const porta = document.getElementById('codigos-porta').value || '______';
    const caixaNum = document.getElementById('codigos-caixa-num').value || '1';
    const caixaCodi = document.getElementById('codigos-caixa-codi').value || '____';
    
    // Obtener todas las habitaciones seleccionadas
    const habitacionSelects = document.querySelectorAll('.habitacion-select');
    const rooms = [];
    habitacionSelects.forEach(sel => {
      if (sel.value) {
        rooms.push({
          num: sel.value,
          planta: sel.value.charAt(0)
        });
      }
    });

    if (rooms.length === 0) {
      rooms.push({ num: '101', planta: '1' });
    }

    let roomsText = '';
    if (lang === 'ca') {
      roomsText = rooms.map(r => `HABITACIÓ ${r.num}  (${this.getFloorText(lang, r.planta)})`).join('\n');
    } else if (lang === 'es') {
      roomsText = rooms.map(r => `Habitación ${r.num}  (${this.getFloorText(lang, r.planta)})`).join('\n');
    } else if (lang === 'en') {
      roomsText = rooms.map(r => `Room: ${r.num}  (${this.getFloorText(lang, r.planta)})`).join('\n');
    } else if (lang === 'fr') {
      roomsText = rooms.map(r => `Chambre : ${r.num}  (${this.getFloorText(lang, r.planta)})`).join('\n');
    }

    const incloureNeteja = document.getElementById('codigos-limpieza').checked;
    const cleaningText = incloureNeteja ? this.getCleaningText(lang) : '';

    const elEsmorzar = document.getElementById('codigos-esmorzar');
    let breakfastText = '';
    if (elEsmorzar && elEsmorzar.checked) {
      const tipo = document.getElementById('esmorzar-ofrecer').checked ? 'ofrecer' : 'recordar';
      const inicio = document.getElementById('esmorzar-inicio').value;
      const fin = document.getElementById('esmorzar-fin').value;
      breakfastText = this.getBreakfastText(lang, tipo, inicio, fin);
    }

    let text = '';

    if (lang === 'ca') {
      text = `Per accedir, cal marcar al teclat lateral de la porta d’entrada:

el codi  ${porta}   i ✅

La targeta/clau de l’habitació és a les caixes que hi ha darrere de la porta.

Codi per obrir la caixa:

Caixa ${caixaNum}
Codi:  ${caixaCodi} A i girar la rodeta.
${roomsText}

Ara amb la targeta podeu obrir totes dues portes, passeu-la pel lector. Ja no necessiteu el codi.${cleaningText}${breakfastText}

Hora de check-out: 11:30 AM
Podeu tornar la targeta a la mateixa caixa de recollida si la recepció està tancada.

Gràcies 
Hostal Somnis`;
    } else if (lang === 'es') {
      text = `Para acceder se tiene que marcar en el teclado lateral de la puerta de entrada:

código     ${porta}  y ✅

La tarjeta / llave de la habitación está en las cajas de detrás de la puerta.

El código para abrir la caja:

Caja  ${caixaNum}
Código:  ${caixaCodi} A y girar ruedecilla.
${roomsText}

Ahora con la tarjeta puede abrir ambas puertas, pásela por el teclado. Ya no necesita el código.${cleaningText}${breakfastText}

*Hora Check out:   11:30 AM *
Si la recepción estuviera cerrada, pueden dejar la tarjeta en la misma caja de recogida.

Gracias 
HOSTAL SOMNIS`;
    } else if (lang === 'en') {
      text = `To access, please use the side keypad by the main entrance door and enter the code: 

${porta}   and ✅

The keycard for the room is in the boxes behind the door.

Code to open the box:

Box ${caixaNum}
Code:  ${caixaCodi} A and turn the wheel.
${roomsText}

Now with the keycard you can open both doors, just tap it on the keypad. You will no longer need the code.${cleaningText}${breakfastText}

Check-out time: 11:30 AM

If reception is closed, you can return your keycard to the same box.

Thank you
Hostal Somnis`;
    } else if (lang === 'fr') {
      text = `Pour entrer, il faut composer sur le clavier situé à côté de la porte principale Code : 

${porta}   et ✅

La carte de la chambre se trouve dans les boîtes derrière la porte principale.

Boîte ${caixaNum}
Code :  ${caixaCodi} A puis tourner la molette
${roomsText}

Vous pouvez désormais ouvrir les deux portes avec la carte, il suffit de la passer sur le lecteur. Vous n'avez plus besoin du code.${cleaningText}${breakfastText}

Heure de check-out : 11:30 AM

En partant, si la réception est fermée, vous pouvez laisser la carte dans la même boîte de dépôt.

Merci
Hostal Somnis`;
    }

    const container = document.getElementById('codigos-resultado');
    if (container) {
      container.innerText = text;
      this.currentText = text; // Guardar en memoria para copiar más fácil
    }
  },

  async copyText() {
    if (!this.currentText) return;

    try {
      await navigator.clipboard.writeText(this.currentText);
      alert('¡Mensaje copiado al portapapeles!');
    } catch (err) {
      // Fallback manual si falla la API del portapapeles
      const tempTextArea = document.createElement("textarea");
      tempTextArea.value = this.currentText;
      document.body.appendChild(tempTextArea);
      tempTextArea.select();
      document.execCommand("copy");
      document.body.removeChild(tempTextArea);
      alert('¡Mensaje copiado al portapapeles!');
    }
  }
};

window.CodesModule = CodesModule;
