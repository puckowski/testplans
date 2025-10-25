export interface TestPlanExecution {
  id?: number;
  testPlanId?: number;
  status?: string;
  startedAt?: string; // ISO datetime
  finishedAt?: string; // ISO datetime
  resultNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}
