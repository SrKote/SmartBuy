import React, { useState, useEffect } from 'react';
import InputSection from './components/InputSection';
import ResultsTable from './components/ResultsTable';
import VariationSelector from './components/VariationSelector';
import OfferDetailModal from './components/OfferDetailModal';
import { identifyVariations, searchMarketData, analyzeFinancialStrategy } from './services/geminiService';
import { getOfficialSelic } from './services/bcbService';
import { AppStatus, UserInput, AnalysisResult, Variation, HistoryItem, InvestmentType, Offer } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [userInput, setUserInput] = useState<UserInput | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marketRawData, setMarketRawData] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prod = params.get('prod');
    const yieldVal = params.get('yield');
    
    if (prod) {
      const parsedYield = yieldVal && !isNaN(Number(yieldVal)) ? Number(yieldVal) : 100;
      const input: UserInput = {
        productName: prod,
        yieldPercent: parsedYield,
        investmentType: InvestmentType.CDB_RDB 
      };
      setUserInput(input);
    }
  }, []);

  const saveHistory = (input: UserInput, rawData: string) => {
    try {
      const newItem: HistoryItem = { timestamp: Date.now(), input, marketDataSummary: rawData };
      const existing = localStorage.getItem('smartbuy_history');
      let items: HistoryItem[] = existing ? JSON.parse(existing) : [];
      items = items.filter(i => i.input.productName !== input.productName);
      items.unshift(newItem);
      localStorage.setItem('smartbuy_history', JSON.stringify(items.slice(0, 5)));
    } catch (e) {
      console.warn("Storage full or error", e);
    }
  };

  const handleStartSearch = async (input: UserInput) => {
    setStatus(AppStatus.SEARCHING_VARIATIONS);
    setError(null);
    setData(null);
    setMarketRawData(null);
    setUserInput(input);
    setVariations([]);
    setSelectedOffer(null);

    try {
      const foundVariations = await identifyVariations(input.productName);
      if (foundVariations.length === 0) {
        setVariations([{ id: input.productName, name: input.productName }]);
      } else {
        setVariations(foundVariations);
      }
      setStatus(AppStatus.SELECTING_VARIATIONS);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao identificar produtos. Tente novamente.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleConfirmVariations = async (selectedIds: string[]) => {
    if (!userInput) return;
    setStatus(AppStatus.SEARCHING_OFFERS);
    
    try {
      const [marketData, officialSelic] = await Promise.all([
        searchMarketData(selectedIds),
        getOfficialSelic()
      ]);
      
      setMarketRawData(marketData);
      setStatus(AppStatus.ANALYZING);

      const result = await analyzeFinancialStrategy(
        marketData, 
        userInput,
        officialSelic
      );
      
      setData(result);
      setStatus(AppStatus.COMPLETE);
      saveHistory(userInput, marketData);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro na análise.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleRecalculate = async (input: UserInput) => {
    if (!marketRawData) return;
    setUserInput(input);
    setStatus(AppStatus.ANALYZING);
    try {
      const officialSelic = await getOfficialSelic();
      const result = await analyzeFinancialStrategy(marketRawData, input, officialSelic);
      setData(result);
      setStatus(AppStatus.COMPLETE);
    } catch (err: any) {
      setError("Erro ao recalcular.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleRestoreHistory = async (item: HistoryItem) => {
    setUserInput(item.input);
    setMarketRawData(item.marketDataSummary);
    setStatus(AppStatus.ANALYZING);
    try {
      const officialSelic = await getOfficialSelic();
      const result = await analyzeFinancialStrategy(item.marketDataSummary, item.input, officialSelic);
      setData(result);
      setStatus(AppStatus.COMPLETE);
    } catch (err) {
      setError("Erro ao restaurar histórico.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleUpdateRationale = (newRationale: string) => {
    if (data) {
      setData({ ...data, rationale: newRationale });
    }
  };

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setVariations([]);
    setData(null);
    setMarketRawData(null);
    setSelectedOffer(null);
  };

  return (
    <div className="min-h-screen bg-midnight-900 relative overflow-x-hidden font-sans">
      {/* Abstract Background Blobs */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-accent-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <header className="py-8 relative z-40">
        <div className="container mx-auto px-4 max-w-6xl flex justify-between items-center">
            <div onClick={handleReset} className="cursor-pointer group flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
                 <span className="text-white font-bold text-lg">S</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white group-hover:text-primary-100 transition-colors">
                SmartBuy
              </h1>
            </div>
            {status !== AppStatus.IDLE && (
              <button onClick={handleReset} className="text-xs font-medium text-zinc-500 hover:text-white transition-colors">
                Nova Pesquisa
              </button>
            )}
        </div>
      </header>

      <main className="container mx-auto px-4 pb-20 max-w-6xl relative z-10">
        <InputSection 
           onStartSearch={handleStartSearch} 
           onRecalculate={handleRecalculate}
           onRestoreHistory={handleRestoreHistory}
           status={status} 
           initialValues={userInput}
        />

        {status === AppStatus.SELECTING_VARIATIONS && (
          <VariationSelector 
            variations={variations} 
            onConfirm={handleConfirmVariations}
            onCancel={handleReset}
          />
        )}

        {status === AppStatus.ERROR && (
          <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/20 text-red-200 p-6 rounded-2xl text-center mb-8 animate-fade-in backdrop-blur-md">
            <p className="font-bold text-lg mb-2">Ops!</p>
            <p className="text-sm opacity-80">{error}</p>
            <button onClick={handleReset} className="mt-4 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors border border-red-500/30">
              Tentar Novamente
            </button>
          </div>
        )}

        {(status === AppStatus.SEARCHING_VARIATIONS || status === AppStatus.SEARCHING_OFFERS || status === AppStatus.ANALYZING) && (
           <div className="max-w-2xl mx-auto text-center py-20 animate-fade-in">
             <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-primary-500 blur-xl opacity-20 animate-pulse-slow"></div>
                <div className="relative w-16 h-16 rounded-2xl bg-surface-highlight border border-white/5 flex items-center justify-center shadow-2xl">
                    {status === AppStatus.ANALYZING 
                      ? <div className="animate-spin w-8 h-8 border-2 border-accent-400 border-t-transparent rounded-full" /> 
                      : <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
                    }
                </div>
             </div>
             <h2 className="text-2xl font-semibold text-white mb-2">
               {status === AppStatus.SEARCHING_VARIATIONS ? 'Identificando variações' : 
                status === AppStatus.SEARCHING_OFFERS ? 'Buscando ofertas' : 'Calculando viabilidade'}
             </h2>
             <p className="text-zinc-500 text-sm">
               Isso pode levar alguns segundos...
             </p>
           </div>
        )}

        {status === AppStatus.COMPLETE && data && (
           <ResultsTable 
             data={data} 
             onSelectOffer={setSelectedOffer}
             onUpdateRationale={handleUpdateRationale}
           />
        )}

        {/* Modal for Details */}
        {selectedOffer && data && (
          <OfferDetailModal 
            offer={selectedOffer}
            monthlyYieldRate={data.monthlyEffectiveRate || 0.8}
            onClose={() => setSelectedOffer(null)}
          />
        )}
      </main>
    </div>
  );
};

export default App;