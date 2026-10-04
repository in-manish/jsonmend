export interface Sample {
  id: string
  label: string
  text: string
}

export const SAMPLES: Sample[] = [
  {
    id: 'python',
    label: 'Python dict with datetime',
    text: `{'id': 42,
 'created': datetime.datetime(2024, 1, 5, 13, 30, tzinfo=datetime.timezone.utc),
 'price': Decimal('9.99'),
 'tags': {'sale', 'new'},
 'owner': UUID('0f8fad5b-d9cb-469f-a165-70867728950e'),
 'active': True,
 'notes': None}`,
  },
  {
    id: 'truncated',
    label: 'Truncated JSON',
    text: '{"users": [{"id": 1, "name": "Ada"}, {"id": 2, "name": "Grace", "roles": ["admin", "dev"',
  },
  {
    id: 'js',
    label: 'JS object literal',
    text: `const config = {
  // server settings
  host: 'localhost',
  port: 8080,
  features: ['auth', 'cache',],
  retry: { attempts: 3, backoff: 1.5, },
};`,
  },
  {
    id: 'log',
    label: 'Log line with payload',
    text: `2024-01-05 13:30:00,123 INFO api.views - response={'status': 'ok', 'items': [1, 2, 3], 'next': None}`,
  },
  {
    id: 'pandas',
    label: 'pandas / numpy repr',
    text: `{'ts': Timestamp('2024-01-05 13:30:00'), 'mean': np.float64(1.5), 'counts': array([3, 1, 2]), 'missing': nan}`,
  },
  {
    id: 'dataclass',
    label: 'Dataclass & enum repr',
    text: `Order(id=7, status=<Status.PAID: 'paid'>, user=User(id=1, email='a@b.c'), total=Decimal('19.90'))`,
  },
  {
    id: 'ndjson',
    label: 'NDJSON lines',
    text: '{"event":"login","user":1}\n{"event":"view","user":1,"page":"/home"}\n{"event":"logout","user":1}',
  },
]
