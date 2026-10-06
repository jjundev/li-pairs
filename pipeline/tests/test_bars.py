import io
import urllib.error

import pytest

from lipairs.bars import FetchError, http_get, sig6


def test_sig6_keeps_six_significant_digits():
    assert sig6(38668800000.123) == 38668800000.0
    assert sig6(29.6200008392334) == 29.62
    assert sig6(0.000123456789) == 0.000123457


def test_http_get_retries_then_succeeds():
    calls = []

    def opener(req, timeout):
        calls.append(req.full_url)
        if len(calls) < 3:
            raise urllib.error.URLError("boom")
        return io.BytesIO(b"ok")

    assert http_get("https://x", opener=opener, sleep=lambda s: None) == b"ok"
    assert len(calls) == 3


def test_http_get_sends_user_agent_and_extra_headers():
    seen = {}

    def opener(req, timeout):
        seen.update(req.headers)
        return io.BytesIO(b"")

    http_get("https://x", headers={"Accept": "application/json"}, opener=opener, sleep=lambda s: None)
    assert seen["User-agent"] == "Mozilla/5.0"
    assert seen["Accept"] == "application/json"


def test_http_get_raises_fetch_error_after_retries():
    def opener(req, timeout):
        raise TimeoutError()

    with pytest.raises(FetchError):
        http_get("https://x", retries=2, opener=opener, sleep=lambda s: None)


def test_http_get_retries_incomplete_read():
    import http.client

    calls = []

    def opener(req, timeout):
        calls.append(1)
        if len(calls) < 2:
            raise http.client.IncompleteRead(b"partial")
        return io.BytesIO(b"ok")

    assert http_get("https://x", opener=opener, sleep=lambda s: None) == b"ok"


def test_http_get_wraps_http_exception_as_fetch_error():
    import http.client

    def opener(req, timeout):
        raise http.client.RemoteDisconnected("bye")

    with pytest.raises(FetchError):
        http_get("https://x", retries=1, opener=opener, sleep=lambda s: None)
