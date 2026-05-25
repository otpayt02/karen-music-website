from flask import Flask, request, jsonify, render_template
import sqlite3
import os

app = Flask(__name__)
DB_FILE = 'music_archive.db'

def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            week_date TEXT NOT NULL,
            section TEXT NOT NULL,
            style TEXT,
            musical_key TEXT,
            content TEXT
        )''')

        # Insert sample data if empty
        c.execute('SELECT COUNT(*) FROM songs')
        if c.fetchone()[0] == 0:
            samples = [
                ('Amazing Grace (Karen)', '2026-04-05', 'Praise/Worship', 'Slow Rock', 'G', 'Verse 1\nAmazing grace how sweet the sound...\n\nChorus\n[G] [D] [Em] [C]'),
                ('Jesus Loves Me', '2026-04-05', 'Kids', 'Foxtrot', 'C', 'Verse 1\nJesus loves me this I know...\n\n[C] [F] [C] [G]'),
                ('Youth Anthem', '2026-04-05', 'Youth', 'Hard Rock', 'E', 'Intro: [E] [A] [B]\n\nVerse 1\nWe are the youth...'),
                ('Special Sunday Solo', '2026-04-05', 'Solos', 'Bossanova', 'A', 'Solo piece with intricate fingerpicking pattern...\n\n[Amaj7] [Bm7] [E7]'),
                ('How Great Thou Art', '2026-03-29', 'Praise/Worship', 'Ballad', 'D', 'Verse 1\nO Lord my God...\n\n[D] [G] [D] [A]')
            ]
            c.executemany('INSERT INTO songs (title, week_date, section, style, musical_key, content) VALUES (?, ?, ?, ?, ?, ?)', samples)
        conn.commit()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/songs', methods=['GET'])
def get_songs():
    search = request.args.get('q', '').lower()
    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        query = "SELECT * FROM songs WHERE title LIKE ? OR style LIKE ? OR musical_key LIKE ? OR week_date LIKE ? OR section LIKE ? ORDER BY week_date DESC"
        params = (f'%{search}%', f'%{search}%', f'%{search}%', f'%{search}%', f'%{search}%')
        c.execute(query, params)
        songs = [dict(row) for row in c.fetchall()]

        # Group by week and format sections
        grouped = {}
        for song in songs:
            date = song['week_date']
            if date not in grouped:
                grouped[date] = {'Kids': [], 'Youth': [], 'Praise/Worship': [], 'Solos': []}

            sec = song['section'] if song['section'] in grouped[date] else 'Praise/Worship'
            grouped[date][sec].append(song)

        return jsonify(grouped)

if __name__ == '__main__':
    init_db()
    print("Starting Church Music Archive server...")
    print("Open http://127.0.0.1:5000 in your browser.")
    app.run(debug=True, port=5000)
