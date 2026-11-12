# A worked answer to the lab's three tasks, for the numbers its checks expect.
import pathlib
import runpy

rows = runpy.run_path(str(pathlib.Path(__file__).resolve().parents[3] / "public/labs/s02-lab-a/rows.py"))["rows"]

# Task 1: every person's name.
for row in rows:
    print(row["name"])

# Task 2: how many amounts are over 20, and what they add up to.
count = 0
over = 0
for row in rows:
    if row["amount"] > 20:
        count = count + 1
        over = over + row["amount"]
print("count", count, over)

# Task 3: the row at which the running total first passes 50.
total = 0
for row in rows:
    total = total + row["amount"]
    if total > 50:
        print(row["name"], total)
        break

# And the largest single amount, which the compare note quotes.
print("largest", max(row["amount"] for row in rows))
