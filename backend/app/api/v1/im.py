from __future__ import annotations

from datetime import datetime

from flask import g, request

from ...auth import require_auth
from ...extensions import db
from ...models import IMConversation, IMMessage, User
from ...responses import fail, ok


def _ms(dt: datetime | None) -> int:
    if dt is None:
        return 0
    return int(dt.timestamp() * 1000)


def _message_to_dict(m: IMMessage) -> dict:
    return {
        "id": m.id,
        "conversationId": m.conversation_id,
        "senderId": m.sender_id,
        "text": m.content,
        "createdAt": _ms(m.created_at),
        "status": "sent",
    }


def register_routes(bp) -> None:
    @bp.get("/im/conversations")
    @require_auth
    def list_conversations():
        me: User = g.current_user
        convs = IMConversation.query.filter(
            (IMConversation.user_a_id == me.id) | (IMConversation.user_b_id == me.id)
        ).all()

        result = []
        for c in convs:
            peer_id = c.user_b_id if c.user_a_id == me.id else c.user_a_id
            peer = User.query.get(peer_id)
            last = (
                IMMessage.query.filter_by(conversation_id=c.id)
                .order_by(IMMessage.created_at.desc())
                .first()
            )
            result.append(
                {
                    "id": c.id,
                    "peerId": peer_id,
                    "peerNickname": peer.nickname if peer else "",
                    "peerAvatarUrl": peer.avatar_url if peer else "",
                    "lastMessage": last.content if last else "",
                    "lastMessageAt": _ms(last.created_at if last else c.last_message_at),
                    "unreadCount": 0,
                }
            )

        result.sort(key=lambda x: x.get("lastMessageAt", 0), reverse=True)
        return ok({"list": result})

    @bp.get("/im/messages")
    @require_auth
    def list_messages():
        me: User = g.current_user
        conversation_id = request.args.get("conversationId")
        if not isinstance(conversation_id, str) or not conversation_id:
            return fail(code="BAD_REQUEST", message="conversationId required", status_code=400)
        conv = IMConversation.query.get(conversation_id)
        if conv is None or me.id not in {conv.user_a_id, conv.user_b_id}:
            return fail(code="NOT_FOUND", message="conversation not found", status_code=404)
        msgs = (
            IMMessage.query.filter_by(conversation_id=conversation_id)
            .order_by(IMMessage.created_at.asc())
            .all()
        )
        return ok({"list": [_message_to_dict(m) for m in msgs]})

    @bp.post("/im/conversations")
    @require_auth
    def create_conversation():
        me: User = g.current_user
        data = request.get_json(silent=True) or {}
        peer_id = data.get("peerId")
        if not isinstance(peer_id, str) or not peer_id:
            return fail(code="BAD_REQUEST", message="peerId required", status_code=400)
        if peer_id == me.id:
            return fail(code="BAD_REQUEST", message="invalid peerId", status_code=400)
        if User.query.get(peer_id) is None:
            return fail(code="NOT_FOUND", message="peer not found", status_code=404)

        a, b = sorted([me.id, peer_id])
        conv = IMConversation.query.filter_by(user_a_id=a, user_b_id=b).first()
        if conv is None:
            conv = IMConversation(user_a_id=a, user_b_id=b)
            db.session.add(conv)
            db.session.commit()
        return ok({"id": conv.id})

    @bp.post("/im/messages")
    @require_auth
    def send_message():
        me: User = g.current_user
        data = request.get_json(silent=True) or {}
        conversation_id = data.get("conversationId")
        text = data.get("text")
        if not isinstance(conversation_id, str) or not conversation_id:
            return fail(code="BAD_REQUEST", message="conversationId required", status_code=400)
        if not isinstance(text, str) or not text.strip():
            return fail(code="BAD_REQUEST", message="text required", status_code=400)
        conv = IMConversation.query.get(conversation_id)
        if conv is None or me.id not in {conv.user_a_id, conv.user_b_id}:
            return fail(code="NOT_FOUND", message="conversation not found", status_code=404)
        msg = IMMessage(conversation_id=conversation_id, sender_id=me.id, content=text.strip())
        conv.last_message_at = datetime.utcnow()
        db.session.add(msg)
        db.session.commit()
        return ok(_message_to_dict(msg), status_code=201)

    @bp.post("/im/conversations/<conversation_id>/read")
    @require_auth
    def mark_read(conversation_id: str):
        me: User = g.current_user
        conv = IMConversation.query.get(conversation_id)
        if conv is None or me.id not in {conv.user_a_id, conv.user_b_id}:
            return fail(code="NOT_FOUND", message="conversation not found", status_code=404)
        return ok({"ok": True})

