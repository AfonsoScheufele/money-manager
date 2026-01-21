import React, { useState, useEffect } from 'react';

const FinancialGoals = ({ monthlyIncome, monthlyExpenses }) => {
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('financialGoals');
    return saved ? JSON.parse(saved) : [];
  });
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    target: '',
    deadline: '',
    type: 'savings'
  });

  useEffect(() => {
    localStorage.setItem('financialGoals', JSON.stringify(goals));
  }, [goals]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newGoal = {
      id: Date.now(),
      ...formData,
      target: parseFloat(formData.target),
      progress: 0,
      createdAt: new Date().toISOString()
    };
    setGoals([...goals, newGoal]);
    setFormData({ name: '', target: '', deadline: '', type: 'savings' });
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta meta?')) {
      setGoals(goals.filter(g => g.id !== id));
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const monthlySavings = monthlyIncome - monthlyExpenses;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: '#1a202c' }}>Metas Financeiras</h3>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Nova Meta
        </button>
      </div>

      {monthlySavings > 0 && (
        <div style={{
          padding: '15px',
          background: '#F0FDF4',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #10B981'
        }}>
          <p style={{ margin: 0, color: '#065F46', fontWeight: '600' }}>
            💰 Você está economizando {formatCurrency(monthlySavings)} por mês
          </p>
        </div>
      )}

      {goals.length === 0 ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
          Nenhuma meta cadastrada. Crie uma meta para começar!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {goals.map(goal => {
            const progress = (goal.progress / goal.target) * 100;
            const monthsNeeded = monthlySavings > 0 ? Math.ceil((goal.target - goal.progress) / monthlySavings) : 0;

            return (
              <div key={goal.id} style={{
                padding: '15px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: '#f9fafb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 5px 0', color: '#111827' }}>{goal.name}</h4>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                      Meta: {formatCurrency(goal.target)} • Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => handleDelete(goal.id)}
                    title="Excluir"
                  >
                    Excluir
                  </button>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#374151' }}>
                      {formatCurrency(goal.progress)} / {formatCurrency(goal.target)}
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#111827' }}>
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '10px',
                    background: '#e5e7eb',
                    borderRadius: '5px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.min(progress, 100)}%`,
                      height: '100%',
                      background: progress >= 100 ? '#10B981' : '#3B82F6',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {monthlySavings > 0 && progress < 100 && (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                    ⏱️ Estimativa: {monthsNeeded} {monthsNeeded === 1 ? 'mês' : 'meses'} para alcançar
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nova Meta Financeira</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome da Meta</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Viagem para Europa"
                  required
                />
              </div>
              <div className="form-group">
                <label>Valor da Meta (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Prazo</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="savings">💰 Economia</option>
                  <option value="expense">💸 Gasto Planejado</option>
                  <option value="investment">📈 Investimento</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Criar Meta
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialGoals;

