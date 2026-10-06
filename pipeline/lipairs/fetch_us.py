"""미국 상장 종목 일봉: Yahoo v8 chart (분할 조정 OHLC).

range=max 는 월봉으로 줄어들므로 period1=0 / period2=9999999999 로 전체 일봉을 받는다.
"""
import json
from datetime import datetime
from zoneinfo import ZoneInfo

from .bars import Bar, FetchError, http_get, sig6

URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1=0&period2=9999999999&interval=1d&events=split"


def parse_yahoo(payload: dict) -> list[Bar]:
    chart = payload.get("chart") or {}
    if chart.get("error"):
        raise FetchError(str(chart["error"]))
    result = (chart.get("result") or [None])[0]
    if not result:
        raise FetchError("결과 없음")
    tz = ZoneInfo(result["meta"].get("exchangeTimezoneName") or "America/New_York")
    q = result["indicators"]["quote"][0]
    by_date: dict[int, Bar] = {}
    for i, ts in enumerate(result.get("timestamp") or []):
        o, h, l, c, v = (q[k][i] for k in ("open", "high", "low", "close", "volume"))
        if None in (o, h, l, c) or c <= 0:
            continue
        d = datetime.fromtimestamp(ts, tz)
        key = d.year * 10000 + d.month * 100 + d.day
        by_date[key] = [key, sig6(o), sig6(h), sig6(l), sig6(c), int(v or 0)]
    return [by_date[k] for k in sorted(by_date)]


def fetch_us(symbol: str, get=http_get) -> list[Bar]:
    try:
        bars = parse_yahoo(json.loads(get(URL.format(symbol=symbol))))
    except (KeyError, IndexError, TypeError, ValueError) as e:
        raise FetchError(f"US {symbol}: 응답 형식 오류 {e!r}") from e
    if not bars:
        raise FetchError(f"US {symbol}: 봉 없음")
    return bars
