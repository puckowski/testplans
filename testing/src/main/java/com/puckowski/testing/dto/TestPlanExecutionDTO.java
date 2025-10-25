package com.puckowski.testing.dto;

/**
 * DTO used for both requests and responses for test plan executions.
 * Date/time fields are represented as ISO-like strings (e.g. 2025-10-24T23:13:50).
 */
public record TestPlanExecutionDTO(
        Integer id,
        Integer testPlanId,
        String status,
        String startedAt,
        String finishedAt,
        String resultNotes,
        String createdAt,
        String updatedAt
) {
}
