import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { TestPlan, TestCase, TestPlanCount } from '../models/test-plan.model';

@Injectable({
  providedIn: 'root'
})
export class TestPlanService {
  private apiUrl = 'http://localhost:8080/api'; // Adjust this to your API base URL

  constructor(private http: HttpClient) { }

  // Test Plan operations
  // Keyset pagination: pass optional 'where' id and 'limit'
  // Keyset pagination using friendly params: after, per, filter
  getTestPlans(after?: number, per = 20, filter?: string): Observable<TestPlan[]> {
    const afterPart = after != null ? `after=${after}&` : '';
    return this.http.get<TestPlan[]>(`${this.apiUrl}/testplans?${afterPart}per=${per}&filter=${encodeURIComponent(filter || '')}`);
  }

  getTestPlanWithCases(planId: number): Observable<TestPlan> {
    return this.http.get<TestPlan>(`${this.apiUrl}/testplans/${planId}/with-testcases`);
  }

  getTestPlanCount(tag?: string): Observable<number> {
    return this.http.get<TestPlanCount>(`${this.apiUrl}/testplans/count?tag=${encodeURIComponent(tag || '')}`).pipe(
      map(res => res.count)
    );
  }

  getTestPlan(id: number): Observable<TestPlan> {
    return this.http.get<TestPlan>(`${this.apiUrl}/testplans/${id}`);
  }

  createTestPlan(testPlan: TestPlan): Observable<TestPlan> {
    return this.http.post<TestPlan>(`${this.apiUrl}/testplans`, testPlan);
  }

  updateTestPlan(id: number, testPlan: TestPlan): Observable<TestPlan> {
    return this.http.put<TestPlan>(`${this.apiUrl}/testplans/${id}`, testPlan);
  }

  deleteTestPlan(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/testplans/${id}`);
  }

  // Test Case operations
  getTestCases(planId: number): Observable<TestCase[]> {
    return this.http.get<TestCase[]>(`${this.apiUrl}/testplans/${planId}/testcases`);
  }

  getTestCase(id: number): Observable<TestCase> {
    return this.http.get<TestCase>(`${this.apiUrl}/testcases/${id}`);
  }

  createTestCase(planId: number, testCase: TestCase): Observable<TestCase> {
    return this.http.post<TestCase>(`${this.apiUrl}/testplans/${planId}/testcases`, testCase);
  }

  updateTestCase(id: number, testCase: TestCase): Observable<TestCase> {
    return this.http.put<TestCase>(`${this.apiUrl}/testcases/${id}`, testCase);
  }

  deleteTestCase(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/testcases/${id}`);
  }

  // Test Plan Execution operations
  getExecutions(planId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/testplans/${planId}/executions`);
  }

  createExecution(planId: number, execution: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/testplans/${planId}/executions`, execution);
  }

  updateExecution(id: number, execution: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/executions/${id}`, execution);
  }

  deleteExecution(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/executions/${id}`);
  }
}