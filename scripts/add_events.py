import csv
import json
import requests
import re
from datetime import datetime
from pathlib import Path

SHEET_ID = "13sQtqiFtBh8ov1xGo13mzOKOg-d-_KXwsQcGAVlmhuE"
SHEET_GID = "0"  # For first sheet
OUTPUT_FILE = "data/events.json"

URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={SHEET_GID}"

def load_existing_events():
    path = Path(OUTPUT_FILE)
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def event_key(event):
    """Unique key for each event"""
    return f"{event['start']}|{event['end']}|{event['title']}"

def get_next_id(existing_events):
    max_id = 0
    for event in existing_events:
        match = re.match(r'^seminaire(\d+)$', str(event.get("id", "")))
        if match:
            num = int(match.group(1))
            max_id = max(max_id, num)
    return f"seminaire{max_id + 1}"

def main():
        # Loading existing events
    existing_events = load_existing_events()
    existing_keys = set(event_key(e) for e in existing_events)

    response = requests.get(URL)
    response.encoding = 'utf-8'
    rows = csv.DictReader(response.text.splitlines())

    for row in rows:
        if row.get("Valide", "").strip().lower() in ["true", "oui", "x", "1"]:
            if datetime.strptime(row.get("Dates", "").strip(), "%d/%m/%Y") > datetime(2025, 11, 1): # If after 01-11-25 change MJC datetime to 13h
                hour_start = "13:00:00"
                hour_stop = "13:30:30"
            else:
                hour_start = "12:00:00"
                hour_stop = "12:30:00"

            event = {
                "id": get_next_id(existing_events),
                "author": f"{row.get('Nom presentateur', '').strip()} ({row.get('Equipe', '').strip().upper()})",
                "start": datetime.strptime(row.get("Dates", "").strip(), "%d/%m/%Y").strftime(f"%Y-%m-%dT{hour_start}"),
                "end": datetime.strptime(row.get("Dates", "").strip(), "%d/%m/%Y").strftime(f"%Y-%m-%dT{hour_stop}"),
                "title": (
                    f"{row.get('Statut presentation', '').strip()} salle {row.get('Salles', '').strip()}"
                    if row.get("Statut presentation", "").strip() != '-'
                    else f"MJC salle {row.get('Salles', '').strip()}"
                ),
                "summary": row.get("Presentation", "").strip()
            }

            if event_key(event) not in existing_keys:
                    existing_events.append(event)
                    existing_keys.add(event_key(event))  # Add the key to keylist

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(existing_events, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
