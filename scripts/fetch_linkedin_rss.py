import feedparser
import json
from datetime import datetime

# Ton flux RSS LinkedIn généré avec rss.app
RSS_URL = "https://rss.app/feeds/SMZC6mk128bGjVCw.xml"

feed = feedparser.parse(RSS_URL)
posts = []

for entry in feed.entries[:3]:
    posts.append({
        "title": entry.title,
        "link": entry.link,
        "date": entry.published
    })

# Générer le fichier JSON
with open("data/linkedin-posts.json", "w", encoding="utf-8") as f:
    json.dump(posts, f, ensure_ascii=False, indent=2)

print(f"{posts} posts LinkedIn sauvegardés dans data/linkedin-posts.json")
