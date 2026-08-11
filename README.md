# Investment Dashboard

A responsive GitHub Pages dashboard for rates, UK/European real-estate funding conditions, FX/carry risk and commodities. The static page reads `data/latest.json`; a scheduled GitHub Action updates that file without exposing API keys in the browser.

## Revision 3 data coverage

| Area | Series | Source / treatment |
|---|---|---|
| UK rates | 2Y, 5Y, 10Y fitted nominal gilt curve | Bank of England, official daily curve |
| German rates | 2Y, 5Y, 10Y current Federal securities | Deutsche Bundesbank, official SDMX-CSV |
| US rates | 2Y, 5Y, 10Y Treasuries | U.S. Treasury via FRED |
| Japan rates | 2Y, 5Y, 10Y constant-maturity JGB curve | Japan Ministry of Finance, official CSV |
| FX | GBP/USD, GBP/CAD, USD/JPY, AUD/JPY | Derived from ECB reference rates |
| Precious metals | Gold, silver, platinum spot | Twelve Data primary; clearly labelled delayed futures fallback |
| Other commodities | WTI, Brent, COMEX copper, uranium-equities proxy | FRED / delayed market charts; uranium is `URA`, not uranium spot |
| Carry risk | USD/JPY and AUD/JPY vs 200DMA, yen velocity, CFTC positioning, VIX curve, HY OAS | ECB, CFTC TFF, Cboe settlements, FRED |
| Property funding | SONIA, €STR, ECB deposit rate, 5Y sovereign yields and directional funding proxies | BoE / ECB / derived |

The UK and euro funding proxies are explicitly labelled as directional combinations of a 5Y sovereign yield and US HY OAS. They are **not** executable loan or swap quotes.

## Reliability behaviour

- Every series carries its own observation date and source.
- A provider failure never aborts unrelated feeds.
- If a refresh fails, the last valid observation remains visible and is marked `stale` with a feed error.
- If no valid observation exists, the row shows `Unavailable`.
- Twelve Data errors are validated rather than being mistaken for an empty successful response.
- The updater records provider-level status in `feed_health` inside `data/latest.json`.
- Unit tests cover the Bundesbank, Japan MOF, CFTC, Cboe and Twelve Data parsers plus stale-value retention.

## Existing repository update

Replace these items at the repository root with the files in this package:

```text
.github/workflows/update-markets.yml
assets/dashboard.css
assets/dashboard.js
scripts/update_data.py
tests/test_update_data.py
index.html
README.md
requirements.txt
```

Keep the existing `data/latest.json` and `data/history.json` when uploading through GitHub so historical data is not lost. The package includes copies for completeness, but you do not need to overwrite your live data files.

After committing, open **Actions → Update market data → Run workflow → Run workflow**. The Action runs the tests first, refreshes the data and commits `data/` back to `main`. GitHub Pages will then redeploy automatically from the branch.

The only repository secrets required are:

- `FRED_API_KEY` — U.S. rates, oil, VIX spot and HY OAS.
- `TWELVE_DATA_API_KEY` — preferred spot gold, silver and platinum feed.

No new secret is required for Bundesbank, BoE, ECB, Japan MOF, CFTC, Cboe, copper or the uranium proxy.

## Local checks

```text
pip install -r requirements.txt
python -m unittest discover -s tests -v
python scripts/update_data.py
python -m http.server 8000
```

Then open `http://localhost:8000/`. Running the updater without secrets is safe: secret-dependent feeds retain their previous valid values and are marked stale.

## Schedule

The updater runs at 07:15, 12:15 and 17:15 UTC on weekdays and can also be run manually. GitHub may start scheduled workflows a little after the stated time.

## Display

The desktop layout expands to 1,840px with up to six headline columns. It steps down to four, three and two columns at narrower widths; on iPhone the page itself remains fixed to the viewport and only the detailed data table scrolls horizontally.
