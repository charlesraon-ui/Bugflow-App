with open(r'c:\Users\SBSI\source\repos\BugFlow\bugflow\app\dashboard\projects\[id]\page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines, 1):
    # Find all opening and closing divs in the line (simplified, not perfect but works for our case)
    # Iterate through the line character by character to find matches
    j = 0
    while j < len(line):
        # Look for closing div first to avoid false positives
        if line[j:j+6] == '</div>':
            if stack:
                popped = stack.pop()
                print(f"Line {i}: Closed div opened at line {popped[0]} - {popped[1][:50]}")
            else:
                print(f"Line {i}: EXTRA closing div!")
            j += 6
        elif line[j:j+4] == '<div':
            # Find the end of this div tag
            end = line.find('>', j)
            if end != -1:
                div_tag = line[j:end+1]
                # Skip self-closing divs (though we shouldn't have them)
                if not div_tag.endswith('/>'):
                    stack.append((i, div_tag, line.strip()[:80]))
                    print(f"Line {i}: Opened div - {line.strip()[:60]}")
                j = end + 1
            else:
                j += 1
        else:
            j += 1

print(f"\n=== FINAL STACK ===")
print(f"Unclosed divs: {len(stack)}")
for item in stack:
    print(f"  Line {item[0]}: {item[2]}")