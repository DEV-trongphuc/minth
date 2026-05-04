import re

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("import { Package, Plus, Edit, Trash2, Search, Droplets, Box, Layers, AlertTriangle } from 'lucide-react';", 
                          "import { Package, Plus, Edit, Trash2, Search, Droplets, Box, Layers, AlertTriangle, ChevronDown } from 'lucide-react';")

with open("F:\\HAMIEN_LUCCY\\src\\pages\\Products.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Imported ChevronDown")
