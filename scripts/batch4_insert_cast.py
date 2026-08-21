#!/usr/bin/env python3
"""
Step 10.3: Insert cast data for 70 expansion dramas.
Uses known cast data sourced from Douban/Baidu/TMDB.
"""
import json
import sqlite3
import os
import re

BASE = '/Coze/Drive/CDrama_Database/cdrama-database'
DB_PATH = os.path.join(BASE, 'data/cdrama.db')

# Format: drama_slug -> [(en_name, zh_name, character), ...]
CAST_DATA = {
    "the-long-season": [("Fan Wei","范伟","王响"),("Qin Hao","秦昊","龚彪"),("Chen Minghao","陈明昊","马德胜"),("Li Gengxi","李庚希","沈墨"),("Liu Yitie","刘奕铁","王阳"),("Jiang Qiming","蒋奇明","傅卫军"),("Liu Lin","刘琳","李巧云"),("Shi Pengyuan","史彭元","王北")],
    "the-long-night": [("Liao Fan","廖凡","严良"),("Bai Yu","白宇","江阳"),("Tan Zhuo","谭卓","李静"),("Ning Li","宁理","陈明章"),("Zhao Yang","赵阳","朱伟"),("Huang Yao","黄尧","张晓倩"),("Tian Xiaojie","田小洁","陈明章")],
    "the-bad-kids": [("Qin Hao","秦昊","张东升"),("Wang Jingchun","王景春","陈冠声"),("Rong Zishan","荣梓杉","朱朝阳"),("Shi Pengyuan","史彭元","严良"),("Wang Shengdi","王圣迪","普普"),("Zhang Songwen","张颂文","朱永平"),("Liu Lin","刘琳","周春红")],
    "three-body": [("Zhang Luyi","张鲁一","汪淼"),("Yu Hewei","于和伟","史强"),("Wang Chuanjun","王传君","丁仪"),("Chin Shih-Chieh","陈瑾","叶文洁(老年)"),("Wang Ziwen","王子文","叶文洁(青年)"),("Lin Yongjian","林永健","常伟思")],
    "mysterious-lotus-casebook": [("Cheng Yi","成毅","李相夷/李莲花"),("Zeng Shunxi","曾舜晞","方多病"),("Xiao Shunyao","肖顺尧","笛飞声"),("Chen Duling","陈都灵","乔婉娩"),("Wang He Runxi","王鹤润","角丽谯")],
    "blossoms-shanghai": [("Hu Ge","胡歌","阿宝"),("Tang Yan","唐嫣","汪小姐"),("Ma Yili","马伊琍","玲子"),("Xin Zhilei","辛芷蕾","李李"),("Dong Yong","董勇","范总")],
    "minning-town": [("Huang Xuan","黄轩","马得福"),("Re Yizha","热依扎","水花"),("Zhang Youhao","张嘉益","马喊水"),("Yao Chen","姚晨","高青峡"),("Bai Yufan","白宇帆","马得宝")],
    "the-age-of-awakening": [("Yu Hewei","于和伟","陈独秀"),("Zhang Tong","张桐","李大钊"),("Hou Jingwen","侯京健","毛泽东"),("Ma Shaohua","马少骅","蔡元培"),("Yu Zhenhua","于震","胡适")],
    "the-longest-day-in-changan": [("Lei Jiayin","雷佳音","张小敬"),("Yi Yangqianxi","易烊千玺","李必"),("Zhou Yiwei","周一围","龙波"),("Zhang Tianai","张天爱","许鹤子"),("Han Tongsheng","韩童生","何执正")],
    "eternal-love": [("Yang Mi","杨幂","白浅"),("Mark Chao","赵又廷","夜华"),("Vengo Gao","高伟光","东华"),("Dilraba","迪丽热巴","凤九"),("Gu Bin","郭品超","桑籍")],
    "story-of-yanxi-palace": [("Wu Jinyan","吴谨言","魏璎珞"),("Qin Lan","秦岚","富察皇后"),("Nie Yuan","聂远","乾隆"),("She Shimeng","佘诗曼","娴妃"),("Xu Kai","许凯","傅恒")],
    "princess-agents": [("Zhao Liying","赵丽颖","楚乔"),("Lin Gengxin","林更新","宇文玥"),("Shawn Dou","窦骁","燕洵"),("Li Qin","李沁","元淳"),("Huang Mengying","黄梦莹","萧玉")],
    "hikaru-no-go": [("Hu Xianxu","胡先煦","时光"),("Zhang Chao","张超","褚嬴"),("Li Mingde","李茂德","洪河"),("Zhao Hao Ran","赵浩闳","沈一朗")],
    "the-rise-of-phoenixes": [("Chen Kun","陈坤","宁弈"),("Ni Ni","倪妮","凤知微"),("Zhao Lixin","赵立新","天盛帝"),("Ni Dahong","倪大红","赵渊"),("Bai Fengxi","白敬亭","顾南衣")],
    "strange-tales-of-tang-dynasty": [("Yang Xuwen","杨旭文","苏无名"),("Yang Zhigang","杨志刚","卢凌风"),("Xi Zi","郜思雯","裴喜君"),("Chen Chuhe","陈楚河","薛环"),("Sun Xuefei","孙雪宁","樱桃")],
    "the-blood-of-youth": [("Lee Hong-yi","李宏毅","萧瑟"),("Aurelio","敖瑞鹏","雷无桀"),("Zhang Yujie","张予曦","叶若依"),("Liu Xueyi","刘学义","无心"),("Lin Bowen","林柏叡","唐莲")],
    "legend-of-fei": [("Zhao Liying","赵丽颖","周翡"),("Wang Yibo","王一博","谢允"),("Zhang Huilin","张慧雯","吴楚楚"),("Meng Ziyi","孟子义","李妍")],
    "who-rules-the-world": [("Yang Yang","杨洋","丰兰息"),("Zhao Lusi","赵露思","白风夕"),("Lai Yi","赖艺","玉无缘"),("Li Qing","李晴","幽州公主")],
    "sword-snow-stride": [("Zhang Yunlong","张若昀","徐凤年"),("Li Gengxi","李庚希","姜泥"),("Hu Jun","胡军","徐骁"),("Gao Shuguang","高曙光","赵黄巢"),("Tian Xiaojie","田小洁","陈芝豹")],
    "day-and-night": [("Pan Yueming","潘粤明","关宏峰/关宏宇"),("Wang Longzheng","王龙正","周巡"),("Liu Yijun","刘奕君","高亚楠"),("Liu Yinshan","刘金山","刘长永")],
    "ordinary-greatness": [("Zhang Ruoyun","张若昀","李大为"),("Bai Lu","白鹿","夏洁"),("Wang Jingchun","王景春","陈新城"),("Ning Li","宁理","曹建军")],
    "thirteen-years-of-dust": [("Chen Jianbin","陈建斌","卫峥嵘"),("Ch Hao","陈若轩","陆明虹"),("Wang Xiao","王骁","二勇")],
    "young-blood": [("Zhang Xincheng","张新成","元仲辛"),("Zhou Yutong","周雨彤","赵简"),("Gong Zhengnan","龚俊","王宽"),("Zheng Wei","郑伟","薛映"),("Su Xiaotong","苏晓彤","小景")],
    "the-imperial-coroner": [("Wang Ziwei","王子璇","楚楚"),("Wang Ziwen","王子奇","萧瑾瑜"),("Yan Zidong","闫子东","景翊"),("Xu Mengjie","徐梦洁","冷月")],
    "moral-peanuts-finale": [("Yang Shunshun","杨羽","赵宁"),("Xing Dongdong","邢冬冬","冬冬"),("An Ning","安宁","安宁"),("Li Wei","黎伟","黎伟"),("Wang Xiaoyi","王秀月","甜甜")],
    "i-am-a-criminal-police": [("Yu Hewei","于和伟","秦海明"),("Fu Dalong","富大龙","陶维志"),("Ding Yongdai","丁勇岱","戴长江")],
    "the-borderlands": [("Guo Qilin","郭麒麟","沈星"),("Francis Ng","吴镇宇","猜叔"),("Jiang Qiming","蒋奇明","王安全"),("You Yongzhi","尤勇智","沈建东"),("Wang Xun","王迅","吴海山"),("Qi Xi","齐溪","刘金翠")],
    "the-heart-of-genius": [("Lei Jiayin","雷佳音","老林"),("Zhang Zifeng","张子枫","林朝夕"),("Zhang Xincheng","张新成","裴之"),("Liu Yitian","刘奕铁","纪江")],
    "guardian": [("Bai Yu","白宇","赵云澜"),("Zhu Yilong","朱一龙","沈巍/黑袍使"),("Xin Peng","辛鹏","大庆"),("Wang Yang","王泷正","祝红")],
    "rattan": [("Jing Tian","景甜","司藤"),("Zhang Binbin","张彬彬","秦放"),("Li Yixiao","李依晓","沈银灯"),("Zhang Yijie","张亦杰","白金")],
    "the-bionic-life": [("Ma Tianyu","马天宇","尹天仇"),("Chen Xingxu","陈星旭","顾天宇"),("Wang Xiuyi","王秀一","李墨")],
    "with-you": [("Liu Haoran","刘昊然","余淮"),("Tan Songyun","谭松韵","耿耿"),("Wang Youshuo","王栎鑫","张平"),("Fang Wenxin","方文强","张霖")],
    "my-huckleberry-friends": [("Li Lanying","李兰迪","余周周"),("Zhang Xincheng","张新成","林杨"),("Zhou Chengcheng","周澄业","米乔"),("Li Chong","李晨","凌翔茜")],
    "suddenly-this-summer": [("Bai Jingting","白敬亭","肖骁"),("Zhang Yuxi","张雨曦","叶绍希"),("Wu Jiacheng","吴佳怡","韩婷")],
    "i-dont-want-to-be-friends-with-you": [("Chen Haoyu","陈昊宇","李青桐"),("Zhuang Dafei","庄达菲","李进步"),("Wang Chenye","王承烨","吴智勋")],
    "nothing-but-you": [("Wu Lei","吴磊","宋三川"),("Zhou Yutong","周雨彤","梁友安"),("Jiang Peiyao","姜珮瑶","罗念")],
    "when-i-fly-towards-you": [("Zhang Miaoyi","张淼怡","苏在在"),("Bian Tiancheng","边天扬","张陆让"),("Guo Zhiheng","郭之恒","顾然")],
    "the-romance-of-tiger-and-rose": [("Zhao Lusi","赵露思","陈芊芊"),("Ding Yuxi","丁禹兮","韩烁"),("Zhou Zixin","周紫馨","陈楚楚")],
    "my-heroic-husband": [("Guo Qilin","郭麒麟","宁毅"),("Song Yi","宋轶","苏檀儿"),("Jiang Yiyi","蒋依依","刘西瓜"),("Gao Shuguang","高曙光","秦嗣源")],
    "hilarious-family": [("Dong Mengyuan","董梦媛","沈翠喜"),("Wang Yu","王煜","沈世钧"),("Zeng Yike","曾可妮","沈明珠")],
    "romance-on-the-farm": [("Tang Min","唐敏","纪宁"),("Lei Pengyu","雷淞然","周青远"),("Liu Xuanyi","刘轩义","沈健")],
    "love-is-sweet": [("Luo Yunxi","罗云熙","袁帅"),("Bai Lu","白鹿","江君"),("Gao Hanshan","高瀚宇","杜磊")],
    "dating-in-the-kitchen": [("Lin Shen","林雨申","路晋"),("Zhao Lusi","赵露思","顾胜男")],
    "tientsin-mystic": [("Li Xian","李现","郭得友"),("Zhang Ming'en","张铭恩","丁卯"),("Wang Zixuan","王紫璇","肖兰兰"),("Chen Yuqi","陈芋米","顾影")],
    "psych-hunter": [("Liu Xueyi","刘学义","江烁"),("Huang Mengying","黄梦莹","秦一宁"),("Zhai Tianlin","翟天临","岳洪生")],
    "the-spirealm": [("Liu Haocun","刘浩存","林秋妹"),("Song Weilong","宋威龙","阮澜烛"),("Ao Ruihao","敖瑞鹏","凌久时")],
    "the-demon-hunters-romance": [("Zhang Linghe","张凌赫","百鬼册"),("Xu Lu","徐璐","段小瑜"),("Wang Runze","王润泽","白虎")],
    "fangs-of-fortune": [("Cheng Yi","成毅","赵远舟"),("Zhang Miaoyi","张淼怡","文潇"),("Tong Mengshi","童梦石","裴思恒")],
    "the-legend-of-shen-li": [("Zhao Lusi","赵露思","沈璃"),("Lin Gengxin","林更新","行止/行云"),("Xin Yunlai","辛云来","墨方"),("Li Qing","李卿","幽兰")],
    "one-and-only": [("Bai Lu","白鹿","漼时宜"),("Ren Jialun","任嘉伦","周生辰"),("Wang Xingyue","王星越","刘子行"),("Zhou Yuxuan","周锡旸","萧晏")],
    "good-bye-my-princess": [("Peng Xiaoran","彭小苒","曲小枫"),("Chen Starux","陈星旭","李承鄞"),("Wei Qianhua","魏千翔","顾剑")],
    "love-and-destiny": [("Zhang Zhen","张震","九宸"),("Ni Ni","倪妮","灵汐"),("Li Xian","李旻","景休"),("Zhang Zhixi","张芷溪","青瑶")],
    "the-blossoming-of-mountain-flowers": [("Song Jia","宋佳","张桂梅"),("Ch Sheng","陈生","陈四海"),("Zeng Meihuizi","曾美慧孜","谷燕燕")],
    "to-the-wonder": [("Ma Yili","马伊琍","张凤侠"),("Zhou Yiran","周依然","李文秀"),("Yu Shi","于适","巴太"),("Kuile","库力","阿勒泰")],
    "strange-tales-of-tang-dynasty-ii": [("Yang Xuwen","杨旭文","苏无名"),("Yang Zhigang","杨志刚","卢凌风"),("Xi Zi","郜思雯","裴喜君"),("Sun Xuefei","孙雪宁","樱桃")],
    "the-legend-of-tianxing": [("Qin Hao","秦昊","柴布斯"),("Lan Yingying","蓝盈莹","南怀瑾"),("Yang Shuo","杨烁","完颜洪烈")],
    "the-story-of-alley": [("Yan Ni","闫妮","黄玲"),("Li Guangfu","李光洁","林武峰"),("Jiang Xin","蒋欣","宋莹"),("Guan Xiaotong","关晓彤","庄筱婷"),("Fan Chengcheng","范丞丞","庄图南")],
    "guardians-of-the-dafeng": [("Wang Hedi","王鹤棣","许七安"),("Zhang Mengxin","张梦馨","临安公主"),("Liu Meihan","刘美含","怀庆公主")],
    "the-story-of-pearl-girl": [("Zhao Lusi","赵露思","端午/苏暮雨"),("Liu Yuning","刘宇宁","燕子京"),("Tang Min","唐敏","张晋然")],
    "legend-of-zang-hai": [("Xiao Zhan","肖战","藏海"),("Zhang Jingyi","张婧仪","香暗荼"),("Zhou Qi","周奇","庄之行"),("Zhong Chuxi","钟楚曦","赵上弦")],
    "bleaching": [("Guo Jingfei","郭京飞","彭兆林"),("Wang Qian","王千源","黎小莲"),("Ren Min","任敏","Zhen Zhen")],
    "glorious-beauty-of-tang": [("Yang Zi","杨紫","李幼贞"),("Li Xian","李现","蒋长扬"),("Zhang Yanyan","张燕燕","何惟芳")],
    "see-her-again": [("Chen Xingxu","陈星旭","江远"),("Lu Yuxiao","卢昱晓","江漫"),("Zhang Kangle","张康乐","沈辉")],
    "regeneration": [("Jing Boran","井柏然","费可"),("Zhou Yiran","周依然","何珊"),("Wang Yanlin","王彦霖","陈树发")],
    "medal-of-the-republic": [("Lei Jiayin","雷佳音","申纪兰"),("Jiang Mengjie","蒋梦婕","屠呦呦"),("Huang Zhizhong","黄志忠","袁隆平"),("Sun Qian","孙茜","张富清")],
    "the-daughter-of-the-mountain": [("Yang Mi","杨幂","黄文秀"),("Zhang Huiwen","张慧雯","韦彩琳"),("Dong Jingchun","董洁","农杰")],
    "like-a-flowing-river": [("Wang Kai","王凯","宋运辉"),("Yang Shuo","杨烁","雷东宝"),("Dong Zijian","董子健","杨巡"),("Tong Yao","童瑶","宋运萍")],
    "all-is-well": [("Yao Chen","姚晨","苏明玉"),("Gao Xin","高鑫","苏明哲"),("Guo Jingfei","郭京飞","苏明成"),("Ni Dahong","倪大红","苏大强")],
    "go-go-squid": [("Li Xian","李现","韩商言"),("Yang Zi","杨紫","佟年"),("Wang Chenye","王承烨","吴白"),("Li Mingde","李茂德","Grunt")],
    "legend-of-yunxi": [("Ju Jingyi","鞠婧祎","韩芸汐"),("Mike","MIKE","龙飞夜"),("Xu Kaihao","许凯皓","顾七少"),("Hu Bing","胡兵","天穆王")],
}

