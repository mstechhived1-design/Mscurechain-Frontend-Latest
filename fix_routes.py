import os
import re

target_files = [
    'app/[hospitalId]/(portals)/hospital-admin/nurses/create/page.tsx',
    'app/[hospitalId]/(portals)/hospital-admin/doctors/[id]/page.tsx',
    'app/[hospitalId]/(portals)/hospital-admin/doctors/edit/page.tsx',
    'app/[hospitalId]/(portals)/hospital-admin/helpdesks/page.tsx',
    'app/[hospitalId]/(portals)/hospital-admin/helpdesks/create/page.tsx',
    'app/[hospitalId]/(portals)/hospital-admin/helpdesks/[helpdeskId]/edit/page.tsx',
]

for filepath in target_files:
    if not os.path.exists(filepath): 
        print(f"Skipping {filepath} - not found")
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content

    # Add usePathname to import
    if 'usePathname' not in content:
        content = content.replace('from "next/navigation"', ', usePathname } from "next/navigation"').replace('import { useRouter', 'import { useRouter, usePathname')
        content = content.replace("from 'next/navigation'", ", usePathname } from 'next/navigation'").replace('import { useRouter', 'import { useRouter, usePathname')
        # deduplicate if it added it twice
        content = content.replace('usePathname, usePathname', 'usePathname')

    # Add basePath after useRouter()
    if 'const basePath =' not in content:
        content = re.sub(
            r'(const router = useRouter\(\);)', 
            r'\1\n  const pathname = usePathname();\n  const basePath = pathname.includes("/hr") ? "/hr" : "/hospital-admin";', 
            content
        )
    
    # Replace hardcoded hospital-admin paths inside router.push
    content = re.sub(r'router\.push\([`\']/hospital-admin/([^`\']+)[`\']\)', r'router.push(`${basePath}/\1`)', content)
    content = re.sub(r'router\.push\(getPath\([`\']/hospital-admin/([^`\']+)[`\']\)\)', r'router.push(getPath(`${basePath}/\1`))', content)
    
    # Replace `/${hospitalId}/hospital-admin/...`
    content = re.sub(r'router\.push\([`\']/\$\{hospitalId\}/hospital-admin/([^`\']+)[`\']\)', r'router.push(`/${hospitalId}${basePath}/\1`)', content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"No changes needed for {filepath}")
