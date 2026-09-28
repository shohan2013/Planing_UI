export type TrendDirection = 'up' | 'down' | 'flat';
export type TrendSentiment = 'positive' | 'negative' | 'neutral';

export interface IKpiTrend {
  direction: TrendDirection;
  percent: number;
  sentiment: TrendSentiment;
}

export interface IMachineDashboardKpiTrends {
  machines: IKpiTrend;
  utilization: IKpiTrend;
  free: IKpiTrend;
  downtime: IKpiTrend;
}

export const FLAT_TREND: IKpiTrend = {
  direction: 'flat',
  percent: 0,
  sentiment: 'neutral',
};

export const FLAT_KPI_TRENDS: IMachineDashboardKpiTrends = {
  machines: FLAT_TREND,
  utilization: FLAT_TREND,
  free: FLAT_TREND,
  downtime: FLAT_TREND,
};

export function computeTrend(
  current: number,
  previous: number,
  goodDirection: TrendDirection,
): IKpiTrend {
  if (previous === current) return FLAT_TREND;

  const direction: TrendDirection = current > previous ? 'up' : 'down';
  const percent =
    previous === 0
      ? 100
      : Math.round((Math.abs(current - previous) / previous) * 1000) / 10;

  return {
    direction,
    percent,
    sentiment: direction === goodDirection ? 'positive' : 'negative',
  };
}
