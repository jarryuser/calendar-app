import { Check } from 'lucide-react'
import { ALL_COLORS, COLOR_HEX } from '@/utils/colors'
import type { EventColor } from '@/types/event'

interface ColorPickerProps {
  value?: EventColor
  onChange: (color: EventColor) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {ALL_COLORS.map(color => (
        <button
          key={color}
          type="button"
          title={color}
          onClick={() => onChange(color)}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
          style={{ backgroundColor: COLOR_HEX[color] }}
        >
          {value === color && <Check size={12} className="text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  )
}
