import React from 'react';

const API_URL = 'http://localhost:5000/api';

const Settings = ({ onRefresh }) => {
  const handleClearData = async () => {
    if (window.confirm('⚠️ ATENÇÃO: Esta ação irá excluir TODAS as transações. As contas e categorias serão mantidas. Tem certeza?')) {
      if (window.confirm('Esta ação é IRREVERSÍVEL. Confirma a exclusão?')) {
        try {
          const response = await fetch(`${API_URL}/transactions/clear`, {
            method: 'DELETE',
          });

          if (response.ok) {
            alert('Todas as transações foram excluídas com sucesso!');
            onRefresh();
          } else {
            alert('Erro ao excluir transações');
          }
        } catch (error) {
          console.error('Error clearing transactions:', error);
          alert('Erro ao excluir transações');
        }
      }
    }
  };

  const handleExportAll = () => {
    fetch(`${API_URL}/transactions`)
      .then(res => res.json())
      .then(transactions => {
        const csv = [
          ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Conta'].join(','),
          ...transactions.map(t => [
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
        link.setAttribute('download', `todas_transacoes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(error => {
        console.error('Error exporting data:', error);
        alert('Erro ao exportar dados');
      });
  };

  return (
    <div>
      <h2 style={{ marginBottom: '32px', color: '#1a202c', fontSize: '1.5rem', fontWeight: '600', letterSpacing: '-0.3px' }}>Configurações</h2>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Exportação de Dados</h3>
        <p style={{ color: '#6b7280', marginBottom: '15px' }}>
          Exporte todas as suas transações para um arquivo CSV.
        </p>
        <button className="btn btn-primary" onClick={handleExportAll}>
          Exportar Todas as Transações
        </button>
      </div>

      <div className="card" style={{ marginBottom: '24px', border: '1px solid #fecaca' }}>
        <h3 style={{ marginBottom: '20px', color: '#dc2626' }}>Limpar Dados</h3>
        <p style={{ color: '#6b7280', marginBottom: '15px' }}>
          <strong>Atenção:</strong> Esta ação irá excluir todas as transações. 
          As contas e categorias serão mantidas. Esta ação é irreversível.
        </p>
        <button 
          className="btn btn-danger" 
          onClick={handleClearData}
        >
          Limpar Todas as Transações
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Sobre o Sistema</h3>
        <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
          <strong>Money Manager</strong> é um sistema completo de gerenciamento financeiro pessoal.
          <br /><br />
          <strong>Funcionalidades:</strong>
          <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
            <li>Registro de receitas e despesas</li>
            <li>Categorização de transações</li>
            <li>Dashboard com gráficos e estatísticas</li>
            <li>Filtros avançados por período, categoria e tipo</li>
            <li>Metas financeiras</li>
            <li>Alertas de gastos</li>
            <li>Exportação de dados</li>
          </ul>
          <br />
          <strong>Versão:</strong> 1.0.0
          <br />
          <strong>Backend:</strong> Go (Gin + SQLite)
          <br />
          <strong>Frontend:</strong> React
        </p>
      </div>
    </div>
  );
};

export default Settings;

