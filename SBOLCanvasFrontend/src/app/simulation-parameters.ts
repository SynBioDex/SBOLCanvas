export interface SimulationField {
  key: string;
  type: 'number' | 'boolean' | 'uri';
  label: string;
  default?: number | boolean;
  min?: number;
}

export type SimulationConfig = Record<string, SimulationField[]>;

export interface InteractionRuleSide {
  defaultRole: string;
  roles: string[];
  endpointTypes?: ('species' | 'dna' | 'node')[];
  coefficientDefault?: number;
  fixedCoefficient?: number;
}

export interface InteractionRule {
  source: InteractionRuleSide;
  target: InteractionRuleSide;
  targetless?: boolean;
  maxReactants?: number;
  maxProducts?: number;
  massAction: boolean;
}

export type InteractionRules = Record<string, InteractionRule>;
export type SimulationValue = number | boolean | string;

const DECIMAL_PATTERN = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

export function parseSimulationNumber(raw: unknown, label: string): number {
  let value: number;
  if (typeof raw === 'number') value = raw;
  else if (typeof raw === 'string' && DECIMAL_PATTERN.test(raw.trim())) value = Number(raw.trim());
  else throw new Error(`${label} must be a finite number`);
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number`);
  return value;
}

export function parseSimulationValue(raw: unknown, field: SimulationField): SimulationValue | undefined {
  if (raw === undefined) return undefined;
  if (field.type === 'number') {
    return parseSimulationNumber(raw, field.label);
  }
  if (field.type === 'boolean') {
    if (raw === true || raw === 'true') return true;
    if (raw === false || raw === 'false') return false;
    throw new Error(`${field.label} must be true or false`);
  }
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error(`${field.label} must be a species URI`);
  }
  return raw;
}
