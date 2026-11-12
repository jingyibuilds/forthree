# The caller wants to keep the line this function builds.

def label(name, team):
    line = name + " (" + team + ")"
    print(line)


lines = []
lines.append(label("Ana", "sales"))
print(lines[0].upper())
