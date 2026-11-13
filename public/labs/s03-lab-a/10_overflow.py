# A column of whole numbers, and one more added to it.

import numpy

column = numpy.array([2 ** 31 - 1], dtype=numpy.int32)
print("before:", column[0])
print("after one more:", (column + 1)[0])
