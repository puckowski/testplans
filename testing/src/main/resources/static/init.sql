-- Table for test plans
CREATE TABLE IF NOT EXISTS test_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for test cases, each linked to a test plan
CREATE TABLE IF NOT EXISTS test_case (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_plan_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'PENDING',
    expected_result TEXT NOT NULL,
    priority TEXT NOT NULL,
    steps TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_plan_id) REFERENCES test_plan(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS test_plan_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_plan_id INTEGER NOT NULL,
    tag VARCHAR(200),
    FOREIGN KEY (test_plan_id) REFERENCES test_plan(id) ON DELETE CASCADE
);

-- Table for executions of test plans
CREATE TABLE IF NOT EXISTS test_plan_execution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_plan_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    started_at DATETIME,
    finished_at DATETIME,
    result_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_plan_id) REFERENCES test_plan(id) ON DELETE CASCADE
);

-- Add duration column to test_case if missing
ALTER TABLE test_case ADD COLUMN duration INTEGER;
