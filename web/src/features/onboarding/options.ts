export const RELATIONSHIP_OPTIONS = [
  {
    value: 'relationship',
    title: 'A relationship',
    body: 'Something real and committed.'
  },
  {
    value: 'life-partner',
    title: 'A life partner',
    body: 'Long-term, serious and future-focused.'
  },
  {
    value: 'intentional-dating',
    title: 'Dating with intention',
    body: 'Open-minded, but not here to waste time.'
  },
  {
    value: 'open-genuine',
    title: 'Something genuine',
    body: 'Open to seeing where the right connection goes.'
  }
] as const

export const LOOKING_FOR_OPTIONS = [
  {
    value: 'women',
    label: 'Women'
  },
  {
    value: 'men',
    label: 'Men'
  },
  {
    value: 'everyone',
    label: 'Everyone'
  }
] as const

export const LIFESTYLE_OPTIONS = [
  {
    value: 'social',
    label: 'Social butterfly'
  },
  {
    value: 'homebody',
    label: 'Cosy nights'
  },
  {
    value: 'fitness',
    label: 'Fitness'
  },
  {
    value: 'food',
    label: 'Food lover'
  },
  {
    value: 'travel',
    label: 'Travel'
  },
  {
    value: 'outdoors',
    label: 'Outdoors'
  },
  {
    value: 'culture',
    label: 'Culture'
  },
  {
    value: 'family',
    label: 'Family time'
  }
] as const

export const CHEMISTRY_OPTIONS = [
  {
    value: 'banter',
    title: 'Make me laugh',
    body: 'Playful chemistry and effortless banter.'
  },
  {
    value: 'deep-talk',
    title: 'Talk until 2am',
    body: 'Depth, curiosity and conversations that go somewhere.'
  },
  {
    value: 'affection',
    title: 'Warm and affectionate',
    body: 'Kindness, closeness and feeling genuinely wanted.'
  },
  {
    value: 'adventure',
    title: 'Let’s go somewhere',
    body: 'Spontaneity, energy and doing things together.'
  }
] as const

export const DEAL_BREAKER_OPTIONS = [
  {
    value: 'relationship-goals',
    label: 'Different relationship goals'
  },
  {
    value: 'smoking',
    label: 'Smoking'
  },
  {
    value: 'children',
    label: 'Different plans for children'
  },
  {
    value: 'distance',
    label: 'Long-distance only'
  },
  {
    value: 'non-monogamy',
    label: 'Non-monogamy'
  },
  {
    value: 'lifestyle',
    label: 'Major lifestyle mismatch'
  }
] as const

export type RelationshipIntent =
  typeof RELATIONSHIP_OPTIONS[number]['value']

export type MatchPreference =
  typeof LOOKING_FOR_OPTIONS[number]['value']

export type LifestyleSignal =
  typeof LIFESTYLE_OPTIONS[number]['value']

export type ChemistryStyle =
  typeof CHEMISTRY_OPTIONS[number]['value']

export type DealBreaker =
  typeof DEAL_BREAKER_OPTIONS[number]['value']
