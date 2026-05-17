import sqlite3

conn = sqlite3.connect('songs.db')
cursor = conn.cursor()

cursor.execute("SELECT * FROM song")
songs = cursor.fetchall()

for song in songs:
    print(f"ID: {song[0]}")
    print(f"Title: {song[1]}")
    print(f"Category: {song[2]}")
    print(f"Tempo: {song[3]}")
    print(f"Style: {song[4]}")
    print(f"Date: {song[5]}")
    print("-" * 50)

conn.close()
