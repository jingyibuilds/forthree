# The compare pane's right reference: the total is set before the loop.
import pathlib
import runpy

rows = runpy.run_path(str(pathlib.Path(__file__).resolve().parents[3] / "public/labs/s02-lab-a/rows.py"))["rows"]

total = 0
for row in rows:
    total = total + row["amount"]
    print(total)
print("total at the end:", total)
