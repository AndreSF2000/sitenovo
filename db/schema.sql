CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  role text NOT NULL CHECK (length(trim(role)) BETWEEN 1 AND 80),
  employee_group text NOT NULL CHECK (employee_group IN ('pizzaiolo', 'equipa')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_cells (
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('day', 'night', 'off', 'custom')),
  note text,
  PRIMARY KEY (employee_id, work_date),
  CHECK (
    (shift = 'custom' AND length(trim(coalesce(note, ''))) BETWEEN 1 AND 50)
    OR (shift <> 'custom' AND note IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS schedule_cells_work_date_idx ON schedule_cells (work_date);
