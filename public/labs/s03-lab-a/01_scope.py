# A report that counts rows, written by an agent.

rows = ["ana", "bo", "cy"]


def count_rows(items):
    total = 0
    for item in items:
        total = total + 1
    return total


count_rows(rows)
print("rows:", total)
