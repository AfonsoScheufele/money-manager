import React, { useState, useEffect } from 'react';
import Charts from './Charts';
import FinancialGoals from './FinancialGoals';
import Alerts from './Alerts';

const API_URL = 'http://localhost:5000/api';

const Dashboard = ({ stats, accounts, transactions }) => {
  // Ensure arrays are initialized
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const [comparison, setComparison] = useState(null);
  const [topExpenses, setTopExpenses] = useState([]);
  const [period] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [comparisonRes, topExpensesRes] = await Promise.all([
        fetch(`${API_URL}/stats/comparison`),
        fetch(`${API_URL}/stats/top-expenses?limit=5`)
      ]);

      const comparisonData = await comparisonRes.json();
      const topExpensesData = await topExpensesRes.json();
      
      setComparison(comparisonData);
      setTopExpenses(Array.isArray(topExpensesData) ? topExpensesData : []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercentage = (current, previous) => {
    if (!previous || previous === 0) return '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  return (
    <div>
      <h2 style={{ marginBottom: '32px', color: '#1a202c', fontSize: '1.5rem', fontWeight: '600', letterSpacing: '-0.3px' }}>Dashboard</h2>
      
      {/* Cards de Estatísticas */}
      <div className="stats-grid">
        <div className="stat-card balance">
          <h3>Saldo Total</h3>
          <div className="value">{formatCurrency(stats?.totalBalance || 0)}</div>
        </div>
        <div className="stat-card income">
          <h3>Receitas do Mês</h3>
          <div className="value">{formatCurrency(stats?.monthlyIncome || 0)}</div>
          {comparison && comparison.previous && (
            <div style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.9 }}>
              {formatPercentage(stats?.monthlyIncome || 0, comparison.previous.income)} vs mês anterior
            </div>
          )}
        </div>
        <div className="stat-card expense">
          <h3>Despesas do Mês</h3>
          <div className="value">{formatCurrency(stats?.monthlyExpenses || 0)}</div>
          {comparison && comparison.previous && (
            <div style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.9 }}>
              {formatPercentage(stats?.monthlyExpenses || 0, comparison.previous.expenses)} vs mês anterior
            </div>
          )}
        </div>
        <div className="stat-card" style={{ 
          background: (stats?.monthlyBalance || 0) >= 0 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
        }}>
          <h3>Balanço do Mês</h3>
          <div className="value">{formatCurrency(stats?.monthlyBalance || 0)}</div>
          {comparison && comparison.previous && (
            <div style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.9 }}>
              {formatPercentage(stats?.monthlyBalance || 0, comparison.previous.balance)} vs mês anterior
            </div>
          )}
        </div>
      </div>

      {/* Comparativo Mensal */}
      {comparison && comparison.current && comparison.previous && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Comparativo Mensal</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <h4 style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '10px' }}>Mês Atual</h4>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10B981' }}>
                {formatCurrency(comparison.current.income)}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Receitas</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#EF4444', marginTop: '10px' }}>
                {formatCurrency(comparison.current.expenses)}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Despesas</div>
            </div>
            <div>
              <h4 style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '10px' }}>Mês Anterior</h4>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10B981' }}>
                {formatCurrency(comparison.previous.income)}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Receitas</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#EF4444', marginTop: '10px' }}>
                {formatCurrency(comparison.previous.expenses)}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Despesas</div>
            </div>
            <div>
              <h4 style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '10px' }}>Variação</h4>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: comparison.current.income >= comparison.previous.income ? '#10B981' : '#EF4444' }}>
                {formatPercentage(comparison.current.income, comparison.previous.income)}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Receitas</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: comparison.current.expenses <= comparison.previous.expenses ? '#10B981' : '#EF4444', marginTop: '10px' }}>
                {formatPercentage(comparison.current.expenses, comparison.previous.expenses)}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Despesas</div>
            </div>
          </div>
        </div>
      )}

      {/* Maiores Gastos */}
      {topExpenses && topExpenses.length > 0 && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Maiores Gastos do Período</h3>
          <div className="transactions-list">
            {topExpenses.map((expense, index) => (
              <div key={index} className="transaction-item expense" style={{ marginBottom: '10px' }}>
                <div className="transaction-info">
                  <h4>
                    {expense.category_icon && `${expense.category_icon} `}
                    {expense.description || 'Sem descrição'}
                  </h4>
                  <p>
                    {expense.category_name || 'Sem categoria'} • 
                    {' '}{new Date(expense.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="transaction-amount expense">
                  {formatCurrency(expense.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráficos */}
      {period && <Charts period={period} />}

      {/* Metas e Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '32px' }}>
        <FinancialGoals 
          monthlyIncome={stats?.monthlyIncome || 0} 
          monthlyExpenses={stats?.monthlyExpenses || 0} 
        />
        <Alerts 
          monthlyExpenses={stats?.monthlyExpenses || 0} 
          transactions={safeTransactions} 
        />
      </div>

      {/* Contas e Últimas Transações */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '32px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Contas</h3>
          {safeAccounts.length === 0 ? (
            <p style={{ color: '#6b7280' }}>Nenhuma conta cadastrada</p>
          ) : (
            <div>
              {safeAccounts.map(account => (
                <div key={account.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '10px 0',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <span style={{ color: '#374151' }}>{account.name}</span>
                  <span style={{ fontWeight: 'bold', color: '#111827' }}>
                    {formatCurrency(account.balance)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Últimas Transações</h3>
          {safeTransactions.length === 0 ? (
            <p style={{ color: '#6b7280' }}>Nenhuma transação registrada</p>
          ) : (
            <div className="transactions-list">
              {safeTransactions.slice(0, 5).map(transaction => (
                <div key={transaction.id} className={`transaction-item ${transaction.type}`}>
                  <div className="transaction-info">
                    <h4>{transaction.description || 'Sem descrição'}</h4>
                    <p>{transaction.account_name} • {new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className={`transaction-amount ${transaction.type}`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
