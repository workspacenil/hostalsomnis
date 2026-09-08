/**
 * MÓDULO DE MAILS CON ASISTENTE IA (GOOGLE GEMINI)
 * - Generador de respuestas con IA a partir de correos recibidos
 * - Base de datos de entrenamiento (Pares: Correo recibido + Respuesta de mi madre)
 * - Conexión directa y segura con Google Gemini API
 */

const MailsModule = {
  currentEditId: null,

  init() {
    this.render();
    this.setupListeners();
  },

  render() {
    this.renderApiKeyStatus();
    this.renderTrainingList();
  },

  setupListeners() {
    const searchInput = document.getElementById('mail-train-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.renderTrainingList());
    }
  },

  // =========================================================================
  // GESTIÓN DE GOOGLE GEMINI API KEY
  // =========================================================================
  getConfig() {
    return Store.get('gemini_config', {
      apiKey: '',
      model: 'gemini-2.5-flash',
      customTone: 'Responde siempre con el tono amable, cercano, educado y hospitalario de mi madre para Hostal Somnis en Súria. Sé clara, servicial y transmite calidez familiar.'
    });
  },

  renderApiKeyStatus() {
    const config = this.getConfig();
    const statusBadge = document.getElementById('mail-api-status-badge');
    const apiKeyInput = document.getElementById('mail-api-key-input');
    const customToneInput = document.getElementById('mail-custom-tone-input');

    if (apiKeyInput) {
      apiKeyInput.value = config.apiKey || '';
    }
    if (customToneInput) {
      customToneInput.value = config.customTone || '';
    }

    if (statusBadge) {
      if (config.apiKey && config.apiKey.trim().length > 10) {
        statusBadge.innerHTML = `
          <span style="display: inline-flex; align-items: center; gap: 5px; color: var(--success); font-size: 12px; font-weight: 600;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Google Gemini API Conectada
          </span>`;
      } else {
        statusBadge.innerHTML = `
          <span style="display: inline-flex; align-items: center; gap: 5px; color: #D97706; font-size: 12px; font-weight: 500;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            API Key pendiente de configurar
          </span>`;
      }
    }
  },

  toggleConfigDrawer() {
    const drawer = document.getElementById('mail-config-drawer');
    if (drawer) {
      drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
    }
  },

  saveConfig(e) {
    if (e) e.preventDefault();
    const keyInput = document.getElementById('mail-api-key-input');
    const toneInput = document.getElementById('mail-custom-tone-input');
    const current = this.getConfig();

    current.apiKey = keyInput ? keyInput.value.trim() : '';
    if (toneInput) current.customTone = toneInput.value.trim();

    Store.set('gemini_config', current);
    this.renderApiKeyStatus();
    alert('Configuración de Google Gemini guardada correctamente.');
    this.toggleConfigDrawer();
  },

  async testConnection() {
    const keyInput = document.getElementById('mail-api-key-input');
    const apiKey = keyInput ? keyInput.value.trim() : this.getConfig().apiKey;
    const testBtn = document.getElementById('btn-test-api');

    if (!apiKey) {
      alert('Por favor, introduce primero tu API Key de Google Gemini.');
      return;
    }

    if (testBtn) {
      testBtn.disabled = true;
      testBtn.textContent = 'Verificando con Google...';
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hola, responde exactamente "OK".' }] }]
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Error HTTP ${res.status}`);
      }

      alert('¡Conexión exitosa con Google Gemini! Tu API Key funciona a la perfección.');
      // Auto-guardar la clave si funcionó
      const current = this.getConfig();
      current.apiKey = apiKey;
      Store.set('gemini_config', current);
      this.renderApiKeyStatus();
    } catch (err) {
      alert(`Error al conectar con Google Gemini:\n${err.message}\n\nAsegúrate de que la API Key es correcta.`);
    } finally {
      if (testBtn) {
        testBtn.disabled = false;
        testBtn.textContent = 'Verificar Conexión';
      }
    }
  },

  // =========================================================================
  // GENERACIÓN DE RESPUESTAS CON IA (GOOGLE GEMINI)
  // =========================================================================
  async generateResponse() {
    const config = this.getConfig();
    const apiKey = config.apiKey ? config.apiKey.trim() : '';

    if (!apiKey) {
      alert('Para usar la IA necesitas configurar tu API Key de Google.\n\nPuedes introducirla en "Configuración API Key" pulsando el botón correspondiente.');
      this.toggleConfigDrawer();
      const input = document.getElementById('mail-api-key-input');
      if (input) input.focus();
      return;
    }

    const incomingMail = document.getElementById('mail-incoming-text').value.trim();
    if (!incomingMail) {
      alert('Por favor, pega el correo o mensaje del cliente que deseas responder.');
      document.getElementById('mail-incoming-text').focus();
      return;
    }

    const lang = document.getElementById('mail-reply-lang').value;
    const notes = document.getElementById('mail-additional-notes').value.trim();

    const generateBtn = document.getElementById('btn-generate-mail');
    const loadingState = document.getElementById('mail-generating-loading');
    const resultBox = document.getElementById('mail-result-box');
    const resultText = document.getElementById('mail-generated-result');

    if (generateBtn) generateBtn.disabled = true;
    if (loadingState) loadingState.style.display = 'flex';
    if (resultBox) resultBox.style.display = 'none';

    try {
      const trainings = Store.get('mail_trainings', []);
      const systemPrompt = this.buildSystemPrompt(trainings, config.customTone);
      const userMessage = this.buildUserMessage(incomingMail, lang, notes);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: userMessage }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature: 0.35,
            topP: 0.95
          }
        })
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error?.message || `Error del servidor de Google (${response.status})`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('Google no devolvió ningún texto.');
      }

      if (resultText) {
        resultText.value = generatedText.trim();
      }
      if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch (err) {
      console.error('Error generando respuesta:', err);
      alert(`No se pudo generar la respuesta con IA:\n${err.message}`);
    } finally {
      if (generateBtn) generateBtn.disabled = false;
      if (loadingState) loadingState.style.display = 'none';
    }
  },

  buildSystemPrompt(trainings, customTone) {
    let prompt = `Eres el asistente oficial de atención al cliente y redacción de correos para "Hostal Somnis", situado en Súria (Barcelona, comarca del Bages).
Tu misión es redactar la respuesta perfecta a cualquier correo o mensaje de un huésped o cliente, imitando exactamente la personalidad, el tono, la cercanía, la calidez y las expresiones de la dueña del hostal (la madre del usuario).

CARACTERÍSTICAS DEL TONO:
- Tono familiar, muy amable, educado, hospitalario, cercano y resolutivo.
- Da la bienvenida con calidez y despídete deseando un buen viaje o estancia.
- Transmite tranquilidad y confianza ante cualquier duda del cliente.
- ${customTone || ''}

INFORMACIÓN CLAVE DE HOSTAL SOMNIS (SÚRIA):
- Ubicación: Súria (Barcelona).
- Sistema de acceso: Entrada autónoma y flexible con cerradura de teclado numérico en la puerta principal y cajitas de llaves con código, sin límite de hora de llegada tras recibir los códigos.
- Desayuno (Esmorzar): Servicio disponible con opción de contratarlo (habitualmente de 08:00 a 10:00).
- Aparcamiento: Hay aparcamiento público gratuito y muy tranquilo justo delante y en las calles alrededor.
- Limpieza: Servicio disponible y sistema de cartel verde en la puerta.

REGLA DE ORO DE APRENDIZAJE:
A continuación tienes ejemplos reales de correos recibidos y las respuestas exactas que redactó la madre. DEBES aprender de estos ejemplos para usar el mismo vocabulario, cortesía y estructura:

`;

    if (trainings && trainings.length > 0) {
      trainings.forEach((item, index) => {
        prompt += `\n--- EJEMPLO DE ENTRENAMIENTO #${index + 1} (${item.title || 'Consulta'}) ---
[Correo del cliente]:
${item.incoming}

[Respuesta de la madre]:
${item.reply}
----------------------------------------\n`;
      });
    } else {
      prompt += `\n(Aún no hay ejemplos adicionales cargados, utiliza el tono amable y las normas de Hostal Somnis).\n`;
    }

    prompt += `\nINSTRUCCIÓN FINAL:
Genera ÚNICAMENTE el texto del correo de respuesta listo para enviar, sin preámbulos tipo "Aquí tienes la respuesta" ni comentarios meta. El texto debe empezar directamente con el saludo (ej: "Hola [Nombre]!", "Benvolgut/da...", etc.) y terminar con la firma correspondiente.`;

    return prompt;
  },

  buildUserMessage(incomingMail, lang, notes) {
    let msg = `Por favor redacta la respuesta al siguiente correo de un cliente:\n\n"""\n${incomingMail}\n"""\n`;

    if (lang === 'auto') {
      msg += `\n- Idioma: Responde en el mismo idioma en el que te escribe el cliente (Català, Castellano, English o Français).`;
    } else {
      const langNames = { ca: 'Català', es: 'Castellano (Español)', en: 'English', fr: 'Français' };
      msg += `\n- Idioma obligatorio: Redacta la respuesta en ${langNames[lang] || lang}.`;
    }

    if (notes) {
      msg += `\n- Puntos específicos o instrucciones que debes incluir en la respuesta:\n${notes}`;
    }

    return msg;
  },

  copyGeneratedMail() {
    const textEl = document.getElementById('mail-generated-result');
    if (!textEl || !textEl.value) return;

    navigator.clipboard.writeText(textEl.value).then(() => {
      const btn = document.getElementById('btn-copy-mail');
      if (btn) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ¡Copiado!
        `;
        btn.style.backgroundColor = 'var(--success)';
        btn.style.borderColor = 'var(--success)';
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.style.backgroundColor = '';
          btn.style.borderColor = '';
        }, 2000);
      }
    }).catch(err => {
      console.error('Error al copiar:', err);
      alert('No se pudo copiar automáticamente. Por favor selecciónalo y cópialo manualmente.');
    });
  },

  clearGenerated() {
    const textEl = document.getElementById('mail-generated-result');
    const resultBox = document.getElementById('mail-result-box');
    if (textEl) textEl.value = '';
    if (resultBox) resultBox.style.display = 'none';
  },

  // =========================================================================
  // GESTIÓN DE LA BASE DE DATOS DE ENTRENAMIENTO (CORREOS DE MI MADRE)
  // =========================================================================
  renderTrainingList() {
    const container = document.getElementById('mail-trainings-list');
    const countBadge = document.getElementById('mail-training-count-badge');
    if (!container) return;

    const trainings = Store.get('mail_trainings', []);
    const searchVal = (document.getElementById('mail-train-search')?.value || '').toLowerCase().trim();

    const filtered = trainings.filter(t => {
      if (!searchVal) return true;
      return (
        (t.title && t.title.toLowerCase().includes(searchVal)) ||
        (t.incoming && t.incoming.toLowerCase().includes(searchVal)) ||
        (t.reply && t.reply.toLowerCase().includes(searchVal))
      );
    });

    if (countBadge) {
      countBadge.textContent = `${trainings.length} correo${trainings.length === 1 ? '' : 's'} de ejemplo`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: var(--text-muted); background: var(--bg-element); border-radius: var(--radius-md); border: 1px dashed var(--border-dark);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px; opacity: 0.6;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          <div style="font-weight: 500; margin-bottom: 4px;">No hay correos de entrenamiento ${searchVal ? 'que coincidan' : ''}</div>
          <div style="font-size: 12px;">Añade los correos que le enviaron a tu madre y sus respuestas para que la IA aprenda su estilo.</div>
        </div>`;
      return;
    }

    let html = '';
    filtered.forEach(item => {
      const escape = (str) => (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html += `
        <div class="train-item-card" id="train-card-${item.id}" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); background: #FFF; margin-bottom: 12px; transition: box-shadow 0.2s;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--bg-sidebar); border-bottom: 1px solid var(--border-color); border-top-left-radius: var(--radius-md); border-top-right-radius: var(--radius-md); cursor: pointer;" onclick="MailsModule.toggleTrainingItem('${item.id}')">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: var(--text-main);"></span>
              <strong style="font-size: 13px; color: var(--text-main);">${escape(item.title || 'Ejemplo de correo')}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;" onclick="event.stopPropagation()">
              <button type="button" class="btn btn-outline" style="padding: 3px 8px; font-size: 11px;" onclick="MailsModule.editTrainingItem('${item.id}')" title="Editar">
                Editar
              </button>
              <button type="button" class="btn btn-outline" style="padding: 3px 8px; font-size: 11px; color: var(--danger); border-color: #FECACA;" onclick="MailsModule.deleteTrainingItem('${item.id}')" title="Eliminar">
                Eliminar
              </button>
            </div>
          </div>
          <div id="train-body-${item.id}" style="padding: 14px 16px; font-size: 13px; display: block;">
            <div style="margin-bottom: 10px;">
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 3px;">📩 Correo recibido del cliente:</span>
              <div style="padding: 8px 12px; background: var(--bg-element); border-radius: var(--radius-sm); color: #374151; white-space: pre-wrap; font-size: 12.5px;">${escape(item.incoming)}</div>
            </div>
            <div>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-main); display: block; margin-bottom: 3px;">💬 Respuesta redactada por mi madre:</span>
              <div style="padding: 8px 12px; background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: var(--radius-sm); color: #166534; white-space: pre-wrap; font-size: 12.5px;">${escape(item.reply)}</div>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  toggleTrainingItem(id) {
    const body = document.getElementById(`train-body-${id}`);
    if (body) {
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    }
  },

  openAddModal() {
    this.currentEditId = null;
    document.getElementById('train-form-title').value = '';
    document.getElementById('train-form-incoming').value = '';
    document.getElementById('train-form-reply').value = '';
    document.getElementById('modal-train-header-text').textContent = 'Añadir Correo y Respuesta de mi Madre';
    document.getElementById('modal-train-item').style.display = 'flex';
  },

  editTrainingItem(id) {
    const trainings = Store.get('mail_trainings', []);
    const item = trainings.find(t => t.id === id);
    if (!item) return;

    this.currentEditId = id;
    document.getElementById('train-form-title').value = item.title || '';
    document.getElementById('train-form-incoming').value = item.incoming || '';
    document.getElementById('train-form-reply').value = item.reply || '';
    document.getElementById('modal-train-header-text').textContent = 'Editar Ejemplo de Entrenamiento';
    document.getElementById('modal-train-item').style.display = 'flex';
  },

  closeAddModal() {
    document.getElementById('modal-train-item').style.display = 'none';
    this.currentEditId = null;
  },

  saveTrainingItem(e) {
    if (e) e.preventDefault();
    const title = document.getElementById('train-form-title').value.trim() || 'Consulta de cliente';
    const incoming = document.getElementById('train-form-incoming').value.trim();
    const reply = document.getElementById('train-form-reply').value.trim();

    if (!incoming || !reply) {
      alert('Por favor, completa tanto el correo recibido como la respuesta de tu madre.');
      return;
    }

    const trainings = Store.get('mail_trainings', []);

    if (this.currentEditId) {
      const idx = trainings.findIndex(t => t.id === this.currentEditId);
      if (idx !== -1) {
        trainings[idx].title = title;
        trainings[idx].incoming = incoming;
        trainings[idx].reply = reply;
      }
    } else {
      trainings.unshift({
        id: 'train-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        title,
        incoming,
        reply
      });
    }

    Store.set('mail_trainings', trainings);
    this.closeAddModal();
    this.renderTrainingList();
  },

  deleteTrainingItem(id) {
    if (!confirm('¿Seguro que deseas eliminar este ejemplo de entrenamiento?')) return;
    const trainings = Store.get('mail_trainings', []);
    const filtered = trainings.filter(t => t.id !== id);
    Store.set('mail_trainings', filtered);
    this.renderTrainingList();
  },

  // =========================================================================
  // IMPORTACIÓN MASIVA / EN BLOQUE
  // =========================================================================
  openBulkImportModal() {
    document.getElementById('modal-bulk-import').style.display = 'flex';
  },

  closeBulkImportModal() {
    document.getElementById('modal-bulk-import').style.display = 'none';
  },

  processBulkImport() {
    const text = document.getElementById('bulk-import-textarea').value.trim();
    if (!text) {
      alert('Por favor, pega el contenido a importar.');
      return;
    }

    let importedCount = 0;
    const trainings = Store.get('mail_trainings', []);

    // Intentar formato JSON primero
    if (text.startsWith('[') && text.endsWith(']')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          parsed.forEach(p => {
            if (p.incoming && p.reply) {
              trainings.unshift({
                id: 'train-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                title: p.title || 'Ejemplo importado',
                incoming: p.incoming,
                reply: p.reply
              });
              importedCount++;
            }
          });
        }
      } catch (e) {
        console.log('No es JSON válido, procesando como texto con separadores...');
      }
    }

    // Si no fue JSON, procesar como texto plano con separadores
    if (importedCount === 0) {
      // Bloques separados por separadores o CORREO: / RESPUESTA:
      const blocks = text.split(/(?:={3,}|-{3,}|\n\n(?=CORREO|CLIENTE|PREGUNTA|EMAIL))/i);
      
      blocks.forEach(block => {
        const clean = block.trim();
        if (!clean) return;

        let incoming = '';
        let reply = '';
        let title = '';

        const replyMatch = clean.match(/(?:RESPUESTA|RESPUESTA MADRE|MADRE|CONTESTACION)[:\s]+([\s\S]+)$/i);
        if (replyMatch) {
          reply = replyMatch[1].trim();
          const beforeReply = clean.substring(0, replyMatch.index).trim();
          const incomingMatch = beforeReply.match(/(?:CORREO|CLIENTE|PREGUNTA|MENSAJE)[:\s]+([\s\S]+)$/i);
          if (incomingMatch) {
            incoming = incomingMatch[1].trim();
            title = beforeReply.substring(0, incomingMatch.index).replace(/^[#\-\s*]+/, '').trim();
          } else {
            incoming = beforeReply;
          }
        }

        if (incoming && reply) {
          trainings.unshift({
            id: 'train-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            title: title || incoming.slice(0, 40) + '...',
            incoming,
            reply
          });
          importedCount++;
        }
      });
    }

    if (importedCount > 0) {
      Store.set('mail_trainings', trainings);
      alert(`¡Se han importado ${importedCount} correos de entrenamiento con éxito!`);
      document.getElementById('bulk-import-textarea').value = '';
      this.closeBulkImportModal();
      this.renderTrainingList();
    } else {
      alert('No se pudieron detectar pares de [Correo] y [Respuesta].\n\nAsegúrate de usar el formato con "CORREO:" y "RESPUESTA:".');
    }
  },

  exportToJson() {
    const trainings = Store.get('mail_trainings', []);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trainings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `hostal_somnis_correos_entrenamiento_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
};

window.MailsModule = MailsModule;
