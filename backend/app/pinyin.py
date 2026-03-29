from __future__ import annotations

import json
import os
import unicodedata


_DICT: dict[int, str] | None = None


def _load_dict() -> dict[int, str]:
    global _DICT
    if _DICT is not None:
        return _DICT
    path = os.path.join(os.path.dirname(os.path.realpath(__file__)), "pinyin_dict.json")
    with open(path, "r", encoding="utf-8") as f:
        raw: dict[str, str] = json.load(f)
    _DICT = {int(k): v for k, v in raw.items()}
    return _DICT


def _strip_tone(s: str) -> str:
    s = s.replace("ü", "v")
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return s


def to_pinyin_full_and_initials(text: str) -> tuple[str, str]:
    if not text:
        return "", ""
    d = _load_dict()
    full_parts: list[str] = []
    initials_parts: list[str] = []
    for ch in text:
        code = ord(ch)
        v = d.get(code)
        if not v:
            continue
        first = v.split(",")[0]
        plain = _strip_tone(first).lower()
        if not plain:
            continue
        full_parts.append(plain)
        initials_parts.append(plain[0])
    return "".join(full_parts), "".join(initials_parts)

