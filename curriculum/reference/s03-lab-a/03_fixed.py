# Task 3's fix to 03_reassign.py: the total goes in and comes back out.
total = 0


def add(total, amount):
    total = total + amount
    return total


total = add(total, 10)
print(total)
