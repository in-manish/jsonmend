/** Preview sizes in CSS pixels (portrait). `fit` fills the pane. */
export interface Device {
  id: string
  label: string
  width: number
  height: number
  kind: 'phone' | 'tablet' | 'desktop'
}

export const FIT = 'fit'

export const DEVICES: Device[] = [
  { id: 'iphone-se', label: 'iPhone SE (375×667)', width: 375, height: 667, kind: 'phone' },
  { id: 'iphone-15', label: 'iPhone 15 (393×852)', width: 393, height: 852, kind: 'phone' },
  {
    id: 'iphone-15-pro-max',
    label: 'iPhone 15 Pro Max (430×932)',
    width: 430,
    height: 932,
    kind: 'phone',
  },
  { id: 'pixel-8', label: 'Pixel 8 (412×915)', width: 412, height: 915, kind: 'phone' },
  { id: 'galaxy-s23', label: 'Galaxy S23 (360×780)', width: 360, height: 780, kind: 'phone' },
  {
    id: 'galaxy-fold',
    label: 'Galaxy Z Fold, folded (280×653)',
    width: 280,
    height: 653,
    kind: 'phone',
  },
  { id: 'ipad-mini', label: 'iPad mini (744×1133)', width: 744, height: 1133, kind: 'tablet' },
  { id: 'ipad-pro', label: 'iPad Pro 11" (834×1194)', width: 834, height: 1194, kind: 'tablet' },
  { id: 'laptop', label: 'Laptop (1280×800)', width: 1280, height: 800, kind: 'desktop' },
]

export const deviceById = (id: string): Device | undefined => DEVICES.find((d) => d.id === id)
