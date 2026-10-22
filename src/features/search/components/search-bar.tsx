import { Search as SearchIcon } from 'lucide-react'
import type { KeyboardEvent, Ref, SyntheticEvent } from 'react'

import { Button } from '#/shared/components/ui/button'
import { Input } from '#/shared/components/ui/input'

type SearchBarProps = {
  /** Accessible name of the search form. */
  formLabel: string
  /** Visually hidden label for the field. */
  label: string
  inputId: string
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  busy: boolean
  /** Combobox wiring for the suggestion list the caller renders. */
  listboxId: string
  open: boolean
  activeDescendantId: string | undefined
  statusId: string
  inputRef?: Ref<HTMLInputElement>
  /** Hint inside the empty field. */
  placeholder?: string
}

/** The medicine search field and Search button, shared by every search on the app. */
export function SearchBar({
  formLabel,
  label,
  inputId,
  value,
  onValueChange,
  onSubmit,
  onKeyDown,
  busy,
  listboxId,
  open,
  activeDescendantId,
  statusId,
  inputRef,
  placeholder = 'Find a Medicine',
}: SearchBarProps): React.JSX.Element {
  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form
      aria-label={formLabel}
      className="flex items-stretch gap-2"
      onSubmit={handleSubmit}
      role="search"
    >
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative min-w-0 flex-1">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary"
        />
        <Input
          aria-activedescendant={activeDescendantId}
          aria-autocomplete="list"
          aria-controls={open ? listboxId : undefined}
          aria-describedby={statusId}
          aria-expanded={open}
          autoComplete="off"
          disabled={busy}
          id={inputId}
          onChange={(event) => {
            onValueChange(event.target.value)
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          ref={inputRef}
          role="combobox"
          type="search"
          value={value}
          variant="search"
        />
      </div>
      <Button className="shrink-0" disabled={busy} size="lg" type="submit">
        {busy ? 'Searching…' : 'Search'}
      </Button>
    </form>
  )
}
