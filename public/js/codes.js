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
      en: '\n\nIMPORTANT: If you want your room to be cleaned, please hang the green sign.',
      fr: '\n\nIMPORTANT : Si vous souhaitez que la chambre soit nettoyée, veuillez accrocher l\'écriteau vert.'
    };
    return texts[lang] || '';
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
    let text = '';

    if (lang === 'ca') {
      text = `Per accedir, cal marcar al teclat lateral de la porta d'entrada al codi:

         ${porta}   i   ✅

La targeta/clau de l'habitació és a les caixes que hi ha darrere de la porta.

Codi per obrir la caixa:

Caixa ${caixaNum}
Codi:  ${caixaCodi} A i girar la rodeta.
${roomsText}

Aquesta targeta obre la porta d'entrada col·locant-la sobre el teclat (ja no caldrà marcar el codi) i també obre l'habitació.${cleaningText}

Hora de check-out: 11:30 h
Podeu tornar la targeta a la mateixa caixa de recollida si la recepció està tancada.

Gràcies 
Hostal Somnis`;
    } else if (lang === 'es') {
      text = `Para acceder se tiene que marcar en el teclado lateral de la puerta de entrada el código:

         ${porta}   y   ✅

La tarjeta / llave de la habitación está en las cajas de detrás de la puerta.

El código para abrir la caja:

Caja ${caixaNum}
Código:  ${caixaCodi} A y girar ruedecilla.
${roomsText}

Esta tarjeta abre la puerta de entrada poniéndola sobre el teclado (ya no hará falta marcar el código) y también abre la habitación.${cleaningText}

Hora Check out: 11:30h
Si la recepción estuviera cerrada, pueden dejar la tarjeta en la misma caja de recogida.

Gracias 
HOSTAL SOMNIS`;
    } else if (lang === 'en') {
      text = `To access, please enter on the side keypad by the main entrance door the code:

         ${porta}   and   ✅

The card/key of the room is in the boxes behind the door.

The code to open the box:

Box ${caixaNum}
Code:  ${caixaCodi} A and turn the wheel.
${roomsText}

This card opens the front door by placing it on the keyboard and also opens the room. With the key card, you won't need to enter the code anymore.${cleaningText}

Check out: 11:30h
The room key card can be left in the same box where it was collected.`;
    } else if (lang === 'fr') {
      text = `Pour entrer, il faut composer sur le clavier situé à côté de la porte principale le code :

         ${porta}   et   ✅

La carte de la chambre se trouve dans les boîtes derrière la porte principale.

Boîte ${caixaNum}
Code :  ${caixaCodi} A puis tourner la molette
${roomsText}

Cette carte ouvre la porte principale en la posant sur le clavier, ainsi que la chambre. Il ne sera plus nécessaire de taper le code.${cleaningText}

Heure de check-out : 11h30
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
