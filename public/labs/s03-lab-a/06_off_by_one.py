# Pairs each name with the next one along.

names = ["Ana", "Bo", "Cy"]


def next_along(items, index):
    return items[index + 1]


for index in range(len(names)):
    print(names[index], "->", next_along(names, index))
