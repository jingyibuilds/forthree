# price.py
# An agent wrote this from one sentence: "apply the discounts to a price".


def apply(amount, discounts=[]):
    discounts.append(0.1)
    for discount in discounts:
        amount = amount - amount * discount
    return amount


print("first call: ", apply(100.0))
print("second call:", apply(100.0))
print("third call: ", apply(100.0))
