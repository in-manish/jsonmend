import type { FormatOptions } from '../../core'

type Choice = [value: FormatOptions[keyof FormatOptions], label: string]

export type Field = { key: keyof FormatOptions; label: string; help?: string } & (
  | { kind: 'select'; choices: Choice[] }
  | { kind: 'boolean' }
)

export interface Group {
  title: string
  fields: Field[]
}

/** Every user-facing option, grouped as in the spec (section 4.5). */
export const OPTION_GROUPS: Group[] = [
  {
    title: 'Layout',
    fields: [
      {
        key: 'indent',
        label: 'Indent',
        kind: 'select',
        choices: [
          [2, '2 spaces'],
          [4, '4 spaces'],
          ['tab', 'Tab'],
          ['none', 'Minified'],
        ],
      },
      {
        key: 'sortKeys',
        label: 'Sort keys',
        kind: 'select',
        choices: [
          ['none', 'Keep order'],
          ['asc', 'A to Z'],
          ['desc', 'Z to A'],
        ],
      },
      { key: 'sortDeep', label: 'Sort nested objects too', kind: 'boolean' },
      { key: 'ensureAscii', label: 'Escape non-ASCII (ensure_ascii)', kind: 'boolean' },
      { key: 'htmlSafe', label: 'HTML-safe (escape / < > &)', kind: 'boolean' },
    ],
  },
  {
    title: 'Keys',
    fields: [
      {
        key: 'duplicateKeys',
        label: 'Duplicate keys',
        kind: 'select',
        choices: [
          ['last', 'Last wins'],
          ['first', 'First wins'],
          ['suffix', 'Rename (key_2)'],
          ['array', 'Merge into array'],
        ],
      },
      {
        key: 'keyCoercion',
        label: 'Non-string keys',
        kind: 'select',
        choices: [
          ['source', 'Source text'],
          ['json', 'JSON-encode'],
        ],
      },
    ],
  },
  {
    title: 'Numbers',
    fields: [
      {
        key: 'bigNumbers',
        label: 'Integers beyond 2^53',
        kind: 'select',
        choices: [
          ['number', 'Keep as number'],
          ['string', 'Convert to string'],
        ],
      },
      {
        key: 'nonFinite',
        label: 'NaN / Infinity',
        kind: 'select',
        choices: [
          ['null', 'null'],
          ['string', 'String'],
        ],
      },
    ],
  },
  {
    title: 'Python & JS types',
    fields: [
      {
        key: 'datetime',
        label: 'Datetimes',
        kind: 'select',
        choices: [
          ['iso', 'ISO 8601 (+00:00)'],
          ['iso-z', 'ISO 8601 (Z)'],
          ['epoch-s', 'Epoch seconds'],
          ['epoch-ms', 'Epoch milliseconds'],
          ['tagged', 'Tagged {"$datetime"}'],
        ],
      },
      {
        key: 'timedelta',
        label: 'Durations',
        kind: 'select',
        choices: [
          ['iso', 'ISO 8601 (P1DT5S)'],
          ['seconds', 'Total seconds'],
        ],
      },
      {
        key: 'decimal',
        label: 'Decimal',
        kind: 'select',
        choices: [
          ['string', 'String (lossless)'],
          ['number', 'Number'],
          ['tagged', 'Tagged {"$decimal"}'],
        ],
      },
      {
        key: 'bytes',
        label: 'Bytes',
        kind: 'select',
        choices: [
          ['base64', 'Base64'],
          ['utf8', 'UTF-8 text'],
          ['hex', 'Hex'],
          ['array', 'Array of ints'],
        ],
      },
      {
        key: 'setOrder',
        label: 'Sets',
        kind: 'select',
        choices: [
          ['sorted', 'Sorted'],
          ['insertion', 'Source order'],
        ],
      },
      {
        key: 'enumMode',
        label: 'Enums',
        kind: 'select',
        choices: [
          ['name', 'Name (RED)'],
          ['value', 'Value'],
          ['qualified', 'Qualified (Color.RED)'],
        ],
      },
      {
        key: 'complex',
        label: 'Complex numbers',
        kind: 'select',
        choices: [
          ['string', 'String (1+2j)'],
          ['object', '{"re", "im"}'],
        ],
      },
      {
        key: 'objectRepr',
        label: '<object at 0x...>',
        kind: 'select',
        choices: [
          ['string', 'Keep text'],
          ['placeholder', 'Without address'],
          ['null', 'null'],
        ],
      },
      { key: 'typeTag', label: 'Add "__type__" to object reprs', kind: 'boolean' },
      {
        key: 'normalizeDateStrings',
        label: 'Rewrite date-like strings as ISO 8601',
        kind: 'boolean',
      },
    ],
  },
  {
    title: 'Repair',
    fields: [
      {
        key: 'multipleValues',
        label: 'Several top-level values',
        kind: 'select',
        choices: [
          ['array', 'Wrap in array'],
          ['jsonl', 'JSON Lines'],
        ],
      },
      {
        key: 'danglingKey',
        label: 'Key without a value',
        kind: 'select',
        choices: [
          ['null', 'Set to null'],
          ['drop', 'Drop the key'],
        ],
      },
      {
        key: 'truncatedString',
        label: 'String cut off at the end',
        kind: 'select',
        choices: [
          ['close', 'Close it'],
          ['drop', 'Drop it'],
        ],
      },
    ],
  },
]
