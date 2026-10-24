// OSRM returns maneuver type/modifier as English keywords (its instruction
// text generator is opt-in and English-only) — this builds the Spanish
// phrases and turn-icon rotation the in-app turn-by-turn screen speaks and
// displays, from those raw keywords.

function sideWord(modifier?: string): string {
  if (!modifier) return '';
  if (modifier.includes('left')) return 'a la izquierda';
  if (modifier.includes('right')) return 'a la derecha';
  return 'derecho';
}

function turnPhrase(modifier?: string): string {
  switch (modifier) {
    case 'uturn':
      return 'Hacé un cambio de sentido';
    case 'sharp left':
      return 'Girá bruscamente a la izquierda';
    case 'left':
      return 'Girá a la izquierda';
    case 'slight left':
      return 'Girá levemente a la izquierda';
    case 'straight':
      return 'Seguí derecho';
    case 'slight right':
      return 'Girá levemente a la derecha';
    case 'right':
      return 'Girá a la derecha';
    case 'sharp right':
      return 'Girá bruscamente a la derecha';
    default:
      return 'Continuá';
  }
}

/** Spanish instruction text for one OSRM step, without a leading distance —
 * the caller prefixes "En 200 m, " / "Ahora, " depending on how close the
 * user is. */
export function buildInstruction(type: string, modifier: string | undefined, streetName: string): string {
  const name = streetName ? ` por ${streetName}` : '';
  switch (type) {
    case 'depart':
      return `Arrancá${name}`;
    case 'arrive':
      return 'Llegaste a destino';
    case 'roundabout':
    case 'rotary':
      return 'Entrá a la rotonda';
    case 'exit roundabout':
    case 'exit rotary':
      return `Salí de la rotonda${name}`;
    case 'merge':
      return `Incorporate${name}`;
    case 'fork':
      return `Mantenete ${sideWord(modifier)} en la bifurcación`;
    case 'end of road':
      return `Al final de la calle, girá ${sideWord(modifier)}`;
    case 'new name':
    case 'continue':
      return `Seguí derecho${name}`;
    case 'turn':
    default:
      return `${turnPhrase(modifier)}${name}`;
  }
}

/** Degrees to rotate a single "straight ahead" arrow icon so it visually
 * points the way of the turn — the same trick GPS apps use instead of
 * shipping a separate icon per turn shape. */
export function maneuverRotationDeg(type: string, modifier?: string): number {
  if (type === 'arrive' || type === 'depart') return 0;
  switch (modifier) {
    case 'uturn':
      return 180;
    case 'sharp left':
      return -120;
    case 'left':
      return -90;
    case 'slight left':
      return -30;
    case 'slight right':
      return 30;
    case 'right':
      return 90;
    case 'sharp right':
      return 120;
    default:
      return 0;
  }
}

export function maneuverIconName(type: string): 'navigate' | 'flag' | 'sync' | 'arrow-up' {
  if (type === 'arrive') return 'flag';
  if (type === 'depart') return 'navigate';
  if (type.includes('roundabout') || type.includes('rotary')) return 'sync';
  return 'arrow-up';
}

/** "En 150 metros" / "Ahora" / "En 1.2 kilómetros" — the distance phrase
 * spoken right before an instruction, rounded to the nearest unit a human
 * actually judges distance in rather than the raw GPS figure. */
export function speakDistancePrefix(meters: number): string {
  if (meters < 30) return 'Ahora';
  if (meters < 150) return `En ${Math.round(meters / 10) * 10} metros`;
  if (meters < 1000) return `En ${Math.round(meters / 50) * 50} metros`;
  return `En ${(meters / 1000).toFixed(1)} kilómetros`;
}
