with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

open_divs = 0
for i, line in enumerate(lines):
    if "return (" in line:
        start_idx = i
        break

print(f"Started at line {start_idx+1}")
for i in range(start_idx, len(lines)):
    line = lines[i]
    # Remove any strings or comments before counting (naive)
    opens = line.count("<div")
    closes = line.count("</div")
    open_divs += opens
    open_divs -= closes
    if i > 330:
        print(f"Line {i+1}: net_open={open_divs}")
        if open_divs == 0:
            print(f"ROOT DIV CLOSED AT LINE {i+1}")
            break
