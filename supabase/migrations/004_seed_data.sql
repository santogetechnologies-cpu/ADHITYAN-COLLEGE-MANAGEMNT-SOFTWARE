-- =============================================================================
-- Migration: 004_seed_data.sql
-- Description: Foundational catalogs and institutional setup for Supabase PostgreSQL
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. DEPARTMENTS & SECTIONS
-- -----------------------------------------------------------------------------
INSERT INTO public.departments (id, name, duration, code)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Computer Science & Engineering', 4, 'CSE'),
    ('22222222-2222-2222-2222-222222222222', 'Mathematics & Computing', 3, 'MATH'),
    ('33333333-3333-3333-3333-333333333333', 'Physics & Electronics', 3, 'PHY'),
    ('44444444-4444-4444-4444-444444444444', 'Business & Management', 3, 'BBA')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sections (id, department_id, name, capacity, current_students, assigned_teacher_name)
VALUES 
    ('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Section A', 60, 0, NULL),
    ('11111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Section B', 60, 0, NULL),
    ('22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'Section A', 40, 0, NULL)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. TIMETABLES
-- -----------------------------------------------------------------------------
INSERT INTO public.timetables (class_name, day_of_week, start_time, end_time, subject, teacher_name, room)
VALUES 
    ('Grade 10-A', 'Monday', '08:00', '08:45', 'Mathematics', 'Faculty Member', 'Room 201'),
    ('Grade 10-A', 'Monday', '08:45', '09:30', 'English', 'Faculty Member', 'Room 105'),
    ('Grade 10-A', 'Monday', '09:30', '10:15', 'Physics', 'Faculty Member', 'Lab A'),
    ('Grade 10-A', 'Monday', '11:15', '12:00', 'Chemistry', 'Faculty Member', 'Lab B'),
    ('Grade 10-A', 'Tuesday', '08:00', '08:45', 'English', 'Faculty Member', 'Room 105'),
    ('Grade 10-A', 'Tuesday', '08:45', '09:30', 'Mathematics', 'Faculty Member', 'Room 201'),
    ('Grade 10-A', 'Wednesday', '09:00', '10:00', 'Computer Science', 'Faculty Member', 'Lab C'),
    ('Grade 10-B', 'Monday', '11:00', '12:00', 'Physics', 'Faculty Member', 'Lab A')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. STORE PRODUCTS
-- -----------------------------------------------------------------------------
INSERT INTO public.store_products (name, price, category, rating, image_url, stock, description)
VALUES 
    ('School Notebook - Mathematics', 25.00, 'Stationery', 4.5, '/placeholder.svg', 50, 'High-grade ruled 192-page notebook for mathematics practice.'),
    ('School Uniform - Shirt', 450.00, 'Uniform', 4.8, '/placeholder.svg', 20, 'Premium cotton institutional uniform shirt, all sizes.'),
    ('Scientific Calculator', 890.00, 'Electronics', 4.7, '/placeholder.svg', 15, 'Multi-function scientific calculator approved for board exams.'),
    ('Art Supplies Kit', 320.00, 'Stationery', 4.3, '/placeholder.svg', 25, 'Complete beginner and intermediate acrylic and sketch set.'),
    ('School Bag - Premium', 1200.00, 'Accessories', 4.9, '/placeholder.svg', 10, 'Ergonomic water-resistant dual-compartment backpack.'),
    ('Sports Shoes', 1800.00, 'Sports', 4.6, '/placeholder.svg', 12, 'Lightweight cushioned all-court athletic shoes.')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. INVENTORY ITEMS & TRANSACTIONS
-- -----------------------------------------------------------------------------
INSERT INTO public.inventory_items (name, category, current_stock, minimum_stock, unit, urgency)
VALUES 
    ('A4 Paper Sheets', 'Stationery', 50, 100, 'Reams', 'high'),
    ('Whiteboard Markers', 'Classroom', 15, 25, 'Boxes', 'medium'),
    ('Laboratory Chemicals', 'Science Lab', 8, 20, 'Bottles', 'high'),
    ('Sports Equipment - Basketballs', 'Sports', 12, 15, 'Units', 'low'),
    ('Computer Keyboards', 'IT', 22, 10, 'Units', 'low'),
    ('First Aid Kits', 'Medical', 18, 10, 'Kits', 'low')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. TRANSPORT VEHICLES & STOPS
-- -----------------------------------------------------------------------------
INSERT INTO public.transport_vehicles (id, vehicle_number, vehicle_type, route_name, driver_name, driver_phone, capacity, occupied_seats, status, current_location, eta_to_next_stop)
VALUES 
    ('b1111111-1111-1111-1111-111111111111', 'Bus #42', 'Bus', 'Route 15 - North District', 'Designated Driver', '(555) 123-4567', 45, 0, 'active', 'Campus Gate A', '10 minutes'),
    ('b2222222-2222-2222-2222-222222222222', 'Bus-001', 'Bus', 'Route A - Central Area', 'Designated Driver', '9876543220', 50, 0, 'active', 'Central Roundabout', '5 minutes'),
    ('b3333333-3333-3333-3333-333333333333', 'Bus-002', 'Bus', 'Route B - North Zone', 'Designated Driver', '9876543221', 45, 0, 'maintenance', 'Depot Workshop', 'In Service')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transport_stops (vehicle_id, stop_name, scheduled_time, stop_order, status, students_count)
VALUES 
    ('b1111111-1111-1111-1111-111111111111', 'Main Campus Gate', '07:25 AM', 1, 'Completed', 0),
    ('b1111111-1111-1111-1111-111111111111', 'Community Center', '07:30 AM', 2, 'Completed', 0),
    ('b1111111-1111-1111-1111-111111111111', 'North District Hub', '07:35 AM', 3, 'Upcoming', 0)
ON CONFLICT DO NOTHING;

INSERT INTO public.vehicle_maintenance (vehicle_id, item, last_change, next_due, status)
VALUES 
    ('b1111111-1111-1111-1111-111111111111', 'Engine Oil & Filter', '15 days ago', 'In 15 days', 'good'),
    ('b1111111-1111-1111-1111-111111111111', 'Brake Pad Inspection', '30 days ago', 'In 30 days', 'good')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. LIBRARY CATALOG
-- -----------------------------------------------------------------------------
INSERT INTO public.library_books (book_code, title, author, isbn, category, subject, class_level, type, status, total_copies, available_copies, published_year, publisher)
VALUES 
    ('BK001', 'Advanced Mathematics for Higher Secondary', 'Academic Press Faculty', '978-0-123456-78-9', 'Textbook', 'Mathematics', 'Class 12', 'Physical', 'Available', 25, 25, 2023, 'Academic Press'),
    ('BK002', 'Modern Physics Concepts & Principles', 'Science Faculty Editorial', '978-0-987654-32-1', 'Reference', 'Physics', 'Class 11', 'Physical', 'Available', 20, 20, 2024, 'Science Publications'),
    ('BK003', 'Fundamentals of Organic Chemistry', 'Chemistry Faculty Board', '978-0-456789-12-3', 'Textbook', 'Chemistry', 'Class 10', 'Physical', 'Available', 30, 30, 2024, 'Digital Learning Co'),
    ('BK004', 'Quantum Computing in Modern Science', 'Computing Research Group', '978-0-789012-34-5', 'E-Resource', 'Computer Science', 'Class 12', 'Digital', 'Available', 100, 100, 2024, 'TechEdu Press')
ON CONFLICT (book_code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. NAAC ACCREDITATION CRITERIA PROGRESS & DOCUMENTS
-- -----------------------------------------------------------------------------
INSERT INTO public.naac_criterion_progress (criterion_number, completion_percentage, total_metrics, completed_metrics)
VALUES 
    (1, 75, 12, 9),
    (2, 60, 15, 9),
    (3, 85, 10, 8),
    (4, 40, 8, 3),
    (5, 55, 11, 6),
    (6, 70, 9, 6),
    (7, 65, 7, 4)
ON CONFLICT (criterion_number) DO UPDATE
SET completion_percentage = EXCLUDED.completion_percentage,
    completed_metrics = EXCLUDED.completed_metrics;

INSERT INTO public.naac_documents (title, filename, criterion_number, metric_code, evidence_type, file_type, file_size, tags)
VALUES 
    ('Course Curriculum Document 2023-24', 'curriculum-2023-24.pdf', 1, '1.1.1', 'Policy Document', 'PDF', '2.5 MB', ARRAY['curriculum', 'academic', 'policy']),
    ('Research Publication Catalog 2023', 'research-publications-2023.xlsx', 3, '3.3.1', 'Data Sheet', 'Excel', '1.8 MB', ARRAY['research', 'publications', 'faculty']),
    ('Infrastructure Audit & Smart Classrooms', 'infrastructure-audit-2023.pdf', 4, '4.1.1', 'Report', 'PDF', '4.2 MB', ARRAY['infrastructure', 'lab', 'smart-class'])
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. EXAMS & SCHEDULES
-- -----------------------------------------------------------------------------
INSERT INTO public.exams (id, name, term, academic_year, start_date, end_date, status)
VALUES 
    ('e1111111-1111-1111-1111-111111111111', 'Mid-Term Examinations 2024', 'Term 1', '2023-2024', CURRENT_DATE + 14, CURRENT_DATE + 24, 'Scheduled'),
    ('e2222222-2222-2222-2222-222222222222', 'Quarterly Assessment 2024', 'Quarter 2', '2023-2024', CURRENT_DATE - 30, CURRENT_DATE - 20, 'Results Published')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.exam_schedules (exam_id, subject, class_name, exam_date, start_time, end_time, room, max_marks)
VALUES 
    ('e1111111-1111-1111-1111-111111111111', 'Mathematics', 'Grade 10-A', CURRENT_DATE + 14, '09:00 AM', '12:00 PM', 'Hall 1', 100),
    ('e1111111-1111-1111-1111-111111111111', 'Physics', 'Grade 10-A', CURRENT_DATE + 17, '09:00 AM', '12:00 PM', 'Hall 1', 100),
    ('e1111111-1111-1111-1111-111111111111', 'Chemistry', 'Grade 10-A', CURRENT_DATE + 21, '09:00 AM', '12:00 PM', 'Hall 2', 100)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. SPORTS & EVENTS
-- -----------------------------------------------------------------------------
INSERT INTO public.sports_events (name, sport, date, status, participants, teams)
VALUES 
    ('Inter-College Cricket Championship', 'Cricket', CURRENT_DATE + 10, 'Upcoming', 0, 0),
    ('Annual Athletic & Sports Meet', 'Multiple', CURRENT_DATE + 20, 'Registrations Open', 0, 0)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 10. CALENDAR EVENTS
-- -----------------------------------------------------------------------------
INSERT INTO public.calendar_events (title, description, date, time, location, category, target_audience, priority, created_by, status)
VALUES 
    ('Annual Science & Tech Exhibition', 'Student innovations and science working projects displayed for industry visitors.', CURRENT_DATE + 15, '10:00 AM', 'Main Auditorium', 'academic', 'all', 'high', 'Administration', 'upcoming'),
    ('College Cultural Day Celebration', 'Cultural performances, exhibitions, and musical evening.', CURRENT_DATE + 25, '09:00 AM', 'Institutional Grounds', 'cultural', 'all', 'high', 'Administration', 'upcoming')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 11. FINANCE TRANSACTIONS
-- -----------------------------------------------------------------------------
INSERT INTO public.finance_transactions (type, amount, department, description, urgency, status)
VALUES 
    ('Procurement', 45000.00, 'Science Lab', 'Procurement of laboratory glassware and supplies', 'medium', 'Approved'),
    ('Maintenance', 12500.00, 'Campus Facilities', 'Campus network maintenance and service', 'low', 'Approved')
ON CONFLICT DO NOTHING;
