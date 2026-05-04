with open("F:\\HAMIEN_LUCCY\\src\\pages\\Dashboard.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

start = 125
open_divs = 0
for i in range(start, 335):
    line = lines[i]
    open_divs += line.count("<div")
    open_divs -= line.count("</div")
    print(f"Line {i+1}: {line.strip()} (open: {open_divs})")
