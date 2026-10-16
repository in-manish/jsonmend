export const PY_SAMPLES: { id: string; label: string; text: string }[] = [
  {
    id: 'tabs',
    label: 'Tab-indented function',
    text: 'def average(values):\n\ttotal = 0\n\tfor v in values:\n\t\ttotal += v\n\tif values:\n\t\treturn total / len(values)\n\treturn 0\n\nprint(average([1, 2, 3]))\n',
  },
  {
    id: 'mixed',
    label: 'Mixed tabs and spaces',
    text: 'def greet(name):\n    if name:\n\tprint("Hello", name)\n    else:\n        print("Hello")\n\ngreet("Ada")\n',
  },
  {
    id: 'two',
    label: '2-space indentation',
    text: 'class Counter:\n  def __init__(self):\n    self.n = 0\n\n  def inc(self):\n    self.n += 1\n    return self.n\n\nc = Counter()\nprint(c.inc())\n',
  },
  {
    id: 'method',
    label: 'Indented method (pasted from a class)',
    text: '    def total(self, items):\n        result = 0\n        for item in items:\n            result += item.price\n        return result\n',
  },
]
