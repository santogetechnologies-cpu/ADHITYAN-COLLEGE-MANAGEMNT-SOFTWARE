-- =============================================================================
-- Migration 008: Student Learning Content, Progress Tracking & Check-ins
-- =============================================================================

-- 1. LEARNING CONTENT CATALOG
CREATE TABLE IF NOT EXISTS public.learning_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    department TEXT,
    class_name TEXT,
    difficulty TEXT DEFAULT 'Intermediate' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    estimated_duration TEXT DEFAULT '2 hours',
    modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learning_content_dept_class ON public.learning_content(department, class_name);
CREATE INDEX IF NOT EXISTS idx_learning_content_subject ON public.learning_content(subject);

ALTER TABLE public.learning_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students and teachers can view published learning content" ON public.learning_content;
CREATE POLICY "Students and teachers can view published learning content"
    ON public.learning_content FOR SELECT TO authenticated
    USING (
        is_published = true AND (
            department IS NULL
            OR department = (SELECT department FROM public.profiles WHERE id = auth.uid())
            OR class_name IS NULL
            OR class_name = (SELECT class_name FROM public.profiles WHERE id = auth.uid())
            OR public.get_current_user_role() IN ('teacher', 'admin', 'principal')
        )
    );

DROP POLICY IF EXISTS "Teachers and admins can manage learning content" ON public.learning_content;
CREATE POLICY "Teachers and admins can manage learning content"
    ON public.learning_content FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('teacher', 'admin', 'principal'))
    WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin', 'principal'));

-- 2. STUDENT LEARNING PROGRESS
CREATE TABLE IF NOT EXISTS public.student_learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES public.learning_content(id) ON DELETE CASCADE,
    current_module_index INT NOT NULL DEFAULT 0,
    progress_percentage NUMERIC NOT NULL DEFAULT 0,
    last_position_seconds NUMERIC NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    completed_modules TEXT[] DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_student_content_progress UNIQUE (student_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_progress_student ON public.student_learning_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_content ON public.student_learning_progress(content_id);

ALTER TABLE public.student_learning_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can manage own learning progress" ON public.student_learning_progress;
CREATE POLICY "Students can manage own learning progress"
    ON public.student_learning_progress FOR ALL TO authenticated
    USING (student_id = auth.uid() OR public.get_current_user_role() IN ('teacher', 'admin', 'principal'))
    WITH CHECK (student_id = auth.uid() OR public.get_current_user_role() IN ('teacher', 'admin', 'principal'));

-- 3. EXPAND WELLNESS CHECKINS COLUMNS
ALTER TABLE public.wellness_checkins 
    ADD COLUMN IF NOT EXISTS mood TEXT,
    ADD COLUMN IF NOT EXISTS energy_level INT,
    ADD COLUMN IF NOT EXISTS readiness_score INT,
    ADD COLUMN IF NOT EXISTS learning_goal TEXT,
    ADD COLUMN IF NOT EXISTS reflection TEXT,
    ADD COLUMN IF NOT EXISTS completed_tasks TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS difficulties TEXT,
    ADD COLUMN IF NOT EXISTS day_rating INT,
    ADD COLUMN IF NOT EXISTS improvements TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

-- Ensure constraint for upsert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_wellness_user_date_type'
    ) THEN
        ALTER TABLE public.wellness_checkins 
        ADD CONSTRAINT uq_wellness_user_date_type UNIQUE (user_id, date, checkin_type);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 4. EXPAND ASSIGNMENT SUBMISSIONS FOR TEXT RESPONSES
ALTER TABLE public.assignment_submissions 
    ADD COLUMN IF NOT EXISTS submission_text TEXT;

