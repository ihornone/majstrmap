export interface PlacedMaster<T = unknown> {
  master: T;
  x: number;
  y: number;
}

export interface PlacementResult<T = unknown> {
  placed: PlacedMaster<T>[];
  radius: number;
}

type Point = { x: number; y: number };

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function parseSvgPathToPoints(d: string): Point[] {
  const tokens = d.match(/([a-df-z]|[-+]?[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?)/gi) || [];
  const points: Point[] = [];
  let curX = 0;
  let curY = 0;
  let cmd = '';
  let i = 0;
  const num = (token: string | undefined): number => parseFloat(token ?? '');

  while (i < tokens.length) {
    const t = tokens[i] ?? '';
    if (/^[a-z]$/i.test(t)) {
      cmd = t;
      i++;
    }

    switch (cmd) {
      case 'M':
      case 'L': {
        curX = num(tokens[i++]);
        curY = num(tokens[i++]);
        points.push({ x: curX, y: curY });
        break;
      }
      case 'm':
      case 'l': {
        curX += num(tokens[i++]);
        curY += num(tokens[i++]);
        points.push({ x: curX, y: curY });
        break;
      }
      case 'H': {
        curX = num(tokens[i++]);
        points.push({ x: curX, y: curY });
        break;
      }
      case 'h': {
        curX += num(tokens[i++]);
        points.push({ x: curX, y: curY });
        break;
      }
      case 'V': {
        curY = num(tokens[i++]);
        points.push({ x: curX, y: curY });
        break;
      }
      case 'v': {
        curY += num(tokens[i++]);
        points.push({ x: curX, y: curY });
        break;
      }
      case 'Z':
      case 'z': {
        break;
      }
      default: {
        i++;
      }
    }
  }

  return points;
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    if (!pi || !pj) continue;
    const xi = pi.x;
    const yi = pi.y;
    const xj = pj.x;
    const yj = pj.y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

function circleInsidePolygon(center: Point, radius: number, polygon: Point[]): boolean {
  if (!pointInPolygon(center, polygon)) {
    return false;
  }

  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const px = center.x + Math.cos(angle) * radius;
    const py = center.y + Math.sin(angle) * radius;
    if (!pointInPolygon({ x: px, y: py }, polygon)) {
      return false;
    }
  }

  return true;
}

function polygonArea(polygon: Point[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    if (!a || !b) continue;
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area / 2);
}

function computeAdaptiveRadius(
  count: number,
  area: number,
  viewBox: ViewBox
): number {
  const usableArea = area * 0.5;
  const cellPerMarker = usableArea / Math.max(count, 1);

  const radius = Math.sqrt(cellPerMarker) / 2.35;

  const maxRadius = Math.min(viewBox.width, viewBox.height) * 0.075;
  const minRadius = Math.min(viewBox.width, viewBox.height) * (count > 100 ? 0.002 : 0.008);

  return Math.max(minRadius, Math.min(maxRadius, radius));
}

interface Grid {
  step: number;
  cols: number;
  rows: number;
  inside: Uint8Array;
}

function buildGrid(
  polygon: Point[],
  radius: number,
  minDist: number,
  viewBox: ViewBox
): Grid {
  const step = minDist;
  const cols = Math.floor(viewBox.width / step) + 1;
  const rows = Math.floor(viewBox.height / step) + 1;
  const inside = new Uint8Array(cols * rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = viewBox.x + col * step;
      const py = viewBox.y + row * step;
      inside[row * cols + col] = circleInsidePolygon({ x: px, y: py }, radius, polygon) ? 1 : 0;
    }
  }

  return { step, cols, rows, inside };
}

export function placeMastersWithoutCollision<
  T extends { x: number; y: number; rating?: number }
>(
  masters: T[],
  regionPath: string,
  viewBox: ViewBox
): { placed: { master: T; x: number; y: number }[]; radius: number } {
  const polygon = parseSvgPathToPoints(regionPath);

  if (polygon.length === 0 || masters.length === 0) {
    return { placed: [], radius: 3 };
  }

  const area = polygonArea(polygon);

  const sorted = [...masters].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  let radius = computeAdaptiveRadius(masters.length, area, viewBox);
  const minRadius = Math.min(viewBox.width, viewBox.height) * (masters.length > 100 ? 0.002 : 0.008);

  let best: { placed: { master: T; x: number; y: number }[]; radius: number } | null = null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const gap = Math.max(radius * 0.4, Math.min(viewBox.width, viewBox.height) * 0.004);
    const minDist = radius * 2 + gap;
    const grid = buildGrid(polygon, radius + Math.min(0.9, radius * 0.15), minDist, viewBox);

    const candidates: Point[] = [];
    for(let index=0;index<grid.inside.length;index++)if(grid.inside[index])candidates.push({x:viewBox.x+(index%grid.cols)*grid.step,y:viewBox.y+Math.floor(index/grid.cols)*grid.step});
    const distances = new Float64Array(candidates.length).fill(Infinity);
    const used = new Uint8Array(candidates.length);
    const placed: { master: T; x: number; y: number }[] = [];
    const seed = sorted[0];
    if (!seed) break;
    let next = 0, initialDistance = Infinity;
    candidates.forEach((point,index)=>{const distance=(point.x-seed.x)**2+(point.y-seed.y)**2;if(distance<initialDistance){initialDistance=distance;next=index;}});
    for(let i=0;i<Math.min(sorted.length,candidates.length);i++){
      const master=sorted[i];
      const point=candidates[next];
      if(!master||!point)break;
      used[next]=1;
      placed.push({master,x:point.x,y:point.y});
      let farthest=-1;
      for(let j=0;j<candidates.length;j++){
        if(used[j])continue;
        const candidate=candidates[j];
        if(!candidate)continue;
        const distance=(candidate.x-point.x)**2+(candidate.y-point.y)**2;
        const closest=Math.min(distances[j]??Infinity,distance);
        distances[j]=closest;
        if(closest>farthest){farthest=closest;next=j;}
      }
    }
    const unresolved=sorted.length-placed.length;

    best = { placed, radius };

    if (unresolved === 0) {
      return best;
    }

    const nextRadius = radius * 0.8;
    if (nextRadius < minRadius) {
      break;
    }
    radius = Math.max(minRadius, nextRadius);
  }

  return best ?? { placed: [], radius: minRadius };
}
