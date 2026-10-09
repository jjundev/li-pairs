from pathlib import Path

import pytest
import yaml

from lipairs.pairs import Leg, PairsError, load_pairs, parse_pairs

GOOD = yaml.safe_load("""
- id: kr-skhynix
  market: KR
  underlying: SK하이닉스
  longs:
    - {symbol: "0193T0", name: KODEX SK하이닉스단일종목레버리지, mult: 2}
  shorts:
    - {symbol: "0197X0", name: SOL SK하이닉스선물단일종목인버스2X, mult: -2}
""")


def test_parse_good_pair():
    [p] = parse_pairs(GOOD)
    assert p.id == "kr-skhynix" and p.market == "KR" and p.underlying == "SK하이닉스"
    assert p.longs[0].symbol == "0193T0" and p.longs[0].mult == 2.0
    assert [leg.symbol for leg in p.legs()] == ["0193T0", "0197X0"]


def test_unquoted_numeric_symbol_is_rejected_with_hint():
    bad = yaml.safe_load("- {id: a, market: KR, longs: [{symbol: 122630, mult: 2}], shorts: [{symbol: '252670', mult: -2}]}")
    with pytest.raises(PairsError, match="따옴표"):
        parse_pairs(bad)


@pytest.mark.parametrize("patch, msg", [
    ({"market": "JP"}, "market"),
    ({"shorts": []}, "하나 이상"),
    ({"longs": [{"symbol": "X", "mult": -2}]}, "양수"),
    ({"shorts": [{"symbol": "Y", "mult": 2}]}, "음수"),
    ({"shorts": [{"symbol": "0193T0", "mult": -2}]}, "두 번"),
    ({"longs": [{"symbol": "X", "mult": 0}]}, "0이 아닌"),
])
def test_invalid_pairs_are_rejected(patch, msg):
    raw = {**GOOD[0], **patch}
    with pytest.raises(PairsError, match=msg):
        parse_pairs([raw])


def test_duplicate_ids_are_rejected():
    with pytest.raises(PairsError, match="중복"):
        parse_pairs(GOOD + GOOD)


def test_repo_pairs_yaml_is_valid_and_has_professor_examples():
    pairs = load_pairs(Path(__file__).parent.parent / "pairs.yaml")
    ids = [p.id for p in pairs]
    assert ids[:3] == ["kr-skhynix", "us-spacex", "us-semis"]
    semis = next(p for p in pairs if p.id == "us-semis")
    assert (semis.longs[0].symbol, semis.shorts[0].symbol) == ("SOXL", "SOXS")


def test_index_is_optional_and_parsed():
    data = yaml.safe_load(yaml.safe_dump(GOOD, allow_unicode=True))
    data[0]["index"] = {"symbol": "KPI200", "name": "코스피200"}
    [p] = parse_pairs(data)
    assert p.index == Leg("KPI200", "코스피200", 1.0)
    assert parse_pairs(GOOD)[0].index is None


def test_index_symbol_must_be_quoted_string():
    data = yaml.safe_load(yaml.safe_dump(GOOD, allow_unicode=True))
    data[0]["index"] = {"symbol": 200, "name": "x"}
    with pytest.raises(PairsError, match="따옴표"):
        parse_pairs(data)


def test_repo_pairs_yaml_links_three_indexes():
    pairs = load_pairs(Path(__file__).parents[1] / "pairs.yaml")
    assert {p.id: p.index.symbol for p in pairs if p.index} == {
        "kr-kospi200": "KPI200", "us-semis": "^SOX", "us-qqq": "^NDX"}
