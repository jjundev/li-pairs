"""한국 상장 종목 일봉: Naver fchart (euc-kr XML)."""
import re

from .bars import Bar, FetchError, http_get

URL = "https://fchart.stock.naver.com/sise.nhn?symbol={symbol}&timeframe=day&count=10000&requestType=0"
ITEM = re.compile(r'<item data="(\d{8})\|([^|"]*)\|([^|"]*)\|([^|"]*)\|([^|"]*)\|([^|"]*)"')


def _num(x: str, fallback: float) -> float:
    try:
        v = float(x)
    except ValueError:
        return fallback
    return v if v > 0 else fallback


def parse_fchart(xml: str) -> list[Bar]:
    bars = []
    for d, o, h, l, c, v in ITEM.findall(xml):
        close = _num(c, 0.0)
        if close <= 0:
            continue
        bars.append([int(d), _num(o, close), _num(h, close), _num(l, close), close, int(_num(v, 0.0))])
    return bars


def fetch_kr(symbol: str, get=http_get) -> list[Bar]:
    xml = get(URL.format(symbol=symbol)).decode("euc-kr", "ignore")
    bars = parse_fchart(xml)
    if not bars:
        raise FetchError(f"KR {symbol}: 봉 없음")
    return bars
