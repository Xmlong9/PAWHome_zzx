from __future__ import annotations

import re
from dataclasses import dataclass


_KEEP_RE = re.compile(r"[\u4e00-\u9fff0-9a-zA-Z]+")


def normalize_query(q: str) -> str:
    if not isinstance(q, str):
        return ""
    parts = _KEEP_RE.findall(q.lower())
    return "".join(parts)


@dataclass(frozen=True)
class Lexicon:
    aliases: dict[str, list[str]]
    bundles: dict[str, list[str]]

    def expand(self, q: str, max_terms: int = 25) -> list[str]:
        base = normalize_query(q)
        if not base:
            return []

        ordered: list[str] = []
        seen: set[str] = set()
        max_terms = max(1, int(max_terms))

        variant_to_canon: dict[str, str] = {}
        canon_to_variants: dict[str, list[str]] = {}
        for canon, variants in self.aliases.items():
            canon_n = normalize_query(canon)
            canon_to_variants[canon_n] = [normalize_query(v) for v in variants]
            variant_to_canon[canon_n] = canon_n
            for v in variants:
                vn = normalize_query(v)
                if vn and vn not in variant_to_canon:
                    variant_to_canon[vn] = canon_n

        def push(x: str):
            if not x:
                return
            if len(ordered) >= max_terms:
                return
            if x in seen:
                return
            seen.add(x)
            ordered.append(x)

        push(base)

        base2 = (
            base.replace("猫咪", "猫")
            .replace("猫猫", "猫")
            .replace("狗狗", "狗")
            .replace("汪汪", "狗")
        )
        push(base2)

        if "沙" in base or "莎" in base or "啥" in base:
            push(base.replace("沙", "砂").replace("莎", "砂").replace("啥", "砂"))
            push(base2.replace("沙", "砂").replace("莎", "砂").replace("啥", "砂"))

        def is_broad_canon(canon_n: str) -> bool:
            return ("用品" in canon_n) or canon_n.endswith("大全") or canon_n.endswith("清单")

        for canon, variants in self.aliases.items():
            if base == canon or base2 == canon or base in variants or base2 in variants:
                canon_n = normalize_query(canon)
                push(canon_n)
                if not is_broad_canon(canon_n):
                    for v in variants:
                        push(normalize_query(v))

        bundle_keys = [base, base2]
        for k in bundle_keys:
            if k in self.bundles:
                for t in self.bundles[k]:
                    push(normalize_query(t))
        if "猫" in base2 and ("用品" in base2 or "物品" in base2):
            for t in self.bundles.get("猫咪用品", []):
                push(normalize_query(t))
        if "狗" in base2 and ("用品" in base2 or "物品" in base2):
            for t in self.bundles.get("狗狗用品", []):
                push(normalize_query(t))
        if ("宠物用品" in base2) or ("宠物" in base2 and ("用品" in base2 or "物品" in base2)):
            for t in self.bundles.get("宠物用品", []):
                push(normalize_query(t))

        i = 0
        while i < len(ordered) and len(ordered) < max_terms:
            t = ordered[i]
            canon = variant_to_canon.get(t)
            if canon:
                push(canon)
                if not is_broad_canon(canon):
                    for v in canon_to_variants.get(canon, []):
                        push(v)
            i += 1

        return ordered[:max_terms]