# Chinese name to slug mapping (pinyin)
ZH_TO_SLUG = {
    "范伟":"fan-wei","秦昊":"qin-hao","陈明昊":"chen-minghao","李庚希":"li-gengxi","刘奕铁":"liu-yitie",
    "蒋奇明":"jiang-qiming","刘琳":"liu-lin","史彭元":"shi-pengyuan","廖凡":"liao-fan","白宇":"bai-yu",
    "谭卓":"tan-zhuo","宁理":"ning-li","赵阳":"zhao-yang","黄尧":"huang-yao","田小洁":"tian-xiaojie",
    "王景春":"wang-jingchun","荣梓杉":"rong-zishan","王圣迪":"wang-shengdi","张颂文":"zhang-songwen",
    "张鲁一":"zhang-luyi","于和伟":"yu-hewei","王传君":"wang-chuanjun","陈瑾":"chen-jin",
    "王子文":"wang-ziwen","林永健":"lin-yongjian","成毅":"cheng-yi","曾舜晞":"zeng-shunxi",
    "肖顺尧":"xiao-shunyao","陈都灵":"chen-duling","王鹤润":"wang-herun","胡歌":"hu-ge",
    "唐嫣":"tang-yan","马伊琍":"ma-yili","辛芷蕾":"xin-zhilei","董勇":"dong-yong","黄轩":"huang-xuan",
    "热依扎":"re-yizha","张嘉益":"zhang-jiayi","姚晨":"yao-chen","白宇帆":"bai-yufan",
    "张桐":"zhang-tong","侯京健":"hou-jingjian","马少骅":"ma-shaohua","于震":"yu-zhen",
    "雷佳音":"lei-jayin","易烊千玺":"yi-yangqianxi","周一围":"zhou-yiwei","张天爱":"zhang-tianai",
    "韩童生":"han-tongsheng","杨幂":"yang-mi","赵又廷":"zhao-youting","高伟光":"gao-weiguang",
    "迪丽热巴":"dilraba","郭品超":"guo-pinchao","吴谨言":"wu-jinyan","秦岚":"qin-lan",
    "聂远":"nie-yuan","佘诗曼":"she-shiman","许凯":"xu-kai","赵丽颖":"zhao-liying",
    "林更新":"lin-gengxin","窦骁":"dou-xiao","李沁":"li-qin","黄梦莹":"huang-mengying",
    "胡先煦":"hu-xianxu","张超":"zhang-chao","李茂德":"li-maode","赵浩闳":"zhao-haohong",
    "陈坤":"chen-kun","倪妮":"ni-ni","赵立新":"zhao-lixin","倪大红":"ni-dahong","白敬亭":"bai-jingting",
    "杨旭文":"yang-xuwen","杨志刚":"yang-zhigang","郜思雯":"gao-siwen","陈楚河":"chen-chuhe",
    "孙雪宁":"sun-xuening","李宏毅":"li-hongyi","敖瑞鹏":"ao-ruipeng","张予曦":"zhang-yuxi",
    "刘学义":"liu-xueyi","林柏叡":"lin-borui","王一博":"wang-yibo","张慧雯":"zhang-huiwen",
    "孟子义":"meng-ziyi","杨洋":"yang-yang","赵露思":"zhao-lusi","赖艺":"lai-yi","李晴":"li-qing",
    "张若昀":"zhang-ruoyun","胡军":"hu-jun","高曙光":"gao-shuguang","潘粤明":"pan-yueming",
    "王龙正":"wang-longzheng","刘奕君":"liu-yijun","刘金山":"liu-jinshan","张新成":"zhang-xincheng",
    "周雨彤":"zhou-yutong","龚俊":"gong-jun","郑伟":"zheng-wei","苏晓彤":"su-xiaotong",
    "王子璇":"wang-zixuan","王子奇":"wang-ziqi","闫子东":"yan-zidong","徐梦洁":"xu-mengjie",
    "杨羽":"yang-yu","邢冬冬":"xing-dongdong","安宁":"an-ning","黎伟":"li-wei","王秀月":"wang-xiuyue",
    "富大龙":"fu-dalong","丁勇岱":"ding-yongdai","郭麒麟":"guo-qilin","吴镇宇":"francis-ng",
    "尤勇智":"you-yongzhi","王迅":"wang-xun","齐溪":"qi-xi","张子枫":"zhang-zifeng",
    "辛鹏":"xin-peng","王泷正":"wang-longzheng","景甜":"jing-tian","张彬彬":"zhang-binbin",
    "李依晓":"li-yixiao","张亦杰":"zhang-yijie","马天宇":"ma-tianyu","陈星旭":"chen-xingxu",
    "王秀一":"wang-xiuyi","刘昊然":"liu-haoran","谭松韵":"tan-songyun","王栎鑫":"wang-yuexin",
    "方文强":"fang-wenqiang","李兰迪":"li-lanying","周澄业":"zhou-chengye","李晨":"li-chen",
    "陈昊宇":"chen-haoyu","庄达菲":"zhuang-dafei","王承烨":"wang-chengye","吴磊":"wu-lei",
    "姜珮瑶":"jiang-peiyao","张淼怡":"zhang-miaoyi","边天cheng":"bian-tiancheng","郭之heng":"guo-zhiheng",
    "周紫馨":"zhou-zixin","丁禹兮":"ding-yuxi","宋轶":"song-yi","蒋依依":"jiang-yiyi",
    "董梦媛":"dong-mengyuan","王煜":"wang-yu","曾可妮":"zeng-keni","唐敏":"tang-min",
    "雷淞然":"lei-songran","刘轩义":"liu-xuanyi","罗云熙":"luo-yunxi","高瀚山":"gao-hanshan",
    "林雨申":"lin-yushen","李现":"li-xian","张铭恩":"zhang-mingen","王紫璇":"wang-zixuan",
    "陈芋米":"chen-yumi","黄梦ying":"huang-mengying","翟天临":"zhai-tianlin","刘浩存":"liu-haocun",
    "宋威龙":"song-weilong","徐璐":"xu-lu","王润泽":"wang-runze","张凌赫":"zhang-linghe",
    "童梦石":"tong-mengshi","辛云来":"xin-yunlai","李旻":"li-min","任嘉伦":"ren-jialun",
    "王星越":"wang-xingyue","周锡旸":"zhou-yuxuan","彭小苒":"peng-xiaoran","陈星旭":"chen-xingxu",
    "魏千翔":"wei-qianxiang","张震":"zhang-zhen","李旻":"li-min","张芷溪":"zhang-zhixi",
    "宋佳":"song-jia","陈生":"chen-sheng","曾美huizi":"zeng-meihuizi","于适":"yu-shi",
    "马伊琍":"ma-yili","周依然":"zhou-yiran","秦昊":"qin-hao","蓝盈莹":"lan-yingying",
    "杨烁":"yang-shuo","闫妮":"yan-ni","李光洁":"li-guangjie","蒋欣":"jiang-xin",
    "关晓彤":"guan-xiaotong","范丞丞":"fan-chengcheng","王鹤棣":"wang-hedi","张梦馨":"zhang-mengxin",
    "刘美含":"liu-meihan","肖战":"xiao-zhan","张婧仪":"zhang-jingyi","周奇":"zhou-qi",
    "钟楚曦":"zhong-chuxi","郭京飞":"guo-jingfei","王千源":"wang-qianyuan","任敏":"ren-min",
    "张燕燕":"zhang-yanyan","卢昱晓":"lu-yuxiao","张康乐":"zhang-kangle","沈辉":"shen-hui",
    "井柏然":"jing-boran","王彦霖":"wang-yanlin","蒋梦婕":"jiang-mengjie","黄志忠":"huang-zhizhong",
    "孙茜":"sun-qian","张慧wen":"zhang-huiwen","董洁":"dong-jie","王凯":"wang-kai",
    "董子健":"dong-zijian","童瑶":"tong-yao","高鑫":"gao-xin","倪大红":"ni-dahong",
    "鞠婧祎":"ju-jingyi","许凯皓":"xu-kaihao","胡兵":"hu-bing",
}

