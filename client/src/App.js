import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import SimpleDashboard from './components/SimpleDashboard';
import Transactions from './components/Transactions';
import AddTransaction from './components/AddTransaction';
import Settings from './components/Settings';
import SalaryManager from './components/SalaryManager';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ totalBalance: 0, monthlyIncome: 0, monthlyExpenses: 0, monthlyBalance: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = async () => {
    try {
      const [accountsRes, transactionsRes, categoriesRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/accounts`),
        fetch(`${API_URL}/transactions`),
        fetch(`${API_URL}/categories`),
        fetch(`${API_URL}/stats`)
      ]);

      const accountsData = await accountsRes.json();
      const transactionsData = await transactionsRes.json();
      const categoriesData = await categoriesRes.json();
      const statsData = await statsRes.json();
      
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setStats(statsData || { totalBalance: 0, monthlyIncome: 0, monthlyExpenses: 0, monthlyBalance: 0 });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  // Refresh data when switching to dashboard tab
  useEffect(() => {
    if (activeTab === 'dashboard') {
      // Small delay to ensure component is mounted
      setTimeout(() => {
        fetchData();
      }, 100);
    }
  }, [activeTab]);

  // Handle hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['dashboard', 'transactions', 'add', 'salary', 'settings'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Money Manager</h1>
        <p>Gerenciamento financeiro pessoal</p>
      </header>

      <nav className="app-nav">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={activeTab === 'transactions' ? 'active' : ''}
          onClick={() => setActiveTab('transactions')}
        >
          Despesas do Mês
        </button>
        <button 
          className={activeTab === 'add' ? 'active' : ''}
          onClick={() => setActiveTab('add')}
        >
          Nova Despesa
        </button>
        <button 
          className={activeTab === 'salary' ? 'active' : ''}
          onClick={() => setActiveTab('salary')}
        >
          Salário
        </button>
        <button 
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          Configurações
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'dashboard' && (
          <SimpleDashboard refreshKey={refreshKey} />
        )}
              {activeTab === 'transactions' && (
          <Transactions 
            transactions={Array.isArray(transactions) ? transactions : []}
            categories={Array.isArray(categories) ? categories : []}
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === 'add' && (
          <AddTransaction 
            accounts={Array.isArray(accounts) ? accounts : []}
            categories={Array.isArray(categories) ? categories : []}
            onRefresh={handleRefresh}
            onClose={() => setActiveTab('transactions')}
          />
        )}
        {activeTab === 'salary' && (
          <SalaryManager 
            accounts={Array.isArray(accounts) ? accounts : []}
            categories={Array.isArray(categories) ? categories : []}
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === 'settings' && (
          <Settings onRefresh={handleRefresh} />
        )}
      </main>
    </div>
  );
}

export default App;
