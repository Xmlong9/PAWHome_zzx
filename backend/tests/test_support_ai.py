def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_conv(client, token: str, mode: str = "smart") -> str:
    r = client.post("/api/v1/shop/support/conversations", headers=_auth(token), json={"mode": mode})
    assert r.status_code == 200
    return r.get_json()["data"]["id"]


def _send_msg(client, token: str, cid: str, content: str):
    r = client.post(
        f"/api/v1/shop/support/conversations/{cid}/messages",
        headers=_auth(token),
        json={"content": content},
    )
    assert r.status_code == 200


def _list_msgs(client, token: str, cid: str) -> list[dict]:
    r = client.get(f"/api/v1/shop/support/conversations/{cid}/messages", headers=_auth(token))
    assert r.status_code == 200
    return r.get_json()["data"]["list"]


def test_smart_support_faq_requires_exact_match(client, app, user1_token, monkeypatch):
    from app.extensions import db
    from app.models import CustomerServiceFaq

    with app.app_context():
        db.session.add(CustomerServiceFaq(id="f1", question="如何退款？", answer="A", sort=0))
        db.session.commit()

    import app.api.v1.shop as shop_mod

    calls = {"n": 0}

    def _fake_ai(*args, **kwargs):
        calls["n"] += 1
        return "AI_REPLY"

    monkeypatch.setattr(shop_mod, "_call_doubao_text", _fake_ai, raising=False)

    cid = _create_conv(client, user1_token, "smart")
    _send_msg(client, user1_token, cid, "如何退款？谢谢")
    msgs = _list_msgs(client, user1_token, cid)
    assert msgs[-1]["role"] == "bot"
    assert msgs[-1]["content"] == "AI_REPLY"


def test_smart_support_out_of_scope_refuses(client, app, user1_token, monkeypatch):
    import app.api.v1.shop as shop_mod

    calls = {"n": 0}

    def _fake_ai(*args, **kwargs):
        calls["n"] += 1
        return "AI_REPLY"

    monkeypatch.setattr(shop_mod, "_call_doubao_text", _fake_ai, raising=False)

    cid = _create_conv(client, user1_token, "smart")
    _send_msg(client, user1_token, cid, "你喜欢什么猫？")
    msgs = _list_msgs(client, user1_token, cid)
    assert msgs[-1]["role"] == "bot"
    assert "订单" in msgs[-1]["content"] and "商店" in msgs[-1]["content"]
    assert calls["n"] == 0


def test_smart_support_rate_limit_blocks_ai(client, user1_token, monkeypatch):
    import app.api.v1.shop as shop_mod

    calls = {"ai": 0, "limit": 0}

    def _fake_ai(*args, **kwargs):
        calls["ai"] += 1
        return "AI_REPLY"

    allowed = {"n": 0}

    def _fake_allow(*args, **kwargs):
        allowed["n"] += 1
        calls["limit"] += 1
        return allowed["n"] == 1

    monkeypatch.setattr(shop_mod, "_call_doubao_text", _fake_ai, raising=False)
    monkeypatch.setattr(shop_mod, "_support_ai_allow", _fake_allow, raising=False)

    cid = _create_conv(client, user1_token, "smart")
    _send_msg(client, user1_token, cid, "订单怎么退款")
    _send_msg(client, user1_token, cid, "订单怎么退款")
    msgs = _list_msgs(client, user1_token, cid)
    assert msgs[-1]["role"] == "bot"
    assert "频繁" in msgs[-1]["content"]
    assert calls["ai"] == 1


def test_smart_support_order_id_in_scope_calls_ai(client, user1_token, monkeypatch):
    import app.api.v1.shop as shop_mod

    calls = {"n": 0}

    def _fake_ai(*args, **kwargs):
        calls["n"] += 1
        return "AI_REPLY"

    monkeypatch.setattr(shop_mod, "_call_doubao_text", _fake_ai, raising=False)

    cid = _create_conv(client, user1_token, "smart")
    _send_msg(client, user1_token, cid, "SO1774613445")
    msgs = _list_msgs(client, user1_token, cid)
    assert msgs[-1]["role"] == "bot"
    assert msgs[-1]["content"] == "AI_REPLY"
    assert calls["n"] == 1


