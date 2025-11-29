
export interface Offer {
  store: string;
  productName: string;
  cashPrice: number;
  installmentPrice: number;
  installments: number;
  cashDiscount: number;
  yieldGenerated: number;
  verdict: 'CASH' | 'INSTALLMENTS';
  link: string;
  exclusiveCondition?: string; // e.g., "Meli+", "Prime"
  paymentMethod?: string; // e.g., "PIX", "BOLETO", "CARD_1X"
  details: string; 
  reviews?: string[];
  pros?: string[];
  cons?: string[];
}

export interface AnalysisResult {
  selicRate: number;
  userYield: number;
  offers: Offer[];
  bestOption: Offer | null;
  rationale: string;
  monthlyEffectiveRate: number; // Added to help draw the chart
}

export enum AppStatus {
  IDLE = 'IDLE',
  SEARCHING_VARIATIONS = 'SEARCHING_VARIATIONS',
  SELECTING_VARIATIONS = 'SELECTING_VARIATIONS',
  SEARCHING_OFFERS = 'SEARCHING_OFFERS',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export enum InvestmentType {
  CDB_RDB = 'CDB_RDB', // Taxable (IR)
  LCI_LCA = 'LCI_LCA'  // Tax Free
}

export interface UserInput {
  productName: string;
  yieldPercent: number;
  investmentType: InvestmentType;
  customSelic?: number;
  targetPrice?: number;
  cashbackPercent?: number;
}

export interface Variation {
  id: string;
  name: string;
}

export interface HistoryItem {
  timestamp: number;
  input: UserInput;
  marketDataSummary: string; // Store raw text to save tokens on restore
}