-- 5. REALTIME REPLICATION FOR NEW TABLES
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_learning_progress;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.learning_content;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wellness_checkins;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_submissions;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- 6. SEED CURRICULUM CONTENT FOR LEARNING VENTURE
INSERT INTO public.learning_content (title, description, subject, department, class_name, difficulty, estimated_duration, modules)
VALUES 
(
    'Advanced Data Structures & Algorithms',
    'Comprehensive module covering balanced search trees, graph theory algorithms, dynamic programming, and complexity analysis.',
    'Computer Science',
    'Computer Science',
    'CS-A',
    'Advanced',
    '4 hours',
    '[
        {
            "id": "mod-1",
            "title": "Red-Black Trees & AVL Self-Balancing Trees",
            "duration": "45 mins",
            "content": "Self-balancing binary search trees maintain logarithmic height under insertions and deletions. We explore color invariants, left/right rotations, and amortized complexity bounds.",
            "keyTakeaways": ["Rotations preserve in-order traversal", "AVL trees offer faster lookups due to stricter balance", "Red-Black trees require fewer rotations on insert/delete"]
        },
        {
            "id": "mod-2",
            "title": "Graph Traversal & Shortest Path Algorithms",
            "duration": "50 mins",
            "content": "Deep dive into Dijkstra with priority queues, Bellman-Ford for negative weights, and Floyd-Warshall for all-pairs shortest paths.",
            "keyTakeaways": ["Dijkstra runs in O((V + E) log V)", "Bellman-Ford detects negative weight cycles", "Floyd-Warshall dynamic programming formulation"]
        },
        {
            "id": "mod-3",
            "title": "Dynamic Programming: Memoization vs Tabulation",
            "duration": "60 mins",
            "content": "Mastering the optimal substructure and overlapping subproblems patterns. Application to Knapsack 0/1, Longest Common Subsequence, and Matrix Chain Multiplication.",
            "keyTakeaways": ["State space representation", "Top-down with cache vs bottom-up iterative", "Space optimization techniques"]
        }
    ]'::jsonb
),
(
    'Digital Electronics & Microprocessor Architecture',
    'Fundamental principles of combinational circuits, sequential logic, pipelining, and assembly-level architecture.',
    'Electronics',
    'Computer Science',
    'CS-A',
    'Intermediate',
    '3.5 hours',
    '[
        {
            "id": "mod-1",
            "title": "Combinational Logic & Karnaugh Map Simplification",
            "duration": "40 mins",
            "content": "Boolean algebra theorems, logic gate synthesis, K-maps up to 4 variables, don''t care conditions, and multiplexer implementations.",
            "keyTakeaways": ["Minimization reduces propagation delay and gate count", "Hazards and glitches in asynchronous logic", "Universal NAND/NOR realization"]
        },
        {
            "id": "mod-2",
            "title": "Sequential Circuits & Finite State Machines",
            "duration": "55 mins",
            "content": "Flip-flops (D, JK, T), setup and hold times, clock skew, Mealy and Moore machine architectures and state transition tables.",
            "keyTakeaways": ["Setup and hold time margin violations", "State assignment strategies", "Synchronous counter design"]
        },
        {
            "id": "mod-3",
            "title": "RISC vs CISC Architecture & Instruction Pipelining",
            "duration": "50 mins",
            "content": "CPU instruction cycle, register banks, hazard resolution in 5-stage classic RISC pipeline, branch prediction, and memory hierarchy.",
            "keyTakeaways": ["Structural, data, and control hazards", "Forwarding/bypassing to mitigate stalls", "L1/L2 cache locality of reference"]
        }
    ]'::jsonb
),
(
    'Database Engineering & Relational Algebra',
    'Relational theory, SQL optimization, indexing strategies (B-Trees, Hash), ACID transactions, and concurrency control.',
    'Database Systems',
    'Computer Science',
    'CS-A',
    'Intermediate',
    '3 hours',
    '[
        {
            "id": "mod-1",
            "title": "Relational Algebra & Normalization (1NF to BCNF)",
            "duration": "45 mins",
            "content": "Formal relational operations, functional dependencies, lossless decomposition, and dependency preservation up to Boyce-Codd Normal Form.",
            "keyTakeaways": ["Armstrong''s axioms for functional dependencies", "Eliminating update, insertion, and deletion anomalies", "BCNF criteria"]
        },
        {
            "id": "mod-2",
            "title": "Storage Engine & B+ Tree Indexing",
            "duration": "45 mins",
            "content": "Page layouts, slotted pages, buffer pool management, clustered vs secondary indexes, and range scan mechanics in B+ Trees.",
            "keyTakeaways": ["All keys stored in leaf nodes linked sequentially", "Branching factor and I/O minimization", "Index selectiveness and query planner costing"]
        },
        {
            "id": "mod-3",
            "title": "Transactions, MVCC & Isolation Levels",
            "duration": "50 mins",
            "content": "ACID properties, Multi-Version Concurrency Control (MVCC), dirty reads, non-repeatable reads, phantom reads, and strict two-phase locking (2PL).",
            "keyTakeaways": ["Snapshot isolation semantics", "Write-Ahead Logging (WAL) and durability", "Deadlock detection and resolution"]
        }
    ]'::jsonb
)
ON CONFLICT DO NOTHING;

