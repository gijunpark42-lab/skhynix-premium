# SK hynix ADR Premium Tracker

Live dashboard comparing SK hynix on the Korean market (KRX `000660`, including
the NXT/Nextrade session) against its NASDAQ-listed ADR (`SKHY`), with a
real-time USD/KRW rate and an intraday premium chart.

<img width="1418" height="1291" alt="skhynix-premium-dashboard" src="https://github.com/user-attachments/assets/c672c05f-099f-4924-b8d0-611bb64d3917" />

**Live:** https://skhynix-premium.vercel.app

## How it works

- **Premium** = `SKHY × USD/KRW × 10 ÷ 000660 price − 1` (10 ADSs = 1 common share).
- Each side uses its **latest available price**: NXT when KRX regular is closed;
  US pre/after-market when NASDAQ regular is closed.
- Data sources (unofficial public JSON, proxied through API routes):
  - Naver Finance — KRX/NXT quote, 5-min candles, USD/KRW
  - Yahoo Finance — SKHY quote and pre/post-market candles
- `/api/quote` polls every 7s, `/api/history` every 60s, both edge-cached
  (`s-maxage`) so viewer polling doesn't hammer the upstream feeds.

## Development

```bash
npm install
npm run dev
```

Deployed on Vercel; pushes to `master` auto-deploy to production.

Informational only — not investment advice.
