#!/usr/bin/env python3
"""
Populate actors table from curated cast data (sourced from TMDB/Douban/电视猫).
Since TMDB API is not accessible from sandbox, we use pre-gathered data.
Run: python3 scripts/populate_actors.py
"""

import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'cdrama.db')

# Cast data gathered from search results (Douban, 电视猫, Baidu Baike)
# Format: drama_slug -> list of {name, en_name, character, photo_url}
# photo_url left as None since we don't have TMDB profile paths (will use fallback)
# en_name is the romanized/pinyin name used on international platforms
CAST_DATA = {
    'the-untamed': [
        {'name': '肖战', 'en_name': 'Xiao Zhan', 'character': '魏无羡'},
        {'name': '王一博', 'en_name': 'Wang Yibo', 'character': '蓝忘机'},
        {'name': '宣璐', 'en_name': 'Xuan Lu', 'character': '江厌离'},
        {'name': '汪卓成', 'en_name': 'Wang Zhuocheng', 'character': '江澄'},
        {'name': '于斌', 'en_name': 'Yu Bin', 'character': '温宁'},
        {'name': '刘海宽', 'en_name': 'Liu Haikuan', 'character': '蓝曦臣'},
        {'name': '孟子义', 'en_name': 'Meng Ziyi', 'character': '温情'},
        {'name': '朱赞锦', 'en_name': 'Zhu Zanjin', 'character': '金光瑶'},
    ],
    'word-of-honor': [
        {'name': '张哲瀚', 'en_name': 'Zhang Zhehan', 'character': '周子舒'},
        {'name': '龚俊', 'en_name': 'Gong Jun', 'character': '温客行'},
        {'name': '周也', 'en_name': 'Zhou Ye', 'character': '顾湘'},
        {'name': '马闻远', 'en_name': 'Ma Wenyuan', 'character': '曹蔚宁'},
        {'name': '孙浠伦', 'en_name': 'Sun Xilun', 'character': '张成岭'},
        {'name': '黄宥明', 'en_name': 'Huang Youming', 'character': '叶白衣'},
        {'name': '李岱昆', 'en_name': 'Li Daikun', 'character': '蝎王'},
        {'name': '郭家豪', 'en_name': 'Guo Jiahao', 'character': '沈慎'},
    ],
    'nirvana-in-fire': [
        {'name': '胡歌', 'en_name': 'Hu Ge', 'character': '梅长苏'},
        {'name': '刘涛', 'en_name': 'Liu Tao', 'character': '霓凰郡主'},
        {'name': '王凯', 'en_name': 'Wang Kai', 'character': '靖王'},
        {'name': '吴磊', 'en_name': 'Wu Lei', 'character': '飞流'},
        {'name': '黄维德', 'en_name': 'Huang Weide', 'character': '誉王'},
        {'name': '陈龙', 'en_name': 'Chen Long', 'character': '蒙挚'},
        {'name': '靳东', 'en_name': 'Jin Dong', 'character': '蔺晨'},
        {'name': '高鑫', 'en_name': 'Gao Xin', 'character': '萧景宣'},
    ],
    'love-between-fairy-and-devil': [
        {'name': '虞书欣', 'en_name': 'Yu Shuxin', 'character': '小兰花'},
        {'name': '王鹤棣', 'en_name': 'Wang Hedi', 'character': '东方青苍'},
        {'name': '徐海乔', 'en_name': 'Xu Haiqiao', 'character': '容昊'},
        {'name': '郭晓婷', 'en_name': 'Guo Xiaoting', 'character': '赤地女子'},
        {'name': '张凌赫', 'en_name': 'Zhang Linghe', 'character': '长珩'},
        {'name': '林柏叡', 'en_name': 'Lin Borui', 'character': '觞阙'},
        {'name': '王悦伊', 'en_name': 'Wang Yueyi', 'character': '丹音'},
        {'name': '洪潇', 'en_name': 'Hong Xiao', 'character': '结黎'},
    ],
    'hidden-love': [
        {'name': '赵露思', 'en_name': 'Zhao Lusi', 'character': '桑稚'},
        {'name': '陈哲远', 'en_name': 'Chen Zheyuan', 'character': '段嘉许'},
        {'name': '马伯骞', 'en_name': 'Ma Boqian', 'character': '桑延'},
        {'name': '曾黎', 'en_name': 'Zeng Li', 'character': '黎萍'},
        {'name': '邱心志', 'en_name': 'Qiu Xinzhi', 'character': '桑荣'},
        {'name': '管梓净', 'en_name': 'Guan Zijing', 'character': '李迅'},
        {'name': '王洋', 'en_name': 'Wang Yang', 'character': '江思云'},
        {'name': '张皓伦', 'en_name': 'Zhang Haolun', 'character': '陈骏文'},
    ],
    'story-of-minglan': [
        {'name': '赵丽颖', 'en_name': 'Zhao Liying', 'character': '盛明兰'},
        {'name': '冯绍峰', 'en_name': 'Feng Shaofeng', 'character': '顾廷烨'},
        {'name': '朱一龙', 'en_name': 'Zhu Yilong', 'character': '齐衡'},
        {'name': '施诗', 'en_name': 'Shi Shi', 'character': '盛墨兰'},
        {'name': '张佳宁', 'en_name': 'Zhang Jianing', 'character': '盛如兰'},
        {'name': '曹翠芬', 'en_name': 'Cao Cuifen', 'character': '盛老太太'},
        {'name': '刘钧', 'en_name': 'Liu Jun', 'character': '盛紘'},
        {'name': '刘琳', 'en_name': 'Liu Lin', 'character': '王若弗'},
    ],
    'ashes-of-love': [
        {'name': '杨紫', 'en_name': 'Yang Zi', 'character': '锦觅'},
        {'name': '邓伦', 'en_name': 'Deng Lun', 'character': '旭凤'},
        {'name': '罗云熙', 'en_name': 'Luo Yunxi', 'character': '润玉'},
        {'name': '陈钰琪', 'en_name': 'Chen Yuqi', 'character': '鎏英'},
        {'name': '王一菲', 'en_name': 'Wang Yifei', 'character': '穗禾'},
        {'name': '邹廷威', 'en_name': 'Zou Tingwei', 'character': '奇鸢'},
        {'name': '周海媚', 'en_name': 'Zhou Haimei', 'character': '天后'},
        {'name': '何中华', 'en_name': 'He Zhonghua', 'character': '天帝'},
    ],
    'the-longest-promise': [
        {'name': '罗云熙', 'en_name': 'Luo Yunxi', 'character': '澹台烬'},
        {'name': '白鹿', 'en_name': 'Bai Lu', 'character': '黎苏苏'},
        {'name': '陈都灵', 'en_name': 'Chen Duling', 'character': '叶冰裳'},
        {'name': '邓为', 'en_name': 'Deng Wei', 'character': '萧凛'},
        {'name': '孙珍妮', 'en_name': 'Sun Zhenni', 'character': '翩然'},
        {'name': '耿业庭', 'en_name': 'Geng Yeting', 'character': '公冶寂无'},
        {'name': '李沛恩', 'en_name': 'Li Peien', 'character': '澹台明朗'},
        {'name': '于波', 'en_name': 'Yu Bo', 'character': '稷泽'},
    ],
    'reset': [
        {'name': '白敬亭', 'en_name': 'Bai Jingting', 'character': '肖鹤云'},
        {'name': '赵今麦', 'en_name': 'Zhao Jinmai', 'character': '李诗情'},
        {'name': '刘奕君', 'en_name': 'Liu Yijun', 'character': '张成'},
        {'name': '刘涛', 'en_name': 'Liu Tao', 'character': '杜局'},
        {'name': '黄觉', 'en_name': 'Huang Jue', 'character': '王兴德'},
        {'name': '刘丹', 'en_name': 'Liu Dan', 'character': '陶映红'},
        {'name': '宋家腾', 'en_name': 'Song Jiateng', 'character': '曾帅'},
        {'name': '曾柯琅', 'en_name': 'Zeng Kelang', 'character': '莫俊杰'},
    ],
    'the-knockout': [
        {'name': '张译', 'en_name': 'Zhang Yi', 'character': '安欣'},
        {'name': '张颂文', 'en_name': 'Zhang Songwen', 'character': '高启强'},
        {'name': '李一桐', 'en_name': 'Li Yitong', 'character': '孟钰'},
        {'name': '张志坚', 'en_name': 'Zhang Zhijian', 'character': '泰叔'},
        {'name': '吴刚', 'en_name': 'Wu Gang', 'character': '徐忠'},
        {'name': '高叶', 'en_name': 'Gao Ye', 'character': '陈书婷'},
        {'name': '王骁', 'en_name': 'Wang Xiao', 'character': '杨健'},
        {'name': '贾冰', 'en_name': 'Jia Bing', 'character': '高启盛'},
    ],
    'meet-yourself': [
        {'name': '刘亦菲', 'en_name': 'Liu Yifei', 'character': '许红豆'},
        {'name': '李现', 'en_name': 'Li Xian', 'character': '谢之遥'},
        {'name': '胡冰卿', 'en_name': 'Hu Bingqing', 'character': '林娜'},
        {'name': '牛骏峰', 'en_name': 'Niu Junfeng', 'character': '胡有鱼'},
        {'name': '吴彦姝', 'en_name': 'Wu Yanshu', 'character': '谢阿奶'},
        {'name': '董晴', 'en_name': 'Dong Qing', 'character': '刘桂兰'},
        {'name': '范帅琦', 'en_name': 'Fan Shuaiqi', 'character': '谢晓春'},
        {'name': '马梦唯', 'en_name': 'Ma Mengwei', 'character': '罗娜娜'},
    ],
    'love-like-the-galaxy': [
        {'name': '吴磊', 'en_name': 'Wu Lei', 'character': '凌不疑'},
        {'name': '赵露思', 'en_name': 'Zhao Lusi', 'character': '程少商'},
        {'name': '郭涛', 'en_name': 'Guo Tao', 'character': '程始'},
        {'name': '曾黎', 'en_name': 'Zeng Li', 'character': '萧元漪'},
        {'name': '李昀锐', 'en_name': 'Li Yunrui', 'character': '袁慎'},
        {'name': '余承恩', 'en_name': 'Yu Chengen', 'character': '楼垚'},
        {'name': '徐娇', 'en_name': 'Xu Jiao', 'character': '程姎'},
        {'name': '保剑锋', 'en_name': 'Bao Jianfeng', 'character': '文帝'},
    ],
    'joy-of-life': [
        {'name': '张若昀', 'en_name': 'Zhang Ruoyun', 'character': '范闲'},
        {'name': '李沁', 'en_name': 'Li Qin', 'character': '林婉儿'},
        {'name': '陈道明', 'en_name': 'Chen Daoming', 'character': '庆帝'},
        {'name': '吴刚', 'en_name': 'Wu Gang', 'character': '陈萍萍'},
        {'name': '李小冉', 'en_name': 'Li Xiaoran', 'character': '李云睿'},
        {'name': '辛芷蕾', 'en_name': 'Xin Zhilei', 'character': '海棠朵朵'},
        {'name': '宋轶', 'en_name': 'Song Yi', 'character': '范若若'},
        {'name': '郭麒麟', 'en_name': 'Guo Qilin', 'character': '范思辙'},
    ],
    'a-little-reunion': [
        {'name': '黄磊', 'en_name': 'Huang Lei', 'character': '方圆'},
        {'name': '海清', 'en_name': 'Hai Qing', 'character': '童文洁'},
        {'name': '陶虹', 'en_name': 'Tao Hong', 'character': '宋倩'},
        {'name': '王砚辉', 'en_name': 'Wang Yanhui', 'character': '乔卫东'},
        {'name': '沙溢', 'en_name': 'Sha Yi', 'character': '季胜利'},
        {'name': '咏梅', 'en_name': 'Yong Mei', 'character': '刘静'},
        {'name': '周奇', 'en_name': 'Zhou Qi', 'character': '方一凡'},
        {'name': '李庚希', 'en_name': 'Li Gengxi', 'character': '乔英子'},
    ],
    'story-of-kunning': [
        {'name': '白鹿', 'en_name': 'Bai Lu', 'character': '姜雪宁'},
        {'name': '张凌赫', 'en_name': 'Zhang Linghe', 'character': '谢危'},
        {'name': '王星越', 'en_name': 'Wang Xingyue', 'character': '张遮'},
        {'name': '周峻纬', 'en_name': 'Zhou Junwei', 'character': '燕临'},
        {'name': '刘些宁', 'en_name': 'Liu Xiening', 'character': '沈芷衣'},
        {'name': '叶晞月', 'en_name': 'Ye Xiyue', 'character': '薛姝'},
        {'name': '汤梦佳', 'en_name': 'Tang Mengjia', 'character': '尤芳'},
        {'name': '周大为', 'en_name': 'Zhou Dawei', 'character': '公冶'},
    ],
}