def test_smart_support_greeting_in_scope_calls_ai(client, user1_token, monkeypatch):
    import app.api.v1.shop as shop_mod

    calls = {"n": 0}

    def _fake_ai(*args, **kwargs):
        calls["n"] += 1
        return "AI_REPLY"

    monkeypatch.setattr(shop_mod, "_call_doubao_text", _fake_ai, raising=False)

    cid = _create_conv(client, user1_token, "smart")
    _send_msg(client, user1_token, cid, "你好")
    msgs = _list_msgs(client, user1_token, cid)
    assert msgs[-1]["role"] == "bot"
    assert msgs[-1]["content"] == "AI_REPLY"
    assert calls["n"] == 1


def test_support_system_prompt_allows_greeting():
    import app.api.v1.shop as shop_mod

    p = shop_mod._support_system_prompt()
    assert "问候" in p or "你好" in p


def test_smart_support_injects_order_context_into_ai(client, app, user1_token, monkeypatch):
    import json

    from app.extensions import db
    from app.models import ShopProduct

    with app.app_context():
        if ShopProduct.query.get("p-test-oc") is None:
            db.session.add(
                ShopProduct(
                    id="p-test-oc",
                    title="猫粮",
                    description="d",
                    price_cents=1990,
                    images_json=json.dumps(["/p.jpg"]),
                    stock=999,
                    is_active=True,
                )
            )
            db.session.commit()

    r = client.post("/api/v1/shop/cart", headers=_auth(user1_token), json={"productId": "p-test-oc", "count": 1})
    assert r.status_code == 200
    r = client.post("/api/v1/shop/recharge", headers=_auth(user1_token), json={"amount": 50})
    assert r.status_code == 200
    r = client.post(
        "/api/v1/shop/order",
        headers=_auth(user1_token),
        json={"from": "cart", "address": "x", "payType": "balance"},
    )
    assert r.status_code == 200
    order_id = r.get_json()["data"]["id"]

    import app.api.v1.shop as shop_mod

    captured = {"text": None}

    def _fake_ai(text: str, *, conversation_id: str, user_id: str):
        captured["text"] = text
        return "AI_REPLY"

    monkeypatch.setattr(shop_mod, "_call_doubao_text", _fake_ai, raising=False)

    cid = _create_conv(client, user1_token, "smart")
    _send_msg(client, user1_token, cid, f"{order_id} 这单买了什么，花了多少钱？")
    msgs = _list_msgs(client, user1_token, cid)
    assert msgs[-1]["role"] == "bot"
    assert msgs[-1]["content"] == "AI_REPLY"
    assert order_id in (captured["text"] or "")
    assert "猫粮" in (captured["text"] or "")


def test_smart_support_order_card_payload_triggers_ai(client, app, user1_token, monkeypatch):
    import json

    from app.extensions import db
    from app.models import ShopProduct

    with app.app_context():
        if ShopProduct.query.get("p-test-card") is None:
            db.session.add(
                ShopProduct(
                    id="p-test-card",
                    title="猫砂",
                    description="d",
                    price_cents=990,
                    images_json=json.dumps(["/p.jpg"]),
                    stock=999,
                    is_active=True,
                )
            )
            db.session.commit()

    r = client.post("/api/v1/shop/cart", headers=_auth(user1_token), json={"productId": "p-test-card", "count": 1})
    assert r.status_code == 200
    r = client.post("/api/v1/shop/recharge", headers=_auth(user1_token), json={"amount": 50})
    assert r.status_code == 200
    r = client.post(
        "/api/v1/shop/order",
        headers=_auth(user1_token),
        json={"from": "cart", "address": "x", "payType": "balance"},
    )
    assert r.status_code == 200
    order_id = r.get_json()["data"]["id"]

    import app.api.v1.shop as shop_mod

    captured = {"text": None}

    def _fake_ai(text: str, *, conversation_id: str, user_id: str):
        captured["text"] = text
        return "AI_REPLY"

    monkeypatch.setattr(shop_mod, "_call_doubao_text", _fake_ai, raising=False)

    cid = _create_conv(client, user1_token, "smart")
    r = client.post(
        f"/api/v1/shop/support/conversations/{cid}/messages",
        headers=_auth(user1_token),
        json={"messageType": "order_card", "orderId": order_id},
    )
    assert r.status_code == 200
    msgs = _list_msgs(client, user1_token, cid)
    assert any(m["role"] == "user" and m["type"] == "order_card" for m in msgs)
    assert msgs[-1]["role"] == "bot"
    assert msgs[-1]["content"] == "AI_REPLY"
    assert order_id in (captured["text"] or "")
    assert "猫砂" in (captured["text"] or "")


