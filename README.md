# Investment Dashboard

A mobile-first GitHub Pages dashboard for UK/European real-estate funding conditions, rates, FX/carry risk and commodities.

## What works automatically

- US 2Y/5Y/10Y Treasury yields — FRED
- WTI and Brent spot series — EIA via FRED
- VIX — CBOE series via FRED
- US high-yield OAS — ICE BofA series via FRED
- GBP/USD, GBP/CAD, USD/JPY and AUD/JPY — derived from official ECB EUR reference rates
- Gold, silver and platinum — Twelve Data if a key is supplied
- UK 2Y/5Y/10Y gilt yields — official Bank of England fitted nominal government yield curve (daily, normally next-business-day publication)
- German 2Y/5Y/10Y yields — official Deutsche Bundesbank current Federal securities series (daily)
- Derived Gold/Silver ratio, Brent-WTI spread, USD/JPY 200-day distance, carry-risk state
- Daily history snapshots retained in `data/history.json`

## UK and German rates

No separate commercial feed is required. The updater uses the Bank of England's stable latest-yield-curve ZIP for UK 2Y/5Y/10Y nominal gilt spot yields and Deutsche Bundesbank's official daily CSV API for German 2Y/5Y/10Y Federal securities. These series may be delayed versus live trading, by design.

## GitHub setup

1. Create a new GitHub repository, e.g. `investment-dashboard`.
2. Upload all files in this package to the repository root and ensure the default branch is `main`.
3. In **Settings → Secrets and variables → Actions**, add:
   - `FRED_API_KEY` — required for the FRED series.
   - `TWELVE_DATA_API_KEY` — optional, for XAU/USD, XAG/USD and XPT/USD.
4. Go to **Settings → Pages → Build and deployment** and choose **GitHub Actions**.
5. Open **Actions → Update market data → Run workflow** once. This creates the first live dataset.
6. The deployment workflow publishes the page. GitHub will show the Pages URL in the deployment job.

## Update schedule

The updater currently runs at 07:15, 12:15 and 17:15 UTC on weekdays. Scheduled GitHub Actions can start later than the exact cron time, particularly during busy periods. For this dashboard that is acceptable because the site shows each observation date and uses the last successful values.

Edit `.github/workflows/update-markets.yml` if you prefer a different cadence.

## Homepage / iPhone

- **Edge:** Settings → Start, home, and new tabs → When Edge starts → Open these pages → add your GitHub Pages URL.
- **iPhone:** open the dashboard in Safari → Share → Add to Home Screen.

## Data integrity choices

The updater keeps values from different publication schedules separate and always shows observation dates. It does not silently fabricate missing values. A failed provider therefore leaves the previous valid snapshot visible or displays an unavailable/configuration state.

## Carry-risk logic

The starter logic intentionally treats a USD/JPY 200-day break as an ARM condition, not a crash signal. A genuine cross-asset FIRE state requires at least three active gauges and at least one high-specificity confirmation. The current code includes yen 1-day velocity and HY spread widening; VIX futures term-structure inversion can be added once a suitable futures feed is configured.

## Next useful additions

- UK SONIA swaps and EUR swaps
- VIX front/second futures term structure
- CFTC yen positioning
- UK/European REIT indices and property-company discounts
- TTF gas, copper and uranium proxies
- Real yields / inflation breakevens
