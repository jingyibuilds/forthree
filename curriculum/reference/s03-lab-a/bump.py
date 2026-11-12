# The compare pane's right reference, and the program the guess is about.
def bump(number, items):
    number = number + 1
    items.append("new")


count = 1
names = ["Ana"]
bump(count, names)
print(count, names)
