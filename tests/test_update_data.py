import io
import json
import sys
import types
import unittest
import zipfile
from unittest.mock import Mock, patch

# Parser tests do not perform network I/O. Stubbing requests also keeps the
# tests runnable in minimal Python environments before requirements are installed.
fake_requests = types.ModuleType("requests")
fake_requests.Session = lambda: Mock(headers=Mock(update=Mock()))
sys.modules.setdefault("requests", fake_requests)

from scripts import update_data


class UpdateDataTests(unittest.TestCase):
    def response(self, *, text="", content=None, payload=None, status=200):
        response = Mock()
        response.status_code = status
        response.text = text
        response.content = content if content is not None else text.encode()
        response.json.return_value = payload
        response.raise_for_status.side_effect = None if status < 400 else RuntimeError(status)
        return response

    @patch.object(update_data.S, "get")
    def test_bundesbank_uses_sdmx_csv_and_skips_missing_days(self, get):
        get.return_value = self.response(text=(
            "TIME_PERIOD;OBS_VALUE\n"
            "2026-08-07;2.76\n"
            "2026-08-08;.\n"
            "2026-08-10;2.79\n"
        ))
        values = update_data.bundesbank_current_yield("de2")
        self.assertEqual(values, [("2026-08-07", 2.76), ("2026-08-10", 2.79)])
        self.assertEqual(get.call_args.kwargs["headers"]["Accept"], "text/csv")

    @patch.object(update_data.S, "get")
    def test_twelve_data_error_is_not_treated_as_empty_success(self, get):
        get.return_value = self.response(payload={"status": "error", "code": 400, "message": "symbol unavailable"})
        with patch.object(update_data, "TWELVE_KEY", "test-key"):
            with self.assertRaisesRegex(RuntimeError, "symbol unavailable"):
                update_data.twelve("XAG/USD")

    @patch.object(update_data.S, "get")
    def test_jgb_constant_maturity_parser(self, get):
        body = (
            "Interest Rate,,,,,,,,,,,,,,,(Unit : %)\n"
            "Date,1Y,2Y,3Y,4Y,5Y,6Y,7Y,8Y,9Y,10Y,15Y,20Y,25Y,30Y,40Y\n"
            "2026/8/7,1.0,1.5,1.6,1.7,2.0,2.1,2.2,2.3,2.4,2.8,3,3,3,3,3\n"
        ).encode("utf-8")
        get.return_value = self.response(content=body)
        result = update_data.jgb_constant_maturity()
        self.assertEqual(result["jp2"][-1], ("2026-08-07", 1.5))
        self.assertEqual(result["jp5"][-1], ("2026-08-07", 2.0))
        self.assertEqual(result["jp10"][-1], ("2026-08-07", 2.8))

    @patch.object(update_data.S, "get")
    def test_cftc_yen_net_and_open_interest_share(self, get):
        text = (
            '"Market_and_Exchange_Names","Report_Date_as_YYYY-MM-DD","Open_Interest_All","Lev_Money_Positions_Long_All","Lev_Money_Positions_Short_All"\n'
            '"JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE","2026-08-04",400000,75000,135000\n'
        )
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, "w") as archive:
            archive.writestr("FinFutYY.txt", text)
        get.return_value = self.response(content=stream.getvalue())
        latest = update_data.cftc_yen_positioning()[-1]
        self.assertEqual(latest["value"], -60000)
        self.assertEqual(latest["pct_oi"], -15.0)

    @patch.object(update_data.S, "get")
    def test_cboe_uses_distinct_standard_monthlies(self, get):
        get.return_value = self.response(text=(
            "Product,Symbol,Expiration Date,Price\n"
            "VX,VX32/Q6,2026-08-12,16.95\n"
            "VX,VX/Q6,2026-08-19,16.95\n"
            "VX,VX/U6,2026-09-16,18.59\n"
        ))
        curve = update_data.cboe_vix_curve()
        self.assertEqual(curve["front"][2], "VX/Q6")
        self.assertEqual(curve["second"][2], "VX/U6")

    def test_failed_refresh_retains_last_valid_value(self):
        series = {"de2": {"label": "Germany 2Y", "value": 2.7, "date": "2026-08-07"}}
        update_data.unavailable(series, "de2", "Germany 2Y", "yield", "Bundesbank", "temporary failure")
        self.assertEqual(series["de2"]["value"], 2.7)
        self.assertTrue(series["de2"]["stale"])
        self.assertEqual(series["de2"]["feed_status"], "stale")


if __name__ == "__main__":
    unittest.main()
