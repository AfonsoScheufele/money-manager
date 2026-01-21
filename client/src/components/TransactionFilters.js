import React, { useState } from 'react';

const TransactionFilters = ({ categories, onFilterChange }) => {
  const [filters, setFilters] = useState({
    period: 'current-month',
    category: '',
    type: '',
    search: '',
    startDate: '',
    endDate: ''
  });

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

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
        return { start: '', end: '' };
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  return (
    <div className="filters-container">
      <div className="filters-grid">
        <div className="form-group">
          <label>Período</label>
          <select
            value={filters.period}
            onChange={(e) => handleFilterChange('period', e.target.value)}
          >
            <option value="current-month">Mês Atual</option>
            <option value="last-3-months">Últimos 3 Meses</option>
            <option value="current-year">Ano Atual</option>
            <option value="custom">Personalizado</option>
            <option value="all">Todos</option>
          </select>
        </div>

        {filters.period === 'custom' && (
          <>
            <div className="form-group">
              <label>Data Inicial</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Data Final</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label>Tipo</label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            <option value="">Todos</option>
            <option value="income">💰 Receita</option>
            <option value="expense">💸 Despesa</option>
          </select>
        </div>

        <div className="form-group">
          <label>Categoria</label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="">Todas</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Buscar por descrição</label>
          <input
            type="text"
            placeholder="Digite para buscar..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default TransactionFilters;

