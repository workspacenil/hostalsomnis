/**
 * MÓDULO DE MAILS CON ASISTENTE IA (GOOGLE GEMINI)
 * - Generador de respuestas con IA para Hostal Somnis
 * - Correos de entrenamiento de la madre integrados fijos en el código (protegidos contra modificaciones accidentales)
 * - Configuración modificable de la Google API Key desde la UI
 */

// =========================================================================
// BASE DE ENTRENAMIENTO INTEGRADA (CORREOS Y RESPUESTAS DE TU MADRE)
// Estos correos están integrados en la aplicación para que la IA aprenda su tono y no se puedan borrar ni tocar desde la app.
// =========================================================================
const MOTHER_TRAINING_MAILS = [
  {
    tema: 'Aparcamiento y cuna para bebé',
    correo_recibido: 'Hola, tenemos una reserva para este fin de semana. ¿Hay sitio para aparcar el coche cerca? Y querríamos saber si tenéis cuna para nuestro bebé de 8 meses.',
    respuesta_madre: 'Hola! Encantada de saludarte. Sí, justo delante del hostal y en las calles contiguas hay aparcamiento público gratuito y muy tranquilo donde siempre se encuentra sitio fácilmente. En cuanto a la cuna, sí que tenemos cuna de viaje disponible y os la podemos dejar montada y lista en la habitación sin ningún suplemento. Avisadnos si necesitáis cualquier otra cosita. ¡Hasta pronto!'
  },
  {
    tema: 'Llegada tarde por la noche (check-in tardío)',
    correo_recibido: 'Hola, llegaremos tarde el viernes, probablemente hacia las 23:30h. ¿Habrá problema para hacer el check-in a esa hora?',
    respuesta_madre: 'Hola! No hay ningún problema. Nuestro sistema de entrada es totalmente autónomo mediante códigos de seguridad para la puerta y la cajita de llaves. El mismo día de vuestra llegada os mandamos las instrucciones detalladas para que podáis entrar tranquilamente a la hora que lleguéis sin prisas. ¡Buen viaje!'
  },
  {
    tema: 'Desayuno y horarios',
    correo_recibido: 'Buenos días, nos gustaría saber si el desayuno está incluido o cómo funciona, y los horarios que tenéis.',
    respuesta_madre: 'Hola! El desayuno es tipo buffet continental con embutidos de la zona, tostadas, bollería, café y zumo, y se sirve habitualmente de 08:00 a 10:00. Si no lo teníais contratado en la reserva, podéis contratarlo a la llegada por 13€ por persona. ¡Cualquier duda nos decís!'
  }
];

