# Supported input

jsonmend accepts a superset of JSON, Python literals and JS object literals. Everything below is
parsed, never executed. Every change it makes is listed in the report.

## Python and JS values

| Input | Default output | Option | Alternatives |
|---|---|---|---|
| `True` / `False` / `None` | `true` / `false` / `null` | | |
| `undefined`, `nil`, `NaT` | `null` | | |
| `NaN`, `Infinity`, `-Infinity`, `nan`, `inf`, `np.nan` | `null` | `nonFinite` | `"NaN"` string |
| `datetime.datetime(2024, 1, 5, 13, 30, tzinfo=datetime.timezone.utc)` | `"2024-01-05T13:30:00+00:00"` | `datetime` | `Z` suffix, epoch seconds, epoch ms, `{"$datetime": ...}` |
| `datetime.date(2024, 1, 5)` | `"2024-01-05"` | `datetime` | epoch, `{"$date": ...}` |
| `datetime.time(13, 30)` | `"13:30:00"` | | |
| `datetime.timedelta(days=1, seconds=5)` | `"P1DT5S"` | `timedelta` | total seconds |
| `Timestamp('2024-01-05 13:30:00')`, `Timedelta('1 days 00:00:05')` (pandas) | ISO string / duration | | |
| `Decimal('1.50')` | `"1.50"` | `decimal` | number, `{"$decimal": ...}` |
| `UUID('...')`, `ObjectId('...')`, `IPv4Address('...')` | string | | |
| `b'abc'`, `bytearray(b'abc')`, `bytes([97])` | `"YWJj"` (base64) | `bytes` | UTF-8 text, hex, array of ints |
| `{1, 2}`, `set()`, `frozenset({...})` | array, sorted when all numbers or all strings | `setOrder` | source order |
| `(1, 2)`, `tuple(...)`, `deque([...])` | array | | |
| `range(1, 5)` | `[1, 2, 3, 4]` (up to 1000 items) | | `{"start", "stop", "step"}` above that |
| `<Color.RED: 1>` | `"RED"` | `enumMode` | value, `"Color.RED"` |
| `PosixPath('/a/b')`, `Path(...)` | `"/a/b"` | | |
| `complex(1, 2)`, `1+2j` | `"1+2j"` | `complex` | `{"re": 1, "im": 2}` |
| `Fraction(1, 3)` | `"1/3"` | | |
| `re.compile('a+')` | `"a+"` | | |
| `np.int64(5)`, `np.float32(1.5)`, `array([1, 2], dtype=int64)` | native number / array | | |
| `OrderedDict([...])`, `defaultdict(<class 'list'>, {...})`, `Counter({...})`, `dict(a=1)`, `namespace(a=1)` | object | | |
| `User(id=1, name='x')` (dataclass, pydantic, namedtuple) | `{"id": 1, "name": "x"}` | `typeTag` | adds `"__type__": "User"` |
| `Point(1, 2)` (positional only) | `[1, 2]` | | |
| `<__main__.User object at 0x7f...>`, `<class 'str'>` | the text as a string | `objectRepr` | `null`, text without the address |
| `...`, `[...]`, `{...}` (Ellipsis, recursive reference) | the text as a string | | |
| `'2024-01-05 13:30:00'` (plain string) | unchanged | `normalizeDateStrings` | ISO 8601 |

### Time zones

`tzinfo` may be any of: `datetime.timezone.utc`, `timezone.utc`, `timezone(timedelta(hours=5, minutes=30))`,
`datetime.timezone(datetime.timedelta(seconds=19800))`, `tzutc()`, `tzoffset(None, 19800)`, `pytz.UTC`,
`<UTC>`, `pytz.FixedOffset(330)`, `zoneinfo.ZoneInfo(key='Asia/Kolkata')`,
`<DstTzInfo 'Asia/Kolkata' IST+5:30:00 STD>`, `gettz('...')`, `tzfile('/usr/share/zoneinfo/...')`.
Named zones are resolved with the browser's time-zone database at the given wall-clock time, so
daylight saving time is handled. Invalid dates (`month=13`, `Feb 29` in a non-leap year) are kept
as their source text and reported.

## Syntax

| Input | Handling |
|---|---|
| `'single'`, `"double"`, `'''triple'''`, backtick and curly quotes | strings |
| `r''`, `b''`, `u''`, `f''` prefixes | raw / bytes / plain strings |
| `\n \t \xNN \uXXXX \U0001F600 \101` and line continuations | decoded |
| `0xFF`, `0o17`, `0b101`, `1_000`, `.5`, `5.`, `+3`, `10n`, `007` | normalized numbers |
| Integers beyond 2^53 | kept digit for digit (option `bigNumbers` can emit strings) |
| Unquoted keys, numeric keys, tuple keys | quoted (option `keyCoercion`) |
| `//`, `/* */`, `#` comments | removed |
| Trailing and extra commas | removed |
| Duplicate keys | option `duplicateKeys`: last wins, first wins, rename, merge |
| pprint's split strings `('aaa' 'bbb')` | joined |

## Structural repair

| Problem | Repair | Severity |
|---|---|---|
| Missing `}` / `]` at the end | added in the right order | warn |
| Missing opening `{` / `[` (`"a":1}`) | added | warn |
| Mismatched closer (`[1, 2 }`) | inner container closed first | warn |
| Stray closer | removed | warn |
| Missing comma / colon | inserted | info / warn |
| Key without a value | `null`, or dropped (`danglingKey`) | warn |
| String cut off at the end | closed, or dropped (`truncatedString`) | warn |
| Literal cut off at the end (`tr`) | completed (`true`) | guess |
| Unescaped quotes inside a string | kept as text | guess |
| Missing end quote at end of line | closed | guess |
| Raw newlines / tabs in strings | escaped | info |
| Several top-level values, NDJSON | array, or JSON Lines (`multipleValues`) | info |
| Top-level `a: 1, b: 2` / `1, 2, 3` | wrapped in `{}` / `[]` | warn / info |
| Anything the parser can't recover | `jsonrepair` fallback | guess |

When any repair is a guess, the output shows a banner and highlights the guessed parts.

## Noise around the data

Markdown code fences, `data = ...;`, `const x: T = ...`, `module.exports =`, `return ...`,
`print(...)`, `console.log(...)`, `JSON.parse(...)`, log prefixes such as
`2024-01-05 12:00:00 INFO main - ...`, `Response: ...`, `[INFO]` tags and trailing prose are
stripped. When the text contains several payloads, the largest is used and the status bar
offers "Payload N of M" to switch.
