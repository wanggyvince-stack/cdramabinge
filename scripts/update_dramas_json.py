#!/usr/bin/env python3
"""
Update dramas_json to include character info per drama.
Changes format from ["drama-slug"] to [{"slug":"drama-slug","character":"角色名"}]
Run: python3 scripts/update_dramas_json.py
"""

import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'cdrama.db')

# Character mapping: drama_slug -> actor_en_name -> character
CHARACTER_MAP = {
    'the-untamed': {
        'Xiao Zhan': '魏无羡', 'Wang Yibo': '蓝忘机', 'Xuan Lu': '江厌离',
        'Wang Zhuocheng': '江澄', 'Yu Bin': '温宁', 'Liu Haikuan': '蓝曦臣',
        'Meng Ziyi': '温情', 'Zhu Zanjin': '金光瑶',
    },
    'word-of-honor': {
        'Zhang Zhehan': '周子舒', 'Gong Jun': '温客行', 'Zhou Ye': '顾湘',
        'Ma Wenyuan': '曹蔚宁', 'Sun Xilun': '张成岭', 'Huang Youming': '叶白衣',
        'Li Daikun': '蝎王', 'Guo Jiahao': '沈慎',
    },
    'nirvana-in-fire': {
        'Hu Ge': '梅长苏', 'Liu Tao': '霓凰郡主', 'Wang Kai': '靖王',
        'Wu Lei': '飞流', 'Huang Weide': '誉王', 'Chen Long': '蒙挚',
        'Jin Dong': '蔺晨', 'Gao Xin': '萧景宣',
    },
    'love-between-fairy-and-devil': {
        'Yu Shuxin': '小兰花', 'Wang Hedi': '东方青苍', 'Xu Haiqiao': '容昊',
        'Guo Xiaoting': '赤地女子', 'Zhang Linghe': '长珩', 'Lin Borui': '觞阙',
        'Wang Yueyi': '丹音', 'Hong Xiao': '结黎',
    },
    'hidden-love': {
        'Zhao Lusi': '桑稚', 'Chen Zheyuan': '段嘉许', 'Ma Boqian': '桑延',
        'Zeng Li': '黎萍', 'Qiu Xinzhi': '桑荣', 'Guan Zijing': '李迅',
        'Wang Yang': '江思云', 'Zhang Haolun': '陈骏文',
    },
    'story-of-minglan': {
        'Zhao Liying': '盛明兰', 'Feng Shaofeng': '顾廷烨', 'Zhu Yilong': '齐衡',
        'Shi Shi': '盛墨兰', 'Zhang Jianing': '盛如兰', 'Cao Cuifen': '盛老太太',
        'Liu Jun': '盛紘', 'Liu Lin': '王若弗',
    },
    'ashes-of-love': {
        'Yang Zi': '锦觅', 'Deng Lun': '旭凤', 'Luo Yunxi': '润玉',
        'Chen Yuqi': '鎏英', 'Wang Yifei': '穗禾', 'Zou Tingwei': '奇鸢',
        'Zhou Haimei': '天后', 'He Zhonghua': '天帝',
    },
    'the-longest-promise': {
        'Luo Yunxi': '澹台烬', 'Bai Lu': '黎苏苏', 'Chen Duling': '叶冰裳',
        'Deng Wei': '萧凛', 'Sun Zhenni': '翩然', 'Geng Yeting': '公冶寂无',
        'Li Peien': '澹台明朗', 'Yu Bo': '稷泽',
    },
    'reset': {
        'Bai Jingting': '肖鹤云', 'Zhao Jinmai': '李诗情', 'Liu Yijun': '张成',
        'Liu Tao': '杜局', 'Huang Jue': '王兴德', 'Liu Dan': '陶映红',
        'Song Jiateng': '曾帅', 'Zeng Kelang': '莫俊杰',
    },
    'the-knockout': {
        'Zhang Yi': '安欣', 'Zhang Songwen': '高启强', 'Li Yitong': '孟钰',
        'Zhang Zhijian': '泰叔', 'Wu Gang': '徐忠', 'Gao Ye': '陈书婷',
        'Wang Xiao': '杨健', 'Jia Bing': '高启盛',
    },
    'meet-yourself': {
        'Liu Yifei': '许红豆', 'Li Xian': '谢之遥', 'Hu Bingqing': '林娜',
        'Niu Junfeng': '胡有鱼', 'Wu Yanshu': '谢阿奶', 'Dong Qing': '刘桂兰',
        'Fan Shuaiqi': '谢晓春', 'Ma Mengwei': '罗娜娜',
    },
    'love-like-the-galaxy': {
        'Wu Lei': '凌不疑', 'Zhao Lusi': '程少商', 'Guo Tao': '程始',
        'Zeng Li': '萧元漪', 'Li Yunrui': '袁慎', 'Yu Chengen': '楼垚',
        'Xu Jiao': '程姎', 'Bao Jianfeng': '文帝',
    },
    'joy-of-life': {
        'Zhang Ruoyun': '范闲', 'Li Qin': '林婉儿', 'Chen Daoming': '庆帝',
        'Wu Gang': '陈萍萍', 'Li Xiaoran': '李云睿', 'Xin Zhilei': '海棠朵朵',
        'Song Yi': '范若若', 'Guo Qilin': '范思辙',
    },
    'a-little-reunion': {
        'Huang Lei': '方圆', 'Hai Qing': '童文洁', 'Tao Hong': '宋倩',
        'Wang Yanhui': '乔卫东', 'Sha Yi': '季胜利', 'Yong Mei': '刘静',
        'Zhou Qi': '方一凡', 'Li Gengxi': '乔英子',
    },
    'story-of-kunning': {
        'Bai Lu': '姜雪宁', 'Zhang Linghe': '谢危', 'Wang Xingyue': '张遮',
        'Zhou Junwei': '燕临', 'Liu Xiening': '沈芷衣', 'Ye Xiyue': '薛姝',
        'Tang Mengjia': '尤芳', 'Zhou Dawei': '公冶',
    },
}


def main():
    print('🔄 Updating dramas_json with character info...\n')

    db_path = os.path.abspath(DB_PATH)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute('SELECT slug, name, dramas_json FROM actors')
    rows = cursor.fetchall()
    updated = 0

    for slug, name, dramas_json in rows:
        try:
            current = json.loads(dramas_json) if dramas_json else []
        except:
            current = []

        # Convert simple strings to objects with character info
        new_dramas = []
        for item in current:
            if isinstance(item, str):
                # Simple string slug - look up character
                drama_slug = item
                char_map = CHARACTER_MAP.get(drama_slug, {})
                character = char_map.get(name, '')
                new_dramas.append({'slug': drama_slug, 'character': character})
            elif isinstance(item, dict):
                new_dramas.append(item)
            else:
                new_dramas.append(item)

        new_json = json.dumps(new_dramas, ensure_ascii=False)
        if new_json != dramas_json:
            cursor.execute(
                'UPDATE actors SET dramas_json = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ?',
                (new_json, slug)
            )
            updated += 1

    conn.commit()
    print(f'✅ Updated {updated} actors with character info')

    # Verify
    cursor.execute('SELECT slug, name, dramas_json FROM actors LIMIT 5')
    for row in cursor.fetchall():
        print(f'  {row[1]} ({row[0]}): {row[2]}')

    conn.close()


if __name__ == '__main__':
    main()
