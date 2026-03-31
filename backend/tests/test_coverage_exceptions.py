from __future__ import annotations


def test_response_helpers_exception_branches(app, monkeypatch):
    from app.responses import fail, ok
    import flask

    class BadG:
        def __getattr__(self, _name: str):
            raise RuntimeError("no g")

    with app.app_context():
        monkeypatch.setattr(flask, "g", BadG())
        resp, status = ok({"x": 1})
        assert status == 200
        resp, status = fail(code="X", message="m", status_code=400, details={"k": "v"})
        assert status == 400


def test_error_logging_fallback_paths(app, client, monkeypatch):
    def boom():
        raise RuntimeError("boom")

    app.add_url_rule("/boom2", "boom2", boom)

    def raising_warning(*_args, **_kwargs):
        raise RuntimeError("logger down")

    def raising_exception(*_args, **_kwargs):
        raise RuntimeError("logger down")

    monkeypatch.setattr(app.logger, "warning", raising_warning)
    r = client.get("/no-such-route-2")
    assert r.status_code == 404

    monkeypatch.setattr(app.logger, "exception", raising_exception)
    r = client.get("/boom2")
    assert r.status_code == 500
