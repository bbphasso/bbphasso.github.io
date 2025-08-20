import csv
import json
import requests
from datetime import datetime

SHEET_ID = "1F1chb6vGqWsRQvLLejuSfWQPk-UXbTkRWvFT8nAIDJo"
SHEET_GID = "0"  # For first sheet

URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={SHEET_GID}"

# 1. Récupérer les données depuis Google Sheet
response = requests.get(URL)
response.encoding = 'utf-8'

rows = list(csv.reader(response.text.splitlines()))

# 2. Supprimer les doublons
unique_rows = []
seen = set()
for row in rows:
    t = tuple(row)  # toutes les colonnes
    if t not in seen:
        seen.add(t)
        unique_rows.append(row)

# 3. Trier par date (colonne A) décroissante
for row in unique_rows:
    row.append(datetime.strptime(row[0], '%Y-%m-%dT%H:%M:%S.%fZ'))

sorted_rows = sorted(unique_rows, key=lambda r: r[-1], reverse=True)

# Les 3 plus récentes
top3_rows = sorted_rows[:3]

# Récupérer la colonne B correspondante
top3_columnB = [row[1] for row in top3_rows]

# Save in JSON
with open("/data/Last_LKIposts.json", "w") as f:
    json.dump(top3_columnB, f)
