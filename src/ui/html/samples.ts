export const HTML_SAMPLES = [
  {
    id: 'page',
    label: 'Minified page',
    text: '<!doctype html><html><head><meta charset="utf-8"><title>Hello</title><style>body{font-family:sans-serif;margin:2rem}.card{border:1px solid #ccc;padding:1rem;border-radius:8px}</style></head><body><div class="card"><h1>Hello, <em>world</em></h1><p>This page was minified onto one line. Format it to read it, then switch to Preview to see it rendered.</p><ul><li>One</li><li>Two <b>bold</b></li><li><a href="https://example.com">A link</a></li></ul></div></body></html>',
  },
  {
    id: 'django',
    label: 'Django template (valid)',
    text: `{% extends "base.html" %}
{% load i18n static %}
{% block content %}
<div class="list {% if compact %}compact{% endif %}"><h1>{% trans "Orders" %}</h1>
{% for order in orders %}<article class="order" data-id="{{ order.pk }}"><a href="{% url 'order-detail' order.pk %}">{{ order.title|default:"Untitled" }}</a>
{% if order.paid %}<span class="badge">Paid</span>{% elif order.pending %}<span class="badge">Pending</span>{% else %}<span class="badge">Unpaid</span>{% endif %}</article>
{% empty %}<p>No orders yet.</p>{% endfor %}
</div>
{% endblock content %}
`,
  },
  {
    id: 'django-broken',
    label: 'Django template (with errors)',
    text: `{% extends "base.html" %}
{% block content %}
<ul>
{% for item in items %}
  <li class="{% if item.active %}on{% endif %}">{{ item.name }</li>
  {% if item.tags %}
    <span>{{ item.tags|join:", " }}</span>
{% endfor %}
</ul>
{% else if user.is_staff %}
<p>Staff</p>
{% endblock %}
`,
  },
] as const
