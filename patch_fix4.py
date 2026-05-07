with open("F:\\HAMIEN_LUCCY\\src\\pages\\Orders.jsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "} , List, LayoutGrid } from 'lucide-react';",
    ", List, LayoutGrid } from 'lucide-react';"
)

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Orders.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed import syntax error")
