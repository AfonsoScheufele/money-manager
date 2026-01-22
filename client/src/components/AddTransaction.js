import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

const AddTransaction = ({ accounts, categories, onRefresh, onClose }) => {
  const [localAccounts, setLocalAccounts] = useState(accounts);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  const ensureAccountExists = async () => {
    if (localAccounts.length > 0) {
      return localAccounts[0].id;
    }

    setIsCreatingAccount(true);
    try {
      const accountRes = await fetch(`${API_URL}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Conta Principal',
          type: 'bank',
          balance: 0,
          color: '#3B82F6'
        }),
      });
      const accountData = await accountRes.json();
      const newAccountId = accountData.id;
      
      // Refresh accounts list
      const accountsRes = await fetch(`${API_URL}/accounts`);
      const accountsData = await accountsRes.json();
      setLocalAccounts(Array.isArray(accountsData) ? accountsData : []);
      
      setIsCreatingAccount(false);
      return newAccountId;
    } catch (error) {
      console.error('Error creating account:', error);
      setIsCreatingAccount(false);
      throw error;
    }
  };

  const [formData, setFormData] = useState({
    account_id: accounts.length > 0 ? accounts[0].id : '',
    category_id: '',
    type: 'expense',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (localAccounts.length > 0 && !formData.account_id) {
      setFormData(prev => ({ ...prev, account_id: localAccounts[0].id }));
    }
  }, [localAccounts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Ensure account exists before creating transaction
      let accountId = formData.account_id;
      if (!accountId || localAccounts.length === 0) {
        accountId = await ensureAccountExists();
      }

      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          account_id: parseInt(accountId),
          amount: parseFloat(formData.amount),
          category_id: formData.category_id ? parseInt(formData.category_id) : null
        }),
      });

      if (response.ok) {
        setFormData({
          account_id: localAccounts.length > 0 ? localAccounts[0].id : '',
          category_id: '',
          type: 'expense',
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        onRefresh();
        if (onClose) onClose();
      } else {
        const errorData = await response.json();
        alert('Erro ao criar despesa: ' + (errorData.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Erro ao criar despesa: ' + error.message);
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === formData.type);

  if (isCreatingAccount) {
    return (
      <div className="empty-state">
        <h3>Criando conta principal...</h3>
        <p>Aguarde um momento</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '32px', color: '#1a202c', fontSize: '1.5rem', fontWeight: '600', letterSpacing: '-0.3px' }}>Nova Despesa</h2>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '32px' }}>
        <div className="form-group">
          <label>Tipo</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value, category_id: '' })}
            required
          >
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
        </div>

        {localAccounts.length > 0 && (
          <div className="form-group">
            <label>Conta</label>
            <select
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
              required
            >
              {localAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Categoria</label>
          <select
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
          >
            <option value="">Sem categoria</option>
            {filteredCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Valor</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Descrição</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ex: Compra no supermercado"
          />
        </div>

        <div className="form-group">
          <label>Data</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
          <button 
            type="submit" 
            className={`btn ${formData.type === 'income' ? 'btn-success' : 'btn-primary'}`}
            style={{ flex: 1, padding: '12px 24px', fontSize: '1rem', fontWeight: '600' }}
          >
            {formData.type === 'income' ? 'Adicionar Receita' : 'Adicionar Despesa'}
          </button>
          {onClose && (
            <button 
              type="button" 
              className="btn" 
              style={{ background: '#6b7280', color: 'white', flex: 1, padding: '12px 24px', fontSize: '1rem', fontWeight: '600' }}
              onClick={onClose}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AddTransaction;