def generate_slug(en_name):
    """Generate actor slug from English name."""
    slug = en_name.lower().strip()
    slug = slug.replace(' ', '-')
    slug = ''.join(c for c in slug if c.isalnum() or c == '-')
    return slug


def main():
    print('🎬 Populating actors table from curated cast data...\n')

    db_path = os.path.abspath(DB_PATH)
    print(f'DB path: {db_path}')
    conn = sqlite3.connect(db_path)
    conn.execute('PRAGMA journal_mode=MEMORY')
    cursor = conn.cursor()

    # Track existing actors by English name for deduplication
    cursor.execute('SELECT slug, name, names_json, dramas_json FROM actors')
    existing_rows = cursor.fetchall()
    existing_slugs = set()
    en_name_to_slug = {}

    for row in existing_rows:
        slug, name, names_json, dramas_json = row
        existing_slugs.add(slug)
        try:
            names = json.loads(names_json) if names_json else {}
            en = names.get('en', '')
            if en:
                en_name_to_slug[en] = slug
        except:
            pass

    print(f'Found {len(existing_rows)} existing actors in DB\n')

    total_inserted = 0
    total_updated = 0

    for drama_slug, cast_list in CAST_DATA.items():
        print(f"\n📺 Processing: {drama_slug} ({len(cast_list)} actors)")

        for member in cast_list:
            en_name = member['en_name']
            zh_name = member['name']

            # Check if actor already exists by English name
            actor_slug = en_name_to_slug.get(en_name)

            if actor_slug:
                # Actor exists - update dramas_json
                try:
                    cursor.execute('SELECT dramas_json FROM actors WHERE slug = ?', (actor_slug,))
                    row = cursor.fetchone()
                    current_dramas_json = row[0] if row else '[]'
                    try:
                        current_dramas = json.loads(current_dramas_json)
                    except:
                        current_dramas = []

                    if drama_slug not in current_dramas:
                        current_dramas.append(drama_slug)
                        cursor.execute(
                            'UPDATE actors SET dramas_json = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ?',
                            (json.dumps(current_dramas, ensure_ascii=False), actor_slug)
                        )
                        conn.commit()
                        print(f'  ✓ Updated "{en_name}" - added {drama_slug} to dramas')
                        total_updated += 1
                    else:
                        print(f'  → "{en_name}" already linked to {drama_slug}')
                except Exception as e:
                    print(f'  ⚠️  Error updating "{en_name}": {e}')
            else:
                # New actor - insert
                slug = generate_slug(en_name)
                # Ensure uniqueness
                base_slug = slug
                counter = 1
                while slug in existing_slugs:
                    slug = f'{base_slug}-{counter}'
                    counter += 1

                existing_slugs.add(slug)
                en_name_to_slug[en_name] = slug

                names_json = json.dumps({'en': en_name, 'zh': zh_name}, ensure_ascii=False)
                bio_json = json.dumps({'en': '', 'zh': '', 'vi': '', 'th': ''}, ensure_ascii=False)
                dramas_json = json.dumps([drama_slug], ensure_ascii=False)
                collaborations_json = '[]'
                # photo_url left as NULL for now (no TMDB profile paths available)
                photo_url = None

                try:
                    cursor.execute(
                        '''INSERT INTO actors (slug, name, names_json, photo_url, bio_json, dramas_json, collaborations_json, created_at, updated_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)''',
                        (slug, en_name, names_json, photo_url, bio_json, dramas_json, collaborations_json)
                    )
                    conn.commit()
                    print(f'  ✓ Inserted "{en_name}" ({zh_name})')
                    total_inserted += 1
                except Exception as e:
                    print(f'  ⚠️  Error inserting "{en_name}": {e}')

    # Final stats
    cursor.execute('SELECT COUNT(*) FROM actors')
    final_count = cursor.fetchone()[0]
    print(f'\n{"="*50}')
    print(f'✅ Done!')
    print(f'   Inserted: {total_inserted} new actors')
    print(f'   Updated:  {total_updated} actor-drama links')
    print(f'   Total actors in DB: {final_count}')

    # Sample records
    print(f'\n📋 Sample records (first 8):')
    cursor.execute('SELECT slug, name, names_json, dramas_json FROM actors LIMIT 8')
    for row in cursor.fetchall():
        print(f'   {row[1]} ({row[0]}) - dramas: {row[3]}')

    conn.close()


if __name__ == '__main__':
    main()
