
import { Point, Unit } from '../types';

export const UNIT_FACTORS: Record<Unit, number> = {
  [Unit.MM]: 10,
  [Unit.CM]: 1,
  [Unit.M]: 0.01,
  [Unit.IN]: 0.393701,
  [Unit.FT]: 0.0328084,
};

// Simple scale factor for demonstration: 100 pixels in original image = 10 cm
// In a real app, this would be calibrated by the user.
export const DEFAULT_PIXELS_PER_CM = 20;

export function calculateDistance(p1: Point, p2: Point, imgWidth: number, imgHeight: number): number {
  const dx = (p1.x - p2.x) * imgWidth;
  const dy = (p1.y - p2.y) * imgHeight;
  const pixelDistance = Math.sqrt(dx * dx + dy * dy);
  return pixelDistance / DEFAULT_PIXELS_PER_CM;
}

export function convertValue(cmValue: number, toUnit: Unit): number {
  return cmValue * UNIT_FACTORS[toUnit];
}

export function formatValue(value: number, unit: Unit, isArea = false): string {
  const suffix = isArea ? `${unit}²` : unit;
  return `${value.toFixed(1)} ${suffix}`;
}

export function calculatePolygonArea(points: Point[], imgWidth: number, imgHeight: number): number {
  if (points.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    area += (p1.x * imgWidth * p2.y * imgHeight) - (p2.x * imgWidth * p1.y * imgHeight);
  }
  
  const pixelArea = Math.abs(area) / 2;
  // Area conversion: (pixelArea / pixels_per_cm^2)
  return pixelArea / (DEFAULT_PIXELS_PER_CM * DEFAULT_PIXELS_PER_CM);
}

export function getCircleParams(center: Point, edge: Point, imgWidth: number, imgHeight: number) {
  const radius = calculateDistance(center, edge, imgWidth, imgHeight);
  const area = Math.PI * radius * radius;
  return { radius, area };
}
