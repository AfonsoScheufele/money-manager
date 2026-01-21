import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const API_URL = 'http://localhost:5000/api';

const Charts = ({ period }) => {
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure period is defined before fetching
    if (!period || !period.start || !period.end) {
      setLoading(false);
      return;
    }

    const fetchChartData = async () => {
      try {
        const [expensesRes, historyRes] = await Promise.all([
          fetch(`${API_URL}/stats/expenses-by-category?start=${period.start}&end=${period.end}`),
          fetch(`${API_URL}/stats/balance-history?months=6`)
        ]);

        const expenses = await expensesRes.json();
        const history = await historyRes.json();

        setExpensesByCategory(Array.isArray(expenses) ? expenses : []);
        setBalanceHistory(Array.isArray(history) ? history : []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching chart data:', error);
        setLoading(false);
      }
    };

    fetchChartData();
  }, [period]);

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

  // Ensure period is defined
  if (!period || !period.start || !period.end) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Período não definido</div>;
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Carregando gráficos...</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
      {/* Gráfico de Pizza - Gastos por Categoria */}
      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Gastos por Categoria</h3>
        {!expensesByCategory || expensesByCategory.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
            Nenhum dado disponível para o período selecionado
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
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
                  padding: '8px 0',
                  borderBottom: expensesByCategory && index < expensesByCategory.length - 1 ? '1px solid #e5e7eb' : 'none'
                }}>
                  <span>
                    <span style={{ color: cat.color || COLORS[index % COLORS.length] }}>{cat.icon}</span>
                    {' '}{cat.name}
                  </span>
                  <span style={{ fontWeight: 'bold' }}>{formatCurrency(cat.total)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Gráfico de Linha - Evolução do Saldo */}
      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Evolução do Saldo</h3>
        {!balanceHistory || balanceHistory.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
            Nenhum dado disponível
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={balanceHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
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
    </div>
  );
};

export default Charts;

