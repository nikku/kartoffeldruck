---
---

<!-- macro definition -->
{% macro hello(name) %}
<h1>Hello {{ name }}!</h1>
{% endmacro %}

<!-- content -->
{{ hello('World') }}
