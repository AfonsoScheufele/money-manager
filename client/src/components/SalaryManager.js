import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

const SalaryManager = ({ accounts, categories, onRefresh }) => {
  const [salaryConfig, setSalaryConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExtraIncome, setShowExtraIncome] = useState(false);
  const [localAccounts, setLocalAccounts] = useState(accounts);
  const [formData, setFormData] = useState({
    amount: '',
    account_id: accounts.length > 0 ? accounts[0].id : '',
    category_id: ''
  });
  const [extraIncomeForm, setExtraIncomeForm] = useState({
    amount: '',
    account_id: accounts.length > 0 ? accounts[0].id : '',
    category_id: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    fetchSalaryConfig();
  }, []);

  useEffect(() => {
    if (localAccounts.length > 0 && !formData.account_id) {
      setFormData({ ...formData, account_id: localAccounts[0].id });
      setExtraIncomeForm({ ...extraIncomeForm, account_id: localAccounts[0].id });
    }
  }, [localAccounts]);

  const ensureAccountExists = async () => {
    if (localAccounts.length > 0) {
      return localAccounts[0].id;
    }

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
      const updatedAccounts = Array.isArray(accountsData) ? accountsData : [];
      setLocalAccounts(updatedAccounts);
      
      return newAccountId;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  };

  const fetchSalaryConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/salary`);
      const data = await response.json();
      if (data.exists) {
        setSalaryConfig(data.config);
        setFormData({
          amount: data.config.amount.toString(),
          account_id: data.config.account_id,
          category_id: data.config.category_id || ''
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching salary config:', error);
      setLoading(false);
    }
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    try {
      // Ensure account exists before saving salary
      let accountId = formData.account_id;
      if (!accountId || localAccounts.length === 0) {
        accountId = await ensureAccountExists();
        setFormData({ ...formData, account_id: accountId });
      }

      const response = await fetch(`${API_URL}/salary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          account_id: parseInt(accountId),
          category_id: formData.category_id ? parseInt(formData.category_id) : null
        }),
      });

      if (response.ok) {
        await fetchSalaryConfig();
        onRefresh(); // Refresh accounts in parent
        alert('Salário configurado com sucesso!');
      } else {
        const errorData = await response.json();
        alert('Erro ao salvar configuração: ' + (errorData.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Error saving salary:', error);
      alert('Erro ao salvar configuração: ' + error.message);
    }
  };

  const handleProcessSalary = async () => {
    if (!window.confirm('Deseja processar o salário agora?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/salary/process`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Salário processado com sucesso!');
        onRefresh();
        await fetchSalaryConfig();
      } else {
        alert('Erro ao processar salário');
      }
    } catch (error) {
      console.error('Error processing salary:', error);
      alert('Erro ao processar salário');
    }
  };

  const handleAddExtraIncome = async (e) => {
    e.preventDefault();
    try {
      // Ensure account exists before adding extra income
      let accountId = extraIncomeForm.account_id;
      if (!accountId || localAccounts.length === 0) {
        accountId = await ensureAccountExists();
        setExtraIncomeForm({ ...extraIncomeForm, account_id: accountId });
      }

      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: parseInt(accountId),
          category_id: extraIncomeForm.category_id ? parseInt(extraIncomeForm.category_id) : null,
          type: 'income',
          amount: parseFloat(extraIncomeForm.amount),
          description: extraIncomeForm.description || 'Receita extra',
          date: extraIncomeForm.date
        }),
      });

      if (response.ok) {
        setExtraIncomeForm({
          amount: '',
          account_id: localAccounts.length > 0 ? localAccounts[0].id : '',
          category_id: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        setShowExtraIncome(false);
        alert('Receita extra adicionada com sucesso!');
        onRefresh();
      } else {
        const errorData = await response.json();
        alert('Erro ao adicionar receita extra: ' + (errorData.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Error adding extra income:', error);
      alert('Erro ao adicionar receita extra: ' + error.message);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getNextSalaryDate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // Get first business day
    let firstBusinessDay = nextMonth;
    if (firstBusinessDay.getDay() === 6) { // Saturday
      firstBusinessDay = new Date(firstBusinessDay.getTime() + 2 * 24 * 60 * 60 * 1000);
    } else if (firstBusinessDay.getDay() === 0) { // Sunday
      firstBusinessDay = new Date(firstBusinessDay.getTime() + 1 * 24 * 60 * 60 * 1000);
    }
    
    return firstBusinessDay.toLocaleDateString('pt-BR');
  };

  const incomeCategories = categories.filter(cat => cat.type === 'income');

  if (loading) {
    return <div className="card">Carregando...</div>;
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Configuração de Salário</h3>
        
        <form onSubmit={handleSaveSalary}>
          <div className="form-group">
            <label>Valor do Salário (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Ex: 5000.00"
              required
            />
          </div>

          <div className="form-group">
            <label>Categoria (opcional)</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            >
              <option value="">Salário (padrão)</option>
              {incomeCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ 
            padding: '16px', 
            background: '#f8fafc', 
            borderRadius: '6px', 
            marginBottom: '20px',
            border: '1px solid #e2e8f0'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
              <strong style={{ color: '#1a202c' }}>Como funciona:</strong>
            </p>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '0.875rem', color: '#64748b' }}>
              <li>O salário será adicionado automaticamente no primeiro dia útil de cada mês</li>
              <li>Próximo pagamento: {getNextSalaryDate()}</li>
              <li>Você pode alterar o valor do salário a qualquer momento</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary">
              {salaryConfig ? 'Atualizar Salário' : 'Configurar Salário'}
            </button>
            {salaryConfig && (
              <button 
                type="button" 
                className="btn btn-success"
                onClick={handleProcessSalary}
              >
                Processar Salário Agora
              </button>
            )}
          </div>
        </form>

        {salaryConfig && (
          <div style={{ 
            marginTop: '24px', 
            padding: '16px', 
            background: '#f0fdf4', 
            borderRadius: '6px',
            border: '1px solid #10b981'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#065f46' }}>
              <strong>Salário configurado:</strong> {formatCurrency(salaryConfig.amount)} por mês
            </p>
            {salaryConfig.last_paid_month && (
              <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', color: '#047857' }}>
                Último pagamento: {salaryConfig.last_paid_month}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: '#1a202c' }}>Receitas Extras</h3>
          <button 
            className="btn btn-primary"
            onClick={() => setShowExtraIncome(!showExtraIncome)}
          >
            {showExtraIncome ? 'Cancelar' : 'Adicionar Receita Extra'}
          </button>
        </div>

        {showExtraIncome && (
          <form onSubmit={handleAddExtraIncome} style={{ marginTop: '20px' }}>
            <div className="form-group">
              <label>Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={extraIncomeForm.amount}
                onChange={(e) => setExtraIncomeForm({ ...extraIncomeForm, amount: e.target.value })}
                required
              />
            </div>


            <div className="form-group">
              <label>Categoria</label>
              <select
                value={extraIncomeForm.category_id}
                onChange={(e) => setExtraIncomeForm({ ...extraIncomeForm, category_id: e.target.value })}
              >
                <option value="">Sem categoria</option>
                {incomeCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Descrição</label>
              <input
                type="text"
                value={extraIncomeForm.description}
                onChange={(e) => setExtraIncomeForm({ ...extraIncomeForm, description: e.target.value })}
                placeholder="Ex: Freelance, Bônus, etc."
              />
            </div>

            <div className="form-group">
              <label>Data</label>
              <input
                type="date"
                value={extraIncomeForm.date}
                onChange={(e) => setExtraIncomeForm({ ...extraIncomeForm, date: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
              Adicionar Receita Extra
            </button>
          </form>
        )}

        {!showExtraIncome && (
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            Adicione receitas extras que você ganhar além do salário mensal, como freelances, bônus, vendas, etc.
          </p>
        )}
      </div>
    </div>
  );
};

export default SalaryManager;

