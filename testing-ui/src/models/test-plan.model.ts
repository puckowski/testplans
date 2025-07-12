export interface TestTag {
  id?: number, 
  testPlanId?: number,
  tag: string
}

export interface TestPlan {
  id?: number;
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  createdDate?: Date;
  updatedDate?: Date;
  tagList: TestTag[];
}

export interface TestCase {
  id?: number;
  name: string;
  description: string;
  steps: string;
  expectedResult: string;
  status: 'PASS' | 'FAIL' | 'PENDING' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  testPlanId?: number;
  createdDate?: Date;
  updatedDate?: Date;
}