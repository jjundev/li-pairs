import json

import pytest

from lipairs.bars import FetchError
from lipairs.fetch_us import fetch_us, parse_yahoo


def payload(ts, o, h, l, c, v, tzname="America/New_York"):
    return {"chart": {"error": None, "result": [{
        "meta": {"currency": "USD", "exchangeTimezoneName": tzname},
        "timestamp": ts,
        "indicators": {"quote": [{"open": o, "high": h, "low": l, "close": c, "volume": v}]},
    }]}}


def test_parse_uses_exchange_date_not_utc():
    # 1791255600 = 2026-10-06 03:00 UTC = 2026-10-05 23:00 뉴욕
    p = payload([1790947800, 1791255600], [10, 11], [12, 12], [9, 10], [11, 11.5], [100, 200])
    assert [b[0] for b in parse_yahoo(p)] == [20261002, 20261005]


def test_parse_skips_null_bars():
    p = payload([1790947800, 1791207000], [10, None], [12, None], [9, None], [11, None], [100, None])
    assert parse_yahoo(p) == [[20261002, 10.0, 12.0, 9.0, 11.0, 100]]


def test_parse_dedupes_same_date_keeping_last():
    # 1791207000 = 2026-10-05 09:30 뉴욕, 1791230400 = 같은 날 16:00
    p = payload([1791207000, 1791230400], [30, 30], [31, 32], [29, 28], [30.5, 29.62], [1, 2])
    assert parse_yahoo(p) == [[20261005, 30.0, 32.0, 28.0, 29.62, 2]]


def test_parse_rounds_to_six_significant_digits():
    p = payload([1790947800], [29.6200008392334], [30.0], [29.0], [29.6200008392334], [None])
    assert parse_yahoo(p)[0] == [20261002, 29.62, 30.0, 29.0, 29.62, 0]


def test_parse_raises_on_api_error():
    with pytest.raises(FetchError):
        parse_yahoo({"chart": {"result": None, "error": {"code": "Not Found"}}})


def test_fetch_us_wraps_malformed_payload():
    with pytest.raises(FetchError):
        fetch_us("SOXS", get=lambda url: b'{"chart": {"result": [{}]}}')


def test_fetch_us_requests_full_daily_history():
    urls = []

    def get(url):
        urls.append(url)
        return json.dumps(payload([1790947800], [1], [1], [1], [1], [1])).encode()

    fetch_us("SOXS", get=get)
    assert "/SOXS?" in urls[0] and "period1=0" in urls[0] and "interval=1d" in urls[0]
    assert "range=max" not in urls[0]
