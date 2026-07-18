import re

files = [
    "apps/web/app/cards/confirmation/page.tsx",
    "apps/web/app/cards/page.tsx",
    "apps/web/app/signup/page.tsx",
    "apps/web/app/onboarding/page.tsx",
    "apps/web/app/wallet/page.tsx",
    "apps/web/app/login/page.tsx",
    "apps/web/app/inventory/page.tsx",
    "apps/web/app/admin/cards/page.tsx",
    "apps/web/app/admin/loans/page.tsx",
    "apps/web/app/admin/settings/page.tsx",
    "apps/web/app/admin/marketplace/page.tsx",
    "apps/web/app/offtaker/login/page.tsx",
    "apps/web/app/offtaker/demands/page.tsx",
    "apps/web/app/loans/committee/page.tsx",
    "apps/web/app/loans/page.tsx",
    "apps/web/app/error.tsx",
    "apps/web/app/marketplace/page.tsx",
    "apps/web/app/global-error.tsx",
    "apps/web/components/Nav.tsx",
]

pattern = re.compile(
    r"<div\s+style=\{\{\s*width:\s*(\d+),\s*height:\s*(\d+),\s*borderRadius:\s*(\d+),\s*background:\s*'#8a1414'\s*\}\}\s*/>"
)

def replacement(m):
    w, h, r = m.group(1), m.group(2), m.group(3)
    return (
        f'<img src="/logo.svg" alt="Trecco" width={{{w}}} height={{{h}}} '
        f'style={{{{ borderRadius: {r} }}}} />'
    )

results = []
for rel_path in files:
    try:
        with open(rel_path, "r") as f:
            content = f.read()
    except FileNotFoundError:
        results.append((rel_path, "FILE NOT FOUND"))
        continue

    new_content, count = pattern.subn(replacement, content)
    if count == 0:
        results.append((rel_path, "NO MATCH — needs manual look"))
        continue

    with open(rel_path, "w") as f:
        f.write(new_content)
    results.append((rel_path, f"replaced {count} occurrence(s)"))

for path, status in results:
    print(f"{status:45s} {path}")
