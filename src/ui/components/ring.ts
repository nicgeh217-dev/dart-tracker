const SIZE = 176;
const RADIUS = 76;
const STROKE = 14;
const SEGMENTS = 20;
const GAP = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** zuletzt gezeigter Fortschritt je Schlüssel, damit der Ring von dort aus weiterläuft */
const lastProgress = new Map<string, number>();

const NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

/** Abwechselnd rote und grüne Segmente wie der Rand eines Dartboards. */
function segments(opacity: string, mask?: string): SVGGElement {
  const segment = CIRCUMFERENCE / SEGMENTS;
  const dash = segment - GAP;
  const group = svg('g', { opacity, ...(mask ? { mask: `url(#${mask})` } : {}) });
  const colors: [string, number][] = [
    ['var(--red)', 0],
    ['var(--green)', -segment],
  ];
  for (const [color, offset] of colors) {
    group.append(
      svg('circle', {
        cx: String(SIZE / 2),
        cy: String(SIZE / 2),
        r: String(RADIUS),
        fill: 'none',
        'stroke-width': String(STROKE),
        'stroke-dasharray': `${dash} ${segment * 2 - dash}`,
        'stroke-dashoffset': String(offset),
        style: `stroke: ${color}`,
      }),
    );
  }
  return group;
}

const dashFor = (progress: number) => `${progress * CIRCUMFERENCE} ${CIRCUMFERENCE}`;

/** Tacho-Ring: helle Segmente bis zum Fortschritt, der Rest gedimmt. */
export function createRing(key: string, progress: number): SVGSVGElement {
  const previous = lastProgress.get(key) ?? progress;
  lastProgress.set(key, progress);

  const reveal = svg('circle', {
    cx: String(SIZE / 2),
    cy: String(SIZE / 2),
    r: String(RADIUS),
    fill: 'none',
    stroke: '#fff',
    'stroke-width': String(STROKE + 4),
    style: `stroke-dasharray: ${dashFor(previous)}; transition: stroke-dasharray 600ms var(--ease)`,
  });

  const root = svg('svg', {
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    class: 'ring-graphic',
    'aria-hidden': 'true',
  });
  root.append(
    svg('defs', {}),
    segments('0.2'),
    segments('1', 'ring-reveal'),
  );
  const mask = svg('mask', { id: 'ring-reveal' });
  mask.append(reveal);
  root.querySelector('defs')!.append(mask);

  if (previous !== progress) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        reveal.style.strokeDasharray = dashFor(progress);
      }),
    );
  }
  return root;
}
