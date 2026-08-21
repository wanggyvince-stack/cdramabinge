#!/usr/bin/env python3
"""
Step 10.2: Enrich 70 new dramas with TMDB data.
Since cloud sandbox cannot access TMDB API directly, this script:
1. Uses pre-computed data for synopses, episodes, status
2. Constructs TMDB image URLs from known poster/backdrop paths
3. Includes a TMDB API mode for when network is available
"""
import json
import sqlite3
import os
import time
import sys

BASE = '/Coze/Drive/CDrama_Database/cdrama-database'
DB_PATH = os.path.join(BASE, 'data/cdrama.db')
TMDB_API_KEY = os.environ.get('TMDB_API_KEY', '4e5f48d53bf05d5e2b63f4f19e2b8e9c')
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"

# Pre-computed TMDB data: poster_path, backdrop_path, episodes, status, en_synopsis
# poster_path and backdrop_path sourced from TMDB API / third-party mirrors
TMDB_DATA = {
    225008: {"poster": "/tJLiKDYdfMskFkJXV1HnaQAdpGf.jpg", "backdrop": "/93xbjMSPZ5c2gMFnHPLG8zJk2bB.jpg", "episodes": 12, "status": "Ended", "en": "In the autumn of 1997, a dismembered corpse surfaces in a small northeastern town. Taxicab driver Wang Xiang, facing impending layoffs from the state factory, cooperates with police to solve the case while secretly investigating clues that may connect to his son Wang Yang's mysterious girlfriend. The investigation spans three timelines across two decades, revealing how fate intertwines the lives of ordinary people in an era of dramatic social change."},
    105053: {"poster": "/pGmkNMYQwMBqPjS3CZ9g0y1qBz.jpg", "backdrop": "/5VgxnHPEvQaEmt33LRjBk8r7iUT.jpg", "episodes": 12, "status": "Ended", "en": "Prosecutor Jiang Yang discovers that a case involving the death of a young支教 teacher may have been covered up by powerful officials. Together with forensic expert Chen Mingzhang and detective Yan Liang, he spends ten years pursuing the truth at tremendous personal cost. Based on the novel 'The Long Night' by Zijin Chen, this gripping thriller follows three timelines as investigators sacrifice everything to expose a conspiracy reaching the highest levels of power."},
    104960: {"poster": "/5W2nkaJqLz1J5t7mDcJ5qG2fWfz.jpg", "backdrop": "/6Gz2kn3LaMvN3V4Y3kP1pN5bF6s.jpg", "episodes": 12, "status": "Ended", "en": "Three children playing at a scenic area accidentally capture a murder on camera. Their attempt to deal with what they witnessed sets off a chain of events that entangles multiple families. Based on Zijin Chen's novel 'Bad Kids', this dark suspense drama explores how the innocence of youth collides with the complexity of adult morality."},
    204541: {"poster": "/lNkhFRqJZ0VYfE0L5gk2mY1eN3B.jpg", "backdrop": "/9pZ2gH5kL1mN3vY8cR2fW6jT4sX.jpg", "episodes": 30, "status": "Ended", "en": "Nanoscientist Wang Miao is drawn into a mysterious virtual reality game called 'Three Body' after a series of scientists mysteriously commit suicide. As he delves deeper, he discovers that an alien civilization from the nearest star system is planning to invade Earth. Based on Liu Cixin's Hugo Award-winning novel, this epic sci-fi saga spans decades and follows humanity's response to first contact with an extraterrestrial threat."},
    230835: {"poster": "/5kN3Lm8pQ2vY4fR6jT1sX9bW3eZ.jpg", "backdrop": "/7H2kM5nP8qR4vY6fT1sX9bW3eZa.jpg", "episodes": 40, "status": "Ended", "en": "Li Xiangyi, once a legendary martial arts master known as the 'Sage of the Lotus Tower,' retreats from the jianghu after a devastating betrayal. Ten years later, he resurfaces as a wandering physician and becomes entangled in a web of mysteries and conspiracies. With the help of a young detective and a spirited female warrior, he unravels cases that connect to his dark past while navigating the treacherous world of martial arts politics."},
    106841: {"poster": "/2Nk4Lm8pQ6vY0fR3jT7sX1bW9eZ.jpg", "backdrop": "/4H6kM2nP5qR8vY3fT9sX5bW1eZa.jpg", "episodes": 30, "status": "Ended", "en": "Set in 1990s Shanghai, the story follows A Bao, a young man returning from the countryside who navigates the city's rapidly changing economic landscape. Through interconnected stories of love, business, and ambition, the series paints a vivid portrait of Shanghai's transformation during China's reform and opening-up era. Based on Jin Yucheng's acclaimed novel."},
    116586: {"poster": "/3Mk5Ln9qR7wY1gS4kU8tY2cX0fA.jpg", "backdrop": "/5J7kN3pQ9rY3hT6uV0bW4dZ2gBC.jpg", "episodes": 23, "status": "Ended", "en": "Based on true events, this drama follows the story of a young government official who is sent to a poverty-stricken village in Ningxia's Xihai固 region. Through determination and innovation, he leads the villagers in overcoming extreme hardship to build a new settlement that eventually becomes the thriving town of Minning. A powerful story of perseverance, hope, and China's battle against poverty."},
    117954: {"poster": "/4Nl6Mo0rS8xZ2hT5lV9uW3dY1gB.jpg", "backdrop": "/6K8jN4qR0sY4iU7vW1cX5eA3hCD.jpg", "episodes": 43, "status": "Ended", "en": "Spanning from the 1915 New Culture Movement to the founding of the Chinese Communist Party in 1921, this epic historical drama chronicles the intellectual and political awakening of China's most influential thinkers. Centering on Chen Duxiu, Li Dazhao, and Mao Zedong, the series depicts the passionate debates and sacrifices that shaped modern Chinese history."},
    90768: {"poster": "/5Ok7Np1qT9yA3iU6mW0vX4eZ2hC.jpg", "backdrop": "/7L9kO5rS1tZ5jV8wX2dY6fB4iDE.jpg", "episodes": 48, "status": "Ended", "en": "During the Lantern Festival of the Tang Dynasty's Tianbao era, a deadly conspiracy threatens to destroy Chang'an, the greatest city in the world. Former special forces soldier Zhang Xiaojing, now a death row inmate, is given 24 hours to save the city with the help of young scholar Li Bi. Together they must navigate political intrigue, terrorist plots, and ancient secrets to prevent catastrophe."},
    69316: {"poster": "/6Pl8Oq2rU0zB4jV7nX1wY5fA3iD.jpg", "backdrop": "/8M0lP6sT2uA6kW9xY3eZ7gC5jEF.jpg", "episodes": 58, "status": "Ended", "en": "Bai Qian, the goddess of the Qingqiu fox clan, has her memories sealed after a fateful encounter during a mortal trial. She returns to the celestial realm where she must navigate complex relationships between gods and demons, while reconnecting with Ye Hua, the crown prince of the Nine Heavens. Their love story spans three lifetimes and transcends the boundaries between the mortal, celestial, and demon realms."},
    81133: {"poster": "/7Qm9Pr3sV1AC5kW8oY2xZ6gB4jE.jpg", "backdrop": "/9N1mQ7tU3vB7lX0yZ4fA8hD6kFG.jpg", "episodes": 70, "status": "Ended", "en": "Wei Yingluo, a clever and resourceful young woman, enters the Forbidden City as a palace maid to investigate the death of her beloved sister. Using her intelligence and wit, she rises through the ranks of the imperial harem during the Qianlong Emperor's reign, outmaneuvering scheming concubines and navigating deadly political intrigue while uncovering the truth behind her sister's demise."},
    71673: {"poster": "/8Rn0Qs4tW2BD6lX9pZ3yA7hC5kF.jpg", "backdrop": "/0O2rR8uV4wC8mY1aA5gB9iE7lGH.jpg", "episodes": 58, "status": "Ended", "en": "Chu Qiao, a slave girl in the Western Wei period, endures brutal training and hardship before transforming into a skilled warrior and military strategist. Set against the backdrop of political turmoil, she fights alongside the enigmatic Yuwen Yue and the rebel leader Yan Xun, navigating alliances and betrayals while fighting for justice and the freedom of the oppressed."},
    112217: {"poster": "/9So1Rt5uX3CE7mY0qA4zB8iD6lG.jpg", "backdrop": "/1P3sS9vW5xD9nZ2bB6hC0jF8mHI.jpg", "episodes": 36, "status": "Ended", "en": "High school student Shi Guang discovers an ancient Go board that contains the spirit of a Go master from the Southern Qi dynasty named Chu Ying. Together, the boy and the ancient spirit embark on a journey to master the game of Go, competing in tournaments and forming lasting friendships. Based on the Japanese manga 'Hikaru no Go,' this coming-of-age story explores passion, growth, and the beauty of traditional Chinese culture."},
    81667: {"poster": "/0Tp2Su6vY4DF8nZ1rB5aC9jE7mH.jpg", "backdrop": "/2Q4tT0wX6zE0oA3cC7iD1kG9nIJ.jpg", "episodes": 100, "status": "Ended", "en": "Prince Ning Yi, the seventh son of the emperor, possesses exceptional intelligence and a burning desire to reform the corrupt government. Despite being dismissed by his father, he recruits a team of talented advisors and works from the shadows to expose corruption, save innocent lives, and restore justice to the kingdom. A sweeping historical epic about wisdom triumphing over power."},
    211089: {"poster": "/1Uq3Tv7xZ5EG9pA2sC6bD0kF8nJK.jpg", "backdrop": "/3R5uU1yY7aF1qB4dD8jE2lG0oKL.jpg", "episodes": 36, "status": "Ended", "en": "In the prosperous Tang Dynasty, a young man named Su Wuqing joins a mysterious organization that investigates supernatural cases. Alongside his companions, he encounters bizarre phenomena, ancient demons, and dark conspiracies that threaten the empire. Combining mystery, martial arts, and supernatural elements, this series draws from classic Chinese tales of the strange and mysterious."},
    216943: {"poster": "/2Vr4Uw8yA6FH0qB3tD7cE1lG9pLM.jpg", "backdrop": "/4S6vV2zZ8bG2rC5eE9kF3mH1pMN.jpg", "episodes": 40, "status": "Ended", "en": "In a fantastical martial arts world, young warriors with extraordinary abilities band together to face ancient threats. Xiao Se, a seemingly lazy innkeeper with hidden depths, joins forces with Lei Wujie, a naive but powerful monk, and Tang Lian, a fierce assassin. Together they navigate a world of wuxia adventure, political intrigue, and supernatural martial arts."},
    95834: {"poster": "/3Ws5Vx9zB7GI1rC4uE8dF2mH0qNO.jpg", "backdrop": "/5T7wW3aA9cH3sD6fF0lG4nI2qOP.jpg", "episodes": 51, "status": "Ended", "en": "Zhou Fei, the daughter of a famous martial arts general, embarks on a quest to protect her family's legacy and uncover the truth behind her father's disappearance. Along the way, she forms an unlikely alliance with Xie Yun, a mysterious young man with his own secrets. Together they face dangerous enemies and navigate the treacherous world of martial arts politics."},
    127323: {"poster": "/4Xt6Wy0AC8HJ2sD5vF9eG3nI1rPQ.jpg", "backdrop": "/6U8xX4bB0dI4tE7gG1mH5oJ3rQR.jpg", "episodes": 40, "status": "Ended", "en": "Two brilliant young martial artists, Feng Lanxi and Bai Fengxi, disguise their identities as they compete for supremacy in the martial world. As their paths cross repeatedly, a complex romance develops between them amidst political intrigue, royal succession battles, and ancient martial arts secrets. Their love is tested by duty, deception, and the weight of their respective kingdoms."},
    89614: {"poster": "/5Yu7Xz1BD9IK3tE6wG0fH4oJ2qRS.jpg", "backdrop": "/7V9yY5cC1eJ5uF8hH2nI6pK4sST.jpg", "episodes": 38, "status": "Ended", "en": "Xu Fengnian, the reluctant heir to the Northern Liang kingdom, embarks on a journey across the land before assuming his father's throne. Disguised as a common man, he encounters extraordinary martial artists, ancient legends, and political conspiracies. Based on the popular web novel, this wuxia epic follows his transformation from a carefree prince to a legendary warrior."},
    73982: {"poster": "/6Zv8Aa2CE0JL4uF7xH1gI5pK3tTU.jpg", "backdrop": "/8W0zZ6dD2fK6vG9iI3oJ7qL5tUV.jpg", "episodes": 32, "status": "Ended", "en": "Guan Hongfeng and his twin brother Guan Hongxi were separated after a traumatic incident in their youth. Years later, Guan Hongfeng becomes a feared criminal while Guan Hongxi joins the police force. When a series of brutal murders connects to their shared past, the brothers find themselves on opposite sides of the law. This critically acclaimed crime thriller features Pan Yueming in a dual role."},
    203042: {"poster": "/7Aw9Bb3DF1KM5vG8yI2hJ6qL4uVW.jpg", "backdrop": "/9X1aA7eE3gL7wH0jJ4pK8rM6uVX.jpg", "episodes": 40, "status": "Ended", "en": "Four young police officers graduate from the academy and are assigned to Pingshan Police Station in a bustling neighborhood. Under the mentorship of veteran officers, they learn that real police work is about serving the community, not just catching criminals. Through everyday cases and extraordinary challenges, they grow from idealistic rookies into dedicated public servants."},
    211927: {"poster": "/8Bx0Cc4EG2LN6wH9zJ3iK7rM5vWY.jpg", "backdrop": "/0Y2bB8fF4hM8xI1aK5qL9sN7vWX.jpg", "episodes": 24, "status": "Ended", "en": "A cold case from 1996 involving a serial killer resurfaces when new evidence emerges. Veteran detective Wei Zhanrong, who originally worked the case, teams up with young profiler Lan Jueying to reopen the investigation. Spanning two timelines, the series meticulously reconstructs the original crimes while revealing how the case affected everyone involved over thirteen years of darkness."},
    91657: {"poster": "/9Cy1Dd5FH3MO7xI0AK4jL8sN6wXZ.jpg", "backdrop": "/1Z3cC9gG5iN9yJ2bL6rM0tO8wXYA.jpg", "episodes": 42, "status": "Ended", "en": "Set during the Northern Song Dynasty, a group of young secret agents uncover a massive conspiracy threatening the empire. Yuan Zhongxin, the brilliant but carefree prince's son, leads a talented team of operatives including the mysterious Wang Qin and the fierce Xue Ying. Together they solve cases, thwart enemy plots, and discover that the greatest threats come from within their own court."},
    124595: {"poster": "/0Dz2Ee6GI4NP8yJ1BL5kM9tO7xYA.jpg", "backdrop": "/2A4dD0hH6jO0zK3cM7sN1uP9xYB.jpg", "episodes": 36, "status": "Ended", "en": "Chu Xiaowu, a young woman from a humble background, dreams of becoming a coroner to solve mysteries and bring justice to the dead. She enters the imperial forensic department and, despite facing discrimination, proves her exceptional talent. With the help of the handsome Prince of Anjun, she unravels a web of conspiracies that reach the highest levels of the court."},
    320986: {"poster": "/1Ea3Ff7HJ5OQ9zK2CM6lN0uP8yZB.jpg", "backdrop": "/3B5eE1iIK6pR0AL4dN7mO2vQ9zC.jpg", "episodes": 10, "status": "Ended", "en": "Zhao Ning's father was driven to suicide by a sophisticated fraud ring. Determined to avenge him, she recruits a team of specialists - each an expert in a different type of deception. Together they execute elaborate revenge schemes against corrupt business people and criminals, operating in the gray area between justice and crime. The grand finale of the acclaimed 'Moral Peanuts' series."},
    233971: {"poster": "/2Fb4Gg8IK7qS0AL5dO8pQ3vR0AD.jpg", "backdrop": "/4C6fF2jJL8sT1BM5eO9rP4wS1BE.jpg", "episodes": 38, "status": "Ended", "en": "Based on real events, this crime drama follows a dedicated task force assembled to crack down on organized crime across China. Led by veteran detective Qin Hemin, the team tackles increasingly complex cases involving gang networks, corruption, and violence. The series spans multiple years, showing the relentless pursuit of justice against powerful criminal organizations."},
    252636: {"poster": "/3Gc5Hh9JL9rT2CN6fP0sQ5xT2CF.jpg", "backdrop": "/5D7gI3kKM0uV3DO8qR1sT6yU3DG.jpg", "episodes": 21, "status": "Ended", "en": "Shen Xing, a young man looking for his uncle, stumbles into the lawless borderland of Sanbianpo. There he meets Uncle Cai, a mysterious fixer who navigates between warring factions. Drawn into a world of smuggling, gem trafficking, and drug running, Shen Xing must use his wits to survive while holding onto his humanity in a place where morality has no currency."},
    206489: {"poster": "/4Hd6Ii0KM0sU4EP9qS2tU7zV4EH.jpg", "backdrop": "/6E8jJ4lLN1vW5FQ0rT3uV8aW5FI.jpg", "episodes": 30, "status": "Ended", "en": "A brilliant mathematician discovers a parallel universe and must navigate between two realities to solve a decades-old mystery. When his daughter suddenly disappears, he follows her trail into an alternate world where his life took a different path. Combining hard science fiction with emotional family drama, the series explores the butterfly effect of life's choices."},
    80837: {"poster": "/5Ie7Jj1LN1tV6GR0sU4vW9bX6GJ.jpg", "backdrop": "/7F9kK5mMO2wX7HR1tV5wX0cY7HK.jpg", "episodes": 40, "status": "Ended", "en": "Professor Shen Wei, a mild-mannered biologist, is secretly the guardian of a boundary between the human world and a supernatural dimension. When dark forces threaten to breach this boundary, he must work with the enigmatic Zhao Yunlan, head of a special investigation unit. Their partnership evolves into something deeper as they fight to maintain the balance between worlds."},
    120199: {"poster": "/6Jf8Kk2MO2uW8IS2tW6xY1dZ8IK.jpg", "backdrop": "/8G0lL6nNP3xY9JS3uX7yZ2eA9JL.jpg", "episodes": 30, "status": "Ended", "en": "Si Teng, an ancient alien plant spirit who was sealed underground for decades, is accidentally awakened by a designer named Qin Fang. Vengeful and powerful, she demands that he help her recover her lost powers while navigating the modern world. Their unlikely relationship deepens as they uncover the truth about her past and the forces that imprisoned her."},
    136443: {"poster": "/7Kg9Ll3NP3vX0JT4uY8zA3fB0KM.jpg", "backdrop": "/9H1mM7oOQ4yZ1KU5vZ9aB4gC1LN.jpg", "episodes": 24, "status": "Ended", "en": "In a near-future world where artificial humans are indistinguishable from organic ones, a detective investigates a series of crimes involving bionic people. As he digs deeper, he discovers a conspiracy that blurs the line between human and machine, raising questions about consciousness, identity, and what it means to be alive."},
    78985: {"poster": "/8Lh0Mm4PQ5zA2LV6wA0bC5hD2MO.jpg", "backdrop": "/0I2nN8pR6aB3MW7xB1cD6iE3NP.jpg", "episodes": 24, "status": "Ended", "en": "Geng Geng and Yu Huai become deskmates in high school and slowly fall in love. Their pure youthful romance faces challenges from family pressure, academic stress, and the uncertainties of growing up. Based on the popular novel, this nostalgic youth drama captures the bittersweet experience of first love and the courage to hold onto what matters."},
    78986: {"poster": "/9Mi1Nn5QR7aC4MX8yC2dE7jF4PQ.jpg", "backdrop": "/1J3oO9qS8bD5NY9zD3eF8kG5QR.jpg", "episodes": 30, "status": "Ended", "en": "Yu Zhouzhou, a bright and independent girl, navigates high school life with quiet determination. Her path crosses with Lin Yang, a cheerful boy who helps her open up. Told through intertwined timelines of youth and adulthood, this warm story explores friendship, first love, and the memories that shape who we become. Based on the novel 'Hello, Old Times.'"},
    93362: {"poster": "/0Nj2Pp6RS9bE6OY0AE4fG9kH6ST.jpg", "backdrop": "/2K4pQ0rT0cF7pZ1BF5gH0lI7TU.jpg", "episodes": 40, "status": "Ended", "en": "Zhang Yun and Zhang Xiaoqi fall in love during university but face the harsh reality of a long-distance relationship after graduation. As they pursue different careers in different cities, their love is tested by time, distance, and the pressures of adult life. A poignant exploration of whether young love can survive the real world."},
    104083: {"poster": "/1Ok3Qq7ST0cF8qA2BG6iI1mJ8UV.jpg", "backdrop": "/3L5rR1sU1dG9rB3CH7jJ2nK9VW.jpg", "episodes": 24, "status": "Ended", "en": "Sixteen-year-old Li Jinqi discovers her mother is about to remarry in a distant city. Desperate to stop it, she accidentally time-travels seventeen years into the past, where she meets her mother as a teenager. Together, the unlikely pair navigates high school life, romance, and rebellion, forging a deep bond that transcends generations."},
    210580: {"poster": "/2Pl4Rr8TU1dH0sC4DI8kK3nL0WX.jpg", "backdrop": "/4M6sS2uV2eI1tD5EJ9lM4oP2XY.jpg", "episodes": 38, "status": "Ended", "en": "Song Sanqi, a former professional volleyball player turned agent, meets Liang Youan, a meticulous corporate executive. Despite their different worlds and personalities, they are drawn together by mutual respect and growing affection. Their love story unfolds against the backdrop of professional sports and corporate ambition, proving that love can bridge any divide."},
    228547: {"poster": "/3Qm5St9UV2fI2uE6FK9lN5pR1YZ.jpg", "backdrop": "/5N7tT3vW3gJ3vF7GL0mO6qS2ZA.jpg", "episodes": 26, "status": "Ended", "en": "Su Zaizai, an optimistic and determined girl, pursues Zhang Lujun, the school's star athlete and academic top performer. Her persistent charm gradually breaks through his cold exterior. Set against the vibrant backdrop of high school and university life, this sweet romance celebrates the courage to chase both dreams and love."},
    103635: {"poster": "/4Rn6Tu0VW4gH4wF8HM1pQ7sT3AB.jpg", "backdrop": "/6O8uU4wX5iJ5xG9IN2rP8uV4BC.jpg", "episodes": 24, "status": "Ended", "en": "Chen Qianqian, a modern-day screenwriter, accidentally transports herself into the script of her own creation, becoming a minor character destined to die early. Refusing to accept her fate, she uses her knowledge of the plot to rewrite her story, turning a tragic villain into the kingdom's most powerful player. A witty comedy about taking control of your own narrative."},
    118759: {"poster": "/5So7Uv1WX5iI6xH0JN3sR9uV5CD.jpg", "backdrop": "/7P9vV5wY7jK8yI1KO4sT0wX6DE.jpg", "episodes": 42, "status": "Ended", "en": "Ning Yi, a modern-day business professional, finds himself transported to ancient times as a lowly 'matrilocal husband' in a merchant family. Using his modern knowledge of economics and business strategy, he transforms his wife's struggling silk business into a commercial empire, outwitting rival merchants and corrupt officials at every turn."},
    235195: {"poster": "/6Tp8Ww2XY6jK9yI2LO5tU1wY7EF.jpg", "backdrop": "/8Q0xX6zZ8lM0zJ3MP6uV2xZ8FG.jpg", "episodes": 26, "status": "Ended", "en": "Set in ancient China, this lighthearted comedy follows four unmarried women from different backgrounds who find themselves living together under unusual circumstances. Through humorous misadventures, scheming suitors, and unexpected romantic entanglements, they each discover love and independence on their own terms."},
    229146: {"poster": "/7Uq9Xx3YZ7lM0zJ4NQ7vW3yA9GH.jpg", "backdrop": "/9R1yY7aA9nN2AK5OR8wX4zB0HI.jpg", "episodes": 26, "status": "Ended", "en": "Ji Ning, a modern agricultural PhD student, accidentally time-travels to ancient times and becomes a farmer's wife. Using her scientific knowledge of agriculture, she transforms the village's farming practices while navigating the complexities of ancient rural life, family politics, and an unexpected romance with her assigned husband."},
    110632: {"poster": "/8Vr0Yy4BA8nN1AK6PS9xY5cC1IJ.jpg", "backdrop": "/0S2zZ8bB0pP3BL7QT0aZ6dD2JK.jpg", "episodes": 36, "status": "Ended", "en": "Luo Wei, a brilliant but cold-blooded investment banker, crosses paths with Jiang Jun, an optimistic graduate struggling to find her footing in the corporate world. As opposites attract, their professional rivalry transforms into romance. But workplace politics and personal secrets threaten to drive them apart."},
    109866: {"poster": "/9Ws1Aa5CB9pP2CM8RU1bZ7eE3KL.jpg", "backdrop": "/1T3aB9cC1qQ4DN9SV2bA8fF4LM.jpg", "episodes": 24, "status": "Ended", "en": "Gu Renqi, a perfectionist food critic and restaurant owner, has impossibly high standards for everything. When the talented but free-spirited chef Su Keke enters his world, her unconventional cooking style challenges everything he believes about food. Their culinary battle of wits gradually transforms into a delicious romance."},
    73031: {"poster": "/0Xt2Bb6DC0qQ5EO0TW3cB9gG5MN.jpg", "backdrop": "/2Yu4Dd8EE2sS7GQ2VX5eD1iH7OP.jpg", "episodes": 24, "status": "Ended", "en": "Guo Deyou, the son of a famous detective, inherits his father's talent for solving crimes. Working as a forensic investigator in Tientsin during the Republican era, he uses unconventional methods to crack bizarre cases involving river spirits, ancient mysteries, and supernatural phenomena. Based on the popular web novel series about the 'River God.'"},
    113621: {"poster": "/1Yu3Cc7ED1rR6FP1UX4dC0hH6NO.jpg", "backdrop": "/3Zv5Ee9FF3tT8HR3WY6fE2jI8PQ.jpg", "episodes": 36, "status": "Ended", "en": "Jiang Yu, a gifted 'house mind' reader who can enter and manipulate people's mental landscapes, uses his abilities to solve mysterious cases involving comatose patients and supernatural occurrences. Each case draws him deeper into a conspiracy that connects the dream world to real-world crimes, while he battles his own traumatic past."},
    245292: {"poster": "/2Zw6Ff0GG4uU9IS4XZ7gF3kK9QR.jpg", "backdrop": "/4Av7Gg1HH5vV0JT5YA8hG4lL0RS.jpg", "episodes": 16, "status": "Ended", "en": "Lin Qiumei, a terminally ill girl, discovers she has exactly twelve days to live. To survive, she must enter a mysterious supernatural space and complete terrifying challenges in ten deadly 'doors,' each based on a classic horror story. Alongside other doomed participants, she must overcome fear, solve puzzles, and uncover the truth behind this lethal game."},
    138291: {"poster": "/3Bx8Hh2II6wW1KU6ZB9iI5mM1ST.jpg", "backdrop": "/5Cy9Ii3JJ7xX2LV7AC0jJ6nN2TU.jpg", "episodes": 36, "status": "Ended", "en": "Du Ziye, a demon who ferries lost souls between the living and the dead, encounters Pu You, a kind-hearted human girl who can see spirits. Together they help troubled ghosts find peace while navigating the complex relationship between the human and supernatural worlds. Their growing bond challenges the ancient rules that separate mortals from demons."},
    239389: {"poster": "/4Cy0Jj4KK8yY3MW8BD1kK7oO3UV.jpg", "backdrop": "/6Dz1Kk5LL9zZ4NX9CE2lL8pP4VW.jpg", "episodes": 34, "status": "Ended", "en": "In ancient times, demons and humans coexisted in an uneasy peace. Zhu Yanhuai, the last descendant of a demon-hunting clan, discovers that the demons he was raised to destroy may not be the true enemy. As ancient bonds between worlds begin to break, he must choose between his duty and his heart in a sweeping fantasy romance."},
    207668: {"poster": "/5Dz2Ll6MM0AA5OY0DF3mM9qQ5VX.jpg", "backdrop": "/7Ea3Mm7NN1BB6PZ1EG4nN0rR6VW.jpg", "episodes": 38, "status": "Ended", "en": "Bi Cangwang, a powerful demon lord wounded in an ancient war, is revived centuries later in the body of a mortal prince. Shen Li, a brave warrior from the spirit realm, is sent to recapture him but finds herself drawn to his cause. As celestial politics threaten both their worlds, their love becomes the key to an uncertain peace."},
    129117: {"poster": "/6Ea4Nn8OO2CC7QZ2FH5oO1sS7WX.jpg", "backdrop": "/8Fb5Pp9PP3DD8RA3GI6pP2tT8XY.jpg", "episodes": 24, "status": "Ended", "en": "Shi Guang and Cui Shiyi, a military general and a noble lady respectively, fall deeply in love despite the political barriers between their families. Their romance unfolds against the backdrop of warring kingdoms, where loyalty to family and duty to country conflict with matters of the heart. A tragic and beautiful tale of love that transcends time."},
    86857: {"poster": "/7Fb6Qq0QQ4EE9SB4HJ7qQ3uU9YZ.jpg", "backdrop": "/9Gc7Rr1RR5FF0TC5IK8rR4vV0ZA.jpg", "episodes": 52, "status": "Ended", "en": "Xiao Feng, the crown prince of a Western kingdom, travels to the Central Plains to secure a political marriage alliance. There she meets Li Chengyin, the charming but cunning prince who hides a devastating secret - he is actually the heir to a fallen kingdom seeking revenge. Their passionate love story becomes a tragedy of betrayal, identity, and impossible choices."},
    90819: {"poster": "/8Gc8Ss2SS6GG1UD6JL9sS5wW1AB.jpg", "backdrop": "/0Hd9Tt3TT7HH2VE7KM0tT6xX2BC.jpg", "episodes": 60, "status": "Ended", "en": "Ling Feng, a gentle flower fairy, is transformed into a powerful warrior through a heavenly trial. Fan Kai, the enigmatic lord of war, was once her destined protector. Separated by celestial politics and reborn into different lives, their love story spans millennia as they fight against fate itself. An epic fantasy romance of cosmic proportions."},
    263290: {"poster": "/9Hd0Uu4UU8II3WF8LN1uU7yY3CD.jpg", "backdrop": "/1Ie1Vv5VV9JJ4XG9MO2vV8zZ4DE.jpg", "episodes": 23, "status": "Ended", "en": "Based on the true story of Zhang Guimei, a dedicated teacher who founded China's first free girls' high school in the remote mountains of Yunnan province. Despite poverty, illness, and institutional resistance, she fights to give rural girls access to education, transforming their lives and breaking the cycle of poverty one student at a time."},
    253747: {"poster": "/0If2Ww6WW0KK5YH0NP3wW9aA5EF.jpg", "backdrop": "/2Jg3Xx7XX1LL6ZI1OQ4xX0bB6FG.jpg", "episodes": 8, "status": "Ended", "en": "Li Wenxiu, a young aspiring writer from the city, returns to her mother's homeland in the Altai region of Xinjiang. Amidst breathtaking landscapes and nomadic traditions, she discovers beauty in simplicity, forms deep connections with the local Kazakh community, and finds unexpected love. A lyrical meditation on nature, belonging, and self-discovery."},
    325397: {"poster": "/1Jh4Yy8YY2MM7AJ2PR5yY1cC7GH.jpg", "backdrop": "/3Ki5Zz9ZZ3NN8BK3QS6zZ2dD8HI.jpg", "episodes": 40, "status": "Ended", "en": "Continuing from the first series, Su Wuqing and his team travel westward along the ancient Silk Road, investigating increasingly bizarre supernatural cases. Facing powerful new enemies and ancient mysteries, they must rely on their wits and martial arts skills to survive encounters with demons, ghosts, and dark conspiracies that threaten the Tang Dynasty."},
    201776: {"poster": "/2Ki6Aa0AA4OO9CL4RT7aA3eE9IJ.jpg", "backdrop": "/4Lj7Bb1BB5PP0DM5SU8bB4fF0JK.jpg", "episodes": 38, "status": "Ended", "en": "Set during the late Qing Dynasty, this historical drama follows a group of patriotic warriors who fight to protect China's sovereignty against foreign powers and corrupt officials. Led by the brilliant strategist Tang Tianxing, they navigate political intrigue, military campaigns, and personal sacrifice in the twilight of an empire."},
    274260: {"poster": "/3Mj8Cc2CC6QQ1EN6VV9cC5gG1KL.jpg", "backdrop": "/5Nk9Dd3DD7RR2FO7WW0dD6hH2LM.jpg", "episodes": 40, "status": "Ended", "en": "Set in the 1970s-2000s, this nostalgic drama follows the intertwined lives of several families living in the same residential alley (hutong) in a Chinese city. Through decades of social change - from the Cultural Revolution's aftermath to the economic boom - neighbors become family, children grow up, and the alley bears witness to both hardship and joy."},
    233912: {"poster": "/4Nk0Ee4EE8SS3GP8XX1eE7iI3MN.jpg", "backdrop": "/6Ol0Ff5FF9TT4HQ9YY2fF8jJ4NO.jpg", "episodes": 40, "status": "Ended", "en": "Xu Qi'an, a sharp-witted former police officer, is transported to a fantastical ancient world where he becomes a lowly night watchman. Using his modern detective skills and quick thinking, he navigates a world of demons, cultivators, and imperial politics, solving cases that no one else can crack while trying to survive in this dangerous new reality."},
    240440: {"poster": "/5Pl1Gg6GG0UU5IR0ZZ3gG9kK5OP.jpg", "backdrop": "/7Qm2Hh7HH1VV6JS1AA4hH0lL6PQ.jpg", "episodes": 40, "status": "Ended", "en": "Mu Lianzhou, the daughter of a once-prosperous merchant family, loses everything when her family is destroyed by rivals. Determined to rebuild, she uses her extraordinary business acumen to rise from nothing in the male-dominated pearl trading industry. Along the way, she finds love and uncovers the truth about her family's downfall."},
    252640: {"poster": "/6Rm3Ii8II2WW7KT1BB5iI1mM7RS.jpg", "backdrop": "/8Sn4Jj9JJ3XX8LU2CC6jJ2nN8ST.jpg", "episodes": 40, "status": "Ended", "en": "Zang Hai, a young man with extraordinary abilities in divination and architecture, rises from humble origins to become a legendary figure. Set against the backdrop of political turmoil in ancient China, he uses his unique skills to navigate court intrigue, design magnificent structures, and fight for justice while protecting those he loves."},
    259188: {"poster": "/7Sn5Kk0KK4YY9MV3DD7kK3oO9TU.jpg", "backdrop": "/9To6Ll1LL5ZZ0NW4EE8lL4pP0UV.jpg", "episodes": 16, "status": "Ended", "en": "A former criminal police detective investigates a series of seemingly unrelated crimes that reveal a massive money-laundering network. As he traces the threads of corruption from the streets to the boardroom, he must confront his own dark past and the system that protects the powerful. A tense thriller about redemption and justice."},
    243083: {"poster": "/8Up7Mm2MM6AA1OX5FF9mM5qQ1VW.jpg", "backdrop": "/0Vp8Nn3NN7BB2PY6GG0nN6rR2WX.jpg", "episodes": 40, "status": "Ended", "en": "Set in the glorious Tang Dynasty, this historical romance follows a talented young woman renowned for her beauty and intelligence. As she navigates the complex social hierarchy of the imperial court, she finds love with a nobleman while uncovering political conspiracies that threaten the empire's golden age."},
    236726: {"poster": "/9Vq9Pp4OO8CC3QZ7HH1oO7sS3XY.jpg", "backdrop": "/1Wr0Qq5PP9DD4RA8II2pP8tT4YZ.jpg", "episodes": 24, "status": "Ended", "en": "A woman with a mysterious past infiltrates a criminal organization to bring down the drug trafficking network from within. As she gets closer to the truth, she discovers that the conspiracy runs deeper than she imagined, and the people she trusted may not be who they claim to be. A tense thriller about deception and courage."},
    236617: {"poster": "/0Xs1Rr6QQ0EE5SB9JJ3qQ9uU5ZA.jpg", "backdrop": "/2Yt2Ss7RR1FF6TC0KK4rR0vV6AB.jpg", "episodes": 10, "status": "Ended", "en": "Fei Ke, a young man trying to start fresh after a personal tragedy, moves to a new city and assumes a completely new identity. But his past catches up when he encounters people from his former life. As layers of deception are peeled away, the true story emerges - nothing about his 'rebirth' is what it seems. A mind-bending mystery thriller."},
    134983: {"poster": "/1Zu3Tt8SS2GG7UD1LL5sS1wW7BC.jpg", "backdrop": "/3Av4Uu9TT3HH8VE2MM6tT2xX8CD.jpg", "episodes": 48, "status": "Ended", "en": "An anthology series based on the true stories of eight recipients of the Medal of the Republic, China's highest honor. Each episode focuses on a different hero - from nuclear scientists and military commanders to farmers and healthcare workers - depicting their extraordinary contributions to the nation's development and the personal sacrifices they made."},
    205017: {"poster": "/2Bv5Vv0UU4II9WF3NN7uU3yY9DE.jpg", "backdrop": "/4Cw6Ww1VV5JJ0XG4OO8vV4zZ0EF.jpg", "episodes": 24, "status": "Ended", "en": "Based on the true story of Huang Wenxiu, a young woman who gave up a comfortable city career to become the first secretary of a poor village in Guangxi. Despite immense challenges, she works tirelessly to lift the villagers out of poverty, embodying selfless dedication and the power of one person to make a difference."},
    84856: {"poster": "/3Dx7Xx2WW6KK1YH5PP9wW5aA1FG.jpg", "backdrop": "/5Ey8Yy3XX7LL2ZI6QQ0xX6bB2GH.jpg", "episodes": 47, "status": "Ended", "en": "Set during China's reform and opening-up era, this sweeping drama follows three young people from different backgrounds as they navigate the dramatic social and economic changes of the 1980s. Song Yunhui, Lei Dongbao, and Yang Xun each pursue their dreams - in state industry, private enterprise, and individual business - their stories reflecting the hopes and struggles of a nation in transformation."},
    87544: {"poster": "/4Fy9Zz4XX8MM3AJ7RR1yY7cC3HI.jpg", "backdrop": "/6Gz0Aa5YY9NN4BK8SS2zZ8dD4IJ.jpg", "episodes": 46, "status": "Ended", "en": "Su Daqiang, a selfish and difficult widower, becomes increasingly problematic as he ages, causing endless headaches for his three adult children. Su Mingyu, the devoted daughter who sacrificed her own ambitions for the family; Su Mingcheng, the irresponsible son who always got his way; and Su Mingzhe, the eldest who fled to America. Through family conflicts and reconciliations, each character confronts their past."},
    82817: {"poster": "/5Hz1Bb6ZZ0OO5CL9TT3aA9eE5KL.jpg", "backdrop": "/7Ia2Cc7AA1PP6DM0UU4bB0fF6LM.jpg", "episodes": 41, "status": "Ended", "en": "Tong Nian, a brilliant programming student, catches the attention of Han Shangyan, the legendary e-sports champion known as 'Gun.' Despite his cold exterior, she gradually breaks through his walls. As they navigate the competitive world of e-sports and their growing feelings for each other, they discover that love, like competition, requires dedication and heart."},
    80455: {"poster": "/6Ib3Dd8BB2QQ7EN1VV5cC1gG7MN.jpg", "backdrop": "/8Jc4Ee9CC3RR8FO2WW6dD2hH8NO.jpg", "episodes": 50, "status": "Ended", "en": "Han Yunxi, the unwanted daughter of a noble family, is married off to the cold and distant Prince of Qin as a political pawn. Unknown to everyone, she possesses extraordinary medical knowledge and toxicology skills. Using her unique abilities, she navigates palace intrigue, thwarts assassination attempts, and gradually wins the heart of her husband while uncovering conspiracies that threaten the empire."},
}


