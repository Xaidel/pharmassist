# A CSS scale on a MapLibre marker element drags it off its coordinate

MapLibre positions every marker by writing an inline `transform` to the element passed as `Marker({ element })`, for example `translate(-50%, -100%) translate(370px, 146px)`.
Tailwind's `scale-110` writes the separate CSS `scale` property.
Individual transforms compose with `transform`, so the scale wraps MapLibre's whole placement around the element's center instead of scaling only the artwork.
The rendered dot lands tens of pixels away from the true coordinate, and because the displacement depends on the projected position, it changes on every zoom and pan.
The symptom is worst on a selected route destination pin: its dot drifts while the route line stays put, so the marker looks inaccurate.

Seen on the results map when the selected pharmacy carried `z-20 scale-110` on the marker element itself.
At one zoom the pin's dot rendered 34 px right and 12 px low of the route endpoint; clearing the element's `scale` snapped the dot exactly onto MapLibre's `translate` point.

```ts
// Bad: the scale composes with MapLibre's positioning transform
new Marker({ element: pinButton }) // pinButton has `scale-110`
```

```ts
// Good: scale an inner wrapper, leave the marker element untransformed
const root = document.createElement('button')
const body = document.createElement('div')
body.className = 'scale-110'
root.append(body)
new Marker({ element: root })
```

Never put `scale-*`, `rotate-*`, `translate-*`, or a custom `transform` on a MapLibre marker element.
Keep stacking (`z-*`), pointer events, and focus rings on the marker element, and put visual scaling or motion on an inner body.
`createCalloutPin` returns that `body` for exactly this purpose.
