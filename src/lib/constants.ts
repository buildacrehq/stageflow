export const STRUCTURE_STAGES = [
  'Foundation 1', 'Foundation 2',
  'GF Lintel', 'GF Roof',
  'FF Lintel', 'FF Roof',
  'SF Lintel', 'SF Roof',
  'TF Lintel', 'TF Roof',
  '4F Lintel', '4F Roof',
]

export const FINISHING_STAGES = [
  'Grills & Frames', 'Electrical 1', 'Plumbing 1',
  'Plastering Int', 'Flooring Procurement', 'Flooring Laying',
  'Plastering Ext', 'Electrical 2', 'Painting 1',
  'Plumbing Fixtures', 'Railings', 'Doors & Windows',
  'Painting 2', 'Handover',
]

export const ALL_STAGES = [...STRUCTURE_STAGES, ...FINISHING_STAGES]

export const STATUS_COLORS = {
  on_time: { bg: 'bg-green-100', text: 'text-green-800', dot: '#3B6D11', badge: 'bg-green-100 text-green-800' },
  buffer:  { bg: 'bg-amber-100', text: 'text-amber-800', dot: '#854F0B', badge: 'bg-amber-100 text-amber-800' },
  delayed: { bg: 'bg-red-100',   text: 'text-red-800',   dot: '#A32D2D', badge: 'bg-red-100 text-red-800' },
  no_data: { bg: 'bg-gray-50',   text: 'text-gray-400',  dot: '#9CA3AF', badge: 'bg-gray-100 text-gray-500' },
}

export const CHART_COLORS = {
  primary:  '#3B82F6',
  green:    '#22C55E',
  amber:    '#F59E0B',
  red:      '#EF4444',
  target:   '#EF4444',
  purple:   '#8B5CF6',
  teal:     '#14B8A6',
}