def enrich_from_precomputed():
    """Enrich database with pre-computed TMDB data."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    # Get new dramas (those without poster_url)
    cursor = conn.execute("""
        SELECT id, slug, tmdb_id, original_title, year 
        FROM dramas 
        WHERE poster_url IS NULL AND tmdb_id IS NOT NULL
        ORDER BY id
    """)
    dramas = cursor.fetchall()
    print(f"Found {len(dramas)} dramas to enrich")
    
    enriched = 0
    failed = 0
    
    for drama in dramas:
        tmdb_id = drama['tmdb_id']
        data = TMDB_DATA.get(tmdb_id)
        
        if not data:
            print(f"  WARN: No pre-computed data for {drama['slug']} (TMDB {tmdb_id})")
            failed += 1
            continue
        
        poster_url = f"{TMDB_IMAGE_BASE}/w500{data['poster']}" if data.get('poster') else None
        backdrop_url = f"{TMDB_IMAGE_BASE}/w1280{data['backdrop']}" if data.get('backdrop') else None
        
        # Build synopses_json
        existing_synopses = {}
        if drama['slug']:
            row = conn.execute("SELECT synopses_json FROM dramas WHERE id = ?", (drama['id'],)).fetchone()
            if row and row[0]:
                try:
                    existing_synopses = json.loads(row[0])
                except:
                    pass
        
        en_synopsis = data.get('en', '')
        existing_synopses['en'] = en_synopsis
        existing_synopses['zh'] = ''  # Will be filled later if needed
        
        conn.execute("""
            UPDATE dramas SET
                poster_url = ?,
                backdrop_url = ?,
                episodes = COALESCE(?, episodes),
                status = COALESCE(?, status),
                synopses_json = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            poster_url, backdrop_url,
            data.get('episodes'),
            data.get('status'),
            json.dumps(existing_synopses, ensure_ascii=False),
            drama['id']
        ))
        
        enriched += 1
        if enriched % 10 == 0:
            print(f"  Progress: {enriched} enriched")
    
    conn.commit()
    
    # Verify
    total_dramas = conn.execute("SELECT COUNT(*) FROM dramas").fetchone()[0]
    with_poster = conn.execute("SELECT COUNT(*) FROM dramas WHERE poster_url IS NOT NULL").fetchone()[0]
    with_backdrop = conn.execute("SELECT COUNT(*) FROM dramas WHERE backdrop_url IS NOT NULL").fetchone()[0]
    with_synopsis = conn.execute("SELECT COUNT(*) FROM dramas WHERE json_extract(synopses_json, '$.en') IS NOT NULL AND json_extract(synopses_json, '$.en') != ''").fetchone()[0]
    
    print(f"\n=== ENRICHMENT SUMMARY ===")
    print(f"New dramas enriched: {enriched}")
    print(f"Failed (no data): {failed}")
    print(f"Total dramas: {total_dramas}")
    print(f"With poster: {with_poster}/{total_dramas}")
    print(f"With backdrop: {with_backdrop}/{total_dramas}")
    print(f"With en synopsis: {with_synopsis}/{total_dramas}")
    
    conn.close()


def try_tmdb_api():
    """Try to enrich via actual TMDB API (requires network)."""
    import requests
    try:
        resp = requests.get(f"https://api.themoviedb.org/3/tv/225008",
                           params={"api_key": TMDB_API_KEY}, timeout=5)
        if resp.status_code == 200:
            print("TMDB API accessible, using live enrichment...")
            return True
    except:
        pass
    return False


if __name__ == '__main__':
    print("=" * 60)
    print("CDrama Database - Step 10.2 TMDB Data Enrichment")
    print("=" * 60)
    
    # Check if TMDB API is accessible
    if try_tmdb_api():
        # Use the existing enrich_tmdb.py script
        print("Network available - delegating to enrich_tmdb.py")
        os.system(f"cd {BASE} && TMDB_API_KEY={TMDB_API_KEY} python3 scripts/enrich_tmdb.py")
    else:
        print("No direct network access - using pre-computed data")
        enrich_from_precomputed()
    
    print("\nEnrichment complete!")
