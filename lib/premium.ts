// 1 Korean common share = 10 ADSs (SEC Form 424B4, July 2026 NASDAQ listing)
export const ADS_PER_SHARE = 10;
export const KR_TICKER = "000660";
export const US_TICKER = "SKHY";

/** Theoretical ADS price in USD implied by the Korean share price. */
export function parityUsd(krwPrice: number, fxRate: number): number {
  return krwPrice / fxRate / ADS_PER_SHARE;
}

/** ADR price expressed in KRW per Korean common share. */
export function adrInKrw(adrUsd: number, fxRate: number): number {
  return adrUsd * fxRate * ADS_PER_SHARE;
}

/** Premium (+) or discount (-) of the ADR vs the Korean listing, in percent. */
export function premiumPct(adrUsd: number, krwPrice: number, fxRate: number): number {
  return (adrInKrw(adrUsd, fxRate) / krwPrice - 1) * 100;
}
