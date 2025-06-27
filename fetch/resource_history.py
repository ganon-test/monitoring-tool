import sqlite3
import json
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), 'resource_history.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS resource_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        source TEXT NOT NULL,
        data TEXT NOT NULL
    )''')
    conn.commit()
    conn.close()

def insert_resource(source, data):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('INSERT INTO resource_history (timestamp, source, data) VALUES (?, ?, ?)', (datetime.utcnow().isoformat(), source, json.dumps(data)))
    conn.commit()
    conn.close()

def get_resource_history(source, days=7):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    c.execute('SELECT timestamp, data FROM resource_history WHERE source=? AND timestamp >= ? ORDER BY timestamp DESC', (source, since))
    rows = c.fetchall()
    conn.close()
    return [(ts, json.loads(d)) for ts, d in rows]

init_db()