def test_call_doubao_text_includes_augmented_text_as_latest_user_message(client, app, user1_token, monkeypatch):
    import app.api.v1.shop as shop_mod

    cid = _create_conv(client, user1_token, "smart")
    _send_msg(client, user1_token, cid, "我想查看物流")

    captured = {"messages": None}

    class _FakeCompletions:
        def create(self, *, model, messages, temperature):
            captured["messages"] = messages

            class _Msg:
                content = "AI_REPLY"

            class _Choice:
                message = _Msg()

            class _Resp:
                choices = [_Choice()]

            return _Resp()

    class _FakeChat:
        completions = _FakeCompletions()

    class _FakeClient:
        chat = _FakeChat()

    monkeypatch.setattr(shop_mod, "_get_ark_client", lambda: _FakeClient(), raising=False)

    reply = shop_mod._call_doubao_text(
        "我想查看物流\n\n【订单信息】\n订单号：SO1774958039\n物流最新：运输中",
        conversation_id=cid,
        user_id="u1",
    )

    assert reply == "AI_REPLY"
    assert captured["messages"] is not None
    assert captured["messages"][-1]["role"] == "user"
    assert "【订单信息】" in captured["messages"][-1]["content"]
    assert "SO1774958039" in captured["messages"][-1]["content"]


def test_smart_support_followup_question_reuses_recent_order_context(client, app, user1_token, monkeypatch):
    import json

    from app.extensions import db
    from app.models import ShopProduct

    with app.app_context():
        if ShopProduct.query.get("p-test-followup") is None:
            db.session.add(
                ShopProduct(
                    id="p-test-followup",
                    title="罐头",
                    description="d",
                    price_cents=1290,
                    images_json=json.dumps(["/p.jpg"]),
                    stock=999,
                    is_active=True,
                )
            )
            db.session.commit()

    r = client.post("/api/v1/shop/cart", headers=_auth(user1_token), json={"productId": "p-test-followup", "count": 1})
    assert r.status_code == 200
    r = client.post("/api/v1/shop/recharge", headers=_auth(user1_token), json={"amount": 50})
    assert r.status_code == 200
    r = client.post(
        "/api/v1/shop/order",
        headers=_auth(user1_token),
        json={"from": "cart", "address": "x", "payType": "balance"},
    )
    assert r.status_code == 200
    order_id = r.get_json()["data"]["id"]

    import app.api.v1.shop as shop_mod

    captured = {"texts": []}

    def _fake_ai(text: str, *, conversation_id: str, user_id: str):
        captured["texts"].append(text)
        return "AI_REPLY"

    monkeypatch.setattr(shop_mod, "_call_doubao_text", _fake_ai, raising=False)

    cid = _create_conv(client, user1_token, "smart")
    _send_msg(client, user1_token, cid, f"{order_id} 物流到哪了")
    _send_msg(client, user1_token, cid, "这单买了什么")

    msgs = _list_msgs(client, user1_token, cid)
    assert msgs[-1]["role"] == "bot"
    assert msgs[-1]["content"] == "AI_REPLY"
    assert len(captured["texts"]) >= 2
    assert order_id in captured["texts"][-1]
    assert "罐头" in captured["texts"][-1]
