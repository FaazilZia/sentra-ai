import os
import re

def fix_file(path):
    if not os.path.exists(path):
        return
    with open(path, 'r') as f:
        content = f.read()

    original_content = content

    # 1. Fix datetime.UTC -> timezone.utc
    if "from datetime import UTC" in content:
        content = content.replace("from datetime import UTC, datetime, timedelta", "from datetime import datetime, timedelta, timezone")
        content = content.replace("from datetime import UTC, datetime", "from datetime import datetime, timezone")
        content = content.replace("UTC", "timezone.utc")

    # 2. Fix 'TYPE | None' -> 'Optional[TYPE]'
    # Using more specific regex to avoid mangling imports and only target type hints
    content = re.sub(r'([a-zA-Z0-9_\[\], ]+)\s*\|\s*None', r'Optional[\1]', content)
    
    # 3. Fix 'TYPE | TYPE' -> 'Union[TYPE, TYPE]'
    content = re.sub(r'([a-zA-Z0-9_\[\], ]+)\s*\|\s*([a-zA-Z0-9_\[\], ]+)', r'Union[\1, \2]', content)

    # 4. Fix generics dict[] -> Dict[], list[] -> List[], tuple[] -> Tuple[]
    content = re.sub(r'\bdict\[', 'Dict[', content)
    content = re.sub(r'\blist\[', 'List[', content)
    content = re.sub(r'\btuple\[', 'Tuple[', content)

    # 5. Fix SQLAlchemy Mapped[Optional[T]] issue (if mangled or needed)
    # Ensure Mapped is the outer generic
    content = re.sub(r'Optional\[\s*Mapped\[\s*([a-zA-Z0-9_]+)\s*\]\s*\]', r'Mapped[Optional[\1]]', content)

    # 6. Ensure typing imports exist IF we used them
    needs_typing = ["Optional", "Union", "Dict", "List", "Tuple", "Annotated", "Any"]
    used_typing = [t for t in needs_typing if f"{t}[" in content]
    
    if used_typing:
        if "from typing import" in content:
            typing_line_match = re.search(r'from typing import (.+)', content)
            if typing_line_match:
                typing_line = typing_line_match.group(0)
                existing_types = [t.strip() for t in typing_line.split("import")[1].split(",")]
                new_types = sorted(list(set(existing_types + used_typing)))
                new_typing_line = f"from typing import {', '.join([nt for nt in new_types if nt])}"
                content = content.replace(typing_line, new_typing_line)
        else:
            content = f"from typing import {', '.join(used_typing)}\n" + content

    if content != original_content:
        with open(path, 'w') as f:
            f.write(content)

# Walk directory
base_dir = "/Users/mohammadfaazilzia/Desktop/Sentra AI/backend/app"
for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            # Skip core files we already surgically fixed
            if any(core in path for core in ["core/security.py", "core/config.py", "core/dependencies.py", "core/errors.py"]):
                continue
            fix_file(path)
