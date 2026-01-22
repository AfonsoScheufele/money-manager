import React, { useState, useMemo } from 'react';
import TransactionFilters from './TransactionFilters';

const API_URL = 'http://localhost:5000/api';

const Transactions = ({ transactions, categories, onRefresh }) => {
  const [filters, setFilters] = useState({
    period: 'all',
    category: '',
    type: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const filteredTransactions = useMemo(() => {
    const getPeriodDates = (period) => {
      const now = new Date();
      let start, end;

      switch (period) {
        case 'current-month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'last-3-months':
          start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'current-year':
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 11, 31);
          break;
        case 'custom':
          return { start: filters.startDate, end: filters.endDate };
        default:
          return { start: null, end: null };
      }

      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      };
    };

    let filtered = [...transactions];

    // Filter by period
    if (filters.period !== 'all') {
      const periodDates = getPeriodDates(filters.period);
      if (periodDates.start && periodDates.end) {
        filtered = filtered.filter(t => {
          const date = t.date.split('T')[0];
          return date >= periodDates.start && date <= periodDates.end;
        });
      }
    }

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter(t => t.category_id === parseInt(filters.category));
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        (t.description || '').toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [transactions, filters.period, filters.type, filters.category, filters.search, filters.startDate, filters.endDate]);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      try {
        const response = await fetch(`${API_URL}/transactions/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          onRefresh();
        }
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Erro ao excluir transação');
      }
    }
  };

  const handleEdit = (transaction) => {
    setEditingId(transaction.id);
    setEditForm({
      account_id: transaction.account_id,
      category_id: transaction.category_id || '',
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description || '',
      date: transaction.date.split('T')[0]
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/transactions/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editForm,
          account_id: parseInt(editForm.account_id),
          amount: parseFloat(editForm.amount),
          category_id: editForm.category_id ? parseInt(editForm.category_id) : null
        }),
      });

      if (response.ok) {
        setEditingId(null);
        setEditForm({});
        onRefresh();
      } else {
        alert('Erro ao atualizar transação');
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Erro ao atualizar transação');
    }
  };

  const handleExport = () => {
    const csv = [
      ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Conta'].join(','),
      ...filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.type === 'income' ? 'Receita' : 'Despesa',
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.category_name || 'Sem categoria',
        t.amount.toFixed(2),
        t.account_name || 'Sem conta'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transacoes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCategories = categories.filter(cat => !editForm.type || cat.type === editForm.type);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ color: '#1a202c', fontSize: '1.5rem', fontWeight: '600', letterSpacing: '-0.3px' }}>Transações</h2>
        <button className="btn btn-primary" onClick={handleExport}>
          Exportar CSV
        </button>
      </div>

      <TransactionFilters 
        categories={categories} 
        onFilterChange={setFilters}
      />

      <div style={{ marginTop: '24px', marginBottom: '24px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', color: '#64748b' }}>
        <strong style={{ color: '#1a202c' }}>Total encontrado: {filteredTransactions.length} transação(ões)</strong>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhuma transação encontrada</h3>
          <p>Tente ajustar os filtros</p>
        </div>
      ) : (
        <div className="transactions-list">
          {filteredTransactions.map(transaction => (
            <div key={transaction.id}>
              {editingId === transaction.id ? (
                <form onSubmit={handleUpdate} className="card" style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div className="form-group">
                      <label>Tipo</label>
                      <select
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value, category_id: '' })}
                        required
                      >
                        <option value="expense">💸 Despesa</option>
                        <option value="income">💰 Receita</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Categoria</label>
                      <select
                        value={editForm.category_id}
                        onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                      >
                        <option value="">Sem categoria</option>
                        {filteredCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
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
                        value={editForm.amount}
                        onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Data</label>
                      <input
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Descrição</label>
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button type="submit" className="btn btn-primary">
                      Salvar
                    </button>
                    <button 
                      type="button" 
                      className="btn" 
                      style={{ background: '#6b7280', color: 'white' }}
                      onClick={() => {
                        setEditingId(null);
                        setEditForm({});
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className={`transaction-item ${transaction.type}`}>
                  <div className="transaction-info">
                    <h4>
                      {transaction.category_icon && `${transaction.category_icon} `}
                      {transaction.description || 'Sem descrição'}
                    </h4>
                    <p>
                      {transaction.account_name} • {transaction.category_name || 'Sem categoria'} • 
                      {' '}{new Date(transaction.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className={`transaction-amount ${transaction.type}`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </div>
                    <button 
                      className="btn" 
                      style={{ padding: '8px 12px', fontSize: '0.9rem', background: '#3B82F6', color: 'white' }}
                      onClick={() => handleEdit(transaction)}
                      title="Editar"
                    >
                      Editar
                    </button>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                      onClick={() => handleDelete(transaction.id)}
                      title="Excluir"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Transactions;
