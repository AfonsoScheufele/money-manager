import React, { useState, useEffect, useRef } from 'react';

const API_URL = 'http://localhost:5000/api';

const Portfolio = () => {
  const [investments, setInvestments] = useState([]);
  const [summary, setSummary] = useState({
    count: 0,
    total_invested: 0,
    total_current_value: 0,
    total_profit_loss: 0,
    total_profit_loss_percent: 0
  });
  const [loading, setLoading] = useState(true);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [updatingPriceId, setUpdatingPriceId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [sellingId, setSellingId] = useState(null);
  const [sellForm, setSellForm] = useState({
    quantity: '',
    sell_price: '',
    account_id: ''
  });
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    ticker: '',
    name: '',
    type: 'FII',
    quantity: '',
    average_price: '',
    notes: ''
  });
  const tickerInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Lista de investimentos populares brasileiros
  const popularInvestments = [
    // FIIs
    { ticker: 'MXRF11', name: 'Maxi Renda', type: 'FII' },
    { ticker: 'HGLG11', name: 'CSHG Logística', type: 'FII' },
    { ticker: 'XPLG11', name: 'XP Log', type: 'FII' },
    { ticker: 'HFOF11', name: 'Hedge Top FOFII', type: 'FII' },
    { ticker: 'KNRI11', name: 'Kinea Rendimentos Imobiliários', type: 'FII' },
    { ticker: 'VISC11', name: 'Vinci Shopping Centers', type: 'FII' },
    { ticker: 'HGRU11', name: 'CSHG Renda Urbana', type: 'FII' },
    { ticker: 'XPML11', name: 'XP Malls', type: 'FII' },
    { ticker: 'RBRF11', name: 'RBR Alpha Fundo de Fundos', type: 'FII' },
    { ticker: 'HGRE11', name: 'CSHG Real Estate', type: 'FII' },
    { ticker: 'VILG11', name: 'Vinci Logística', type: 'FII' },
    { ticker: 'HCTR11', name: 'Hectare CE', type: 'FII' },
    { ticker: 'BRCO11', name: 'BR Properties', type: 'FII' },
    { ticker: 'HABT11', name: 'Habitat II', type: 'FII' },
    { ticker: 'RBRP11', name: 'RBR Properties', type: 'FII' },
    { ticker: 'IRDM11', name: 'Iridium', type: 'FII' },
    { ticker: 'VINO11', name: 'Vinci Offices', type: 'FII' },
    { ticker: 'CPTS11', name: 'Capitania Securities', type: 'FII' },
    { ticker: 'RBRY11', name: 'RBR Yield', type: 'FII' },
    { ticker: 'RBRL11', name: 'RBR Log', type: 'FII' },
    { ticker: 'BTLG11', name: 'BTG Pactual Logística', type: 'FII' },
    { ticker: 'GGRC11', name: 'GGR Covepi', type: 'FII' },
    { ticker: 'RBRR11', name: 'RBR Rendimento', type: 'FII' },
    // Ações
    { ticker: 'ITUB4', name: 'Itaú Unibanco', type: 'Ação' },
    { ticker: 'PETR4', name: 'Petrobras', type: 'Ação' },
    { ticker: 'VALE3', name: 'Vale', type: 'Ação' },
    { ticker: 'BBDC4', name: 'Bradesco', type: 'Ação' },
    { ticker: 'ABEV3', name: 'Ambev', type: 'Ação' },
    { ticker: 'WEGE3', name: 'WEG', type: 'Ação' },
    { ticker: 'MGLU3', name: 'Magazine Luiza', type: 'Ação' },
    { ticker: 'RENT3', name: 'Localiza', type: 'Ação' },
    { ticker: 'RAIL3', name: 'Rumo', type: 'Ação' },
    { ticker: 'SUZB3', name: 'Suzano', type: 'Ação' },
    { ticker: 'ELET3', name: 'Eletrobras', type: 'Ação' },
    { ticker: 'BBAS3', name: 'Banco do Brasil', type: 'Ação' },
    { ticker: 'RADL3', name: 'Raia Drogasil', type: 'Ação' },
    { ticker: 'CMIG4', name: 'Cemig', type: 'Ação' },
    { ticker: 'CSAN3', name: 'Cosan', type: 'Ação' },
    // ETFs
    { ticker: 'BOVA11', name: 'iShares Ibovespa', type: 'ETF' },
    { ticker: 'SMAL11', name: 'iShares Small Cap', type: 'ETF' },
    { ticker: 'IVVB11', name: 'iShares S&P 500', type: 'ETF' },
    { ticker: 'BBSD11', name: 'BB Seguridade', type: 'ETF' },
    { ticker: 'DIVO11', name: 'iShares Dividendos', type: 'ETF' },
    { ticker: 'FIND11', name: 'iShares FIIs', type: 'ETF' },
    { ticker: 'ISUS11', name: 'iShares Sustentabilidade', type: 'ETF' },
  ];

  const investmentTypes = [
    { value: 'FII', label: 'FII (Fundos Imobiliários)' },
    { value: 'Ação', label: 'Ação' },
    { value: 'ETF', label: 'ETF' },
    { value: 'Tesouro', label: 'Tesouro Direto' },
    { value: 'CDB', label: 'CDB' },
    { value: 'LCI/LCA', label: 'LCI/LCA' },
    { value: 'Debênture', label: 'Debênture' },
    { value: 'Outro', label: 'Outro' }
  ];

  useEffect(() => {
    fetchData();
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/accounts`);
      const data = await response.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  // Check for recommended investment from Recommendations page
  useEffect(() => {
    const recommended = localStorage.getItem('recommendedInvestment');
    if (recommended) {
      try {
        const data = JSON.parse(recommended);
        setFormData(prev => ({
          ...prev,
          ticker: data.ticker,
          name: data.name,
          type: data.type
        }));
        localStorage.removeItem('recommendedInvestment');
        // Navigate to portfolio tab if not already there
        if (window.location.hash !== '#portfolio') {
          window.location.hash = '#portfolio';
        }
      } catch (e) {
        console.error('Error parsing recommended investment:', e);
      }
    }
  }, []);

  // Auto-refresh data every 10 minutes (server updates prices automatically)
  useEffect(() => {
    if (investments.length === 0) return;
    
    const refreshInterval = setInterval(() => {
      fetchData(); // Just refresh data, don't trigger price updates
    }, 600000); // 10 minutes
    
    return () => clearInterval(refreshInterval);
  }, [investments.length]);

  const fetchData = async () => {
    try {
      const [investmentsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/investments`),
        fetch(`${API_URL}/investments/summary`)
      ]);

      const investmentsData = await investmentsRes.json();
      const summaryData = await summaryRes.json();

      setInvestments(Array.isArray(investmentsData) ? investmentsData : []);
      setSummary(summaryData || summary);
      setLoading(false);
      
      // Fetch analysis after data is loaded
      if (Array.isArray(investmentsData) && investmentsData.length > 0) {
        fetchAnalysis();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const res = await fetch(`${API_URL}/investments/analysis`);
      const data = await res.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Error fetching analysis:', error);
    } finally {
      setLoadingAnalysis(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // If average_price is not filled, try to fetch current price to use as average
      let averagePrice = formData.average_price ? parseFloat(formData.average_price) : null;
      
      if (!averagePrice && formData.ticker) {
        try {
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const priceRes = await fetch(`${API_URL}/investments/fetch-price?ticker=${formData.ticker.toUpperCase()}`);
          const priceData = await priceRes.json();
          
          if (priceRes.ok && priceData.price) {
            averagePrice = priceData.price;
          } else {
            // Error fetching price - check if it's rate limit
            if (priceRes.status === 429) {
              alert(
                'Muitas requisições ao Yahoo Finance. Aguarde alguns minutos e tente novamente, ou preencha o preço médio manualmente.'
              );
            } else {
              alert(
                `Não foi possível buscar o preço automaticamente: ${priceData.error || 'Erro desconhecido'}\n\n` +
                'Por favor, preencha o preço médio manualmente antes de salvar.'
              );
            }
            return; // User needs to fill manually
          }
        } catch (error) {
          console.error('Error fetching price:', error);
          alert(
            'Erro ao buscar preço. Por favor, preencha o preço médio manualmente antes de salvar.'
          );
          return;
        }
      }
      
      if (!averagePrice) {
        alert('Por favor, preencha o preço médio antes de salvar.');
        return;
      }
      
      const payload = {
        ticker: formData.ticker.toUpperCase(),
        name: formData.name,
        type: formData.type,
        quantity: parseFloat(formData.quantity),
        average_price: averagePrice,
        current_price: averagePrice, // Use same price as current initially, will be updated
        notes: formData.notes || null
      };

      const url = editingId 
        ? `${API_URL}/investments/${editingId}`
        : `${API_URL}/investments`;
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const savedInvestment = await response.json();
        resetForm();
        // After creating/updating, fetch the price automatically
        const investmentId = editingId || savedInvestment.id;
        if (investmentId) {
          await updateSinglePrice(investmentId);
        }
        fetchData();
      } else {
        const errorData = await response.json();
        alert('Erro: ' + (errorData.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Error saving investment:', error);
      alert('Erro ao salvar investimento');
    }
  };

  const updateSinglePrice = async (id) => {
    setUpdatingPriceId(id);
    try {
      const response = await fetch(`${API_URL}/investments/${id}/update-price`, {
        method: 'POST'
      });

      if (response.ok) {
        fetchData();
      } else {
        const errorData = await response.json();
        console.error('Error updating price:', errorData.error);
      }
    } catch (error) {
      console.error('Error updating price:', error);
    } finally {
      setUpdatingPriceId(null);
    }
  };

  const updateAllPrices = async (silent = false) => {
    setUpdatingPrices(true);
    try {
      const response = await fetch(`${API_URL}/investments/update-all-prices`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        fetchData();
        if (!silent) {
          let message = `Preços atualizados! ${result.updated} sucesso`;
          if (result.failed > 0) {
            message += `, ${result.failed} falharam`;
            if (result.errors && result.errors.length > 0) {
              message += `\n\nErros:\n${result.errors.slice(0, 3).join('\n')}`;
              if (result.errors.length > 3) {
                message += `\n... e mais ${result.errors.length - 3} erro(s)`;
              }
            }
          }
          alert(message);
        }
      } else {
        const errorData = await response.json();
        if (!silent) {
          alert('Erro ao atualizar preços: ' + (errorData.error || 'Erro desconhecido'));
        }
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      if (!silent) {
        alert('Erro ao atualizar preços');
      }
    } finally {
      setUpdatingPrices(false);
    }
  };

  const handleEdit = (investment) => {
    setEditingId(investment.id);
    setFormData({
      ticker: investment.ticker,
      name: investment.name,
      type: investment.type,
      quantity: investment.quantity.toString(),
      average_price: investment.average_price.toString(),
      notes: investment.notes || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este investimento?')) return;

    try {
      const response = await fetch(`${API_URL}/investments/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting investment:', error);
      alert('Erro ao excluir investimento');
    }
  };

  const handleSellClick = (investment) => {
    setSellingId(investment.id);
    setSellForm({
      quantity: investment.quantity.toString(),
      sell_price: investment.current_price ? investment.current_price.toString() : '',
      account_id: accounts.length > 0 ? accounts[0].id.toString() : ''
    });
  };

  const handleSell = async (e) => {
    e.preventDefault();
    
    if (!sellForm.quantity || !sellForm.sell_price || !sellForm.account_id) {
      alert('Preencha todos os campos');
      return;
    }

    const quantity = parseFloat(sellForm.quantity);
    const sellPrice = parseFloat(sellForm.sell_price);
    const accountId = parseInt(sellForm.account_id);

    if (quantity <= 0 || sellPrice <= 0) {
      alert('Quantidade e preço devem ser maiores que zero');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/investments/${sellingId}/sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: quantity,
          sell_price: sellPrice,
          account_id: accountId
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Venda realizada! Valor: R$ ${data.sell_value?.toFixed(2) || '0.00'}\n${data.profit_loss >= 0 ? 'Lucro' : 'Prejuízo'}: R$ ${Math.abs(data.profit_loss || 0).toFixed(2)} (${data.profit_loss_percent?.toFixed(2) || '0.00'}%)`);
        setSellingId(null);
        setSellForm({ quantity: '', sell_price: '', account_id: '' });
        fetchData();
        if (window.fetchAccounts) {
          window.fetchAccounts();
        }
      } else {
        alert(data.error || 'Erro ao realizar venda');
      }
    } catch (error) {
      console.error('Error selling investment:', error);
      alert('Erro ao realizar venda');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setShowSuggestions(false);
    setFilteredSuggestions([]);
    setFormData({
      ticker: '',
      name: '',
      type: 'FII',
      quantity: '',
      average_price: '',
      notes: ''
    });
  };

  const handleTickerChange = async (e) => {
    const value = e.target.value.toUpperCase().trim();
    setFormData({ ...formData, ticker: value });
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Show suggestions from first character
    if (value.length >= 1) {
      // First, filter local suggestions (quick local search)
      const localFiltered = popularInvestments.filter(inv => {
        const tickerUpper = inv.ticker.toUpperCase();
        const tickerLetters = tickerUpper.replace(/[0-9]/g, '');
        const valueLetters = value.replace(/[0-9]/g, '');
        
        const tickerMatch = tickerUpper.includes(value) || 
                           tickerLetters.includes(valueLetters) ||
                           valueLetters.includes(tickerLetters);
        const nameMatch = inv.name.toLowerCase().includes(value.toLowerCase());
        return tickerMatch || nameMatch;
      });
      
      // Show local suggestions immediately
      setFilteredSuggestions(localFiltered);
      setShowSuggestions(localFiltered.length > 0);
      
      // Always try to search in StatusInvest API for dynamic suggestions via backend
      const searchValue = value;
      
      // Use a timeout to debounce API calls
      searchTimeoutRef.current = setTimeout(async () => {
        // Check if value hasn't changed (use ref to get current value)
        const currentValue = tickerInputRef.current?.value?.toUpperCase().trim() || '';
        if (currentValue === searchValue && searchValue.length >= 1) {
          try {
            const apiRes = await fetch(`${API_URL}/investments/search?q=${encodeURIComponent(searchValue)}`);
            
            if (apiRes.ok) {
              const apiData = await apiRes.json();
              
              if (apiData && Array.isArray(apiData) && apiData.length > 0) {
                // Convert API results to suggestion format
                const apiSuggestions = apiData.slice(0, 20).map(item => ({
                  ticker: item.ticker || '',
                  name: item.name || item.ticker || '',
                  type: item.type || 'Outro'
                })).filter(item => {
                  // Very flexible filter - accept almost any match
                  if (!item.ticker || item.ticker.length === 0) return false;
                  
                  const tickerUpper = item.ticker.toUpperCase();
                  const searchUpper = searchValue.toUpperCase();
                  const nameUpper = (item.name || '').toUpperCase();
                  
                  // Extract letters only for comparison
                  const tickerLetters = tickerUpper.replace(/[0-9]/g, '');
                  const searchLetters = searchUpper.replace(/[0-9]/g, '');
                  
                  // Match if:
                  // 1. Ticker starts with or contains search
                  // 2. Letters match (ignoring numbers)
                  // 3. Name contains search
                  return tickerUpper.startsWith(searchUpper) ||
                         tickerUpper.includes(searchUpper) || 
                         tickerLetters.startsWith(searchLetters) ||
                         tickerLetters.includes(searchLetters) ||
                         searchLetters.includes(tickerLetters) ||
                         nameUpper.includes(searchUpper);
                });
                
                // Merge local and API results, removing duplicates
                const allSuggestions = [...localFiltered];
                apiSuggestions.forEach(apiItem => {
                  if (apiItem.ticker && !allSuggestions.find(local => local.ticker === apiItem.ticker)) {
                    allSuggestions.push(apiItem);
                  }
                });
                
                // Sort: exact matches first, then by ticker
                allSuggestions.sort((a, b) => {
                  const aExact = a.ticker.toUpperCase().startsWith(searchValue);
                  const bExact = b.ticker.toUpperCase().startsWith(searchValue);
                  if (aExact && !bExact) return -1;
                  if (!aExact && bExact) return 1;
                  return a.ticker.localeCompare(b.ticker);
                });
                
                setFilteredSuggestions(allSuggestions);
                setShowSuggestions(allSuggestions.length > 0);
              }
            }
          } catch (error) {
            console.error('Error fetching suggestions from API:', error);
            // Keep local suggestions visible
          }
        }
      }, 200); // 200ms debounce for faster response
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
  };

  const handleSelectSuggestion = async (suggestion) => {
    let finalName = suggestion.name;
    let finalType = suggestion.type;
    
    // If name is generic (from API), try to get real name from StatusInvest
    if (suggestion.name.includes('Buscado da API')) {
      try {
        const nameRes = await fetch(`https://statusinvest.com.br/home/mainsearchquery?q=${suggestion.ticker}`);
        const nameData = await nameRes.json();
        if (nameData && nameData.length > 0) {
          if (nameData[0].name) {
            finalName = nameData[0].name;
          }
          // Determine type from StatusInvest response (type 2 = FII, 1 = Stock, etc)
          if (nameData[0].type === 2) {
            finalType = 'FII';
          } else if (nameData[0].type === 1) {
            finalType = 'Ação';
          }
        }
      } catch (error) {
        console.error('Error fetching name:', error);
      }
    }
    
    setFormData({
      ...formData,
      ticker: suggestion.ticker,
      name: finalName,
      type: finalType
    });
    setShowSuggestions(false);
    setFilteredSuggestions([]);
    
    // Fetch current price automatically when selecting a suggestion
    try {
      const response = await fetch(`${API_URL}/investments/fetch-price?ticker=${suggestion.ticker}`);
      const data = await response.json();
      
      if (response.ok && data.price) {
        setFormData(prev => ({
          ...prev,
          ticker: suggestion.ticker,
          name: finalName,
          type: finalType,
          average_price: data.price.toFixed(2)
        }));
      } else if (response.status === 429) {
        // Rate limited - show friendly message but don't block
        console.warn('Rate limit:', data.error);
        // User can fill manually
      } else if (data.error) {
        // Other error - user can fill manually
        console.warn('Price fetch error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching price:', error);
      // Don't block the user, they can fill manually if needed
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Carregando carteira...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1a202c', fontSize: '1.5rem', fontWeight: '600', letterSpacing: '-0.3px' }}>
            Carteira de Investimentos
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
            Preços atualizados automaticamente a cada 2 minutos
          </p>
        </div>
        <button
          onClick={() => updateAllPrices(false)}
          disabled={updatingPrices}
          className="btn btn-primary"
          style={{ padding: '10px 20px', fontSize: '0.9rem' }}
        >
          {updatingPrices ? 'Atualizando...' : '🔄 Atualizar Agora'}
        </button>
      </div>

      {/* Resumo da Carteira */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}>
          <h3>Total Investido</h3>
          <div className="value">{formatCurrency(summary.total_invested)}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
          <h3>Valor Atual</h3>
          <div className="value">{formatCurrency(summary.total_current_value)}</div>
        </div>
        <div className="stat-card" style={{ 
          background: summary.total_profit_loss >= 0 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white'
        }}>
          <h3>Ganho/Perda</h3>
          <div className="value">{formatCurrency(summary.total_profit_loss)}</div>
          <div style={{ fontSize: '0.9rem', marginTop: '8px', opacity: 0.9 }}>
            {formatPercent(summary.total_profit_loss_percent)}
          </div>
        </div>
        <div className="stat-card">
          <h3>Total de Ativos</h3>
          <div className="value">{summary.count}</div>
        </div>
      </div>

      {/* Análise e Sugestões */}
      {investments.length > 0 && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#1a202c' }}>Análise da Carteira e Sugestões</h3>
            <button
              onClick={fetchAnalysis}
              disabled={loadingAnalysis}
              className="btn"
              style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#3B82F6', color: 'white' }}
            >
              {loadingAnalysis ? 'Analisando...' : '🔄 Atualizar Análise'}
            </button>
          </div>

          {loadingAnalysis ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Analisando sua carteira...</div>
          ) : analysis && (
            <div>
              {/* Saúde da Carteira */}
              {analysis.portfolio_health && (
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  background: analysis.portfolio_health === 'boa' ? '#d1fae5' : 
                              analysis.portfolio_health === 'atenção' ? '#fef3c7' : '#fee2e2',
                  border: `1px solid ${analysis.portfolio_health === 'boa' ? '#10b981' : 
                           analysis.portfolio_health === 'atenção' ? '#f59e0b' : '#ef4444'}`
                }}>
                  <strong>Saúde da Carteira: </strong>
                  <span style={{
                    color: analysis.portfolio_health === 'boa' ? '#059669' : 
                           analysis.portfolio_health === 'atenção' ? '#d97706' : '#dc2626',
                    textTransform: 'uppercase',
                    fontWeight: '600'
                  }}>
                    {analysis.portfolio_health === 'boa' ? '✅ Boa' : 
                     analysis.portfolio_health === 'atenção' ? '⚠️ Atenção' : '❌ Precisa Melhorar'}
                  </span>
                </div>
              )}

              {/* Sugestões */}
              {analysis.suggestions && analysis.suggestions.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '16px', color: '#1a202c', fontSize: '1.1rem' }}>
                    Sugestões de Ação ({analysis.suggestions.length})
                  </h4>
                  {analysis.suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        background: suggestion.action === 'vender' ? '#fee2e2' :
                                    suggestion.action === 'vender_parcial' ? '#fef3c7' : '#dbeafe',
                        border: `1px solid ${suggestion.action === 'vender' ? '#ef4444' :
                                 suggestion.action === 'vender_parcial' ? '#f59e0b' : '#3b82f6'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div>
                          <strong style={{ fontSize: '1rem' }}>
                            {suggestion.action === 'vender' ? '🔴 Vender' :
                             suggestion.action === 'vender_parcial' ? '🟡 Realizar Lucros Parcialmente' :
                             '🟢 Comprar Mais'}
                          </strong>
                          <div style={{ marginTop: '4px', color: '#4b5563' }}>
                            <strong>{suggestion.ticker}</strong> - {suggestion.name}
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          background: suggestion.priority === 'alta' ? '#ef4444' :
                                      suggestion.priority === 'média' ? '#f59e0b' : '#3b82f6',
                          color: 'white',
                          fontWeight: '600'
                        }}>
                          {suggestion.priority === 'alta' ? 'Alta' : suggestion.priority === 'média' ? 'Média' : 'Baixa'}
                        </span>
                      </div>
                      <p style={{ margin: '8px 0', color: '#374151', fontSize: '0.9rem' }}>
                        {suggestion.reason}
                      </p>
                      {suggestion.profit_loss_percent !== undefined && (
                        <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#6b7280' }}>
                          Performance: {formatPercent(suggestion.profit_loss_percent)}
                          {suggestion.current_value && ` • Valor atual: ${formatCurrency(suggestion.current_value)}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Avisos */}
              {analysis.warnings && analysis.warnings.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '16px', color: '#1a202c', fontSize: '1.1rem' }}>
                    ⚠️ Avisos ({analysis.warnings.length})
                  </h4>
                  {analysis.warnings.map((warning, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        background: '#fef3c7',
                        border: '1px solid #f59e0b'
                      }}
                    >
                      <strong>{warning.ticker}</strong> - {warning.name}
                      <div style={{ marginTop: '4px', color: '#374151', fontSize: '0.9rem' }}>
                        {warning.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Diversificação */}
              {analysis.diversification && analysis.diversification.warnings && analysis.diversification.warnings.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: '16px', color: '#1a202c', fontSize: '1.1rem' }}>
                    📊 Diversificação
                  </h4>
                  {analysis.diversification.warnings.map((warning, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        background: '#dbeafe',
                        border: '1px solid #3b82f6'
                      }}
                    >
                      <strong>{warning.type}:</strong> {warning.message}
                    </div>
                  ))}
                </div>
              )}

              {(!analysis.suggestions || analysis.suggestions.length === 0) &&
               (!analysis.warnings || analysis.warnings.length === 0) &&
               (!analysis.diversification || !analysis.diversification.warnings || analysis.diversification.warnings.length === 0) && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                  ✅ Sua carteira está bem balanceada! Nenhuma sugestão no momento.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Formulário */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>
          {editingId ? 'Editar Investimento' : 'Adicionar Novo Investimento'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Ticker/Código</label>
              <input
                ref={tickerInputRef}
                type="text"
                value={formData.ticker}
                onChange={handleTickerChange}
                onFocus={() => {
                  if (formData.ticker.length > 0) {
                    handleTickerChange({ target: { value: formData.ticker } });
                  }
                }}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="Digite o código (ex: HGLG11) ou nome"
                required
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  maxHeight: '300px',
                  overflowY: 'auto',
                  marginTop: '4px'
                }}>
                  {filteredSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: index < filteredSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#1a202c', fontSize: '0.95rem' }}>
                            {suggestion.ticker}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>
                            {suggestion.name}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: suggestion.type === 'FII' ? '#dbeafe' : suggestion.type === 'Ação' ? '#dcfce7' : '#fef3c7',
                          color: suggestion.type === 'FII' ? '#1e40af' : suggestion.type === 'Ação' ? '#166534' : '#92400e',
                          fontWeight: '500'
                        }}>
                          {suggestion.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Nome do Investimento</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome será preenchido automaticamente ao selecionar"
                required
              />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                {investmentTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Quantidade</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="Ex: 10"
                required
              />
            </div>
            <div className="form-group">
              <label>Preço Médio (R$) - Será buscado automaticamente</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.average_price}
                onChange={(e) => setFormData({ ...formData, average_price: e.target.value })}
                placeholder="Será preenchido automaticamente ao selecionar um investimento"
              />
            </div>
          </div>
          <div style={{ marginTop: '8px', padding: '12px', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#0369a1' }}>
              💡 O preço atual será buscado automaticamente após salvar o investimento.
            </p>
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Observações</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anotações sobre este investimento (opcional)"
              rows="3"
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Atualizar' : 'Adicionar'} Investimento
            </button>
            {editingId && (
              <button type="button" className="btn" onClick={resetForm} style={{ background: '#6b7280', color: 'white' }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de Investimentos */}
      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#1a202c' }}>Meus Investimentos</h3>
        {investments.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
            Nenhum investimento cadastrado ainda
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>Ticker</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>Nome</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>Tipo</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>Qtd</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>Preço Médio</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>Total Investido</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>Preço Atual</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>Valor Atual</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>Ganho/Perda</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {investments.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1a202c' }}>{inv.ticker}</td>
                    <td style={{ padding: '12px', color: '#374151' }}>{inv.name}</td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>{inv.type}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#374151' }}>{inv.quantity}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#374151' }}>{formatCurrency(inv.average_price)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#1a202c' }}>
                      {formatCurrency(inv.total_invested)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#374151' }}>
                      {inv.current_price ? formatCurrency(inv.current_price) : '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#1a202c' }}>
                      {inv.current_value ? formatCurrency(inv.current_value) : '-'}
                    </td>
                    <td style={{ 
                      padding: '12px', 
                      textAlign: 'right', 
                      fontWeight: '600',
                      color: inv.profit_loss >= 0 ? '#10B981' : '#EF4444'
                    }}>
                      {inv.profit_loss !== null && inv.profit_loss !== undefined ? (
                        <>
                          {formatCurrency(inv.profit_loss)}
                          <br />
                          <span style={{ fontSize: '0.85rem' }}>
                            {inv.profit_loss_percent !== null && inv.profit_loss_percent !== undefined 
                              ? formatPercent(inv.profit_loss_percent) 
                              : ''}
                          </span>
                        </>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => updateSinglePrice(inv.id)}
                          disabled={updatingPriceId === inv.id}
                          className="btn"
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '0.85rem', 
                            background: updatingPriceId === inv.id ? '#9ca3af' : '#10b981', 
                            color: 'white' 
                          }}
                          title="Atualizar preço atual"
                        >
                          {updatingPriceId === inv.id ? '⏳' : '🔄'}
                        </button>
                        <button
                          onClick={() => handleEdit(inv)}
                          className="btn"
                          style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#3b82f6', color: 'white' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleSellClick(inv)}
                          className="btn"
                          style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#10b981', color: 'white' }}
                        >
                          Vender
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="btn"
                          style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#ef4444', color: 'white' }}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sellingId && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Vender Investimento</h3>
              <form onSubmit={handleSell}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Quantidade a vender:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={sellForm.quantity}
                    onChange={(e) => setSellForm({ ...sellForm, quantity: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Preço de venda (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={sellForm.sell_price}
                    onChange={(e) => setSellForm({ ...sellForm, sell_price: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Conta para receber:
                  </label>
                  <select
                    value={sellForm.account_id}
                    onChange={(e) => setSellForm({ ...sellForm, account_id: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="">Selecione uma conta</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.balance || 0)}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSellingId(null);
                      setSellForm({ quantity: '', sell_price: '', account_id: '' });
                    }}
                    className="btn"
                    style={{ padding: '10px 20px', background: '#6b7280', color: 'white' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    style={{ padding: '10px 20px', background: '#10b981', color: 'white' }}
                  >
                    Confirmar Venda
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;

