export interface CreditScoreInputs {
  currentSavings: number;
  savingsTarget: number;
  monthlyTransactionCounts: number[];
  inventoryValue: number;
  offersAvailable: number;
  offersCompleted: number;
  hasRepeatBuyer: boolean;
  monthsWithSavings: boolean[];
}

export interface CreditScoreBreakdown {
  savingsScore: number;
  walletScore: number;
  inventoryScore: number;
  marketScore: number;
  punctualityScore: number;
  totalScore: number;
  rating: string;
  loanDecision: string;
}

export function scoreSavings(currentSavings: number, target: number): number {
  if (target <= 0) return 0;
  const ratio = currentSavings / target;
  return Math.min(300, ratio * 300);
}

export function scoreWalletActivity(monthlyCounts: number[]): number {
  if (monthlyCounts.length === 0) return 0;
  const avgPerMonth = monthlyCounts.reduce((sum, n) => sum + n, 0) / monthlyCounts.length;
  if (avgPerMonth >= 60) return 200;
  if (avgPerMonth >= 31) return 180;
  if (avgPerMonth >= 16) return 140;
  if (avgPerMonth >= 6) return 80;
  return 40;
}

export function scoreInventory(value: number): number {
  if (value > 1000000) return 200;
  if (value > 500000) return 170;
  if (value > 200000) return 120;
  if (value > 50000) return 60;
  return 20;
}

export function scoreMarketPerformance(
  offersAvailable: number,
  offersCompleted: number,
  hasRepeatBuyer: boolean,
): number {
  if (offersAvailable <= 0) return 0;
  const matchRate = offersCompleted / offersAvailable;
  let score = matchRate * 200;
  if (hasRepeatBuyer) score += 10;
  return Math.min(200, score);
}

export function scorePunctuality(monthsWithSavings: boolean[]): number {
  if (monthsWithSavings.length === 0) return 0;
  const savedCount = monthsWithSavings.filter(Boolean).length;
  let score = (savedCount / monthsWithSavings.length) * 100;
  let streak = 0;
  for (let i = monthsWithSavings.length - 1; i >= 0; i--) {
    if (monthsWithSavings[i]) streak++;
    else break;
  }
  if (streak >= 6) score += 10;
  else if (streak >= 3) score += 5;
  return Math.min(100, score);
}

export function getRating(totalScore: number): { rating: string; loanDecision: string } {
  if (totalScore >= 900) return { rating: 'AAA', loanDecision: 'Premium borrower; lowest interest and highest limits' };
  if (totalScore >= 800) return { rating: 'AA', loanDecision: 'Excellent; fast approval' };
  if (totalScore >= 700) return { rating: 'A', loanDecision: 'Good; standard approval' };
  if (totalScore >= 600) return { rating: 'BBB', loanDecision: 'Fair; reduced loan amount or guarantor may be required' };
  if (totalScore >= 500) return { rating: 'BB', loanDecision: 'Moderate risk; smaller loans only' };
  if (totalScore >= 400) return { rating: 'B', loanDecision: 'High risk; improvement plan recommended' };
  return { rating: 'C', loanDecision: 'Not currently eligible; encourage savings and platform activity' };
}

export function calculateCreditScore(inputs: CreditScoreInputs): CreditScoreBreakdown {
  const savingsScore = scoreSavings(inputs.currentSavings, inputs.savingsTarget);
  const walletScore = scoreWalletActivity(inputs.monthlyTransactionCounts);
  const inventoryScore = scoreInventory(inputs.inventoryValue);
  const marketScore = scoreMarketPerformance(
    inputs.offersAvailable,
    inputs.offersCompleted,
    inputs.hasRepeatBuyer,
  );
  const punctualityScore = scorePunctuality(inputs.monthsWithSavings);

  const totalScore = Math.round(
    savingsScore + walletScore + inventoryScore + marketScore + punctualityScore,
  );

  const { rating, loanDecision } = getRating(totalScore);

  return {
    savingsScore: Math.round(savingsScore),
    walletScore: Math.round(walletScore),
    inventoryScore: Math.round(inventoryScore),
    marketScore: Math.round(marketScore),
    punctualityScore: Math.round(punctualityScore),
    totalScore,
    rating,
    loanDecision,
  };
}
