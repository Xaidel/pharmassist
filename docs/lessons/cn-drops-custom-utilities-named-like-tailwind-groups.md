# `cn()` drops a custom utility named like a Tailwind group

`cn()` runs `tailwind-merge`, which resolves conflicts by class-name prefix, not by what a utility actually sets.
A custom `@utility` whose name starts with a Tailwind group prefix is treated as a member of that group, and the earlier class in the same group is removed.

Seen on the home sheet: `bg-card bg-dot-grid` inside `cn()` lost `bg-card`, because `bg-dot-grid` (a `background-image` pattern) was read as another background colour.
The sheet turned transparent, so the map and its attribution showed through it.
The same classes in a plain `className` string worked, which hides the bug until someone wraps them in `cn()`.

```css
/* Bad: collides with bg-* colours under tailwind-merge */
@utility bg-dot-grid { background-image: radial-gradient(...); }

/* Good: a name outside every Tailwind group */
@utility dot-grid { background-image: radial-gradient(...); }
```

Name custom utilities so they do not start with a Tailwind group prefix (`bg-`, `text-`, `border-`, `shadow-`, `p-`, `m-`, …) unless they really replace that group's value; this repo's `h-sheet-*` and `max-h-*` utilities are fine because they do set height.
When a style vanishes after adding `cn()`, check the rendered `className` in the browser for the missing class.
