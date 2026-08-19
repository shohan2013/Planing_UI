export interface IProcessStepInput {
  lineId: number;
  stepName: string;
  startDate: string | null;
  endDate: string | null;
  machineNumber: string;
}

export const PRODUCTION_STEPS: string[] = [
  'Body Ball',
  'HSP Blunger',
  'Primary Blunger',
  'Secondary Blunger',
  'Clay Roll',
  'Jiggering',
  'Casting',
  'Biscuit Klin',
  'Glaze',
];
