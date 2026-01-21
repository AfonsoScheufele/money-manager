import React, { useState, useEffect } from 'react';

const Alerts = ({ monthlyExpenses, transactions }) => {
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem('financialAlerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'expense-limit',
    threshold: '',
    message: ''
  });

  useEffect(() => {
    localStorage.setItem('financialAlerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    const checkAlerts = () => {
      const activeAlerts = alerts.filter(alert => alert.active);
      const triggered = [];

      activeAlerts.forEach(alert => {
      if (alert.type === 'expense-limit' && monthlyExpenses >= alert.threshold) {
        triggered.push({
          ...alert,
          message: `⚠️ Atenção! Você ultrapassou o limite de gastos mensais de ${formatCurrency(alert.threshold)}`
        });
      } else if (alert.type === 'large-transaction') {
        const largeTransactions = transactions.filter(t => 
          t.type === 'expense' && t.amount >= alert.threshold
        );
        if (largeTransactions.length > 0) {
          triggered.push({
            ...alert,
            message: `⚠️ Transação grande detectada: ${formatCurrency(alert.threshold)} ou mais`
          });
        }
      }
    });

    if (triggered.length > 0) {
      triggered.forEach(alert => {
        if (!alert.notified) {
          alert.notified = true;
          // Aqui você pode adicionar notificações do navegador se necessário
        }
      });
    }
    };

    checkAlerts();
  }, [monthlyExpenses, transactions, alerts]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newAlert = {
      id: Date.now(),
      ...formData,
      threshold: parseFloat(formData.threshold),
      active: true,
      notified: false,
      createdAt: new Date().toISOString()
    };
    setAlerts([...alerts, newAlert]);
    setFormData({ type: 'expense-limit', threshold: '', message: '' });
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este alerta?')) {
      setAlerts(alerts.filter(a => a.id !== id));
    }
  };

  const toggleAlert = (id) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, active: !alert.active } : alert
    ));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const triggeredAlerts = alerts.filter(a => a.active && monthlyExpenses >= a.threshold);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: '#1a202c' }}>Alertas Financeiros</h3>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Novo Alerta
        </button>
      </div>

      {triggeredAlerts.length > 0 && (
        <div style={{
          padding: '15px',
          background: '#FEF2F2',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #EF4444'
        }}>
          {triggeredAlerts.map(alert => (
            <p key={alert.id} style={{ margin: '5px 0', color: '#DC2626', fontWeight: '600' }}>
              {alert.message || `⚠️ Limite de ${formatCurrency(alert.threshold)} ultrapassado!`}
            </p>
          ))}
        </div>
      )}

      {alerts.length === 0 ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
          Nenhum alerta configurado. Crie alertas para monitorar seus gastos!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {alerts.map(alert => (
            <div key={alert.id} style={{
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: alert.active ? '#f9fafb' : '#f3f4f6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 5px 0', color: '#111827', fontWeight: '600' }}>
                  {alert.type === 'expense-limit' ? '💸 Limite de Gastos Mensais' : '💰 Transação Grande'}
                </p>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                  Limite: {formatCurrency(alert.threshold)} • 
                  Status: <span style={{ color: alert.active ? '#10B981' : '#6b7280' }}>
                    {alert.active ? 'Ativo' : 'Inativo'}
                  </span>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn"
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '0.8rem',
                    background: alert.active ? '#6b7280' : '#10B981',
                    color: 'white'
                  }}
                  onClick={() => toggleAlert(alert.id)}
                >
                  {alert.active ? '⏸️' : '▶️'}
                </button>
                <button
                  className="btn btn-danger"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => handleDelete(alert.id)}
                  title="Excluir"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo Alerta Financeiro</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tipo de Alerta</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="expense-limit">💸 Limite de Gastos Mensais</option>
                  <option value="large-transaction">💰 Transação Grande</option>
                </select>
              </div>
              <div className="form-group">
                <label>Valor Limite (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Mensagem Personalizada (opcional)</label>
                <input
                  type="text"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Ex: Atenção! Você está gastando muito"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Criar Alerta
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;

