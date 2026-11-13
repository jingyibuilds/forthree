# weekly_total.py
# An agent wrote this from one sentence: "total the sales team's amounts for the week".

rows = [
    {"name": "Ana", "team": "sales", "amount": 18},
    {"name": "Bo", "team": "eng", "amount": 12},
    {"name": "Cy", "team": "sales", "amount": 31},
    {"name": "Di", "team": "eng", "amount": 27},
    {"name": "Eve", "team": "sales", "amount": 25},
]

for row in rows:
    total = 0
    if row["team"] == "sales":
        total = total + row["amount"]

print("Success: the sales total is", total)
