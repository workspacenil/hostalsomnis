/**
 * MÓDULO DE FINANZAS - HOSTAL SOMNIS
 */

const FinancesModule = {
  transactions: [],

  init() {
    this.loadTransactions();
  },

  loadTransactions() {
    // Leer del Storage local (PWA)
    this.transactions = Store.get('finances', []);
    this.render();
  },

  render() {
    let totalIngresos = 0;
    let totalGastos = 0;

    // Ordenar por fecha descendente
    this.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const tbody = document.getElementById('finanzas-table-body');
    if (!tbody) return;

    let html = '';

    if (this.transactions.length === 0) {
      html = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">
            No hay movimientos registrados aún.
          </td>
        </tr>
      `;
    } else {
      this.transactions.forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'ingreso') {
          totalIngresos += amt;
        } else {
          totalGastos += amt;
        }

        const color = t.type === 'ingreso' ? 'var(--success)' : 'var(--danger)';
        const sign = t.type === 'ingreso' ? '+' : '-';

        html += `
          <tr style="border-bottom: 1px solid var(--bg-hover);">
            <td style="padding: 12px 16px;">${App.formatDateReadable(t.date)}</td>
            <td style="padding: 12px 16px; font-weight: 500;">${t.concept}</td>
            <td style="padding: 12px 16px; color: var(--text-muted);">${t.category}</td>
            <td style="padding: 12px 16px; text-align: right; color: ${color}; font-weight: 600;">
              ${sign} ${App.formatMoney(amt)}
            </td>
            <td style="padding: 12px 16px; text-align: center;">
              <button class="btn btn-outline" style="padding: 4px 8px; font-size: 11px;" onclick="FinancesModule.deleteTransaction('${t.id}')">Borrar</button>
            </td>
          </tr>
        `;
      });
    }

    tbody.innerHTML = html;

    const balanceNeto = totalIngresos - totalGastos;

    // Actualizar KPIs
    document.getElementById('kpi-ingresos').textContent = App.formatMoney(totalIngresos);
    document.getElementById('kpi-gastos').textContent = App.formatMoney(totalGastos);
    
    const balanceElem = document.getElementById('kpi-balance');
    balanceElem.textContent = App.formatMoney(balanceNeto);
    balanceElem.style.color = balanceNeto >= 0 ? 'var(--text-main)' : 'var(--danger)';
  },

  openModal(type) {
    const form = document.getElementById('form-finance');
    if (form) form.reset();

    const titleElem = document.getElementById('modal-finance-title');
    const typeInput = document.getElementById('finance-type');
    const dateInput = document.getElementById('finance-date');

    if (titleElem) {
      titleElem.textContent = type === 'ingreso' ? 'Añadir Nuevo Ingreso' : 'Añadir Nuevo Gasto';
      titleElem.style.color = type === 'ingreso' ? 'var(--success)' : 'var(--danger)';
    }

    if (typeInput) typeInput.value = type;
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    const modal = document.getElementById('modal-finance');
    if (modal) modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('modal-finance');
    if (modal) modal.classList.remove('active');
  },

  saveTransaction(e) {
    e.preventDefault();
    
    const type = document.getElementById('finance-type').value;
    const concept = document.getElementById('finance-concept').value;
    const amount = document.getElementById('finance-amount').value;
    const date = document.getElementById('finance-date').value;
    const category = document.getElementById('finance-category').value;

    if (!concept || !amount || !date) return;

    const newTx = {
      id: 'tx-' + Math.random().toString(36).substr(2, 9),
      type,
      concept,
      amount: parseFloat(amount),
      date,
      category,
      createdAt: new Date().toISOString()
    };

    this.transactions.push(newTx);
    Store.set('finances', this.transactions);
    
    this.closeModal();
    this.render();
  },

  deleteTransaction(id) {
    if (!confirm('¿Seguro que deseas eliminar este movimiento?')) return;
    
    this.transactions = this.transactions.filter(t => t.id !== id);
    Store.set('finances', this.transactions);
    this.render();
  }
};

window.FinancesModule = FinancesModule;