const MailsModule = {
  activeBooking: null,
  currentLang: 'ca',

  init() {
    this.render();
  },

  render() {
    this.renderApiKeyStatus();
    this.renderOutlookStatus();
  },

  // =========================================================================
  // GESTIÓN DE API KEYS (MULTI-IA: GEMINI, GROQ, OPENROUTER, MISTRAL)
  // =========================================================================
  getConfig() {
    let config = Store.get('ai_keys_config');
    if (!config) {
      // Migrar de la configuración previa si existía
      const oldGemini = Store.get('gemini_config', {});
      config = {
        geminiKeys: oldGemini.apiKey ? [oldGemini.apiKey] : [],
        groqKey: '',
        openRouterKey: '',
        mistralKey: '',
        customTone: oldGemini.customTone || 'Responde siempre con el tono familiar, cercano, muy educado y hospitalario de mi madre para Hostal Somnis en Súria. Sé clara, amable y resolutiva.'
      };
      Store.set('ai_keys_config', config);
    }
    return config;
  },

  renderApiKeyStatus() {
    const config = this.getConfig();
    const statusBadge = document.getElementById('mail-api-status-badge');
    const geminiTextarea = document.getElementById('mail-gemini-keys-input');
    const groqInput = document.getElementById('mail-groq-key-input');
    const openRouterInput = document.getElementById('mail-openrouter-key-input');
    const mistralInput = document.getElementById('mail-mistral-key-input');
    const customToneInput = document.getElementById('mail-custom-tone-input');

    if (geminiTextarea) {
      geminiTextarea.value = (config.geminiKeys || []).join('\n');
    }
    if (groqInput) groqInput.value = config.groqKey || '';
    if (openRouterInput) openRouterInput.value = config.openRouterKey || '';
    if (mistralInput) mistralInput.value = config.mistralKey || '';
    if (customToneInput) customToneInput.value = config.customTone || '';

    // Contar total de claves disponibles
    const geminiCount = (config.geminiKeys || []).filter(k => k.trim().length > 10).length;
    const groqCount = config.groqKey && config.groqKey.trim().length > 10 ? 1 : 0;
    const openRouterCount = config.openRouterKey && config.openRouterKey.trim().length > 10 ? 1 : 0;
    const mistralCount = config.mistralKey && config.mistralKey.trim().length > 10 ? 1 : 0;
    const totalCount = geminiCount + groqCount + openRouterCount + mistralCount;

    if (statusBadge) {
      if (totalCount > 0) {
        statusBadge.innerHTML = `
          <span style="display: inline-flex; align-items: center; gap: 6px; color: var(--success); font-size: 12px; font-weight: 600; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 4px 10px; border-radius: 16px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ${totalCount} IA${totalCount === 1 ? '' : 's'} / Clave${totalCount === 1 ? '' : 's'} lista${totalCount === 1 ? '' : 's'} (Fallback activo)
          </span>`;
      } else {
        statusBadge.innerHTML = `
          <span style="display: inline-flex; align-items: center; gap: 5px; color: #D97706; font-size: 12px; font-weight: 500; background: #FFFBEB; border: 1px solid #FDE68A; padding: 4px 10px; border-radius: 16px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            Configurar API Keys
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
    const geminiTextarea = document.getElementById('mail-gemini-keys-input');
    const groqInput = document.getElementById('mail-groq-key-input');
    const openRouterInput = document.getElementById('mail-openrouter-key-input');
    const mistralInput = document.getElementById('mail-mistral-key-input');
    const customToneInput = document.getElementById('mail-custom-tone-input');

    const geminiRaw = geminiTextarea ? geminiTextarea.value : '';
    const geminiKeys = geminiRaw
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 5);

    const newConfig = {
      geminiKeys: geminiKeys,
      groqKey: groqInput ? groqInput.value.trim() : '',
      openRouterKey: openRouterInput ? openRouterInput.value.trim() : '',
      mistralKey: mistralInput ? mistralInput.value.trim() : '',
      customTone: customToneInput ? customToneInput.value.trim() : ''
    };

    Store.set('ai_keys_config', newConfig);
    this.renderApiKeyStatus();
    alert(`Configuración guardada correctamente con ${geminiKeys.length} clave(s) de Google Gemini y proveedores de respaldo.`);
    this.toggleConfigDrawer();
  },

  // =========================================================================
  // GESTIÓ DEL CORREU OUTLOOK DE LA MARE
  // =========================================================================
  getOutlookConfig() {
    const settings = Store.get('settings', {}) || {};
    return settings.outlook || {
      motherEmail: settings.email || 'info@hostalsomnis.cat',
      provider: 'web'
    };
  },

  saveOutlookConfig(motherEmail, provider) {
    const settings = Store.get('settings', {}) || {};
    settings.outlook = {
      motherEmail: (motherEmail || '').trim(),
      provider: provider || settings.outlook?.provider || 'web'
    };
    Store.set('settings', settings);

    if (window.CloudSync && typeof CloudSync.pushSettings === 'function') {
      CloudSync.pushSettings(settings);
    }
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outlook: settings.outlook })
    }).catch(() => {});

    this.renderOutlookStatus();
  },

  renderOutlookStatus() {
    const config = this.getOutlookConfig();
    const displayEl = document.getElementById('mail-mother-outlook-display');
    const modeSelect = document.getElementById('mail-outlook-mode-select');
    const drawerMotherEmail = document.getElementById('mail-drawer-mother-email');
    const drawerOutlookMode = document.getElementById('mail-drawer-outlook-mode');

    const provider = config.provider || 'thunderbird';

    if (displayEl) {
      displayEl.value = config.motherEmail || 'Sense configurar';
    }
    if (modeSelect) {
      modeSelect.value = provider;
    }
    if (drawerMotherEmail) {
      drawerMotherEmail.value = config.motherEmail || '';
    }
    if (drawerOutlookMode) {
      drawerOutlookMode.value = provider;
    }

    const btnLabel = document.getElementById('btn-open-mail-label');
    if (btnLabel) {
      if (provider === 'thunderbird') {
        btnLabel.textContent = '🦅 Obrir i Enviar a Thunderbird';
      } else if (provider === 'app') {
        btnLabel.textContent = '💻 Obrir i Enviar a la teva App de Correu';
      } else if (provider === 'office365') {
        btnLabel.textContent = '🏢 Obrir i Enviar a Microsoft 365';
      } else {
        btnLabel.textContent = '🚀 Obrir i Enviar a Outlook Web';
      }
    }
  },

  promptEditMotherEmail() {
    const config = this.getOutlookConfig();
    const current = config.motherEmail || 'info@hostalsomnis.cat';
    const email = prompt('Introdueix el correu electrònic de la mare (Outlook / Hotmail):', current);
    if (email !== null) {
      this.saveOutlookConfig(email, config.provider);
      alert(`Correu d'Outlook de la mare guardat: ${email.trim()}`);
    }
  },

  onOutlookModeChange(mode) {
    const config = this.getOutlookConfig();
    this.saveOutlookConfig(config.motherEmail, mode);
  },

  onRecipientChange() {
    const recipientInput = document.getElementById('confirmacio-recipient-email');
    const badge = document.getElementById('mail-recipient-source-badge');
    if (!badge || !recipientInput) return;
    if (recipientInput.value.trim().length > 0) {
      badge.textContent = 'Destinatari llest';
      badge.style.color = 'var(--success)';
    } else {
      badge.textContent = 'Cal introduir correu';
      badge.style.color = '#D97706';
    }
  },

  // =========================================================================
  // CLIENTES DE API INDIVIDUALES (HTTP DIRECTO)
  // =========================================================================
  async callGemini(apiKey, systemPrompt, userMessage) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.35, topP: 0.95 }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${res.status}`;
      throw new Error(`Google Gemini (${res.status}): ${msg}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Google Gemini no devolvió contenido.');
    return text.trim();
  },

  async callGroq(apiKey, systemPrompt, userMessage) {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.35
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${res.status}`;
      throw new Error(`Groq (${res.status}): ${msg}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Groq no devolvió contenido.');
    return text.trim();
  },

  async callOpenRouter(apiKey, systemPrompt, userMessage) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.35
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${res.status}`;
      throw new Error(`OpenRouter (${res.status}): ${msg}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenRouter no devolvió contenido.');
    return text.trim();
  },

  async callMistral(apiKey, systemPrompt, userMessage) {
    const url = 'https://api.mistral.ai/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.35
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${res.status}`;
      throw new Error(`Mistral (${res.status}): ${msg}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Mistral no devolvió contenido.');
    return text.trim();
  },

  // =========================================================================
  // GENERACIÓN CON FALLBACK EN CASCADA INTELIGENTE
  // =========================================================================
  buildQueue(config) {
    const queue = [];

    // 1º Prioridad: Claves de Google Gemini (gemini-2.5-flash)
    if (config.geminiKeys && Array.isArray(config.geminiKeys)) {
      config.geminiKeys.forEach((k, idx) => {
        const cleanKey = k.trim();
        if (cleanKey.length > 8) {
          queue.push({
            name: `Google Gemini (Clave #${idx + 1})`,
            fn: (sys, usr) => this.callGemini(cleanKey, sys, usr)
          });
        }
      });
    }

    // 2º Prioridad: Groq Llama 3.3 70B (ultra rápida)
    if (config.groqKey && config.groqKey.trim().length > 8) {
      queue.push({
        name: 'Groq (Llama 3.3 70B - Ultra Rápida)',
        fn: (sys, usr) => this.callGroq(config.groqKey.trim(), sys, usr)
      });
    }

    // 3º Prioridad: OpenRouter (modelos free)
    if (config.openRouterKey && config.openRouterKey.trim().length > 8) {
      queue.push({
        name: 'OpenRouter (Llama 3.3 Free)',
        fn: (sys, usr) => this.callOpenRouter(config.openRouterKey.trim(), sys, usr)
      });
    }

    // 4º Prioridad: Mistral
    if (config.mistralKey && config.mistralKey.trim().length > 8) {
      queue.push({
        name: 'Mistral AI',
        fn: (sys, usr) => this.callMistral(config.mistralKey.trim(), sys, usr)
      });
    }

    return queue;
  },

  showLoadingMessage(msg, isFallbackWarning = false) {
    const textEl = document.getElementById('mail-loading-status-text');
    const warningBox = document.getElementById('mail-fallback-warning');
    
    if (textEl) textEl.textContent = msg;
    if (warningBox) {
      if (isFallbackWarning) {
        warningBox.innerHTML = `
          <div style="background: #FEF3C7; border: 1px solid #F59E0B; color: #92400E; padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-top: 8px; line-height: 1.4; display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span><strong>Aviso:</strong> ${msg}</span>
          </div>`;
        warningBox.style.display = 'block';
      } else {
        warningBox.style.display = 'none';
      }
    }
  },

  async generateResponse() {
    const config = this.getConfig();
    const queue = this.buildQueue(config);

    if (queue.length === 0) {
      alert('No tienes ninguna API Key configurada.\n\nPulsa en "Configurar API Keys" arriba a la derecha para añadir tus claves gratuitas de Google Gemini o Groq.');
      this.toggleConfigDrawer();
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
    const providerBadge = document.getElementById('mail-provider-used-badge');

    if (generateBtn) generateBtn.disabled = true;
    if (loadingState) loadingState.style.display = 'flex';
    if (resultBox) resultBox.style.display = 'none';

    const systemPrompt = this.buildSystemPrompt(MOTHER_TRAINING_MAILS, config.customTone);
    const userMessage = this.buildUserMessage(incomingMail, lang, notes);

    let successResponse = null;
    let usedProviderName = null;
    const failedErrors = [];

    // Bucle en cascada (fallback)
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];

      if (i > 0) {
        // Informar al usuario de que se agotaron los tokens de la anterior y tardará unos segundos más
        this.showLoadingMessage(
          `La IA anterior agotó su cuota de tokens o no respondió. Cambiando de inteligencia artificial a "${current.name}"... Tardará un poco más en redactar.`,
          true
        );
        // Pequeña pausa para que el navegador renderice la advertencia
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        this.showLoadingMessage(`Conectando con ${current.name} para redactar la respuesta...`, false);
      }

      try {
        console.log(`Intentando generar respuesta con: ${current.name}`);
        successResponse = await current.fn(systemPrompt, userMessage);
        usedProviderName = current.name;
        break; // Éxito! Salir del bucle
      } catch (err) {
        console.warn(`Error con ${current.name}:`, err.message);
        failedErrors.push(`${current.name}: ${err.message}`);
      }
    }

    if (generateBtn) generateBtn.disabled = false;
    if (loadingState) loadingState.style.display = 'none';

    if (successResponse) {
      if (resultText) resultText.value = successResponse;
      if (providerBadge) {
        providerBadge.textContent = `Generado con: ${usedProviderName}`;
      }
      if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      // Si fallaron todas las claves
      const errorDetails = failedErrors.join('\n• ');
      alert(`No se pudo generar la respuesta con ninguna de las IAs configuradas.\n\nDetalles:\n• ${errorDetails}\n\nPor favor revisa tus claves o añade claves adicionales en la configuración.`);
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

BASE DE ENTRENAMIENTO - EJEMPLOS REALES DE MI MADRE:
A continuación tienes los ejemplos oficiales con correos reales recibidos y las respuestas exactas que redactó mi madre. Debes tomar estos ejemplos como guía suprema para tu redacción, vocabulario y tono:

`;

    trainings.forEach((item, index) => {
      prompt += `\n--- EJEMPLO OFICIAL #${index + 1} (${item.tema}) ---
[Correo del cliente]:
${item.correo_recibido}

[Respuesta exacta de mi madre]:
${item.respuesta_madre}
----------------------------------------\n`;
    });

    prompt += `\nINSTRUCCIÓN FINAL:
Genera ÚNICAMENTE el texto del correo de respuesta listo para enviar, sin preámbulos tipo "Aquí tienes la respuesta" ni comentarios meta. El texto debe empezar directamente con el saludo (ej: "Hola [Nombre]!", "Benvolgut/da...", etc.) y terminar con la firma cordial.`;

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
  // ACORDEÓN (MINIMIZAR / EXPANDIR CON FLECHITA)
  // =========================================================================
  toggleAccordion(name) {
    const body = document.getElementById(`accordion-${name}-body`);
    const arrow = document.getElementById(`arrow-${name}`);
    if (!body) return;

    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    if (arrow) {
      arrow.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
    }
  },

  // =========================================================================
  // PLANTILLES OFICIALS DE CONFIRMACIÓ DE RESERVA (4 IDIOMES)
  // =========================================================================
  CONFIRMATION_TEMPLATES: {
    ca: {
      langName: 'Català',
      template: `RESERVA
 

[NOM I COGNOMS DEL CLIENT]
TEL.  [TELÈFON]
[ADREÇA]
[CODI POSTAL I POBLACIÓ]


DATA ENTRADA: 			[DATA D'ENTRADA]
DATA SORTIDA:			[DATA DE SORTIDA]		
HABITACIONS:				[NÚMERO D'HABITACIONS]
NÚMERO DE NITS:			[NÚMERO DE NITS] [nit / nits]
NÚMERO DE PERSONES:		[NÚMERO DE PERSONES]
IMPORT PER HABITACIÓ I NIT:	[IMPORT PER HABITACIÓ I NIT] €  
TOTAL ESTADA:			[TOTAL ESTADA] €
TAXA TURÍSTICA:			0,99€ Per persona inclosa en el preu 
FORMA DE PAGAMENT:		50% En el moment de confirmar la reserva i la resta  30 dies abans de la data d’arribada
PENDENT DE PAGAMENT:		[PENDENT DE PAGAMENT] € 
MÈTODE PAGAMENT:		1-Targeta de crèdit   - 2- Targeta amb  enllaç de pagament segur – 3-Transferència bancària


Horari   Check in: A partir de les 13:00h PM
               Check Out: Abans de les 11:30h AM


El dia de la reserva si la porta d’entrada està tancada podeu trucar al tel. 659 900 549 i en 1 minut farem el check in. Depenent de l’hora d’arribada us farem arribar un enllaç per fer el check in online i les dades d’accés, en aquest cas us ho farem saber abans.

Moltes gràcies per la vostra confiança.
Cordialment.

Hostal Somnis
C. Diputació, 29
08260 Súria (Barcelona)
Tel. 659 900 549
www.hostalsomnis.com

Condicions de pagament: 50% en el moment d’efectuar la reserva (pagament no reemborsable) i 50% 30 dies abans de la data d’arribada. A partir del [DATA_LIMIT_CANCEL_LACIO] reserva no reemborsable.`
    },
    es: {
      langName: 'Castellano (Español)',
      template: `RESERVA
 

[NOMBRE Y APELLIDOS DEL CLIENTE]
TEL.  [TELÉFONO]
[DIRECCIÓN]
[CÓDIGO POSTAL Y POBLACIÓN]


FECHA DE ENTRADA: 		[FECHA DE ENTRADA]
FECHA DE SALIDA:			[FECHA DE SALIDA]		
HABITACIONES:			[NÚMERO DE HABITACIONES]
NÚMERO DE NOCHES:		[NÚMERO DE NOCHES] [noche / noches]
NÚMERO DE PERSONAS:		[NÚMERO DE PERSONAS]
IMPORTE POR HABITACIÓN Y NOCHE:	[IMPORTE POR HABITACIÓN Y NOCHE] €  
TOTAL ESTANCIA:			[TOTAL ESTANCIA] €
TASA TURÍSTICA:			0,99€ Por persona incluida en el precio 
FORMA DE PAGO:			50% En el momento de confirmar la reserva y el resto  30 días antes de la fecha de llegada
PENDIENTE DE PAGO:		[PENDIENTE DE PAGO] € 
MÉTODO DE PAGO:			1-Tarjeta de crédito   - 2- Tarjeta con  enlace de pago seguro – 3-Transferencia bancaria


Horario   Check in: A partir de las 13:00h PM
               Check Out: Antes de las 11:30h AM


El día de la reserva si la puerta de entrada está cerrada podéis llamar al tel. 659 900 549 y en 1 minuto haremos el check in. Dependiendo de la hora de llegada os haremos llegar un enlace para hacer el check in online y los datos de acceso, en este caso os lo haremos saber con antelación.

Muchas gracias por vuestra confianza.
Cordialmente.

Hostal Somnis
C. Diputació, 29
08260 Súria (Barcelona)
Tel. 659 900 549
www.hostalsomnis.com

Condiciones de pago: 50% en el momento de efectuar la reserva (pago no reembolsable) y 50% 30 días antes de la fecha de llegada. A partir del [FECHA_LIMITE_CANCELACION] reserva no reembolsable.`
    },
    en: {
      langName: 'English',
      template: `BOOKING CONFIRMATION
 

[GUEST FULL NAME]
TEL.  [PHONE]
[ADDRESS]
[POSTAL CODE AND CITY]


CHECK-IN DATE: 			[CHECK-IN DATE]
CHECK-OUT DATE:			[CHECK-OUT DATE]		
ROOMS:					[NUMBER OF ROOMS]
NUMBER OF NIGHTS:		[NUMBER OF NIGHTS] [night / nights]
NUMBER OF GUESTS:		[NUMBER OF GUESTS]
RATE PER ROOM AND NIGHT:	[RATE PER ROOM AND NIGHT] €  
TOTAL STAY:				[TOTAL STAY] €
TOURIST TAX:			€0.99 Per person included in the price 
PAYMENT TERMS:			50% Upon booking confirmation and the balance 30 days before arrival date
BALANCE DUE:			[BALANCE DUE] € 
PAYMENT METHOD:			1-Credit card   - 2- Credit card via secure payment link – 3-Bank transfer


Schedule   Check-in: From 1:00 PM
               Check-out: Before 11:30 AM


On the day of arrival, if the front door is closed, please call tel. +34 659 900 549 and we will check you in within a minute. Depending on your arrival time, we will send you a link to complete online check-in and access details, in which case we will let you know in advance.

Thank you very much for your trust.
Kind regards.

Hostal Somnis
C. Diputació, 29
08260 Súria (Barcelona)
Tel. +34 659 900 549
www.hostalsomnis.com

Payment conditions: 50% upon booking (non-refundable deposit) and 50% 30 days before arrival. From [CANCELLATION_DEADLINE_DATE], the reservation is non-refundable.`
    },
    fr: {
      langName: 'Français',
      template: `CONFIRMATION DE RÉSERVATION
 

[NOM ET PRÉNOM DU CLIENT]
TÉL.  [TÉLÉPHONE]
[ADRESSE]
[CODE POSTAL ET VILLE]


DATE D'ARRIVÉE : 			[DATE D'ARRIVÉE]
DATE DE DÉPART :			[DATE DE DÉPART]		
CHAMBRES :				[NOMBRE DE CHAMBRES]
NOMBRE DE NUITS :		[NOMBRE DE NUITS] [nuit / nuits]
NOMBRE DE PERSONNES :	[NOMBRE DE PERSONNES]
TARIF PAR CHAMBRE ET PAR NUIT :	[TARIF PAR CHAMBRE ET PAR NUIT] €  
TOTAL DU SÉJOUR :		[TOTAL DU SÉJOUR] €
TAXE DE SÉJOUR :			0,99 € Par personne incluse dans le tarif 
CONDITIONS DE PAIEMENT :	50% Au moment de confirmer la réservation et le solde 30 jours avant la date d'arrivée
RESTE À PAYER :			[RESTE À PAYER] € 
MODE DE PAIEMENT :		1-Carte bancaire   - 2- Carte bancaire avec lien de paiement sécurisé – 3-Virement bancaire


Horaires   Check-in : À partir de 13h00
               Check-out : Avant 11h30


Le jour de votre arrivée, si la porte d'entrée est fermée, vous pouvez appeler le +34 659 900 549 et en 1 minute nous ferons le check-in. Selon l'heure d'arrivée, nous vous ferons parvenir un lien pour faire le check-in en ligne avec vos codes d'accès, auquel cas nous vous en informerons au préalable.

Merci beaucoup pour votre confiance.
Cordialement.

Hostal Somnis
C. Diputació, 29
08260 Súria (Barcelona)
Tél. +34 659 900 549
www.hostalsomnis.com

Conditions de paiement : 50% au moment de la réservation (acompte non remboursable) et 50% 30 jours avant la date d'arrivée. À partir du [DATE_LIMITE_ANNULATION] réservation non remboursable.`
    }
  },

  // Helper per formatar el dia i mes límit de cancel·lació en l'idioma seleccionat
  formatCancellationDate(day, month, lang) {
    if (!day || !month) return null;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    if (isNaN(d) || isNaN(m) || m < 1 || m > 12) return null;

    const months = {
      ca: ['', 'gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'],
      es: ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
      en: ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      fr: ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
    };

    const getOrdinal = (n) => {
      if (n > 3 && n < 21) return 'th';
      switch (n % 10) {
        case 1:  return 'st';
        case 2:  return 'nd';
        case 3:  return 'rd';
        default: return 'th';
      }
    };

    if (lang === 'ca') {
      const prep = (m === 4 || m === 8 || m === 10) ? "d’" : "de ";
      return `${d} ${prep}${months.ca[m]}`;
    } else if (lang === 'es') {
      return `${d} de ${months.es[m]}`;
    } else if (lang === 'en') {
      return `${months.en[m]} ${d}${getOrdinal(d)}`;
    } else if (lang === 'fr') {
      return `${d === 1 ? '1er' : d} ${months.fr[m]}`;
    }
    return `${d}/${m}`;
  },

  // =========================================================================
  // GENERACIÓ DE CONFIRMACIÓ DE RESERVA AMB PLANTILLA OFICIAL I IA
  // =========================================================================
  async generateConfirmation() {
    const inputEl = document.getElementById('confirmacio-input-text');
    const input = inputEl ? inputEl.value.trim() : '';
    if (!input) {
      alert('Si us plau, enganxa o escriu les dades o notes de la reserva que ha posat la mare.');
      if (inputEl) inputEl.focus();
      return;
    }

    const lang = (document.getElementById('confirmacio-lang')?.value) || 'ca';
    const dia = document.getElementById('confirmacio-dia')?.value || '';
    const mes = document.getElementById('confirmacio-mes')?.value || '';
    const formattedDate = this.formatCancellationDate(dia, mes, lang);

    const config = this.getConfig();
    const queue = this.buildQueue(config);

    if (queue.length === 0) {
      alert('No tens cap API Key configurada. Configura-la a dalt a la dreta.');
      this.toggleConfigDrawer();
      return;
    }

    const btn = document.getElementById('btn-generate-confirmacio');
    const loading = document.getElementById('confirmacio-loading');
    const loadingText = document.getElementById('confirmacio-loading-text');
    const resultText = document.getElementById('confirmacio-result-text');

    if (btn) btn.disabled = true;
    if (loading) loading.style.display = 'flex';
    if (loadingText) loadingText.textContent = `La IA està processant les dades i omplint la plantilla oficial en ${lang.toUpperCase()}...`;

    try {
      const templateObj = this.CONFIRMATION_TEMPLATES[lang] || this.CONFIRMATION_TEMPLATES.ca;
      const langName = templateObj.langName;
      const targetTemplate = templateObj.template;

      let dateInstruction = '';
      if (formattedDate) {
        dateInstruction = `Per a la data límit no reemborsable s'ha seleccionat el dia i mes: "${formattedDate}". Insereix exactament aquesta data a la frase final de condicions de pagament en ${langName}.`;
      } else {
        dateInstruction = `Si a les notes de la reserva s'especifica una data no reemborsable o data d'arribada (habitualment 30 dies abans de la sortida/arribada), formata-la correctament en ${langName} i insereix-la. Si no se n'indica cap, deixa el format adequat segons la plantilla.`;
      }

      const systemPrompt = `Ets l'assistent oficial d'Hostal Somnis a Súria (Barcelona, comarca del Bages).
La teva missió és generar la confirmació oficial de reserva omplint exactament la plantilla oficial d'Hostal Somnis a partir de les notes o dades que ha escrit la propietària (la mare).

REGLES CRÍTIQUES DE REDACCIÓ I TRADUCCIÓ:
1. IDIOMA ESTRICTE: Tot el text del document final ha d'estar 100% en ${langName}.
   - Si la mare ha escrit notes en català o castellà (ex: "tres habitaciones", "dos noches", "habitación doble"), HAS DE TRADUIR TOTES les paraules, conceptes i mesos al ${langName} (per exemple en francès: "trois chambres", "chambre double", "deux nuits"; en anglès: "three rooms", "double room", "two nights").
   - MAI deixis paraules o fragments en castellà o català si l'idioma seleccionat és francès o anglès.
2. GRAMÀTICA I PLURALS EXACTES:
   - Adapta el singular/plural correctament (ex: 1 nit / 2 nits; 1 noche / 2 noches; 1 night / 2 nights; 1 nuit / 2 nuits; 1 habitació / 2 habitacions; 1 chambre / 2 chambres).
3. FORMAT I DADES:
   - Extreu i col·loca a cada lloc: Nom i cognoms de l'hoste, telèfon, adreça, codi postal i població, data d'entrada, data de sortida, nombre d'habitacions, nombre de nits, nombre de persones, import per habitació i nit, total de l'estada, taxa turística (0,99€ per persona inclosa), forma de pagament (50% al confirmar i la resta 30 dies abans), pendent de pagament (el 50% restant o l'import pendent), i mètode de pagament.
   - Si a les notes el total de l'estada no està calculat o posa 0, calcula'l automàticament: (import habitació i nit) x (nits) x (habitacions).
   - Si el pendent de pagament no està indicat explícitament, correspon normalment al 50% restant del total de l'estada.
   - Si alguna dada personal no apareix a les notes (per exemple si no ha posat l'adreça del client o el telèfon), mantén la línia neta o indica només el que hi hagi sense inventar dades personals falses.
4. DATA LÍMIT NO REEMBORSABLE:
   ${dateInstruction}
5. FORMAT DE SORTIDA:
   - Mantén l'estructura visual neta, alineada i professional de la plantilla oficial.
   - Respon ÚNICAMENT amb la plantilla emplenada en text pla, sense cap tipus de bloc de codi markdown (sense \`\`\`), sense introduccions ni explicacions adicionals fora de la confirmació.`;

      const userMessage = `PLANTILLA OFICIAL A EMPLENAR EN ${langName.toUpperCase()}:
"""
${targetTemplate}
"""

DADES / NOTES DE LA RESERVA INTRODUÏDES PER LA MARE:
"""
${input}
"""

Omple la plantilla oficial en ${langName} seguint totes les instruccions:`;

      let text = null;
      const failedErrors = [];

      for (let i = 0; i < queue.length; i++) {
        const current = queue[i];
        if (i > 0 && loadingText) {
          loadingText.textContent = `La IA anterior ha esgotat la quota o no ha respost. Canviant a "${current.name}", trigarà una mica més...`;
          await new Promise(r => setTimeout(r, 700));
        }

        try {
          console.log(`Intentant confirmació de reserva amb: ${current.name}`);
          text = await current.fn(systemPrompt, userMessage);
          if (text && text.trim().length > 20) {
            break;
          }
        } catch (e) {
          console.warn(`Error confirmació amb ${current.name}:`, e);
          failedErrors.push(`${current.name}: ${e.message}`);
        }
      }

      if (text) {
        // Netejar possibles cometes invertides markdown si el model n'ha posat
        let cleaned = text.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
        }
        if (resultText) {
          resultText.value = cleaned;
          resultText.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } else {
        const details = failedErrors.join('\n• ');
        alert(`No s'ha pogut generar la confirmació de reserva amb cap de les IAs configurades.\n\nDetalls:\n• ${details}\n\nSi us plau, revisa les teves claus API.`);
      }
    } finally {
      if (btn) btn.disabled = false;
      if (loading) loading.style.display = 'none';
    }
  },

  copyConfirmation() {
    const textEl = document.getElementById('confirmacio-result-text');
    if (!textEl || !textEl.value) {
      alert('Encara no hi ha cap confirmació generada per copiar.');
      return;
    }

    navigator.clipboard.writeText(textEl.value).then(() => {
      const btn = document.getElementById('btn-copy-confirmacio');
      if (btn) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ¡Copiat al porta-retalls!
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
      // Fallback para selección
      textEl.select();
      document.execCommand('copy');
      alert('¡Text copiat al porta-retalls!');
    });
  },

  // =========================================================================
  // AUTOMATITZACIÓ DE RESERVES I ENVIAMENT PER OUTLOOK
  // =========================================================================
  extractEmail(booking) {
    if (!booking) return '';
    if (booking.guestEmail && booking.guestEmail.trim()) return booking.guestEmail.trim();
    if (booking.email && booking.email.trim()) return booking.email.trim();
    
    // Cercar adreça de correu a notes, descripció o resum
    const fullText = `${booking.notes || ''} ${booking.description || ''} ${booking.summary || ''}`;
    const match = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0].trim() : '';
  },

  calculateNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 1;
    try {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      const diff = Math.round((d2 - d1) / (1000 * 3600 * 24));
      return diff > 0 ? diff : 1;
    } catch (e) {
      return 1;
    }
  },

  formatDisplayDate(dateStr, lang = 'ca') {
    if (!dateStr) return '';
    const parts = String(dateStr).trim().split('-');
    if (parts.length === 3) {
      const y = parts[0], m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
      const months = {
        ca: ['', 'gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'],
        es: ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
        en: ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        fr: ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
      };
      if (lang === 'ca') {
        const prep = (m === 4 || m === 8 || m === 10) ? "d’" : "de ";
        return `${d} ${prep}${months.ca[m]} de ${y}`;
      } else if (lang === 'es') {
        return `${d} de ${months.es[m]} de ${y}`;
      } else if (lang === 'en') {
        const ord = (d === 1 || d === 21 || d === 31) ? 'st' : ((d === 2 || d === 22) ? 'nd' : ((d === 3 || d === 23) ? 'rd' : 'th'));
        return `${months.en[m]} ${d}${ord}, ${y}`;
      } else if (lang === 'fr') {
        return `${d === 1 ? '1er' : d} ${months.fr[m]} ${y}`;
      }
    }
    return dateStr;
  },

  calculateCancellationDate(checkInStr, lang = 'ca') {
    if (!checkInStr) return '';
    try {
      const d = new Date(checkInStr);
      d.setDate(d.getDate() - 30);
      const day = d.getDate();
      const month = d.getMonth() + 1;
      return this.formatCancellationDate(day, month, lang) || `${day}/${month}`;
    } catch (e) {
      return '';
    }
  },

  populateConfirmationTemplate(booking, lang = 'ca', customCancellationDate = null) {
    if (!booking) return;
    const templateObj = this.CONFIRMATION_TEMPLATES[lang] || this.CONFIRMATION_TEMPLATES.ca;
    let template = templateObj.template;

    const guestName = (booking.guestName || 'Hoste').trim();
    const phone = (booking.guestPhone || booking.phone || '').trim();
    const address = (booking.guestAddress || booking.address || '').trim();
    const city = (booking.city || booking.postalCode ? `${booking.postalCode || ''} ${booking.city || ''}`.trim() : '').trim();
    const checkInStr = booking.checkIn || '';
    const checkOutStr = booking.checkOut || '';
    const nights = this.calculateNights(checkInStr, checkOutStr);
    const formattedCheckIn = this.formatDisplayDate(checkInStr, lang) || checkInStr;
    const formattedCheckOut = this.formatDisplayDate(checkOutStr, lang) || checkOutStr;
    const roomsCount = booking.roomsCount || 1;
    const guestsCount = booking.guestsCount || 2;
    const pricePerNight = booking.price ? parseFloat(booking.price).toFixed(2) : '89.00';
    const totalStay = booking.totalPrice ? parseFloat(booking.totalPrice).toFixed(2) : (parseFloat(pricePerNight) * nights).toFixed(2);
    const pendingPayment = (parseFloat(totalStay) * 0.5).toFixed(2);
    const cancelDate = customCancellationDate || this.calculateCancellationDate(checkInStr, lang) || (lang === 'en' ? '30 days before arrival' : '30 dies abans de la data d\'arribada');

    // Substitució en Català
    template = template
      .replace('[NOM I COGNOMS DEL CLIENT]', guestName)
      .replace('[NOMBRE Y APELLIDOS DEL CLIENTE]', guestName)
      .replace('[GUEST FULL NAME]', guestName)
      .replace('[NOM ET PRÉNOM DU CLIENT]', guestName);

    template = template
      .replace('[TELÈFON]', phone || '')
      .replace('[TELÉFONO]', phone || '')
      .replace('[PHONE]', phone || '')
      .replace('[TÉLÉPHONE]', phone || '');

    template = template
      .replace('[ADREÇA]', address || '')
      .replace('[DIRECCIÓN]', address || '')
      .replace('[ADDRESS]', address || '')
      .replace('[ADRESSE]', address || '');

    template = template
      .replace('[CODI POSTAL I POBLACIÓ]', city || '')
      .replace('[CÓDIGO POSTAL Y POBLACIÓN]', city || '')
      .replace('[POSTAL CODE AND CITY]', city || '')
      .replace('[CODE POSTAL ET VILLE]', city || '');

    template = template
      .replace("[DATA D'ENTRADA]", formattedCheckIn)
      .replace('[FECHA DE ENTRADA]', formattedCheckIn)
      .replace('[CHECK-IN DATE]', formattedCheckIn)
      .replace("[DATE D'ARRIVÉE]", formattedCheckIn);

    template = template
      .replace('[DATA DE SORTIDA]', formattedCheckOut)
      .replace('[FECHA DE SALIDA]', formattedCheckOut)
      .replace('[CHECK-OUT DATE]', formattedCheckOut)
      .replace('[DATE DE DÉPART]', formattedCheckOut);

    template = template
      .replace("[NÚMERO D'HABITACIONS]", `${roomsCount} (Habitació ${booking.room || '101'})`)
      .replace('[NÚMERO DE HABITACIONES]', `${roomsCount} (Habitación ${booking.room || '101'})`)
      .replace('[NUMBER OF ROOMS]', `${roomsCount} (Room ${booking.room || '101'})`)
      .replace('[NOMBRE DE CHAMBRES]', `${roomsCount} (Chambre ${booking.room || '101'})`);

    template = template
      .replace("[NÚMERO DE NITS] [nit / nits]", `${nights} ${nights === 1 ? 'nit' : 'nits'}`)
      .replace('[NÚMERO DE NOCHES] [noche / noches]', `${nights} ${nights === 1 ? 'noche' : 'noches'}`)
      .replace('[NUMBER OF NIGHTS] [night / nights]', `${nights} ${nights === 1 ? 'night' : 'nights'}`)
      .replace('[NOMBRE DE NUITS] [nuit / nuits]', `${nights} ${nights === 1 ? 'nuit' : 'nuits'}`);

    template = template
      .replace('[NÚMERO DE PERSONES]', `${guestsCount} ${guestsCount === 1 ? 'persona' : 'persones'}`)
      .replace('[NÚMERO DE PERSONAS]', `${guestsCount} ${guestsCount === 1 ? 'persona' : 'personas'}`)
      .replace('[NUMBER OF GUESTS]', `${guestsCount} ${guestsCount === 1 ? 'guest' : 'guests'}`)
      .replace('[NOMBRE DE PERSONNES]', `${guestsCount} ${guestsCount === 1 ? 'personne' : 'personnes'}`);

    template = template
      .replace('[IMPORT PER HABITACIÓ I NIT]', pricePerNight)
      .replace('[IMPORTE POR HABITACIÓN Y NOCHE]', pricePerNight)
      .replace('[RATE PER ROOM AND NIGHT]', pricePerNight)
      .replace('[TARIF PAR CHAMBRE ET PAR NUIT]', pricePerNight);

    template = template
      .replace('[TOTAL ESTADA]', totalStay)
      .replace('[TOTAL ESTANCIA]', totalStay)
      .replace('[TOTAL STAY]', totalStay)
      .replace('[TOTAL DU SÉJOUR]', totalStay);

    template = template
      .replace('[PENDENT DE PAGAMENT]', pendingPayment)
      .replace('[PENDIENTE DE PAGO]', pendingPayment)
      .replace('[BALANCE DUE]', pendingPayment)
      .replace('[RESTE À PAYER]', pendingPayment);

    template = template
      .replace('[DATA_LIMIT_CANCEL_LACIO]', cancelDate)
      .replace('[FECHA_LIMITE_CANCELACION]', cancelDate)
      .replace('[CANCELLATION_DEADLINE_DATE]', cancelDate)
      .replace('[DATE_LIMITE_ANNULATION]', cancelDate);

    // Netejar línies buides residuals si faltaven adreça o telèfon
    template = template.replace(/^TEL\.\s*\n/m, '').replace(/^\n\n\n+/g, '\n\n');

    const resultText = document.getElementById('confirmacio-result-text');
    if (resultText) {
      resultText.value = template.trim();
    }
    return template;
  },

  setConfirmationLang(lang) {
    this.currentLang = lang || 'ca';
    ['ca', 'es', 'en', 'fr'].forEach(l => {
      const btn = document.getElementById(`btn-mail-lang-${l}`);
      if (btn) btn.classList.toggle('active', l === this.currentLang);
    });
    const select = document.getElementById('confirmacio-lang');
    if (select) select.value = this.currentLang;

    if (this.activeBooking) {
      this.populateConfirmationTemplate(this.activeBooking, this.currentLang);
      const subjectInput = document.getElementById('confirmacio-subject');
      if (subjectInput) {
        const subjNames = {
          ca: 'Confirmació de reserva — Hostal Somnis',
          es: 'Confirmación de reserva — Hostal Somnis',
          en: 'Booking Confirmation — Hostal Somnis',
          fr: 'Confirmation de réservation — Hostal Somnis'
        };
        subjectInput.value = `${subjNames[this.currentLang] || subjNames.ca} (Hab. ${this.activeBooking.room || '101'} - ${this.activeBooking.guestName || 'Hoste'})`;
      }
    }
  },

  prepareBookingEmail(bookingData) {
    this.activeBooking = bookingData;
    const lang = this.currentLang || 'ca';

    // Obrir l'acordió de confirmació automàticament
    const body = document.getElementById('accordion-confirmacio-body');
    const arrow = document.getElementById('arrow-confirmacio');
    if (body) body.style.display = 'block';
    if (arrow) arrow.style.transform = 'rotate(0deg)';

    // Minimitzar acordió de preguntes per deixar espai lliure a la revisió
    const pregBody = document.getElementById('accordion-preguntes-body');
    const pregArrow = document.getElementById('arrow-preguntes');
    if (pregBody) pregBody.style.display = 'none';
    if (pregArrow) pregArrow.style.transform = 'rotate(-90deg)';

    // Mostrar bàner de reserva activa
    const banner = document.getElementById('mail-booking-loaded-banner');
    const titleEl = document.getElementById('mail-booking-title');
    const subEl = document.getElementById('mail-booking-subtitle');
    const nights = this.calculateNights(bookingData.checkIn, bookingData.checkOut);
    const totalStay = bookingData.totalPrice ? parseFloat(bookingData.totalPrice).toFixed(2) : (parseFloat(bookingData.price || 89) * nights).toFixed(2);

    if (banner) banner.style.display = 'flex';
    if (titleEl) titleEl.textContent = `🛎️ Reserva: ${bookingData.guestName || 'Hoste'}`;
    if (subEl) subEl.textContent = `Habitació ${bookingData.room || '101'} • ${bookingData.checkIn || ''} al ${bookingData.checkOut || ''} (${nights} ${nights === 1 ? 'nit' : 'nits'}) • Total: ${totalStay} €`;

    // Extreure correu del client de les dades o notes
    const recipientEmail = this.extractEmail(bookingData);
    const recipientInput = document.getElementById('confirmacio-recipient-email');
    if (recipientInput) {
      recipientInput.value = recipientEmail;
    }
    this.onRecipientChange();

    // Emplenar assumpte
    const subjNames = {
      ca: 'Confirmació de reserva — Hostal Somnis',
      es: 'Confirmación de reserva — Hostal Somnis',
      en: 'Booking Confirmation — Hostal Somnis',
      fr: 'Confirmation de réservation — Hostal Somnis'
    };
    const subjectInput = document.getElementById('confirmacio-subject');
    if (subjectInput) {
      subjectInput.value = `${subjNames[lang] || subjNames.ca} (Hab. ${bookingData.room || '101'} - ${bookingData.guestName || 'Hoste'})`;
    }

    // Emplenar la plantilla oficial automàticament a l'instant
    this.populateConfirmationTemplate(bookingData, lang);

    // Posar notes en brut a la casella d'IA per si vol afinar
    const rawInput = document.getElementById('confirmacio-input-text');
    if (rawInput) {
      rawInput.value = `${bookingData.guestName || ''}, Tel ${bookingData.guestPhone || bookingData.phone || ''}, ${recipientEmail}. Entrada ${bookingData.checkIn || ''}, sortida ${bookingData.checkOut || ''}, Hab. ${bookingData.room || '101'}, ${nights} nit(s), ${bookingData.guestsCount || 2} pers., Total: ${totalStay}€, Notes: ${bookingData.notes || 'Sense observacions'}`.trim();
    }

    // Scroll suau cap al panell de revisió
    setTimeout(() => {
      const panel = document.getElementById('confirmacio-mail-review-panel') || document.getElementById('accordion-confirmacio-body');
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (!recipientEmail && recipientInput) {
        recipientInput.focus();
      }
    }, 150);
  },

  clearActiveBooking() {
    this.activeBooking = null;
    const banner = document.getElementById('mail-booking-loaded-banner');
    if (banner) banner.style.display = 'none';
    const recipientInput = document.getElementById('confirmacio-recipient-email');
    if (recipientInput) recipientInput.value = '';
    this.onRecipientChange();
  },

  openInOutlook() {
    const recipientInput = document.getElementById('confirmacio-recipient-email');
    const subjectInput = document.getElementById('confirmacio-subject');
    const bodyTextarea = document.getElementById('confirmacio-result-text');

    const to = recipientInput ? recipientInput.value.trim() : '';
    const subject = subjectInput ? subjectInput.value.trim() : 'Confirmació de reserva — Hostal Somnis';
    const body = bodyTextarea ? bodyTextarea.value.trim() : '';

    if (!to) {
      alert('⚠️ Si us plau, introdueix el correu electrònic del client (destinatari) abans d\'obrir Outlook.');
      if (recipientInput) {
        recipientInput.focus();
        recipientInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!body) {
      alert('⚠️ El text de la confirmació està buit. Si us plau, revisa la plantilla.');
      return;
    }

    const config = this.getOutlookConfig();
    const provider = config.provider || 'thunderbird';

    if (provider === 'web') {
      // Outlook Web (outlook.live.com per a Hotmail / Outlook personal)
      const url = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, '_blank');
    } else if (provider === 'office365') {
      // Outlook Microsoft 365 per a comptes empresarials
      const url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, '_blank');
    } else {
      // Mozilla Thunderbird o aplicació de correu per defecte del sistema
      // Protocol estàndard mailto suportat nativament al 100% per Thunderbird
      const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;
    }

    // Feedback visual a la interfície
    const btn = document.getElementById('btn-open-outlook');
    if (btn) {
      const origHtml = btn.innerHTML;
      const appName = provider === 'thunderbird' ? 'Thunderbird' : (provider === 'app' ? 'el teu correu' : 'Outlook');
      btn.innerHTML = `✓ Obert a ${appName}! Revisa i prem Enviar`;
      btn.style.background = '#059669';
      btn.style.borderColor = '#059669';
      setTimeout(() => {
        btn.innerHTML = origHtml;
        btn.style.background = '';
        btn.style.borderColor = '';
      }, 4000);
    }
  }
};

window.MailsModule = MailsModule;