def make_actor_slug(en_name, zh_name):
    """Generate actor slug from English name, fallback to pinyin."""
    slug = en_name.lower().strip()
    slug = re.sub(r'[^a-z0-9-]', '-', slug)
    slug = re.sub(r'-+', '-', slug).strip('-')
    # Check if we have a pinyin mapping
    if zh_name in ZH_TO_SLUG:
        return ZH_TO_SLUG[zh_name]
    return slug


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
    print(f"Existing actors: {len(existing_actors)}")

    # Get drama info for building drama entries
    drama_info = {}
    for row in cursor.execute("SELECT slug, titles_json, year, poster_url FROM dramas").fetchall():
        slug, titles_json, year, poster_url = row
        titles = json.loads(titles_json) if titles_json else {}
        drama_info[slug] = {"title": titles, "year": year, "poster_url": poster_url}

    new_actors = {}
    updates = {}

    for drama_slug, cast_list in CAST_DATA.items():
        for en_name, zh_name, character in cast_list:
            actor_slug = make_actor_slug(en_name, zh_name)
            # Dedup slug
            if actor_slug in existing_actors or actor_slug in new_actors:
                pass  # Already exists or being created
            
            drama_entry = {
                "slug": drama_slug,
                "character": character,
            }
            # Add poster/title if available
            di = drama_info.get(drama_slug, {})
            if di.get("poster_url"):
                drama_entry["poster_url"] = di["poster_url"]

            names = {"en": en_name, "zh": zh_name, "vi": "", "th": ""}

            if actor_slug in existing_actors:
                existing_dramas = existing_actors[actor_slug]['dramas_json']
                if not any(d.get('slug') == drama_slug for d in existing_dramas):
                    existing_dramas.append(drama_entry)
                    existing_actors[actor_slug]['dramas_json'] = existing_dramas
                    updates[actor_slug] = existing_dramas
            elif actor_slug in new_actors:
                if not any(d.get('slug') == drama_slug for d in new_actors[actor_slug]['dramas_json']):
                    new_actors[actor_slug]['dramas_json'].append(drama_entry)
            else:
                new_actors[actor_slug] = {
                    'name': en_name,
                    'names_json': names,
                    'dramas_json': [drama_entry],
                }

    # Insert new actors
    insert_count = 0
    for slug, data in new_actors.items():
        # Handle slug uniqueness
        base_slug = slug
        counter = 1
        while slug in existing_actors or (slug in new_actors and slug != base_slug):
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO actors (slug, name, names_json, photo_url, bio_json, dramas_json, collaborations_json)
                VALUES (?, ?, ?, NULL, ?, ?, '[]')
            """, (
                slug,
                data['name'],
                json.dumps(data['names_json'], ensure_ascii=False),
                json.dumps({"en": "", "zh": "", "vi": "", "th": ""}, ensure_ascii=False),
                json.dumps(data['dramas_json'], ensure_ascii=False),
            ))
            insert_count += 1
        except Exception as e:
            print(f"Error inserting {slug}: {e}")

    # Update existing actors
    update_count = 0
    for slug, dramas_list in updates.items():
        cursor.execute("UPDATE actors SET dramas_json = ? WHERE slug = ?",
                      (json.dumps(dramas_list, ensure_ascii=False), slug))
        update_count += 1

    conn.commit()

    # Verify
    total_actors = cursor.execute("SELECT COUNT(*) FROM actors").fetchone()[0]
    print(f"\n=== CAST INSERTION SUMMARY ===")
    print(f"New actors inserted: {insert_count}")
    print(f"Existing actors updated: {update_count}")
    print(f"Total actors in DB: {total_actors}")
    
    # Verify new dramas have cast
    new_slugs = list(CAST_DATA.keys())
    for slug in new_slugs[:5]:
        # Check if any actor links to this drama
        row = cursor.execute(
            "SELECT COUNT(*) FROM actors WHERE dramas_json LIKE ?", 
            (f'%"{slug}"%',)
        ).fetchone()
        print(f"  {slug}: {row[0]} actors linked")

    conn.close()
    print("Done!")


if __name__ == '__main__':
    main()
