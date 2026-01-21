import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

const SimpleDashboard = ({ refreshKey }) => {
  const [salaryConfig, setSalaryConfig] = useState(null);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  // Refresh when component becomes visible (user switches to dashboard tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };
    
    // Refresh immediately when component mounts
    fetchData();
    
    // Also refresh when tab becomes visible
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch accounts
      const accountsRes = await fetch(`${API_URL}/accounts`);
      const accountsData = await accountsRes.json();
      const accountsArray = Array.isArray(accountsData) ? accountsData : [];
      setAccounts(accountsArray);
      
      // If no account exists but user created one, it should appear here
      console.log('Accounts loaded:', accountsArray);

      // Fetch categories
      const categoriesRes = await fetch(`${API_URL}/categories`);
      const categoriesData = await categoriesRes.json();
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);

      // Fetch salary config
      const salaryRes = await fetch(`${API_URL}/salary`);
      const salaryData = await salaryRes.json();
      if (salaryData.exists && salaryData.config) {
        const config = salaryData.config;
        console.log('Salary config loaded:', config);
        console.log('Current account:', accountsArray[0]?.id);
        
        // If salary is configured for a different account, update it to use current account
        if (accountsArray.length > 0 && config.account_id !== accountsArray[0].id) {
          console.log('Account mismatch detected. Updating salary config to use current account.');
          console.log('Old account_id:', config.account_id, 'New account_id:', accountsArray[0].id);
          // Auto-update salary config to use current account
          try {
            const updateRes = await fetch(`${API_URL}/salary`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: config.amount,
                account_id: accountsArray[0].id,
                category_id: config.category_id
              }),
            });
            const updateData = await updateRes.json();
            console.log('Update response:', updateData);
            if (updateRes.ok && updateData.config) {
              setSalaryConfig(updateData.config);
              console.log('Salary config updated successfully');
              return; // Exit early since we already set the config
            } else {
              console.error('Failed to update salary config:', updateData);
            }
          } catch (error) {
            console.error('Error updating salary account:', error);
          }
        }
        
        setSalaryConfig(config);
      } else {
        setSalaryConfig(null);
      }

      // Fetch current month expenses
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const transactionsRes = await fetch(`${API_URL}/transactions`);
      const transactionsData = await transactionsRes.json();
      const expenses = Array.isArray(transactionsData) 
        ? transactionsData.filter(t => 
            t.type === 'expense' && 
            t.date >= startDate && 
            t.date <= endDate
          )
        : [];
      setMonthlyExpenses(expenses);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Excluir esta despesa?')) return;

    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Erro ao excluir despesa');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const totalExpenses = monthlyExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  // Use saved salary config
  const salaryAmount = salaryConfig ? salaryConfig.amount : 0;
  const remaining = salaryAmount - totalExpenses;
  const savingsPercentage = salaryAmount > 0 ? ((remaining / salaryAmount) * 100).toFixed(1) : 0;

  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: 0, color: '#1a202c', fontSize: '1.5rem', fontWeight: '600', letterSpacing: '-0.3px' }}>
          Dashboard - {currentMonth}
        </h2>
        <button 
          className="btn btn-primary"
          onClick={fetchData}
          style={{ padding: '8px 16px', fontSize: '0.875rem' }}
        >
          Atualizar
        </button>
      </div>


      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="stat-card balance">
          <h3>Salário</h3>
          <div className="value">{formatCurrency(salaryAmount)}</div>
        </div>
        <div className="stat-card expense">
          <h3>Total de Despesas</h3>
          <div className="value">{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="stat-card" style={{
          background: remaining >= 0 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white'
        }}>
          <h3>O que Vai Sobrar</h3>
          <div className="value">{formatCurrency(remaining)}</div>
        </div>
        <div className="stat-card" style={{
          background: remaining >= 0 
            ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
            : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white'
        }}>
          <h3>% para Guardar</h3>
          <div className="value">{savingsPercentage}%</div>
        </div>
      </div>

      {/* Lista de Despesas */}
      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Despesas do Mês</h3>
        {monthlyExpenses.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
            Nenhuma despesa adicionada ainda
          </p>
        ) : (
          <>
            <div className="transactions-list">
              {monthlyExpenses.map(expense => (
                <div key={expense.id} className="transaction-item expense">
                  <div className="transaction-info">
                    <h4>{expense.description || 'Sem descrição'}</h4>
                    <p>{new Date(expense.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="transaction-amount expense">
                      {formatCurrency(expense.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
                Para adicionar ou editar despesas, use a aba <strong>"Nova Despesa"</strong> ou <strong>"Despesas do Mês"</strong>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SimpleDashboard;

