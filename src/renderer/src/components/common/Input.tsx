interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
  type?: string
}

export default function Input({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  type = 'text'
}: Props) {
  const cls =
    'w-full rounded-lg border border-cream-dark bg-white px-4 py-2.5 text-text-dark outline-none focus:border-blue-accent focus:ring-1 focus:ring-blue-accent transition-colors'

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text-gray">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={cls + ' resize-none'}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </label>
  )
}
