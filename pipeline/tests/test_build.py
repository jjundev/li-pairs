import json
from datetime import datetime, timedelta, timezone

from lipairs.bars import FetchError
from lipairs.build import build, index_name, ohlc_name
from lipairs.pairs import Leg, Pair

NOW = datetime(2026, 10, 6, 16, 30, tzinfo=timezone(timedelta(hours=9)))
HYNIX = Pair("kr-skhynix", "KR", "SK하이닉스", (Leg("0193T0", "KODEX", 2.0),), (Leg("0197X0", "SOL", -2.0),))
HYNIX2 = Pair("kr-dup", "KR", "중복", (Leg("0193T0", "KODEX", 2.0),), (Leg("0195S0", "X", -1.5),))
BARS = [[20261005, 1.0, 2.0, 0.5, 1.5, 10], [20261006, 1.5, 2.5, 1.0, 2.0, 20]]


def ok(symbol):
    return BARS


def fail(symbol):
    raise FetchError("down")


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def test_success_writes_ohlc_and_pairs(tmp_path):
    doc = build([HYNIX], tmp_path, {"KR": ok}, NOW)
    assert read(tmp_path / "ohlc/KR_0193T0.json") == {"symbol": "0193T0", "market": "KR", "currency": "KRW", "bars": BARS}
    assert read(tmp_path / "pairs.json") == doc
    assert doc["generatedAt"] == "2026-10-06T16:30+09:00"
    leg = doc["pairs"][0]["longs"][0]
    assert leg == {"symbol": "0193T0", "name": "KODEX", "mult": 2, "file": "ohlc/KR_0193T0.json",
                   "available": True, "stale": False, "lastDate": 20261006}


def test_failure_keeps_previous_file_and_marks_stale(tmp_path):
    build([HYNIX], tmp_path, {"KR": ok}, NOW)
    before = (tmp_path / "ohlc/KR_0197X0.json").read_text(encoding="utf-8")
    doc = build([HYNIX], tmp_path, {"KR": fail}, NOW, log=lambda m: None)
    assert (tmp_path / "ohlc/KR_0197X0.json").read_text(encoding="utf-8") == before
    leg = doc["pairs"][0]["shorts"][0]
    assert (leg["available"], leg["stale"], leg["lastDate"]) == (True, True, 20261006)


def test_failure_without_previous_file_is_unavailable(tmp_path):
    doc = build([HYNIX], tmp_path, {"KR": fail}, NOW, log=lambda m: None)
    leg = doc["pairs"][0]["longs"][0]
    assert (leg["available"], leg["stale"], leg["lastDate"]) == (False, False, None)


def test_symbol_shared_by_two_pairs_is_fetched_once(tmp_path):
    calls = []

    def counting(symbol):
        calls.append(symbol)
        return BARS

    doc = build([HYNIX, HYNIX2], tmp_path, {"KR": counting}, NOW)
    assert sorted(calls) == ["0193T0", "0195S0", "0197X0"]
    assert doc["pairs"][1]["shorts"][0]["mult"] == -1.5


def test_ohlc_name():
    assert ohlc_name("US", "SOXL") == "ohlc/US_SOXL.json"


SOX = Pair("us-semis", "US", "반도체", (Leg("SOXL", "L", 3.0),), (Leg("SOXS", "S", -3.0),),
           Leg("^SOX", "필라델피아 반도체 지수", 1.0))


def test_index_name_strips_non_alnum():
    assert index_name("US", "^SOX") == "ohlc/US_IDX_SOX.json"
    assert index_name("KR", "KPI200") == "ohlc/KR_IDX_KPI200.json"


def test_index_is_fetched_and_linked(tmp_path):
    seen = []
    doc = build([SOX], tmp_path, {"US": lambda s: seen.append(s) or BARS}, NOW)
    assert "^SOX" in seen
    assert read(tmp_path / "ohlc/US_IDX_SOX.json")["bars"] == BARS
    assert doc["pairs"][0]["index"] == {"symbol": "^SOX", "name": "필라델피아 반도체 지수",
        "file": "ohlc/US_IDX_SOX.json", "available": True, "stale": False, "lastDate": 20261006}


def test_index_failure_keeps_previous_file(tmp_path):
    build([SOX], tmp_path, {"US": ok}, NOW)
    doc = build([SOX], tmp_path, {"US": lambda s: fail(s) if s == "^SOX" else BARS}, NOW, log=lambda m: None)
    idx = doc["pairs"][0]["index"]
    assert (idx["available"], idx["stale"], idx["lastDate"]) == (True, True, 20261006)


def test_pair_without_index_is_null(tmp_path):
    assert build([HYNIX], tmp_path, {"KR": ok}, NOW)["pairs"][0]["index"] is None
