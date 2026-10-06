import pytest

from lipairs.discover import group_candidates, kr_classify, render_markdown, us_classify


@pytest.mark.parametrize("name, expected", [
    ("KODEX SK하이닉스단일종목레버리지", ("SK하이닉스", 2)),
    ("SOL SK하이닉스선물단일종목인버스2X", ("SK하이닉스", -2)),
    ("1Q SK하이닉스선물단일종목레버리지", ("SK하이닉스", 2)),
    ("KODEX 레버리지", ("200", 2)),
    ("KODEX 200선물인버스2X", ("200", -2)),
    ("KODEX 인버스", ("200", -1)),
    ("TIGER 미국필라델피아반도체레버리지(합성)", ("미국필라델피아반도체", 2)),
    ("KODEX 200", None),
    ("TIGER 미국S&P500", None),
])
def test_kr_classify(name, expected):
    assert kr_classify(name) == expected


@pytest.mark.parametrize("name, expected", [
    ("Direxion Daily Semiconductor Bull 3X ETF", ("SOX", 3)),
    ("Direxion Daily Semiconductor Bear 3X ETF", ("SOX", -3)),
    ("Direxion Shares ETF Trust Direxion Daily SpaceX Bull 2X ETF", ("SPCX", 2)),
    ("Themes ETF Trust Leverage Shares 2X Long SPCX Daily ETF", ("SPCX", 2)),
    ("Themes ETF Trust Leverage Shares 2X Short SPCX Daily ETF", ("SPCX", -2)),
    ("Investment Managers Series Trust II Tradr 2X Long SpaceX Daily", ("SPCX", 2)),
    ("ETF Opportunities Trust T-Rex 2X Inverse Tesla Daily Target ET", ("TSLA", -2)),
    ("Direxion Daily TSLA Bull 2X ETF", ("TSLA", 2)),
    ("Direxion Daily AMZN Bear 1X ETF", ("AMZN", -1)),
    ("ProShares UltraPro QQQ", ("QQQ", 3)),
    ("ProShares UltraShort Technology", ("TECHNOLOGY", -2)),
    ("ProShares Short MSCI EAFE", ("MSCI EAFE", -1)),
    ("Vanguard Ultra-Short Treasury ETF", None),
    ("Invesco Short Duration Total Return Bond ETF", None),
    ("Tidal ETF Trust II YieldMax TSLA Option Income Strategy ETF", None),
])
def test_us_classify(name, expected):
    assert us_classify(name) == expected


def test_group_and_render_only_two_sided_new_groups():
    rows = [
        ("US", "SOXL", "Direxion Daily Semiconductor Bull 3X ETF"),
        ("US", "SOXS", "Direxion Daily Semiconductor Bear 3X ETF"),
        ("US", "NVDU", "Direxion Daily NVDA Bull 2X ETF"),
        ("US", "NVDD", "Direxion Daily NVDA Bear 1X ETF"),
        ("US", "AAPU", "Direxion Daily AAPL Bull 2X ETF"),  # 숏 없음 → 제외
        ("US", "AAA", "Alternative Access First Priority CLO Bond ETF"),
    ]
    groups = group_candidates(rows)
    assert groups[("US", "NVDA")] == [("NVDU", "Direxion Daily NVDA Bull 2X ETF", 2.0), ("NVDD", "Direxion Daily NVDA Bear 1X ETF", -1.0)]
    md = render_markdown(groups, known={("US", "SOXL"), ("US", "SOXS")})
    assert "NVDA" in md and "id: us-nvda" in md and 'symbol: "NVDD"' in md
    assert "AAPL" not in md
    assert "## US · SOX" not in md
