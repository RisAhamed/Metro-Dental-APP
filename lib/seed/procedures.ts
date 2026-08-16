import { proceduresData, type SeedProcedure } from './proceduresData';

export type { SeedProcedure } from './proceduresData';

export const defaultProcedures: SeedProcedure[] = proceduresData;

export const DEFAULT_PROCEDURES_COUNT = proceduresData.length;