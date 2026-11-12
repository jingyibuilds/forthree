# Totals a nested list of amounts by calling itself.

def total(items):
    out = 0
    for item in items:
        if isinstance(item, list):
            out = out + total(item)
        else:
            out = out + total([item])
    return out


print(total([1, [2, 3], 4]))
