#!/usr/bin/env python3
"""
数据验证脚本：确保数据库中每部剧都有有效的 TMDB ID 或 MyDramaList ID

使用方法：
  python scripts/validate_drama_data.py          # 验证所有剧
  python scripts/validate_drama_data.py --fix    # 尝试自动修复（从 TMDB 获取缺失的 ID）
"""

import sqlite3
import sys
import os
import requests
from pathlib import Path

# 数据库路径
DB_PATH = Path(__file__).parent.parent / "data" / "cdrama.db"

# TMDB API 配置
TMDB_API_KEY = os.environ.get("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"


def get_db_connection():
    """获取数据库连接"""
    if not DB_PATH.exists():
        print(f"❌ 数据库文件不存在: {DB_PATH}")
        sys.exit(1)
    
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def validate_dramas(conn):
    """验证所有剧集的数据完整性"""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            id, 
            slug, 
            original_title, 
            tmdb_id, 
            mdl_id,
            poster_url,
            synopses_json
        FROM dramas
        ORDER BY id
    """)
    
    dramas = cursor.fetchall()
    issues = []
    
    print(f"📊 验证 {len(dramas)} 部剧集...\n")
    
    for drama in dramas:
        drama_issues = []
        
        # 检查 TMDB ID 或 MyDramaList ID
        if not drama["tmdb_id"] and not drama["mdl_id"]:
            drama_issues.append("❌ 缺少 TMDB ID 和 MyDramaList ID")
        
        # 检查海报 URL
        if not drama["poster_url"] or "placeholder" in drama["poster_url"]:
            drama_issues.append("⚠️  海报 URL 缺失或为 placeholder")
        
        # 检查标题
        if not drama["original_title"] or drama["original_title"].strip() == "":
            drama_issues.append("❌ 缺少 original_title")
        
        # 检查是否是英文标题（应该是中文）
        if drama["original_title"] and all(ord(c) < 128 for c in drama["original_title"]):
            drama_issues.append("⚠️  original_title 是英文，应该是中文")
        
        # 检查简介是否是占位符
        if drama["synopses_json"]:
            import json
            try:
                synopses = json.loads(drama["synopses_json"])
                en_synopsis = synopses.get("en", "")
                if "captivating" in en_synopsis and "drama from" in en_synopsis:
                    drama_issues.append("⚠️  简介是 AI 生成的占位符文本")
            except:
                pass
        
        if drama_issues:
            issues.append({
                "id": drama["id"],
                "slug": drama["slug"],
                "title": drama["original_title"],
                "tmdb_id": drama["tmdb_id"],
                "mdl_id": drama["mdl_id"],
                "issues": drama_issues
            })
    
    # 打印结果
    if issues:
        print(f"⚠️  发现 {len(issues)} 部剧集存在问题:\n")
        for issue in issues:
            print(f"【{issue['slug']}】{issue['title']}")
            print(f"  TMDB ID: {issue['tmdb_id'] or '❌'}")
            print(f"  MDL ID: {issue['mdl_id'] or '❌'}")
            for problem in issue["issues"]:
                print(f"  {problem}")
            print()
        
        return False
    else:
        print("✅ 所有剧集数据验证通过！")
        return True


def search_tmdb(title, language="zh"):
    """在 TMDB 搜索剧集"""
    if not TMDB_API_KEY:
        print("❌ 未设置 TMDB_API_KEY 环境变量")
        return None
    
    headers = {
        "Authorization": f"Bearer {TMDB_API_KEY}",
        "Content-Type": "application/json"
    }
    
    params = {
        "query": title,
        "language": language
    }
    
    try:
        response = requests.get(
            f"{TMDB_BASE_URL}/search/tv",
            headers=headers,
            params=params,
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        if data["results"]:
            return data["results"][0]
        return None
    except Exception as e:
        print(f"❌ TMDB 搜索失败: {e}")
        return None


def auto_fix(conn):
    """尝试自动修复缺失的数据"""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, slug, original_title
        FROM dramas
        WHERE tmdb_id IS NULL OR tmdb_id = 0
    """)
    
    dramas = cursor.fetchall()
    fixed_count = 0
    
    print(f"🔧 尝试修复 {len(dramas)} 部剧集的 TMDB ID...\n")
    
    for drama in dramas:
        print(f"搜索: {drama['original_title']} ({drama['slug']})")
        
        # 先尝试中文搜索
        result = search_tmdb(drama["original_title"], language="zh")
        
        # 如果没找到，尝试英文标题
        if not result:
            cursor.execute("SELECT titles_json FROM dramas WHERE id = ?", (drama["id"],))
            titles_row = cursor.fetchone()
            if titles_row and titles_row["titles_json"]:
                import json
                try:
                    titles = json.loads(titles_row["titles_json"])
                    en_title = titles.get("en")
                    if en_title:
                        print(f"  尝试英文标题: {en_title}")
                        result = search_tmdb(en_title, language="en")
                except:
                    pass
        
        if result:
            tmdb_id = result["id"]
            print(f"  ✅ 找到 TMDB ID: {tmdb_id}")
            
            # 更新数据库
            cursor.execute("""
                UPDATE dramas 
                SET tmdb_id = ?
                WHERE id = ?
            """, (tmdb_id, drama["id"]))
            
            fixed_count += 1
        else:
            print(f"  ❌ 未找到")
        
        print()
    
    conn.commit()
    print(f"✅ 修复完成: {fixed_count}/{len(dramas)}")


def main():
    """主函数"""
    print("=" * 60)
    print("CDrama Database 数据验证工具")
    print("=" * 60)
    print()
    
    conn = get_db_connection()
    
    # 检查命令行参数
    if "--fix" in sys.argv:
        auto_fix(conn)
        print()
    
    # 验证数据
    is_valid = validate_dramas(conn)
    conn.close()
    
    # 返回退出码
    sys.exit(0 if is_valid else 1)


if __name__ == "__main__":
    main()
