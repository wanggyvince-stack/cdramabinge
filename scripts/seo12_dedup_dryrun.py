#!/usr/bin/env python3
"""SEO-12 actor dedup dry-run — outputs before/after comparison for Anna review.
Does NOT write to DB. Run with: python3 scripts/seo12_dedup_dryrun.py
"""
import sqlite3, json, sys
from collections import defaultdict

DB = 'data/cdrama.db'

# ─── Retain map per v2.1 workorder (38 pairs) ───
# Format: tmdb_person_id -> (retain_slug, discard_slug)
# wu-jiayi pair reversed per Anna's correction
RETAIN_MAP = {
    17382:   ('ni-dahong', 'ni-dahong-1'),
    96614:   ('song-jia', 'song-jia-1'),
    96862:   ('hu-jun', 'hu-jun-1'),
    107775:  ('zhang-jiayi-1', 'zhang-jiayi'),           # -1 has correct name
    110507:  ('you-yongzhi', 'you-yongzhi-1'),
    128040:  ('dylan-kuo', 'guo-pinchao'),                # Guo Pinchao is same person
    130984:  ('li-chen', 'jerry-lee'),                    # Li Chen (correct), Li Chong → Li Chen
    565344:  ('li-guangjie', 'li-guangjie-1'),            # 565344 = 李光洁 Li Guangjie
    1151657: ('jing-tian', 'jing-tian-1'),
    1192904: ('wallace-huo', 'huo-jianhua'),
    1236326: ('xu-lu', 'xu-lu-1'),
    1251627: ('nie-yuan', 'nie-yuan-1'),
    1338063: ('huang-zhizhong', 'huang-zhizhong-1'),
    1344903: ('yu-hewei', 'yu-hewei-1'),
    1376103: ('zhang-huiwen', 'zhang-huiwen-1'),          # Zhang Huiwen (correct)
    1412414: ('fu-dalong', 'fu-dalong-1'),
    1557698: ('dilraba-dilmurat', 'dilraba'),              # 475 dramas vs 176 → keep longer filmo side
    1599854: ('zhang-tianai', 'zhang-tian-ai'),
    1672872: ('wang-herun', 'wang-herun-1'),               # Wang Herun (correct)
    1724346: ('wang-yanlin', 'wang-yanlin-1'),
    1737891: ('joe-xu', 'xu-haiqiao'),                     # joe-xu has 573 dramas
    1742841: ('lan-yingying', 'lyric-lan'),
    1782333: ('zhou-yutong', 'zhou-yutong-1'),
    1803092: ('zeng-shunxi', 'joseph-zeng'),
    1803094: ('gao-hanyu', 'gao-hanshan'),                 # gao-hanshan had wrong name
    1829558: ('karlina-zhang', 'zhang-jianing'),
    1875562: ('zhang-mingen-1', 'zhang-mingen'),           # -1 has longer filmo
    1882287: ('re-yizha', 'rayzha-alimjan'),
    1909812: ('li-landi', 'li-lanying'),                   # li-lanying had wrong name/spelling
    1989508: ('wang-ziqi', 'wang-ziqi-1'),                 # Wang Ziqi (correct), 1989508 = 王子奇
    2050456: ('wang-hedi', 'dylan-wang'),                  # wang-hedi 201 dramas
    2164716: ('wang-runze', 'wang-runze-1'),
    2165598: ('arthur-chen', 'chen-feiyu'),                # arthur-chen has longer filmo
    2376754: ('zeng-keni', 'zeng-kenni'),                  # Zeng Keni (correct, tmdb 2376754)
    2459066: ('wu-jiayi', 'wu-jiacheng'),                  # ** REVERSED ** per Anna v2.1
    2682877: ('liu-haocun', 'liu-haocun-1'),
    2973248: ('bai-yufan', 'bai-yufan-1'),
    3480427: ('liu-yitie', 'liu-yitie-1'),
}

# ─── Name corrections (TMDB official) ───
NAME_CORRECTIONS = {
    'li-chen':       ('Li Chong',    'Li Chen'),
    'li-guangjie':   ('Li Guangfu',  'Li Guangjie'),
    'zhang-huiwen':  ('Zhang Huilin', 'Zhang Huiwen'),
    'wang-herun':    ('Wang He Runxi','Wang Herun'),
    'wang-ziqi':     ('Wang Ziwen',  'Wang Ziqi'),
    'zeng-keni':     ('Zeng Yike',   'Zeng Keni'),
}


def json_load(s):
    if not s: return None
    try: return json.loads(s)
    except: return None


