# A `Button` positioned with translate jumps away when pressed

The shared `Button` has `active:translate-y-px` for a pressed feel.
Tailwind's translate utilities all write the same `translate` property, so on `:active` the press value replaces any positioning translate passed in `className`.

Seen on the results sheet's full-view button, centred with `top-1/2 -translate-y-1/2`: on mouse down the button dropped about 20 px, the pointer was released over the drag handle beneath it, and the browser fired `click` on their common parent instead of either button.
Nothing happened, while a scripted `element.click()` worked because it has no pressed state, so a quick JS check falsely passes.

```tsx
// Bad: the press effect cancels the centring translate
<Button className="absolute right-3 top-1/2 -translate-y-1/2" size="icon" />

// Good: position without translate
<Button className="absolute right-3 top-2" size="icon" />
```

Position a `Button` with `top`/`inset`, flex, or grid instead of translate.
When a control ignores real clicks but passes `element.click()`, log `pointerdown`, `pointerup`, and `click` targets in the capture phase: a pointerup on a different element means the control moved under the pointer.
