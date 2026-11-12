# Two line items, and the total the customer is charged.

def total(first, second):
    return first + second


charged = total(0.10, 0.20)
print("charged:", charged)
print("is it 0.30?", charged == 0.30)
