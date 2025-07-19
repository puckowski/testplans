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
  getTestPlans(page = 0, size = 20, tag?: string): Observable<TestPlan[]> {
    return this.http.get<TestPlan[]>(`${this.apiUrl}/testplans?page=${page}&size=${size}&tag=${encodeURIComponent(tag || '')}`);
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
}