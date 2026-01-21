import React, { useState } from 'react';

const Accounts = ({ accounts, onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    balance: 0,
    color: '#3B82F6'
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        setFormData({ name: '', type: 'bank', balance: 0, color: '#3B82F6' });
        onRefresh();
      }
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/accounts/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          onRefresh();
        }
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  const accountTypes = {
    bank: '🏦 Banco',
    wallet: '💵 Carteira',
    savings: '💰 Poupança',
    investment: '📈 Investimento',
    other: '📊 Outro'
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ color: '#1a202c', fontSize: '1.5rem', fontWeight: '600', letterSpacing: '-0.3px' }}>Contas</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Nova Conta
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhuma conta cadastrada</h3>
          <p>Comece adicionando sua primeira conta</p>
        </div>
      ) : (
        <div className="accounts-grid">
          {accounts.map(account => (
            <div key={account.id} className="account-card" style={{ borderLeftColor: account.color }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ color: '#111827', marginBottom: '5px' }}>{account.name}</h3>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    {accountTypes[account.type] || account.type}
                  </p>
                </div>
                <button 
                  className="btn btn-danger" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => handleDelete(account.id)}
                  title="Excluir"
                >
                  Excluir
                </button>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
                {formatCurrency(account.balance)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nova Conta</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome da Conta</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="bank">🏦 Banco</option>
                  <option value="wallet">💵 Carteira</option>
                  <option value="savings">💰 Poupança</option>
                  <option value="investment">📈 Investimento</option>
                  <option value="other">📊 Outro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Saldo Inicial</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label>Cor</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Criar Conta
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;

