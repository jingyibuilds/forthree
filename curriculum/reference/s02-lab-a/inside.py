# The compare pane's left reference: the total is set inside the loop.
import pathlib
import runpy

rows = runpy.run_path(str(pathlib.Path(__file__).resolve().parents[3] / "public/labs/s02-lab-a/rows.py"))["rows"]

for row in rows:
    total = 0
    total = total + row["amount"]
    print(total)
print("total at the end:", total)
