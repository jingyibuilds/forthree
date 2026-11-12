# The average amount per team, over three teams.

rows = [
    {"team": "sales", "amount": 18},
    {"team": "eng", "amount": 12},
]


def average(amounts):
    return sum(amounts) / len(amounts)


for team in ["sales", "eng", "support"]:
    amounts = [row["amount"] for row in rows if row["team"] == team]
    print(team, average(amounts))
