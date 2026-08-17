#!/usr/bin/env python3
"""Batch 3 - Step 5: Insert cast data for 35 new dramas into actors table."""

import json
import sqlite3
import os
import re

BASE = '/Coze/Drive/CDrama_Database/cdrama-database'
DB_PATH = os.path.join(BASE, 'data/cdrama.db')

# ============================================================
# Cast data: drama_slug -> list of (actor_en_name, actor_zh_name, character_zh)
# Based on search results from Douban, Baidu Baike, Maoyan etc.
# ============================================================

CAST_DATA = {
    "the-first-frost": [
        ("Bai Jingting", "白敬亭", "桑延"),
        ("Zhang Ruonan", "章若楠", "温以凡"),
        ("Chen Haosen", "陈昊森", "苏浩安"),
        ("Zhang Miaoyi", "张淼怡", "钟思乔"),
        ("Zhai Xiaowen", "翟潇闻", "向朗"),
        ("Yuan Ye", "原野", "穆承允"),
        ("Wu Yuheng", "吴宇恒", "段嘉许"),
        ("Liu Chutian", "刘楚恬", "桑稚"),
    ],
    "the-double": [
        ("Wu Jinyan", "吴谨言", "薛芳菲/姜梨"),
        ("Wang Xingyue", "王星越", "萧蘅"),
        ("Chen Xinhai", "陈鑫海", "沈玉容"),
        ("Liang Yongqi", "梁永棋", "沈玉容"),
        ("Chen Qiaoen", "陈乔恩", "季淑然"),
        ("Su Ke", "苏可", "姜相国"),
        ("Li Meng", "李梦", "婉宁公主"),
        ("Yang Chaoyue", "杨超越", "姜梨"),
    ],
    "love-o2o": [
        ("Yang Yang", "杨洋", "肖奈"),
        ("Zheng Shuang", "郑爽", "贝微微"),
        ("Mao Xiaotong", "毛晓彤", "二喜"),
        ("Bai Yu", "白宇", "曹光"),
        ("Niu Junfeng", "牛骏峰", "KO/于半珊"),
        ("Cui Hang", "崔航", "郝眉"),
    ],
    "falling-into-your-smile": [
        ("Xu Kai", "许凯", "陆思诚"),
        ("Cheng Xiao", "程潇", "童谣"),
        ("Zhai Xiaowen", "翟潇闻", "简阳"),
        ("Yao Chi", "姚弛", "老K"),
        ("Hui Ziqiu", "惠楸秋", "余明"),
        ("Wang Yizhe", "王一哲", "小白"),
    ],
    "are-you-the-one": [
        ("Zhang Wanyi", "张晚意", "崔行舟"),
        ("Wang Churan", "王楚然", "柳眠棠"),
        ("Liu Lingzi", "刘令姿", "贺珍"),
        ("Chang Huasen", "常华森", "子瑜"),
        ("Zhang Chi", "张弛", "赵泉"),
        ("Yuan Yuxuan", "袁雨萱", "石雪霁"),
        ("Huang Cancan", "黄灿灿", "孙芸儿"),
        ("Dong Xuan", "董璇", "吴太后"),
    ],
    "perfect-match": [
        ("Lu Yuxiao", "卢昱晓", "康宁"),
        ("Wang Xingyue", "王星越", "柴安"),
        ("Wu Xuanyi", "吴宣仪", "福慧"),
        ("Ni Hongjie", "倪虹洁", "郦娘子"),
        ("Liu Xiening", "刘些宁", "寿华"),
        ("Chen Heyi", "陈鹤一", "杜仰熙"),
        ("Huang Shengchi", "黄圣池", "范良翰"),
        ("Ke Ying", "柯颖", "好德"),
    ],
    "lost-you-forever": [
        ("Yang Zi", "杨紫", "小夭/玟小六"),
        ("Zhang Wanyi", "张晚意", "玱玹"),
        ("Dang Wei", "檀健次", "相柳/防风邶"),
        ("Deng Wei", "邓为", "涂山璟/叶十七"),
        ("Dai Luwa", "代露娃", "阿念"),
        ("Wang Hongyi", "王弘毅", "赤水丰隆"),
    ],
    "new-life-begins": [
        ("Bai Jingting", "白敬亭", "尹峥"),
        ("Tian Xiwei", "田曦薇", "李薇"),
        ("Chen Xiao Yun", "陈小纭", "郝葭"),
        ("Liu Guanlin", "刘冠麟", "尹岸"),
        ("Tang Mengjia", "汤梦佳", "上官婧"),
        ("Chen Youwang", "陈幽篁", "元英"),
    ],
    "the-best-thing": [
        ("Zhang Wanyi", "张晚意", "陈麦冬"),
        ("Zhou Ye", "周也", "庄洁"),
        ("Lin Yi", "林一", "何苏叶"),
        ("Li Qing", "李沁", "方妤"),
    ],
    "the-tale-of-rose": [
        ("Liu Yifei", "刘亦菲", "黄亦玫"),
        ("Tong Dawei", "佟大为", "黄振华"),
        ("Lin Gengxin", "林更新", "方协文"),
        ("Wan Qian", "万茜", "苏更生"),
        ("Lin Yi", "林一", "何西"),
        ("Peng Guanying", "彭冠英", "庄国栋"),
        ("Huo Jianhua", "霍建华", "傅家明"),
        ("Zhu Zhu", "朱珠", "姜雪琼"),
    ],
    "the-rise-of-ning": [
        ("Zhang Wanyi", "张晚意", "罗慎远"),
        ("Ren Min", "任敏", "罗宜宁"),
        ("Ci Sha", "此沙", "陆嘉学"),
        ("Zhang Yao", "张瑶", "林海如"),
        ("Lu Fangsheng", "芦芳生", "罗成章"),
        ("Zhao Ziqi", "赵子琪", "陈兰"),
        ("Dai Jiaoqian", "戴娇倩", "乔月婵"),
        ("Wu Yuheng", "吴宇恒", "林茂"),
    ],
    "kill-me-love-me": [
        ("Liu Xueyi", "刘学义", "慕容璟和"),
        ("Wu Jinyan", "吴谨言", "眉林"),
        ("Bi Wenjun", "毕雯珺", "越秦"),
        ("Zhao Xiaotang", "赵小棠", "落梅"),
        ("Chen Chuhe", "陈楚河", "慕容玄烈"),
        ("Huang Riyng", "黄日莹", "子顾"),
    ],
    "love-and-redemption": [
        ("Cheng Yi", "成毅", "禹司凤"),
        ("Yuan Bingyan", "袁冰妍", "褚璇玑"),
        ("Liu Xueyi", "刘学义", "柏麟帝君"),
        ("Zhang Yuxi", "张予曦", "郑淑慎"),
    ],
    "my-journey-to-you": [
        ("Yu Shuxin", "虞书欣", "云为衫"),
        ("Zhang Linghe", "张凌赫", "宫子羽"),
        ("Esther", "卢昱晓", "上官浅"),
        ("Sun Chenjun", "孙晨竣", "金繁"),
    ],
    "the-princess-royal": [
        ("Zhao Jinmai", "赵今麦", "李蓉"),
        ("Zhang Linghe", "张凌赫", "裴文宣"),
        ("Chen Duling", "陈都灵", "上官婉儿"),
        ("Sui Yuan", "隋媛", "苏容卿"),
    ],
    "moonlight-mystique": [
        ("Bai Lu", "白鹿", "白烁"),
        ("Ao Ruihao", "敖瑞鹏", "梵樾"),
        ("Zhang Kangle", "张康乐", "重昭"),
        ("Dai Luwa", "代露娃", "藏樱"),
    ],
    "love-game-in-eastern-fantasy": [
        ("Yu Shuxin", "虞书欣", "凌妙妙"),
        ("Ding Yuxi", "丁禹兮", "慕声"),
        ("Zhu Xudan", "祝绪丹", "慕瑶"),
        ("Yang Shi", "杨仕泽", "柳拂衣"),
    ],
    "the-prisoner-of-beauty": [
        ("Liu Yuning", "刘宇宁", "魏劭"),
        ("Song Zuoer", "宋祖儿", "小乔"),
        ("Xuan Lu", "宣璐", "苏娥皇"),
        ("Liu Duanduan", "刘端端", "魏俨"),
        ("Liu Xiaoqing", "刘晓庆", "徐夫人"),
        ("He Hongshan", "何泓姗", "大乔"),
        ("Li Xueqin", "李雪琴", "小桃"),
        ("He Rundong", "何润东", "高恒"),
    ],
    "fated-hearts": [
        ("Wang Churan", "王楚然", "烽影"),
        ("Li Hongyi", "李宏毅", "燃梅"),
    ],
    "put-your-head-on-my-shoulder": [
        ("Lin Yi", "林一", "顾未易"),
        ("Xing Fei", "邢菲", "司徒末"),
        ("Tang Xiaotian", "唐晓天", "林直树"),
        ("Zheng Yingying", "郑英瑛", "池亚玲"),
    ],
    "go-ahead": [
        ("Tan Songyun", "谭松韵", "李尖尖"),
        ("Song Weilong", "宋威龙", "凌霄"),
        ("Zhang Xincheng", "张新成", "贺子秋"),
        ("Tu Songyan", "涂松岩", "李海潮"),
        ("Ma Li", "马丽", "陈婷"),
    ],
    "a-love-so-beautiful": [
        ("Hu Yitian", "胡一天", "江辰"),
        ("Shen Yue", "沈月", "陈小希"),
        ("Gao Zhiting", "高至霆", "吴柏松"),
        ("Wang Ziwei", "王梓薇", "林静晓"),
    ],
    "bright-eyes-in-the-dark": [
        ("Chen Feiyu", "陈飞宇", "林陆骁"),
        ("Zhang Jingyi", "张婧仪", "南初"),
        ("Zeng Shunxi", "曾舜晞", "楼明冶"),
        ("Liu Yihan", "刘已航", "雷大朋"),
    ],
    "in-blossom": [
        ("Ju Jingyi", "鞠婧祎", "杨采薇"),
        ("Liu Xueyi", "刘学义", "潘樾"),
        ("Zhang Miaoyi", "张淼怡", "白小黛"),
    ],
    "brocade-odyssey": [
        ("Tan Songyun", "谭松韵", "季英英"),
        ("Ren Jialun", "任嘉伦", "杨静澜"),
        ("Jiang Shan", "蒋欣", "赵环珠"),
        ("Ma Yake", "马雅柯", "杨静渊"),
    ],
    "blossoms-in-adversity": [
        ("Zhang Jingyi", "张婧仪", "花芷"),
        ("Zhai Zilu", "翟子路", "顾晏惜"),
        ("Liu Xueyi", "刘学义", "沈琪"),
    ],
    "lighter-and-princess": [
        ("Chen Feiyu", "陈飞宇", "李峋"),
        ("Zhang Jingyi", "张婧仪", "朱韵"),
        ("Zhao Zhiwei", "赵志伟", "方舒苗"),
        ("Cui Peng", "崔鹏", "高见鸿"),
    ],
    "under-the-skin": [
        ("Tan Jianci", "檀健次", "沈翊"),
        ("Jin Shijia", "金世佳", "杜城"),
        ("Lu Yuxiao", "卢昱晓", "柳小叶"),
    ],
    "day-of-change": [
        ("Zhang Yi", "张译", "严良"),
        ("Wang Junkai", "王俊凯", "庄树"),
        ("Pan Yueming", "潘粤明", "蒋广善"),
        ("Wang Longzheng", "王龙正", "马坤"),
    ],
    "our-interpreter": [
        ("Yang Mi", "杨幂", "乔菲"),
        ("Huang Xuan", "黄轩", "程家阳"),
        ("Gao Weiguang", "高伟光", "王旭东"),
        ("Zhou Qiqi", "周奇奇", "吴嘉怡"),
    ],
    "hello-mr-gu": [
        ("Liu Haoran", "刘昊然", "陆子筝"),
        ("Ouyang Nana", "欧阳娜娜", "蚁小妲"),
    ],
    "the-happy-seven-in-changan": [
        ("Liu Xueyi", "刘学义", "李勉"),
        ("Liu Haocun", "刘浩存", "李 twirl"),
        ("Zhai Xiaowen", "翟潇闻", "裴尚宫"),
    ],
    "you-are-my-glory": [
        ("Yang Yang", "杨洋", "于途"),
        ("Dilraba", "迪丽热巴", "乔晶晶"),
        ("Liu Yuning", "刘宇宁", "沈净"),
        ("Hu Ke", "胡可", "肖再"),
    ],
    "the-lost-tomb-2": [
        ("Hou Minghao", "侯明昊", "吴邪"),
        ("Cheng Yi", "成毅", "张起灵"),
        ("Li Man", "李曼", "阿宁"),
        ("Liu Xueyi", "刘学义", "黑眼镜"),
    ],
    "arsenal-military-academy": [
        ("Bai Lu", "白鹿", "谢襄"),
        ("Xu Kai", "许凯", "顾燕帧"),
        ("Li Chengbin", "李程彬", "沈君山"),
        ("Wu Jiaxin", "吴佳怡", "曲曼婷"),
        ("Chao Xu", "朝旭", "纪瑾"),
        ("Zhang Yixin", "张逸杰", "黄迪"),
    ],
}

