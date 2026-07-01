with open('bugflow/app/dashboard/projects/[id]/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("=== Lines 800-900 ===")
for i in range(799, 900):
    print(f"{i+1:4}: {lines[i].rstrip()}")

print("\n=== Checking all JSX tags ===")
tag_stack = []
import re
tag_pattern = re.compile(r'</?([a-zA-Z0-9]+)[^>]*>?')

for line_num, line in enumerate(lines, 1):
    matches = list(tag_pattern.finditer(line))
    for match in matches:
        tag_full = match.group(0)
        tag_name = match.group(1)
        is_closing = tag_full.startswith('</')
        if is_closing:
            if tag_stack and tag_stack[-1][0] == tag_name:
                popped = tag_stack.pop()
                # print(f"Line {line_num}: closed {tag_name} (opened at {popped[1]})")
            else:
                print(f"WARNING Line {line_num}: closing {tag_name} but stack is {[t[0] for t in tag_stack]}")
        else:
            # Self-closing tags
            if tag_full.endswith('/>') or tag_name in ['br', 'hr', 'img', 'input', 'meta', 'link']:
                continue
            tag_stack.append((tag_name, line_num, line.strip()[:80]))

print(f"\n=== Unclosed tags: {len(tag_stack)} ===")
for i, (tag, line_num, text) in enumerate(tag_stack, 1):
    print(f"{i:2}. Line {line_num:4}: <{tag}> - {text}")