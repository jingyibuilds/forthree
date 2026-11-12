# Three rows, read by one function.

rows = [
    {"name": "Ana", "team": "sales"},
    {"name": "Bo", "team": "eng"},
    {"name": "Cy"},
]


def team_of(row):
    return row["team"]


for row in rows:
    print(row["name"], team_of(row))
