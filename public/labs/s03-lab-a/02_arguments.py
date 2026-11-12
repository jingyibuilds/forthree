# Two amounts and a discount, with a floor under the price.

def final_price(amount, discount, minimum):
    price = amount - discount
    if price < minimum:
        price = minimum
    return price


print(final_price(100, 15))
