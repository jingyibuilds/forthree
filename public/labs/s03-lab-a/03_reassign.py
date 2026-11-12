# A running total kept in a name outside the function.

total = 0


def add(amount):
    total = total + amount
    return total


print(add(10))
