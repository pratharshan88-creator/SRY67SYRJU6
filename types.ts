
export enum MeasurementMode {
  DISTANCE = 'DISTANCE',
  POINT = 'POINT',
  LINE = 'LINE',
  TRIANGLE = 'TRIANGLE',
  RECTANGLE = 'RECTANGLE',
  POLYGON = 'POLYGON',
  CIRCLE = 'CIRCLE',
  AREA = 'AREA',
  LIVE_AI = 'LIVE_AI',
  WHITEBOARD = 'WHITEBOARD'
}

export enum Unit {
  MM = 'mm',
  CM = 'cm',
  M = 'm',
  IN = 'in',
  FT = 'ft'
}

export interface Point {
  x: number; // Percentage 0-1 of image width
  y: number; // Percentage 0-1 of image height
  id: string;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

export interface MeasurementResult {
  label: string;
  value: number;
  unit: Unit;
}

export interface Transformation {
  x: number;
  y: number;
  scale: number;
}
