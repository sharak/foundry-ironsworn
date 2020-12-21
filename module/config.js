export const IRONSWORN = {};


IRONSWORN.difficulties = {
    '12': 'DIFFICULTY.Troublesome',
    '8': 'DIFFICULTY.Dangerous',
    '4': 'DIFFICULTY.Formidable',
    '2': 'DIFFICULTY.Extreme',
    '1': 'DIFFICULTY.Epic',
}

IRONSWORN.nextLevel = {
    'DIFFICULTY.Troublesome': '8',
    'DIFFICULTY.Dangerous': '4',
    'DIFFICULTY.Formidable': '2',
    'DIFFICULTY.Extreme': '1',
    'DIFFICULTY.Epic': '1',
}

IRONSWORN.experience = {
    'DIFFICULTY.Epic': 5,
    'DIFFICULTY.Extreme': 4,
    'DIFFICULTY.Formidable': 3,
    'DIFFICULTY.Dangerous': 2,
    'DIFFICULTY.Troublesome': 1,
}
