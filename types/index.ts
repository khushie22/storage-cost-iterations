import { StorageType, ReplicationType } from '@/lib/pricing';
import { TierAllocation, TransactionInputs } from '@/lib/costCalculator';

export interface Database {
  id: string;
  name: string;
  totalSizeTB: number;
  tierAllocation: TierAllocation;
  transactions: TransactionInputs;
}

export interface AppState {
  storageType: StorageType;
  replication: ReplicationType;
  numberOfDatabases: number;
  databases: Database[];
  showResults: boolean;
}



