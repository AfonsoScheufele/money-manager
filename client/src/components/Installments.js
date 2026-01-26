import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

function Installments() {
  const [installments, setInstallments] = useState([]);
  const [payments, setPayments] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    total_amount: '',
    installments_count: '',
    start_date: new Date().toISOString().split('T')[0],
    account_id: '',
    category_id: ''
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const [installmentsRes, accountsRes, categoriesRes] = await Promise.all([
        fetch(`${API_URL}/installments`),
        fetch(`${API_URL}/accounts`),
        fetch(`${API_URL}/categories`)
      ]);

      const installmentsData = await installmentsRes.json();
      const accountsData = await accountsRes.json();
      const categoriesData = await categoriesRes.json();

      setInstallments(installmentsData);
      setAccounts(accountsData);
      setCategories(categoriesData.filter(c => c.type === 'expense'));

      for (const inst of installmentsData) {
        fetchPayments(inst.id);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const fetchPayments = async (installmentId) => {
    try {
      const res = await fetch(`${API_URL}/installments/${installmentId}/payments`);
      const data = await res.json();
      setPayments(prev => ({ ...prev, [installmentId]: data }));
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/installments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          total_amount: parseFloat(formData.total_amount),
          installments_count: parseInt(formData.installments_count)
        })
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({
          description: '',
          total_amount: '',
          installments_count: '',
          start_date: new Date().toISOString().split('T')[0],
          account_id: '',
          category_id: ''
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating installment:', error);
    }
  };

  const handlePay = async (installmentId, paymentId, amount) => {
    const date = prompt('Data do pagamento (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!date) return;

    try {
      const res = await fetch(`${API_URL}/installments/${installmentId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, date })
      });

      if (res.ok) {
        fetchData();
        fetchPayments(installmentId);
        window.location.reload();
      }
    } catch (error) {
      console.error('Error paying installment:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta compra parcelada?')) return;

    try {
      const res = await fetch(`${API_URL}/installments/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting installment:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#3B82F6';
      case 'completed': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getPaymentStatus = (payment) => {
    if (payment.paid_date) return { text: 'Pago', color: '#10B981' };
    const dueDate = new Date(payment.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) return { text: 'Vencido', color: '#EF4444' };
    return { text: 'Pendente', color: '#F59E0B' };
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className="installments-container">
      <div className="section-header">
        <h2>Compras Parceladas</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancelar' : 'Nova Compra Parcelada'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="installment-form">
          <div className="form-group">
            <label>Descrição</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Valor Total</label>
              <input
                type="number"
                step="0.01"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Número de Parcelas</label>
              <input
                type="number"
                min="1"
                value={formData.installments_count}
                onChange={(e) => setFormData({ ...formData, installments_count: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data da Primeira Parcela</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Conta</label>
              <select
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                required
              >
                <option value="">Selecione...</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Categoria</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value || null })}
            >
              <option value="">Selecione...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary">Criar Compra Parcelada</button>
        </form>
      )}

      <div className="installments-list">
        {installments.length === 0 ? (
          <p className="empty-state">Nenhuma compra parcelada cadastrada.</p>
        ) : (
          installments.map(inst => {
            const installmentPayments = payments[inst.id] || [];
            const paidCount = installmentPayments.filter(p => p.paid_date).length;
            const totalPaid = installmentPayments
              .filter(p => p.paid_date)
              .reduce((sum, p) => sum + p.amount, 0);

            return (
              <div key={inst.id} className="installment-card">
                <div className="installment-header">
                  <div>
                    <h3>{inst.description}</h3>
                    <p className="installment-info">
                      {inst.account_name && <span>Conta: {inst.account_name}</span>}
                      {inst.category_name && <span>Categoria: {inst.category_name}</span>}
                    </p>
                  </div>
                  <div className="installment-status">
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(inst.status) }}
                    >
                      {inst.status === 'active' ? 'Ativa' : 'Concluída'}
                    </span>
                    <button
                      onClick={() => handleDelete(inst.id)}
                      className="btn-danger btn-small"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="installment-summary">
                  <div className="summary-item">
                    <span className="label">Valor Total:</span>
                    <span className="value">R$ {inst.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Parcelas:</span>
                    <span className="value">{paidCount}/{inst.installments_count}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Valor por Parcela:</span>
                    <span className="value">R$ {inst.installment_amount.toFixed(2)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Total Pago:</span>
                    <span className="value">R$ {totalPaid.toFixed(2)}</span>
                  </div>
                </div>

                <div className="payments-section">
                  <h4>Parcelas</h4>
                  <div className="payments-list">
                    {installmentPayments.map(payment => {
                      const status = getPaymentStatus(payment);
                      return (
                        <div key={payment.id} className="payment-item">
                          <div className="payment-info">
                            <span className="payment-number">Parcela {payment.installment_number}</span>
                            <span className="payment-amount">R$ {payment.amount.toFixed(2)}</span>
                            <span className="payment-date">
                              Vencimento: {new Date(payment.due_date).toLocaleDateString('pt-BR')}
                            </span>
                            <span
                              className="payment-status"
                              style={{ color: status.color }}
                            >
                              {status.text}
                            </span>
                          </div>
                          {!payment.paid_date && (
                            <button
                              onClick={() => handlePay(inst.id, payment.id, payment.amount)}
                              className="btn-success btn-small"
                            >
                              Pagar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Installments;