def make_slug(name_zh):
    """Convert Chinese name to a pinyin-based slug. Use a simple mapping."""
    # Manual mapping for accuracy
    name_map = {
        "白敬亭": "bai-jingting", "章若楠": "zhang-ruonan", "陈昊森": "chen-haosen",
        "张淼怡": "zhang-miaoyi", "翟潇闻": "zhai-xiaowen", "原野": "yuan-ye",
        "吴宇恒": "wu-yuheng", "刘楚恬": "liu-chutian", "吴谨言": "wu-jinyan",
        "王星越": "wang-xingyue", "陈鑫海": "chen-xinhai", "梁永棋": "liang-yongqi",
        "陈乔恩": "chen-qiaoen", "苏可": "su-ke", "李梦": "li-meng",
        "杨超越": "yang-changyue", "杨洋": "yang-yang", "郑爽": "zheng-shuang",
        "毛晓彤": "mao-xiaotong", "白宇": "bai-yu", "牛骏峰": "niu-junfeng",
        "崔航": "cui-hang", "许凯": "xu-kai", "程潇": "cheng-xiao",
        "姚弛": "yao-chi", "惠楸秋": "hui-qiuqiu", "王一哲": "wang-yizhe",
        "张晚意": "zhang-wanyi", "王楚然": "wang-churan", "刘令姿": "liu-lingzi",
        "常华森": "chang-huasen", "张弛": "zhang-chi", "袁雨萱": "yuan-yuxuan",
        "黄灿灿": "huang-cancan", "董璇": "dong-xuan", "卢昱晓": "lu-yuxiao",
        "吴宣仪": "wu-xuanyi", "倪虹洁": "ni-hongjie", "刘些宁": "liu-xiening",
        "陈鹤一": "chen-heyi", "黄圣池": "huang-shengchi", "柯颖": "ke-ying",
        "杨紫": "yang-zi", "檀健次": "tan-jianci", "邓为": "deng-wei",
        "代露娃": "dai-luwa", "王弘毅": "wang-hongyi", "田曦薇": "tian-xiwei",
        "陈小纭": "chen-xiaoyun", "刘冠麟": "liu-guanlin", "汤梦佳": "tang-mengjia",
        "周也": "zhou-ye", "林一": "lin-yi", "李沁": "li-qin",
        "刘亦菲": "liu-yifei", "佟大为": "tong-dawei", "林更新": "lin-gengxin",
        "万茜": "wan-qian", "彭冠英": "peng-guanying", "霍建华": "huo-jianhua",
        "朱珠": "zhu-zhu", "任敏": "ren-min", "此沙": "ci-sha",
        "张瑶": "zhang-yao", "芦芳生": "lu-fangsheng", "赵子琪": "zhao-ziqi",
        "戴娇倩": "dai-jiaoqian", "刘学义": "liu-xueyi", "毕雯珺": "bi-wenjun",
        "赵小棠": "zhao-xiaotang", "陈楚河": "chen-chuhe", "黄日莹": "huang-riying",
        "成毅": "cheng-yi", "袁冰妍": "yuan-bingyan", "张予曦": "zhang-yuxi",
        "虞书欣": "yu-shuxin", "张凌赫": "zhang-linghe", "孙晨竣": "sun-chenjun",
        "赵今麦": "zhao-jinmai", "陈都灵": "chen-duling", "隋媛": "sui-yuan",
        "白鹿": "bai-lu", "敖瑞鹏": "ao-ruipeng", "张康乐": "zhang-kangle",
        "丁禹兮": "ding-yuxi", "祝绪丹": "zhu-xudan", "杨仕泽": "yang-shize",
        "刘宇宁": "liu-yuning", "宋祖儿": "song-zuoer", "宣璐": "xuan-lu",
        "刘端端": "liu-duanduan", "刘晓庆": "liu-xiaoqing", "何泓姗": "he-hongshan",
        "李雪琴": "li-xueqin", "何润东": "he-rundong", "李宏毅": "li-hongyi",
        "邢菲": "xing-fei", "唐晓天": "tang-xiaotian", "谭松韵": "tan-songyun",
        "宋威龙": "song-weilong", "张新成": "zhang-xincheng", "涂松岩": "tu-songyan",
        "马丽": "ma-li", "胡一天": "hu-yitian", "沈月": "shen-yue",
        "高至霆": "gao-zhiting", "王梓薇": "wang-ziwei", "陈飞宇": "chen-feiyu",
        "张婧仪": "zhang-jingyi", "曾舜晞": "zeng-shunxi", "刘已航": "liu-yihan",
        "鞠婧祎": "ju-jingyi", "任嘉伦": "ren-jialun", "蒋欣": "jiang-xin",
        "翟子路": "zhai-zilu", "赵志伟": "zhao-zhiwei", "崔鹏": "cui-peng",
        "金世佳": "jin-shijia", "张译": "zhang-yi", "王俊凯": "wang-junkai",
        "潘粤明": "pan-yueming", "王龙正": "wang-longzheng", "杨幂": "yang-mi",
        "黄轩": "huang-xuan", "高伟光": "gao-weiguang", "周奇奇": "zhou-qiqi",
        "刘昊然": "liu-haoran", "欧阳娜娜": "ouyang-nana", "刘浩存": "liu-haocun",
        "迪丽热巴": "dilraba", "胡可": "hu-ke", "侯明昊": "hou-minghao",
        "李曼": "li-man", "李程彬": "li-chengbin", "吴佳怡": "wu-jiayi",
        "张逸杰": "zhang-yijie", "魏子昕": "wei-zixin", "王成思": "wang-chengsi",
        "敖子逸": "ao-ziyi", "金士杰": "jin-shijie", "孔雪儿": "kong-xueer",
        "季肖冰": "ji-xiaobing", "冯晖": "feng-hui", "吴昊宸": "wu-haochen",
        "周陆啦": "zhou-lula", "刘一宏": "liu-yihong", "崔奕": "cui-yi",
        "张棪琰": "zhang-yan yan", "胡小庭": "hu-xiaoting", "郭军": "guo-jun",
        "姚筱筱": "yao-xiaoxiao", "宫正晔": "gong-zhengye",
    }
    return name_map.get(name_zh, name_zh.lower().replace(' ', '-'))


