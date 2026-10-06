import pytest

from lipairs.bars import FetchError
from lipairs.fetch_kr import fetch_kr, parse_fchart

SAMPLE = """<?xml version="1.0" encoding="EUC-KR" ?>
<protocol>
<chartdata symbol="0197X0" name="SOL SK하이닉스선물단일종목인버스2X" count="3" timeframe="day">
<item data="20260527|16260|17010|13950|16265|34054128" />
<item data="20260528|0|0|0|15565|0" />
<item data="20260529|14585|15500|14265|0|29053612" />
</chartdata>
</protocol>"""


def test_parse_fchart_reads_items():
    bars = parse_fchart(SAMPLE)
    assert bars[0] == [20260527, 16260.0, 17010.0, 13950.0, 16265.0, 34054128]


def test_zero_open_high_low_fall_back_to_close():
    assert parse_fchart(SAMPLE)[1] == [20260528, 15565.0, 15565.0, 15565.0, 15565.0, 0]


def test_zero_close_bar_is_dropped():
    assert [b[0] for b in parse_fchart(SAMPLE)] == [20260527, 20260528]


def test_fetch_kr_decodes_euc_kr_and_builds_url():
    urls = []

    def get(url):
        urls.append(url)
        return SAMPLE.encode("euc-kr")

    assert len(fetch_kr("0197X0", get=get)) == 2
    assert "symbol=0197X0" in urls[0] and "timeframe=day" in urls[0]


def test_fetch_kr_without_bars_raises():
    with pytest.raises(FetchError):
        fetch_kr("XXXXXX", get=lambda url: b"<protocol></protocol>")
