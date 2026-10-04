const handleAdjectives = [
  'agile',
  'calme',
  'fidèle',
  'libre',
  'limpide',
  'paisible',
  'rapide',
  'simple',
  'solaire',
  'stable',
  'tendre',
  'tranquille',
  'vaste',
] as const

const handleNouns = [
  'aurore',
  'brume',
  'boussole',
  'canopée',
  'ciel',
  'étoile',
  'forêt',
  'horizon',
  'lagon',
  'lumière',
  'nuage',
  'océan',
  'passage',
  'phare',
  'rivage',
  'sentier',
  'source',
  'voyage',
] as const

const suffixAlphabet = 'abcdefghjkmnpqrstuvwxyz23456789'

function slugWord(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
}

function randomIndex(length: number) {
  const value = new Uint32Array(1)
  crypto.getRandomValues(value)
  return Math.floor((value[0]! / 0x1_0000_0000) * length)
}

export function generateReadableAccountHandle() {
  const adjective = slugWord(handleAdjectives[randomIndex(handleAdjectives.length)]!)
  const noun = slugWord(handleNouns[randomIndex(handleNouns.length)]!)
  let suffix = ''
  for (let index = 0; index < 4; index += 1) suffix += suffixAlphabet[randomIndex(suffixAlphabet.length)]
  return `${adjective}-${noun}-${suffix}`
}

export function isReadableAccountHandleUniqueConflict(error: unknown) {
  return error instanceof Error && /unique constraint failed:\s*users\.handle/i.test(error.message)
}