def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Load existing actors
    existing_actors = {}
    for row in cursor.execute("SELECT slug, name, names_json, dramas_json FROM actors").fetchall():
        slug, name, names_json, dramas_json = row
        existing_actors[slug] = {
            'name': name,
            'names_json': json.loads(names_json) if names_json else {},
            'dramas_json': json.loads(dramas_json) if dramas_json else [],
        }

    # Track new actors to insert and existing to update
    new_actors = {}  # slug -> {name, names_json, dramas_json}
    updates = {}     # slug -> dramas_json (append)

    for drama_slug, cast_list in CAST_DATA.items():
        for en_name, zh_name, character in cast_list:
            actor_slug = make_slug(zh_name)

            drama_entry = {"slug": drama_slug, "character": character}
            names = {"en": en_name, "zh": zh_name, "vi": "", "th": ""}

            if actor_slug in existing_actors:
                # Existing actor - append drama
                existing_dramas = existing_actors[actor_slug]['dramas_json']
                # Check if this drama is already linked
                if not any(d['slug'] == drama_slug for d in existing_dramas):
                    existing_dramas.append(drama_entry)
                    existing_actors[actor_slug]['dramas_json'] = existing_dramas
                    if actor_slug not in updates:
                        updates[actor_slug] = existing_dramas
                    else:
                        updates[actor_slug] = existing_dramas
            elif actor_slug in new_actors:
                # New actor, already in batch - append drama
                if not any(d['slug'] == drama_slug for d in new_actors[actor_slug]['dramas_json']):
                    new_actors[actor_slug]['dramas_json'].append(drama_entry)
            else:
                # Brand new actor
                new_actors[actor_slug] = {
                    'name': en_name,
                    'names_json': names,
                    'dramas_json': [drama_entry],
                }

    # Insert new actors
    insert_count = 0
    for slug, data in new_actors.items():
        cursor.execute("""
            INSERT INTO actors (slug, name, names_json, photo_url, bio_json, dramas_json, collaborations_json)
            VALUES (?, ?, ?, NULL, ?, ?, '[]')
        """, (
            slug,
            data['name'],
            json.dumps(data['names_json'], ensure_ascii=False),
            json.dumps({"en": "", "zh": "", "vi": "", "th": ""}, ensure_ascii=False),
            json.dumps(data['dramas_json'], ensure_ascii=False),
        ))
        insert_count += 1

    # Update existing actors with new drama entries
    update_count = 0
    for slug, dramas_list in updates.items():
        cursor.execute("""
            UPDATE actors SET dramas_json = ? WHERE slug = ?
        """, (json.dumps(dramas_list, ensure_ascii=False), slug))
        update_count += 1

    conn.commit()

    # Verify
    total_actors = cursor.execute("SELECT COUNT(*) FROM actors").fetchone()[0]
    print(f"=== CAST INSERTION SUMMARY ===")
    print(f"New actors inserted: {insert_count}")
    print(f"Existing actors updated: {update_count}")
    print(f"Total actors in DB: {total_actors}")

    conn.close()


if __name__ == '__main__':
    main()
