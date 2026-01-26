import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const API_URL = 'http://localhost:5000/api';

const History = () => {
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [historyMonths, setHistoryMonths] = useState(12);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchChartData();
  }, [historyMonths, selectedPeriod]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const [expensesRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/stats/expenses-by-category?start=${selectedPeriod.start}&end=${selectedPeriod.end}`),
        fetch(`${API_URL}/stats/balance-history?months=${historyMonths}`)
      ]);

      const expenses = await expensesRes.json();
      const history = await historyRes.json();

      setExpensesByCategory(Array.isArray(expenses) ? expenses : []);
      
      // Format month labels for better display
      const formattedHistory = Array.isArray(history) ? history.map(item => ({
        ...item,
        monthLabel: formatMonthLabel(item.month)
      })) : [];
      
      setBalanceHistory(formattedHistory);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setLoading(false);
    }
  };

  const formatMonthLabel = (monthString) => {
    if (!monthString) return '';
    const [year, month] = monthString.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${monthNames[parseInt(month) - 1]}/${year}`;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].name}</p>
          <p style={{ margin: '5px 0 0 0', color: payload[0].color }}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Carregando histórico...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: 0, color: '#1a202c', fontSize: '1.5rem', fontWeight: '600', letterSpacing: '-0.3px' }}>
          Histórico Financeiro
        </h2>
        <select
          value={historyMonths}
          onChange={(e) => setHistoryMonths(parseInt(e.target.value))}
          style={{
            padding: '10px 16px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '0.9rem',
            backgroundColor: 'white',
            color: '#374151',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          <option value={3}>Últimos 3 meses</option>
          <option value={6}>Últimos 6 meses</option>
          <option value={12}>Últimos 12 meses</option>
          <option value={24}>Últimos 24 meses</option>
        </select>
      </div>

      {/* Gráfico de Barras - Comparativo Mensal */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Receitas vs Despesas por Mês</h3>
        {!balanceHistory || balanceHistory.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
            Nenhum dado disponível
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={balanceHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <Legend />
              <Bar dataKey="income" fill="#10B981" name="Receitas" />
              <Bar dataKey="expenses" fill="#EF4444" name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabela de Histórico Mensal */}
      {balanceHistory && balanceHistory.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Resumo Mensal Detalhado</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>Mês</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>Receitas</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>Despesas</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>Saldo</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>% Economizado</th>
                </tr>
              </thead>
              <tbody>
                {balanceHistory.map((item, index) => {
                  const savingsPercentage = item.income > 0 
                    ? ((item.balance / item.income) * 100).toFixed(1) 
                    : '0.0';
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px', color: '#374151', fontWeight: '500' }}>{item.monthLabel}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#10B981', fontWeight: '600' }}>
                        {formatCurrency(item.income)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#EF4444', fontWeight: '600' }}>
                        {formatCurrency(item.expenses)}
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        textAlign: 'right', 
                        fontWeight: '600',
                        color: item.balance >= 0 ? '#10B981' : '#EF4444'
                      }}>
                        {formatCurrency(item.balance)}
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        textAlign: 'right', 
                        fontWeight: '600',
                        color: parseFloat(savingsPercentage) >= 0 ? '#10B981' : '#EF4444'
                      }}>
                        {savingsPercentage}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gráfico de Linha - Evolução do Saldo */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Evolução do Saldo ao Longo do Tempo</h3>
        {!balanceHistory || balanceHistory.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
            Nenhum dado disponível
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={balanceHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Receitas"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#EF4444" 
                strokeWidth={2}
                name="Despesas"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="balance" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Saldo"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gráfico de Pizza - Gastos por Categoria (Mês Atual) */}
      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Gastos por Categoria - Mês Atual</h3>
        {!expensesByCategory || expensesByCategory.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
            Nenhum dado disponível para o período selecionado
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {expensesByCategory && expensesByCategory.length > 0 && expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '20px' }}>
              {expensesByCategory && expensesByCategory.length > 0 && expensesByCategory.map((cat, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: expensesByCategory && index < expensesByCategory.length - 1 ? '1px solid #e5e7eb' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: cat.color || COLORS[index % COLORS.length], fontSize: '1.2rem' }}>
                      {cat.icon}
                    </span>
                    <span style={{ color: '#374151', fontWeight: '500' }}>{cat.name}</span>
                  </div>
                  <span style={{ fontWeight: 'bold', color: '#1a202c' }}>{formatCurrency(cat.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;





