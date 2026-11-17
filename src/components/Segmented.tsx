interface SegmentedProps<T extends string> {
  legend: string
  name: string
  options: { value: T; label: string }[]
  // Uncontrolled (read through FormData) with defaultValue, or controlled with value + onChange.
  defaultValue?: T
  value?: T
  onChange?: (value: T) => void
}

// Native radio group styled as a segmented control: arrow keys, labels and form submission work out of the box.
export function Segmented<T extends string>({
  legend,
  name,
  options,
  defaultValue,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <fieldset className="segmented">
      <legend>{legend}</legend>
      <div className="segmented-track">
        {options.map((option) => (
          <label key={option.value} className="segment">
            <input
              type="radio"
              name={name}
              value={option.value}
              {...(value === undefined
                ? { defaultChecked: option.value === defaultValue }
                : { checked: option.value === value, onChange: () => onChange?.(option.value) })}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
