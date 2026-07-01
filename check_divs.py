with open('bugflow/app/dashboard/projects/[id]/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Split into tokens with line numbers
lines = content.split('\n')
div_stack = []

for line_num, line in enumerate(lines, 1):
    # Find all <div and </div in this line
    matches = list(re.finditer(r'</?div', line))
    # Sort matches by their position in the line
    matches.sort(key=lambda m: m.start())
    
    for match in matches:
        tag = match.group()
        pos = match.start()
        if tag == '<div':
            div_stack.append((line_num, pos, line.strip()))
            print(f'+ Line {line_num}, pos {pos}: opened div (stack size: {len(div_stack)}) - {line.strip()[:80]}')
        elif tag == '</div':
            if div_stack:
                popped = div_stack.pop()
                print(f'- Line {line_num}, pos {pos}: closed div opened at line {popped[0]} (stack size: {len(div_stack)})')
            else:
                print(f'! Line {line_num}, pos {pos}: EXTRA closing div!')

print(f'\nFinal unclosed divs: {len(div_stack)}')
for i, unclosed in enumerate(div_stack, 1):
    print(f'  {i}. Line {unclosed[0]}: {unclosed[2][:100]}')

