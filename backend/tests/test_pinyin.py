from app.pinyin import to_pinyin_full_and_initials


def test_pinyin_full_and_initials_for_shop_terms():
    full, initials = to_pinyin_full_and_initials("豆腐猫砂")
    assert full.endswith("maosha")
    assert initials.endswith("ms")

