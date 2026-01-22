import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

const InvestmentRecommendations = () => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recommendationsRes, investmentsRes] = await Promise.all([
        fetch(`${API_URL}/investments/recommendations`),
        fetch(`${API_URL}/investments`)
      ]);

      const recommendationsData = await recommendationsRes.json();
      const investmentsData = await investmentsRes.json();

      setRecommendations(recommendationsData);
      setInvestments(Array.isArray(investmentsData) ? investmentsData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const handleAddToPortfolio = (rec) => {
    // Store recommendation data to pass to portfolio page
    const data = {
      ticker: rec.ticker,
      name: rec.name,
      type: rec.type
    };
    localStorage.setItem('recommendedInvestment', JSON.stringify(data));
    // Navigate to portfolio page
    window.location.hash = '#portfolio';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '1.2rem', color: '#6b7280', marginBottom: '16px' }}>
          Analisando sua carteira e buscando oportunidades...
        </div>
        <div style={{ color: '#9ca3af' }}>Isso pode levar alguns segundos</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1a202c', fontSize: '1.5rem', fontWeight: '600', letterSpacing: '-0.3px' }}>
            💡 Investimentos Recomendados
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
            Sugestões personalizadas baseadas na análise da sua carteira
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn btn-primary"
          style={{ padding: '10px 20px', fontSize: '0.9rem' }}
        >
          {loading ? 'Atualizando...' : '🔄 Atualizar Recomendações'}
        </button>
      </div>

      {/* Análise da Carteira */}
      {recommendations && recommendations.portfolio_analysis && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '16px', color: '#1a202c' }}>📊 Análise da sua Carteira</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>Total Investido</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1a202c' }}>
                {formatCurrency(recommendations.portfolio_analysis.total_invested)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>Investimentos</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1a202c' }}>
                {recommendations.portfolio_analysis.owned_count}
              </div>
            </div>
            {recommendations.portfolio_analysis.type_distribution && Object.keys(recommendations.portfolio_analysis.type_distribution).length > 0 && (
              <div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px' }}>Distribuição</div>
                {Object.entries(recommendations.portfolio_analysis.type_distribution).map(([type, percentage]) => (
                  <div key={type} style={{ marginBottom: '4px', fontSize: '0.9rem' }}>
                    <span style={{ color: '#374151' }}>{type}:</span>{' '}
                    <span style={{ fontWeight: '600', color: '#1a202c' }}>{percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recomendações */}
      {recommendations && recommendations.recommendations && recommendations.recommendations.length > 0 ? (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Baseado na análise da sua carteira atual, aqui estão investimentos que podem ajudar a{' '}
              <strong>diversificar</strong> e <strong>potencializar seus ganhos</strong>. Cada recomendação inclui uma justificativa detalhada.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            {recommendations.recommendations.map((rec, index) => (
              <div
                key={index}
                className="card"
                style={{
                  padding: '24px',
                  border: '2px solid #3b82f6',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1.5rem', color: '#1a202c', fontWeight: '700' }}>
                        {rec.ticker}
                      </strong>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        background: rec.type === 'FII' ? '#3b82f6' : rec.type === 'Ação' ? '#10b981' : '#f59e0b',
                        color: 'white',
                        fontWeight: '600'
                      }}>
                        {rec.type}
                      </span>
                      {rec.priority === 'alta' && (
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          background: '#ef4444',
                          color: 'white',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          ⭐ Alta Prioridade
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '1.1rem', color: '#374151', marginBottom: '12px', fontWeight: '500' }}>
                      {rec.name}
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: '#6b7280', 
                      marginBottom: '16px',
                      padding: '8px 12px',
                      background: 'white',
                      borderRadius: '6px',
                      display: 'inline-block'
                    }}>
                      <strong>📁 Categoria:</strong> {rec.category}
                    </div>
                    <div style={{
                      padding: '16px',
                      borderRadius: '8px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      fontSize: '0.95rem',
                      color: '#374151',
                      lineHeight: '1.7'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>💡</span>
                        <strong style={{ color: '#1a202c' }}>Por que investir:</strong>
                      </div>
                      <div style={{ paddingLeft: '28px', color: '#4b5563' }}>
                        {rec.reason}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleAddToPortfolio(rec)}
                  className="btn"
                  style={{
                    marginTop: '16px',
                    padding: '12px 24px',
                    fontSize: '1rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#059669';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#10b981';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ➕ Adicionar à Carteira
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '1.2rem', color: '#6b7280', marginBottom: '12px' }}>
            {investments.length === 0 
              ? '📊 Adicione investimentos à sua carteira para receber recomendações personalizadas.'
              : '✅ Sua carteira já está bem diversificada!'}
          </div>
          <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            {investments.length === 0 
              ? 'Comece adicionando alguns investimentos e depois volte aqui para ver sugestões baseadas na sua carteira.'
              : 'Continue monitorando e ajustando conforme necessário. As recomendações serão atualizadas automaticamente conforme sua carteira evolui.'}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentRecommendations;