PET_LEXICON = Lexicon(
    aliases={
        "猫砂": ["猫砂", "猫沙", "猫莎", "猫啥", "猫 砂", "猫 沙"],
        "豆腐猫砂": ["豆腐猫砂", "豆腐猫沙", "豆腐猫莎"],
        "膨润土猫砂": ["膨润土猫砂", "膨润土猫沙"],
        "混合猫砂": ["混合猫砂", "混合猫沙"],
        "猫砂铲": ["猫砂铲", "铲屎铲", "猫砂铲子", "铲屎官工具"],
        "猫粮": ["猫粮", "猫 粮", "猫咪粮", "主粮", "猫主粮"],
        "狗粮": ["狗粮", "狗 粮", "狗狗粮", "狗主粮"],
        "猫罐头": ["猫罐头", "猫罐", "主食罐", "零食罐"],
        "猫条": ["猫条", "猫 条", "舔舔条", "猫咪零食"],
        "冻干": ["冻干", "冻 干", "冻干零食", "冻干粮"],
        "猫零食": ["猫零食", "猫咪零食", "猫零食包", "猫咪小零食"],
        "狗零食": ["狗零食", "狗狗零食", "狗零食包", "狗狗小零食"],
        "化毛膏": ["化毛膏", "化毛", "排毛膏", "去毛球", "猫化毛膏"],
        "益生菌": ["益生菌", "肠胃宝", "调理肠胃", "宠物益生菌"],
        "驱虫": ["驱虫", "驱 虫", "体内驱虫", "体外驱虫", "驱虫药"],
        "疫苗": ["疫苗", "打针", "免疫", "疫苗接种"],
        "营养膏": ["营养膏", "营养补充", "宠物营养膏"],
        "钙片": ["钙片", "补钙", "宠物钙片"],
        "洗护": ["洗护", "洗澡", "沐浴露", "香波", "护理"],
        "梳子": ["梳子", "宠物梳", "开结梳", "针梳", "排梳"],
        "指甲剪": ["指甲剪", "剪指甲", "宠物指甲剪", "指甲钳"],
        "耳部清洁": ["洗耳液", "耳漂", "耳道清洁", "清耳液"],
        "眼部清洁": ["洗眼液", "滴眼液", "眼部清洁", "泪痕"],
        "猫窝": ["猫窝", "猫屋", "猫床", "猫咪窝"],
        "狗窝": ["狗窝", "狗屋", "狗床", "狗狗窝"],
        "猫抓板": ["猫抓板", "抓板", "磨爪板", "猫抓柱", "猫爬架"],
        "猫砂盆": ["猫砂盆", "猫厕所", "猫厕", "猫盆"],
        "尿垫": ["尿垫", "尿片", "尿布", "吸尿垫"],
        "项圈": ["项圈", "项 圈", "项链", "脖圈"],
        "牵引绳": ["牵引绳", "牵引", "狗绳", "遛狗绳", "牵引带"],
        "猫包": ["猫包", "航空箱", "外出包", "猫咪背包", "宠物包"],
        "宠物推车": ["宠物推车", "推车", "宠物车"],
        "宠物玩具": ["宠物玩具", "玩具", "逗猫棒", "逗猫", "磨牙玩具"],
        "磨牙棒": ["磨牙棒", "磨牙", "洁牙骨", "狗狗磨牙"],
        "猫薄荷": ["猫薄荷", "薄荷", "猫草", "猫咪薄荷"],
        "饮水机": ["饮水机", "自动饮水机", "宠物饮水机"],
        "自动喂食器": ["自动喂食器", "喂食器", "定时喂食器", "宠物喂食器", "自动喂猫器", "自动喂狗器"],
        "食盆": ["食盆", "饭盆", "猫碗", "狗碗", "喂食碗"],
        "猫砂垫": ["猫砂垫", "落砂垫", "除砂垫", "猫砂脚垫"],
        "猫砂除臭": ["除臭", "除味", "除臭剂", "猫砂除臭", "除臭粉"],
        "湿巾": ["湿巾", "宠物湿巾", "清洁湿巾", "擦脚湿巾", "清洁纸巾"],
        "消毒": ["消毒", "除菌", "消毒液", "消毒喷雾", "杀菌", "除螨", "除螨喷雾"],
        "拾便袋": ["拾便袋", "便便袋", "捡屎袋", "狗屎袋", "垃圾袋"],
        "胸背": ["胸背", "胸背带", "背带", "胸背牵引", "遛狗胸背", "宠物背带"],
        "嘴套": ["嘴套", "口套", "防咬嘴套", "狗嘴套"],
        "伊丽莎白圈": ["伊丽莎白圈", "伊丽莎白项圈", "头套", "防舔圈", "防舔项圈"],
        "宠物笼": ["宠物笼", "猫笼", "狗笼", "笼子", "航空笼"],
        "围栏": ["围栏", "宠物围栏", "栅栏", "隔离栏", "护栏"],
        "牙刷牙膏": ["牙刷牙膏", "牙刷", "牙膏", "宠物牙刷", "宠物牙膏", "洁牙"],
        "剃毛器": ["剃毛器", "电推剪", "推毛器", "剪毛器", "宠物剃毛器"],
        "吹风机": ["吹风机", "宠物吹风机", "烘干机", "烘干箱", "宠物烘干箱"],
        "猫咪用品": ["猫咪用品", "猫用品", "猫咪必备", "猫咪日用品"],
        "狗狗用品": ["狗狗用品", "狗用品", "狗狗必备", "狗狗日用品"],
        "宠物用品": ["宠物用品", "宠物用具", "宠物必备", "宠物日用品", "宠物物品"],
        "猫咪用品大全": ["猫咪用品大全", "猫用品大全", "猫咪用品"],
        "狗狗用品大全": ["狗狗用品大全", "狗用品大全", "狗狗用品"],
        "宠物用品大全": ["宠物用品大全", "宠物用品清单", "宠物用品"],
        "猫咪用品清单": ["猫咪用品清单", "猫用品清单", "猫咪用品"],
        "狗狗用品清单": ["狗狗用品清单", "狗用品清单", "狗狗用品"],
    },
    bundles={
        "猫咪用品": [
            "猫砂",
            "豆腐猫砂",
            "膨润土猫砂",
            "混合猫砂",
            "猫砂铲",
            "猫砂盆",
            "猫砂垫",
            "猫粮",
            "猫罐头",
            "猫条",
            "冻干",
            "猫抓板",
            "猫爬架",
            "猫窝",
            "猫包",
            "宠物玩具",
            "化毛膏",
            "猫薄荷",
            "猫零食",
            "指甲剪",
            "梳子",
            "耳部清洁",
            "眼部清洁",
            "食盆",
            "饮水机",
            "自动喂食器",
            "湿巾",
            "消毒",
            "伊丽莎白圈",
            "宠物笼",
            "围栏",
            "牙刷牙膏",
            "剃毛器",
            "吹风机",
            "洗护",
            "驱虫",
            "益生菌",
            "营养膏",
        ],
        "狗狗用品": [
            "狗粮",
            "冻干",
            "狗零食",
            "狗窝",
            "尿垫",
            "项圈",
            "牵引绳",
            "胸背",
            "嘴套",
            "拾便袋",
            "宠物玩具",
            "磨牙棒",
            "指甲剪",
            "梳子",
            "耳部清洁",
            "眼部清洁",
            "食盆",
            "饮水机",
            "自动喂食器",
            "湿巾",
            "消毒",
            "伊丽莎白圈",
            "宠物笼",
            "围栏",
            "牙刷牙膏",
            "剃毛器",
            "吹风机",
            "洗护",
            "驱虫",
            "益生菌",
            "宠物推车",
            "营养膏",
        ],
        "宠物用品": [
            "猫咪用品",
            "狗狗用品",
            "驱虫",
            "疫苗",
            "洗护",
            "宠物玩具",
            "项圈",
            "牵引绳",
            "胸背",
            "拾便袋",
            "猫包",
            "宠物推车",
            "尿垫",
            "食盆",
            "饮水机",
            "自动喂食器",
            "湿巾",
            "消毒",
            "伊丽莎白圈",
            "宠物笼",
            "围栏",
            "牙刷牙膏",
        ],
    },
)


def expand_pet_query(q: str, max_terms: int = 25) -> list[str]:
    return PET_LEXICON.expand(q, max_terms=max_terms)
