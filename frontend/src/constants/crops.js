// Kept in sync with the crop list the fertilizer engine has nutrient targets for
// (backend/fertilizer_engine.py CROP_NUTRIENT_TARGETS).
export const CROP_OPTIONS = [
  'Rice', 'Wheat', 'Maize', 'Sugarcane', 'Cotton', 'Soybean',
  'Chickpea', 'Groundnut', 'Potato', 'Tomato', 'Mustard', 'Sunflower', 'Onion',
]

export const GROWTH_STAGE_OPTIONS = [
  { value: 'sowing',    label: 'Sowing / Land Prep' },
  { value: 'vegetative', label: 'Vegetative Growth' },
  { value: 'flowering', label: 'Flowering / Reproductive' },
  { value: 'maturity',  label: 'Maturity / Pre-Harvest' },
]