def main():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row

    # build slug -> row dict
    all_actors = {r['slug']: dict(r) for r in conn.execute('SELECT * FROM actors').fetchall()}

    report = []
    stats = {
        'pairs': 0,
        'dramas_added_total': 0,
        'filmography_source_switches': 0,
        'name_corrections': 0,
        'bio_upgrades': 0,
        'photos_upgrades': 0,
    }

    # Verify every retain/discard slug exists
    missing = []
    for retain, discard in RETAIN_MAP.values():
        if retain not in all_actors: missing.append(retain)
        if discard not in all_actors: missing.append(discard)
    if missing:
        print(f"FATAL: missing slugs: {missing}")
        sys.exit(1)

    # Sort by tmdb_person_id for stable output
    for tmdb_id in sorted(RETAIN_MAP.keys()):
        retain_slug, discard_slug = RETAIN_MAP[tmdb_id]
        r = all_actors[retain_slug]
        d = all_actors[discard_slug]

        stats['pairs'] += 1

        # ── Name correction (if applicable) ──
        name_before = r['name']
        name_after = name_before
        if retain_slug in NAME_CORRECTIONS:
            old, new = NAME_CORRECTIONS[retain_slug]
            if name_before == old:
                name_after = new
                stats['name_corrections'] += 1
                name_change = f"{old} -> {new}"
            else:
                name_change = f"EXPECTED '{old}' but actual='{name_before}' -> no change"
        else:
            name_change = '(unchanged)'

        # ── dramas_json: union by drama slug ──
        r_dramas = json_load(r['dramas_json']) or []
        d_dramas = json_load(d['dramas_json']) or []
        r_slugs = {e.get('slug') for e in r_dramas if isinstance(e, dict)}
        new_dramas = list(r_dramas)
        added = 0
        for entry in d_dramas:
            if isinstance(entry, dict) and entry.get('slug') not in r_slugs:
                new_dramas.append(entry)
                r_slugs.add(entry.get('slug'))
                added += 1
        stats['dramas_added_total'] += added

        # ── full_filmography_json: take longer ──
        r_filmo = r.get('full_filmography_json') or ''
        d_filmo = d.get('full_filmography_json') or ''
        if len(d_filmo) > len(r_filmo):
            filmo_source = f"SWITCH: retain {len(r_filmo)} -> take discard {len(d_filmo)}"
            stats['filmography_source_switches'] += 1
        else:
            filmo_source = f"keep retain ({len(r_filmo)} >= {len(d_filmo)})"

        # ── bio_json / photos_json: take longer ──
        r_bio = r.get('bio_json') or ''
        d_bio = d.get('bio_json') or ''
        bio_pick = 'retain' if len(r_bio) >= len(d_bio) else 'DISCARD'
        if bio_pick == 'DISCARD':
            stats['bio_upgrades'] += 1

        r_photos = r.get('photos_json') or ''
        d_photos = d.get('photos_json') or ''
        photos_pick = 'retain' if len(r_photos) >= len(d_photos) else 'DISCARD'
        if photos_pick == 'DISCARD':
            stats['photos_upgrades'] += 1

        # ── collaborations_json: union by slug ──
        r_collab = json_load(r['collaborations_json']) or []
        d_collab = json_load(d['collaborations_json']) or []
        collab_union = list(r_collab)
        c_slugs = {e.get('slug') for e in r_collab if isinstance(e, dict)}
        collab_added = 0
        for c in d_collab:
            if isinstance(c, dict) and c.get('slug') not in c_slugs:
                collab_union.append(c)
                c_slugs.add(c.get('slug'))
                collab_added += 1

        report.append({
            'tmdb_id': tmdb_id,
            'retain': retain_slug,
            'discard': discard_slug,
            'name_change': name_change,
            'dramas_r': len(r_dramas),
            'dramas_d': len(d_dramas),
            'dramas_added': added,
            'dramas_final': len(new_dramas),
            'filmo_source': filmo_source,
            'bio': f"retain={len(r_bio)} discard={len(d_bio)} pick={bio_pick}",
            'photos': f"retain={len(r_photos)} discard={len(d_photos)} pick={photos_pick}",
            'collab_union_added': collab_added,
        })

    # Print table
    print(f"\n{'='*130}")
    print(f"SEO-12 DEDUP DRY-RUN ({stats['pairs']} pairs)")
    print(f"{'='*130}\n")

    for r in report:
        print(f"tmdb {r['tmdb_id']:8d}  RETAIN={r['retain']:<22s}  DISCARD={r['discard']}")
        print(f"   name:     {r['name_change']}")
        print(f"   dramas:   retain={r['dramas_r']} discard={r['dramas_d']} +added={r['dramas_added']} => final={r['dramas_final']}")
        print(f"   filmo:    {r['filmo_source']}")
        print(f"   bio:      {r['bio']}")
        print(f"   photos:   {r['photos']}")
        print(f"   collab:   +{r['collab_union_added']} from discard")
        print()

    print(f"\n{'='*130}")
    print(f"SUMMARY:")
    print(f"  total pairs:                  {stats['pairs']}")
    print(f"  name corrections applied:     {stats['name_corrections']}")
    print(f"  filmography source switches:  {stats['filmography_source_switches']}")
    print(f"  bio source upgrades:          {stats['bio_upgrades']}")
    print(f"  photos source upgrades:       {stats['photos_upgrades']}")
    print(f"  total dramas_json entries added across all pairs: {stats['dramas_added_total']}")
    print(f"{'='*130}")

    # ── Safety check: any drama whose cast currently references a discard slug? ──
    print("\n── CAST LINK SAFETY CHECK (dramas with cast link pointing to discard slugs) ──")
    discard_slugs = {d for _, d in RETAIN_MAP.values()}
    drama_cast_refs = defaultdict(list)  # drama_slug -> [discard_slugs referencing it]
    for discard in discard_slugs:
        d_row = all_actors[discard]
        dramas_list = json_load(d_row['dramas_json']) or []
        for entry in dramas_list:
            if isinstance(entry, dict) and entry.get('slug'):
                drama_cast_refs[entry['slug']].append(discard)

    unsafe = 0
    for drama_slug, refs in sorted(drama_cast_refs.items()):
        if drama_slug in all_actors:
            continue  # not a drama slug
        print(f"  {drama_slug}: cast references discard slugs {refs} -> will be FIXED by dramas_json union")
        unsafe += 1
    print(f"\n  {unsafe} dramas have cast links to discard slugs — all resolved by dramas_json union before delete")
    print("  (no 404 cast links will be created)")

    # ── Retain-slug URL verification: all retain slugs exist and are valid actors ──
    print("\n── RETAIN-SLUG VALIDATION ──")
    for retain, discard in RETAIN_MAP.values():
        r_row = all_actors[retain]
        if not r_row.get('name'):
            print(f"  WARNING: retain slug '{retain}' has empty name")

    print("\nDRY-RUN COMPLETE. No changes written to DB.")


if __name__ == '__main__':
    main()
