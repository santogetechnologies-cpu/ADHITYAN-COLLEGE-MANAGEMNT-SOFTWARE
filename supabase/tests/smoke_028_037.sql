-- Smoke test for migrations 028-043. Synthetic data only; everything is rolled back.
-- Run against a SCRATCH/STAGING database that has 001-015 + 028-037 applied (never production):
--   psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/smoke_028_037.sql
-- Any failed assertion raises an exception and the script exits non-zero.
\set ON_ERROR_STOP 1
BEGIN;
DO $$ BEGIN PERFORM 1; END $$;

CREATE TEMP TABLE _r(name text, ok boolean);
GRANT ALL ON _r TO PUBLIC;
CREATE OR REPLACE FUNCTION pg_temp.chk(n text, c boolean) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN INSERT INTO _r VALUES (n, COALESCE(c, false)); END $f$;

INSERT INTO auth.users(id,email) VALUES
 ('c0000000-0000-0000-0000-000000000001','smoke.s1@example.test'),
 ('c0000000-0000-0000-0000-000000000002','smoke.s2@example.test'),
 ('c0000000-0000-0000-0000-000000000003','smoke.lib@example.test'),
 ('c0000000-0000-0000-0000-000000000004','smoke.fin@example.test');
INSERT INTO public.profiles(id,email,name,role,class_name) VALUES
 ('c0000000-0000-0000-0000-000000000001','smoke.s1@example.test','Smoke S1','student','C1'),
 ('c0000000-0000-0000-0000-000000000002','smoke.s2@example.test','Smoke S2','student','C1'),
 ('c0000000-0000-0000-0000-000000000003','smoke.lib@example.test','Smoke Lib','librarian',NULL),
 ('c0000000-0000-0000-0000-000000000004','smoke.fin@example.test','Smoke Fin','financier',NULL);

SELECT pg_temp.chk('student gets permanent id', (SELECT student_id IS NOT NULL FROM public.profiles WHERE id='c0000000-0000-0000-0000-000000000001'));
SELECT pg_temp.chk('students row created', EXISTS (SELECT 1 FROM public.students WHERE user_id='c0000000-0000-0000-0000-000000000001'));

-- fee collection: idempotent, no overpay
INSERT INTO public.student_fees(id,student_id,student_name,class_name,total_due,paid_amount,due_date,status)
 VALUES ('c1000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','Smoke S2','C1',1000,0,CURRENT_DATE,'pending');
SELECT pg_temp.chk('pay 400 ok', (public.record_fee_payment('c1000000-0000-0000-0000-000000000001',400,'Cash','SMOKE-REF-1','smoke-idem-0001','c0000000-0000-0000-0000-000000000004')->>'success')='true');
SELECT pg_temp.chk('retry is duplicate', (public.record_fee_payment('c1000000-0000-0000-0000-000000000001',400,'Cash','SMOKE-REF-1','smoke-idem-0001','c0000000-0000-0000-0000-000000000004')->>'duplicate')='true');
SELECT pg_temp.chk('overpay rejected', (public.record_fee_payment('c1000000-0000-0000-0000-000000000001',700,'Cash','SMOKE-REF-2','smoke-idem-0002','c0000000-0000-0000-0000-000000000004')->>'code')='OVERPAYMENT');
SELECT pg_temp.chk('retry did not create a second payment', (SELECT count(*) FROM public.fee_payments WHERE student_fee_id='c1000000-0000-0000-0000-000000000001')=1);
SELECT pg_temp.chk('fee row updated (total_due is the outstanding balance)', (SELECT paid_amount=400 AND total_due=600 AND status='partially_paid' FROM public.student_fees WHERE id='c1000000-0000-0000-0000-000000000001'));
SELECT pg_temp.chk('pay remainder returns zero balance', (public.record_fee_payment('c1000000-0000-0000-0000-000000000001',600,'UPI','SMOKE-REF-3','smoke-idem-0003','c0000000-0000-0000-0000-000000000004')->>'balance_remaining')::numeric=0);
SELECT pg_temp.chk('fee closed after full payment', (SELECT status='paid' AND total_due=0 AND paid_amount=1000 FROM public.student_fees WHERE id='c1000000-0000-0000-0000-000000000001'));
SELECT pg_temp.chk('ledger rows posted (one per payment, none for retries)', (SELECT count(*) FROM public.finance_transactions WHERE description LIKE 'Fee receipt REC-%' AND type='Fee Payment')=2);
SELECT pg_temp.chk('nothing due after full payment', (public.record_fee_payment('c1000000-0000-0000-0000-000000000001',1,'Cash','SMOKE-REF-4','smoke-idem-0004','c0000000-0000-0000-0000-000000000004')->>'code')='NOTHING_DUE');

-- row level security as a student
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);
SELECT pg_temp.chk('student cannot see another student''s fees', (SELECT count(*) FROM public.student_fees WHERE student_id='c0000000-0000-0000-0000-000000000002')=0);
SELECT pg_temp.chk('student cannot call record_fee_payment', (SELECT has_function_privilege('authenticated','public.record_fee_payment(uuid,numeric,text,text,text,uuid,text)','EXECUTE'))=false);
SELECT pg_temp.chk('student cannot call rate limiter', (SELECT has_function_privilege('authenticated','public.check_rate_limit(text,integer,integer)','EXECUTE'))=false);
SELECT pg_temp.chk('student cannot issue library book', (public.issue_library_book(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', CURRENT_DATE+7)->>'error') LIKE 'Not authorized%');
RESET ROLE;

SELECT pg_temp.chk('buckets with sensitive data are private',
  NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id IN ('documents','attachments','student_documents','staff_documents') AND public));
SELECT pg_temp.chk('institutional_settings singleton exists', (SELECT count(*) FROM public.institutional_settings)=1);

-- ===================== 037 admissions lifecycle =====================
INSERT INTO auth.users(id,email) VALUES ('c0000000-0000-0000-0000-000000000005','smoke.recep@example.test'),
                                        ('c0000000-0000-0000-0000-000000000006','smoke.newstu@example.test');
INSERT INTO public.profiles(id,email,name,role) VALUES ('c0000000-0000-0000-0000-000000000005','smoke.recep@example.test','Smoke Recep','receptionist');
INSERT INTO public.admission_applications(id,application_number,applicant_name,email,phone,class_name,parent_name,parent_phone,status)
 VALUES ('c2000000-0000-0000-0000-000000000001','SMK-ADM-001','Smoke Applicant','smoke.newstu@example.test','900','B.Sc MLT','Smoke Parent','901','Submitted');
SELECT pg_temp.chk('cannot jump Submitted -> Approved', (public.admission_set_status('c2000000-0000-0000-0000-000000000001','Approved',NULL,'c0000000-0000-0000-0000-000000000005')->>'code')='INVALID_TRANSITION');
SELECT pg_temp.chk('Submitted -> Under Review ok', (public.admission_set_status('c2000000-0000-0000-0000-000000000001','Under Review',NULL,'c0000000-0000-0000-0000-000000000005')->>'success')='true');
SELECT pg_temp.chk('enroll before approval refused', (public.admission_enroll('c2000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000005')->>'code')='NOT_APPROVED');
INSERT INTO public.admission_document_verifications(application_id,student_name,document_type,status)
 VALUES ('c2000000-0000-0000-0000-000000000001','Smoke Applicant','12th Marksheet','Rejected');
SELECT pg_temp.chk('rejected document blocks approval', (public.admission_set_status('c2000000-0000-0000-0000-000000000001','Approved',NULL,'c0000000-0000-0000-0000-000000000005')->>'code')='DOCUMENTS_REJECTED');
UPDATE public.admission_document_verifications SET status='Verified' WHERE application_id='c2000000-0000-0000-0000-000000000001';
SELECT pg_temp.chk('approve after documents verified', (public.admission_set_status('c2000000-0000-0000-0000-000000000001','Approved','ok','c0000000-0000-0000-0000-000000000005')->>'success')='true');
SELECT pg_temp.chk('enroll creates student record', (public.admission_enroll('c2000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000005')->>'student_id')='SMK-ADM-001');
SELECT pg_temp.chk('enroll retry is idempotent', (public.admission_enroll('c2000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000005')->>'already_enrolled')='true');
SELECT pg_temp.chk('exactly one student row', (SELECT count(*) FROM public.students WHERE student_id='SMK-ADM-001')=1);
SELECT pg_temp.chk('application marked Enrolled and linked', (SELECT status='Enrolled' AND student_record_id IS NOT NULL AND enrolled_by IS NOT NULL FROM public.admission_applications WHERE id='c2000000-0000-0000-0000-000000000001'));
SELECT pg_temp.chk('Enrolled is terminal for status changes', (public.admission_set_status('c2000000-0000-0000-0000-000000000001','Cancelled','x','c0000000-0000-0000-0000-000000000005')->>'code')='INVALID_TRANSITION');
SELECT pg_temp.chk('status changes audited', (SELECT count(*) FROM public.audit_logs WHERE entity_id='c2000000-0000-0000-0000-000000000001' AND action IN ('admission_status_change','admission_enrolled'))=3);
-- portal account provisioned later adopts the existing student record (no unique violation)
INSERT INTO public.profiles(id,email,name,role,student_id) VALUES ('c0000000-0000-0000-0000-000000000006','smoke.newstu@example.test','Smoke Applicant','student','SMK-ADM-001');
SELECT pg_temp.chk('later login adopts the enrolled record', (SELECT user_id='c0000000-0000-0000-0000-000000000006' FROM public.students WHERE student_id='SMK-ADM-001') AND (SELECT count(*) FROM public.students WHERE student_id='SMK-ADM-001')=1);

-- ===================== 038 admission deposit =====================
INSERT INTO public.admission_applications(id,application_number,applicant_name,email,phone,class_name,parent_name,parent_phone,status)
 VALUES ('c2000000-0000-0000-0000-000000000002','SMK-ADM-002','Deposit Applicant','dep@example.test','900','B.Sc MLT','P','901','Submitted'),
        ('c2000000-0000-0000-0000-000000000003','SMK-ADM-003','Closed Applicant','closed@example.test','900','B.Sc MLT','P','901','Rejected');
SELECT pg_temp.chk('deposit recorded with receipt', (public.record_admission_deposit('c2000000-0000-0000-0000-000000000002',2500,'Cash',NULL,'smoke-dep-0001','c0000000-0000-0000-0000-000000000005')->>'success')='true');
SELECT pg_temp.chk('deposit retry is duplicate', (public.record_admission_deposit('c2000000-0000-0000-0000-000000000002',2500,'Cash',NULL,'smoke-dep-0001','c0000000-0000-0000-0000-000000000005')->>'duplicate')='true');
SELECT pg_temp.chk('deposit stored once with receipt + ledger', (SELECT count(*) FROM public.admission_fees WHERE application_id='c2000000-0000-0000-0000-000000000002')=1
   AND (SELECT count(*) FROM public.fee_receipts WHERE roll_number='SMK-ADM-002' AND fee_type='Admission Deposit')=1
   AND (SELECT count(*) FROM public.finance_transactions WHERE type='Admission Deposit' AND description LIKE '%SMK-ADM-002%')=1);
SELECT pg_temp.chk('deposit refused for rejected application', (public.record_admission_deposit('c2000000-0000-0000-0000-000000000003',100,'Cash',NULL,'smoke-dep-0002','c0000000-0000-0000-0000-000000000005')->>'code')='APPLICATION_CLOSED');
SELECT pg_temp.chk('deposit rejects bad amount / mode', (public.record_admission_deposit('c2000000-0000-0000-0000-000000000002',0,'Cash',NULL,'smoke-dep-0003','c0000000-0000-0000-0000-000000000005')->>'code')='INVALID_AMOUNT'
   AND (public.record_admission_deposit('c2000000-0000-0000-0000-000000000002',10,'Barter',NULL,'smoke-dep-0004','c0000000-0000-0000-0000-000000000005')->>'code')='INVALID_MODE');
SELECT pg_temp.chk('authenticated cannot call record_admission_deposit', has_function_privilege('authenticated','public.record_admission_deposit(uuid,numeric,text,text,text,uuid)','EXECUTE')=false);

-- ===================== 039 entrance tests + merit =====================
INSERT INTO public.admission_applications(id,application_number,applicant_name,email,phone,class_name,parent_name,parent_phone,status,academic_year,qualifying_marks,submission_date) VALUES
 ('c3000000-0000-0000-0000-00000000000a','MRT-A','Cand A','a@x.t','1','Merit Course','P','1','Under Review','2026-27',90,'2026-05-01'),
 ('c3000000-0000-0000-0000-00000000000b','MRT-B','Cand B','b@x.t','1','Merit Course','P','1','Under Review','2026-27',70,'2026-05-02'),
 ('c3000000-0000-0000-0000-00000000000c','MRT-C','Cand C','c@x.t','1','Merit Course','P','1','Under Review','2026-27',95,'2026-05-03'),
 ('c3000000-0000-0000-0000-00000000000d','MRT-D','Cand D','d@x.t','1','Merit Course','P','1','Under Review','2026-27',60,'2026-05-04'),
 ('c3000000-0000-0000-0000-00000000000e','MRT-E','Cand E','e@x.t','1','Merit Course','P','1','Under Review','2026-27',NULL,'2026-05-05'),
 ('c3000000-0000-0000-0000-00000000000f','MRT-F','Cand F','f@x.t','1','Merit Course','P','1','Rejected','2026-27',99,'2026-05-06');
SELECT pg_temp.chk('schedule creates one test per eligible applicant, skips closed',
  (SELECT (r->>'scheduled')::int = 5 AND jsonb_array_length(r->'skipped') = 1 FROM (SELECT public.admission_schedule_tests(ARRAY[
     'c3000000-0000-0000-0000-00000000000a','c3000000-0000-0000-0000-00000000000b','c3000000-0000-0000-0000-00000000000c',
     'c3000000-0000-0000-0000-00000000000d','c3000000-0000-0000-0000-00000000000e','c3000000-0000-0000-0000-00000000000f']::uuid[],
     DATE '2026-06-01','c0000000-0000-0000-0000-000000000005') r) x));
SELECT pg_temp.chk('rescheduling a pending test moves the date', (public.admission_schedule_tests(ARRAY['c3000000-0000-0000-0000-00000000000a']::uuid[],DATE '2026-06-02','c0000000-0000-0000-0000-000000000005')->>'rescheduled')='1');
SELECT pg_temp.chk('score above maximum refused', (public.admission_record_test_result((SELECT id FROM public.admission_entrance_tests WHERE roll_no='MRT-A'),'Completed',120,100,'c0000000-0000-0000-0000-000000000005')->>'code')='VALIDATION_ERROR');
SELECT pg_temp.chk('record A 80/100', (public.admission_record_test_result((SELECT id FROM public.admission_entrance_tests WHERE roll_no='MRT-A'),'Completed',80,100,'c0000000-0000-0000-0000-000000000005')->>'success')='true');
SELECT pg_temp.chk('record B 95/100', (public.admission_record_test_result((SELECT id FROM public.admission_entrance_tests WHERE roll_no='MRT-B'),'Completed',95,100,'c0000000-0000-0000-0000-000000000005')->>'success')='true');
SELECT pg_temp.chk('record D 40/50', (public.admission_record_test_result((SELECT id FROM public.admission_entrance_tests WHERE roll_no='MRT-D'),'Completed',40,50,'c0000000-0000-0000-0000-000000000005')->>'success')='true');
SELECT pg_temp.chk('record E absent', (public.admission_record_test_result((SELECT id FROM public.admission_entrance_tests WHERE roll_no='MRT-E'),'Absent',NULL,NULL,'c0000000-0000-0000-0000-000000000005')->>'success')='true');
SELECT pg_temp.chk('completed test cannot be rescheduled', (public.admission_schedule_tests(ARRAY['c3000000-0000-0000-0000-00000000000a']::uuid[],DATE '2026-07-01','c0000000-0000-0000-0000-000000000005')->'skipped'->0->>'reason') LIKE 'test already completed');
-- 50/50 weights: A=(90+80)/2=85, B=(70+95)/2=82.5, D=(60+80)/2=70; C no entrance, E no entrance & no marks -> excluded; F rejected -> not a candidate
SELECT pg_temp.chk('merit: ranks A,B,D with 2 seats; C,E excluded', (SELECT
    (r->>'ranked')::int = 3 AND (r->>'selected')::int = 2 AND jsonb_array_length(r->'excluded') = 2
    AND r->'rows'->0->>'name' = 'Cand A' AND (r->'rows'->0->>'score')::numeric = 85
    AND r->'rows'->1->>'name' = 'Cand B' AND (r->'rows'->1->>'score')::numeric = 82.5
    AND r->'rows'->2->>'name' = 'Cand D' AND r->'rows'->2->>'status' = 'Waitlist'
  FROM (SELECT public.admission_publish_merit('Merit Course','2026-27',2,50,NULL,'c0000000-0000-0000-0000-000000000005') r) x));
SELECT pg_temp.chk('republishing replaces, does not duplicate', (public.admission_publish_merit('Merit Course','2026-27',2,50,NULL,'c0000000-0000-0000-0000-000000000005')->>'ranked')='3'
   AND (SELECT count(*) FROM public.admission_merit_lists WHERE course_name='Merit Course')=3);
SELECT pg_temp.chk('weights outside 0-100 refused', (public.admission_publish_merit('Merit Course','2026-27',2,150,NULL,'c0000000-0000-0000-0000-000000000005')->>'code')='VALIDATION_ERROR');
SELECT pg_temp.chk('100% qualifying weight ignores entrance (C now ranks first)', (public.admission_publish_merit('Merit Course','2026-27',2,100,NULL,'c0000000-0000-0000-0000-000000000005')->'rows'->0->>'name')='Cand C');
SELECT pg_temp.chk('back to 50/50', (public.admission_publish_merit('Merit Course','2026-27',2,50,NULL,'c0000000-0000-0000-0000-000000000005')->>'selected')='2');
SELECT pg_temp.chk('apply merit: A,B approved, D waitlisted', (SELECT (r->>'updated')::int = 3 FROM (SELECT public.admission_apply_merit('Merit Course','2026-27',NULL,'c0000000-0000-0000-0000-000000000005') r) x));
SELECT pg_temp.chk('statuses after apply', (SELECT string_agg(application_number||':'||status, ',' ORDER BY application_number) FROM public.admission_applications WHERE class_name='Merit Course' AND application_number IN ('MRT-A','MRT-B','MRT-D'))='MRT-A:Approved,MRT-B:Approved,MRT-D:Waitlisted');
SELECT pg_temp.chk('apply merit again changes nothing', (public.admission_apply_merit('Merit Course','2026-27',NULL,'c0000000-0000-0000-0000-000000000005')->>'updated')='0');
SELECT pg_temp.chk('merit/test functions not callable by authenticated', has_function_privilege('authenticated','public.admission_publish_merit(text,text,integer,integer,text,uuid)','EXECUTE')=false
   AND has_function_privilege('authenticated','public.admission_schedule_tests(uuid[],date,uuid)','EXECUTE')=false);

-- ===================== 040 fee engine =====================
INSERT INTO public.students(id,student_id,name,department,class_name,current_semester,status,admission_quota) VALUES
 ('c4000000-0000-0000-0000-000000000001','FE-001','Fee S1','DeptX','ClassA',1,'active','General'),
 ('c4000000-0000-0000-0000-000000000002','FE-002','Fee S2','DeptX','ClassA',1,'active','Management'),
 ('c4000000-0000-0000-0000-000000000003','FE-003','Fee S3','DeptX','ClassB',3,'active','General'),
 ('c4000000-0000-0000-0000-000000000004','FE-004','Fee S4','DeptY','ClassC',1,'active','General'),
 ('c4000000-0000-0000-0000-000000000005','FE-005','Fee S5','DeptX','ClassA',1,'withdrawn','General');
INSERT INTO public.fee_plans(id,name,academic_year,department) VALUES ('c5000000-0000-0000-0000-000000000001','Smoke Plan','2026-27','DeptX');
INSERT INTO public.fee_plan_items(plan_id,fee_head_id,amount,billing_cycle,semesters) VALUES
 ('c5000000-0000-0000-0000-000000000001',(SELECT id FROM public.fee_heads WHERE code='TUITION'),40000,'per_year',NULL),
 ('c5000000-0000-0000-0000-000000000001',(SELECT id FROM public.fee_heads WHERE code='EXAM'),2000,'per_semester',NULL),
 ('c5000000-0000-0000-0000-000000000001',(SELECT id FROM public.fee_heads WHERE code='LAB'),1500,'per_semester',ARRAY[1,2]),
 ('c5000000-0000-0000-0000-000000000001',(SELECT id FROM public.fee_heads WHERE code='ADMISSION'),500,'one_time',NULL);
SELECT pg_temp.chk('draft plan cannot be billed', (public.fee_generate(false,'c5000000-0000-0000-0000-000000000001',NULL,NULL,NULL,'department','DeptX',NULL,NULL,NULL,NULL,true,true,'c0000000-0000-0000-0000-000000000005')->>'code')='PLAN_NOT_PUBLISHED');
UPDATE public.fee_plans SET status='Published' WHERE id='c5000000-0000-0000-0000-000000000001';
CREATE FUNCTION pg_temp.fails(q TEXT) RETURNS BOOLEAN LANGUAGE plpgsql AS $f$ BEGIN EXECUTE q; RETURN FALSE; EXCEPTION WHEN OTHERS THEN RETURN TRUE; END $f$;
SELECT pg_temp.chk('cannot add an item to a published plan', pg_temp.fails($q$INSERT INTO public.fee_plan_items(plan_id,fee_head_id,amount,billing_cycle) VALUES ('c5000000-0000-0000-0000-000000000001',(SELECT id FROM public.fee_heads WHERE code='SPORTS'),1,'one_time')$q$));
SELECT pg_temp.chk('cannot change an item of a published plan', pg_temp.fails($q$UPDATE public.fee_plan_items SET amount=1 WHERE plan_id='c5000000-0000-0000-0000-000000000001'$q$));
SELECT pg_temp.chk('cannot delete an item of a published plan', pg_temp.fails($q$DELETE FROM public.fee_plan_items WHERE plan_id='c5000000-0000-0000-0000-000000000001'$q$));
SELECT pg_temp.chk('published plan cannot return to Draft', pg_temp.fails($q$UPDATE public.fee_plans SET status='Draft' WHERE id='c5000000-0000-0000-0000-000000000001'$q$));
SELECT pg_temp.chk('published plan targeting cannot change', pg_temp.fails($q$UPDATE public.fee_plans SET department='DeptY' WHERE id='c5000000-0000-0000-0000-000000000001'$q$));
INSERT INTO public.fee_plans(id,name,academic_year) VALUES ('c5000000-0000-0000-0000-000000000002','Empty Plan','2026-27');
SELECT pg_temp.chk('empty plan cannot be published', pg_temp.fails($q$UPDATE public.fee_plans SET status='Published' WHERE id='c5000000-0000-0000-0000-000000000002'$q$));
SELECT pg_temp.chk('clone succeeds', (public.fee_plan_clone('c5000000-0000-0000-0000-000000000001','Smoke Plan v2','2027-28','c0000000-0000-0000-0000-000000000005')->>'success')='true');
SELECT pg_temp.chk('clone is an editable Draft with all items', (SELECT count(*)=4 FROM public.fee_plan_items i JOIN public.fee_plans p ON p.id=i.plan_id WHERE p.name='Smoke Plan v2' AND p.status='Draft'));

SELECT pg_temp.chk('preview counts and total', (SELECT (r->>'students')::int=3 AND (r->>'to_create')::int=11 AND (r->>'total_amount')::numeric=130500 AND (r->>'preview')::boolean
   FROM (SELECT public.fee_generate(false,'c5000000-0000-0000-0000-000000000001',NULL,NULL,NULL,'department','DeptX',NULL,NULL,NULL,NULL,true,true,'c0000000-0000-0000-0000-000000000005') r) x));
SELECT pg_temp.chk('preview writes nothing', (SELECT count(*) FROM public.student_fees WHERE student_record_id IS NOT NULL)=0 AND (SELECT count(*) FROM public.fee_runs)=0);
SELECT pg_temp.chk('execute creates the demands', (SELECT (r->>'created')::int=11 AND (r->>'total_amount')::numeric=130500
   FROM (SELECT public.fee_generate(true,'c5000000-0000-0000-0000-000000000001',NULL,NULL,NULL,'department','DeptX',NULL,NULL,NULL,NULL,true,true,'c0000000-0000-0000-0000-000000000005') r) x));
SELECT pg_temp.chk('one invoice per head, student has no login yet', (SELECT count(*)=4 FROM public.student_fees WHERE student_record_id='c4000000-0000-0000-0000-000000000001' AND student_id IS NULL AND original_amount=total_due));
SELECT pg_temp.chk('fee rows carry the student code automatically', (SELECT bool_and(student_code = 'FE-001') FROM public.student_fees WHERE student_record_id='c4000000-0000-0000-0000-000000000001'));
SELECT pg_temp.chk('lab fee skipped for semester 3', (SELECT count(*)=0 FROM public.student_fees f JOIN public.fee_heads h ON h.id=f.fee_head_id WHERE f.student_record_id='c4000000-0000-0000-0000-000000000003' AND h.code='LAB'));
SELECT pg_temp.chk('rerun bills nothing twice', (public.fee_generate(true,'c5000000-0000-0000-0000-000000000001',NULL,NULL,NULL,'department','DeptX',NULL,NULL,NULL,NULL,true,true,'c0000000-0000-0000-0000-000000000005')->>'code')='NOTHING_TO_BILL');
SELECT pg_temp.chk('semester run does not repeat semester fees', (public.fee_generate(false,'c5000000-0000-0000-0000-000000000001',NULL,NULL,NULL,'department','DeptX',NULL,1,NULL,NULL,false,false,'c0000000-0000-0000-0000-000000000005')->>'to_create')::int=0);
-- ad-hoc fee added mid-year to one class
SELECT pg_temp.chk('ad-hoc preview for a class (withdrawn student excluded)', (SELECT (r->>'students')::int=2 AND (r->>'total_amount')::numeric=2400
   FROM (SELECT public.fee_generate(false,NULL,(SELECT id FROM public.fee_heads WHERE code='UNIFORM'),1200,'Lab coat','class','ClassA',NULL,NULL,'2026-27',DATE '2026-09-30',false,false,'c0000000-0000-0000-0000-000000000005') r) x));
SELECT pg_temp.chk('ad-hoc executes', (public.fee_generate(true,NULL,(SELECT id FROM public.fee_heads WHERE code='UNIFORM'),1200,'Lab coat','class','ClassA',NULL,NULL,'2026-27',DATE '2026-09-30',false,false,'c0000000-0000-0000-0000-000000000005')->>'created')::int=2);
SELECT pg_temp.chk('identical ad-hoc double submit refused', (public.fee_generate(true,NULL,(SELECT id FROM public.fee_heads WHERE code='UNIFORM'),1200,'Lab coat','class','ClassA',NULL,NULL,'2026-27',DATE '2026-09-30',false,false,'c0000000-0000-0000-0000-000000000005')->>'code')='DUPLICATE_RUN');
SELECT pg_temp.chk('ad-hoc to a single student by student id', (public.fee_generate(true,NULL,(SELECT id FROM public.fee_heads WHERE code='TRANSPORT'),3000,NULL,'student','FE-004',NULL,NULL,'2026-27',DATE '2026-10-15',false,false,'c0000000-0000-0000-0000-000000000005')->>'created')::int=1);
SELECT pg_temp.chk('ad-hoc quota filter bills only the Management student', (public.fee_generate(true,NULL,(SELECT id FROM public.fee_heads WHERE code='DEVELOPMENT'),5000,NULL,'department','DeptX','Management',NULL,'2026-27',DATE '2026-11-01',false,false,'c0000000-0000-0000-0000-000000000005')->>'created')::int=1);
-- adjustments
SELECT pg_temp.chk('concession reduces balance, keeps history', (public.fee_adjust((SELECT f.id FROM public.student_fees f JOIN public.fee_heads h ON h.id=f.fee_head_id WHERE f.student_record_id='c4000000-0000-0000-0000-000000000001' AND h.code='TUITION'),'concession',10000,'Merit concession','c0000000-0000-0000-0000-000000000005')->>'balance_remaining')::numeric=30000);
SELECT pg_temp.chk('concession invariants hold', (SELECT original_amount=40000 AND waived_amount=10000 AND total_due=30000 AND paid_amount=0 FROM public.student_fees f JOIN public.fee_heads h ON h.id=f.fee_head_id WHERE f.student_record_id='c4000000-0000-0000-0000-000000000001' AND h.code='TUITION'));
SELECT pg_temp.chk('concession above balance refused', (public.fee_adjust((SELECT f.id FROM public.student_fees f JOIN public.fee_heads h ON h.id=f.fee_head_id WHERE f.student_record_id='c4000000-0000-0000-0000-000000000001' AND h.code='TUITION'),'waiver',99999,'too much','c0000000-0000-0000-0000-000000000005')->>'code')='EXCEEDS_BALANCE');
SELECT pg_temp.chk('reason is mandatory', (public.fee_adjust((SELECT id FROM public.student_fees WHERE student_record_id='c4000000-0000-0000-0000-000000000001' LIMIT 1),'waiver',1,' ','c0000000-0000-0000-0000-000000000005')->>'code')='REASON_REQUIRED');
-- payment for a student record WITHOUT a login
SELECT pg_temp.chk('pay a fee of a student with no login', (public.record_fee_payment((SELECT f.id FROM public.student_fees f JOIN public.fee_heads h ON h.id=f.fee_head_id WHERE f.student_record_id='c4000000-0000-0000-0000-000000000001' AND h.code='EXAM'),2000,'Cash',NULL,'smoke-fee-pay-001','c0000000-0000-0000-0000-000000000004')->>'success')='true');
SELECT pg_temp.chk('receipt carries student id + head name', EXISTS (SELECT 1 FROM public.fee_receipts WHERE roll_number='FE-001' AND fee_type='Examination fee' AND student_record_id='c4000000-0000-0000-0000-000000000001' AND student_id IS NULL));
SELECT pg_temp.chk('paid fee cannot be cancelled, only waived', (public.fee_adjust((SELECT f.id FROM public.student_fees f JOIN public.fee_heads h ON h.id=f.fee_head_id WHERE f.student_record_id='c4000000-0000-0000-0000-000000000001' AND h.code='EXAM'),'cancellation',NULL,'mistake','c0000000-0000-0000-0000-000000000005')->>'code')='NOTHING_DUE');
SELECT pg_temp.chk('unpaid fee can be cancelled', (public.fee_adjust((SELECT f.id FROM public.student_fees f JOIN public.fee_heads h ON h.id=f.fee_head_id WHERE f.student_record_id='c4000000-0000-0000-0000-000000000001' AND h.code='LAB'),'cancellation',NULL,'not applicable','c0000000-0000-0000-0000-000000000005')->>'status')='cancelled');
SELECT pg_temp.chk('cancelled fee can be billed again (new charge)', (SELECT (r->>'to_create')::int>=1 FROM (SELECT public.fee_generate(false,'c5000000-0000-0000-0000-000000000001',NULL,NULL,NULL,'student','FE-001',NULL,NULL,NULL,NULL,false,false,'c0000000-0000-0000-0000-000000000005') r) x));
-- cancelling a whole run keeps paid items
SELECT pg_temp.chk('cancel plan run: unpaid cancelled, paid kept, run stays open', (SELECT (r->>'kept_because_paid')::int=1 AND (r->>'run_closed')::boolean=false
   FROM (SELECT public.fee_cancel_run((SELECT run_id FROM public.student_fees WHERE student_record_id='c4000000-0000-0000-0000-000000000001' AND charge_key LIKE '%ONCE' LIMIT 1),'wrong plan','c0000000-0000-0000-0000-000000000005') r) x));
SELECT pg_temp.chk('cancel ad-hoc run closes it', (SELECT (r->>'run_closed')::boolean FROM (SELECT public.fee_cancel_run((SELECT id FROM public.fee_runs WHERE run_type='adhoc' AND description='Lab coat'),'raised in error','c0000000-0000-0000-0000-000000000005') r) x));
-- login created later adopts the student record AND its fees
INSERT INTO auth.users(id,email) VALUES ('c0000000-0000-0000-0000-000000000007','fe2@example.test');
INSERT INTO public.profiles(id,email,name,role,student_id) VALUES ('c0000000-0000-0000-0000-000000000007','fe2@example.test','Fee S2','student','FE-002');
SELECT pg_temp.chk('fees of the student are linked to the new login', (SELECT count(*)>0 AND bool_and(student_id='c0000000-0000-0000-0000-000000000007') FROM public.student_fees WHERE student_record_id='c4000000-0000-0000-0000-000000000002'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000007',true);
SELECT pg_temp.chk('student with login sees own fees only', (SELECT count(*)>0 FROM public.student_fees) AND (SELECT count(*)=0 FROM public.student_fees WHERE student_record_id<>'c4000000-0000-0000-0000-000000000002'));
SELECT pg_temp.chk('student cannot read fee plans', (SELECT count(*)=0 FROM public.fee_plans));
SELECT pg_temp.chk('fee functions not callable by authenticated', has_function_privilege('authenticated','public.fee_generate(boolean,uuid,uuid,numeric,text,text,text,text,integer,text,date,boolean,boolean,uuid)','EXECUTE')=false
   AND has_function_privilege('authenticated','public.fee_adjust(uuid,text,numeric,text,uuid)','EXECUTE')=false);
RESET ROLE;

-- ===================== 042 admission routes, quotas, form fields, required documents =====================
INSERT INTO public.admission_applications(id,application_number,applicant_name,email,phone,class_name,parent_name,parent_phone,status,academic_year,qualifying_marks,admission_type,quota) VALUES
 ('c6000000-0000-0000-0000-000000000001','RTE-ENT','Route Entrance','e@x.t','1','Route Course','P','1','Under Review','2026-27',80,'MERIT_ENTRANCE','GENERAL'),
 ('c6000000-0000-0000-0000-000000000002','RTE-MRK','Route Marks','m@x.t','1','Route Course','P','1','Under Review','2026-27',70,'MERIT_MARKS','GENERAL'),
 ('c6000000-0000-0000-0000-000000000003','RTE-DIR','Route Direct','d@x.t','1','Route Course','P','1','Under Review','2026-27',NULL,'DIRECT','MANAGEMENT'),
 ('c6000000-0000-0000-0000-000000000004','RTE-NON','No Route','n@x.t','1','Route Course','P','1','Under Review','2026-27',NULL,NULL,NULL);
SELECT pg_temp.chk('direct route: approved without test or merit', (public.admission_set_status('c6000000-0000-0000-0000-000000000003','Approved',NULL,'c0000000-0000-0000-0000-000000000005')->>'success')='true');
SELECT pg_temp.chk('no route set: old behaviour (approve works)', (public.admission_set_status('c6000000-0000-0000-0000-000000000004','Approved',NULL,'c0000000-0000-0000-0000-000000000005')->>'success')='true');
SELECT pg_temp.chk('entrance route cannot be approved without a completed test', (public.admission_set_status('c6000000-0000-0000-0000-000000000001','Approved',NULL,'c0000000-0000-0000-0000-000000000005')->>'code')='ENTRANCE_REQUIRED');
SELECT pg_temp.chk('merit route cannot be approved by hand', (public.admission_set_status('c6000000-0000-0000-0000-000000000002','Approved',NULL,'c0000000-0000-0000-0000-000000000005')->>'code')='MERIT_REQUIRED');
-- marks-only merit (weight 100): no entrance needed; DIRECT and no-route applications are not ranked into merit routes
SELECT pg_temp.chk('marks-only weight ranks GENERAL-quota applicants on marks alone; DIRECT and other quotas are not ranked', (SELECT (r->>'ranked')::int=2 AND r->'rows'->0->>'name'='Route Entrance' AND r->'rows'->1->>'name'='Route Marks' FROM (SELECT public.admission_publish_merit('Route Course','2026-27',5,100,'GENERAL','c0000000-0000-0000-0000-000000000005') r) x));
SELECT pg_temp.chk('all quotas: same two ranked; applicant with no marks is excluded', (SELECT (r->>'ranked')::int=2 AND jsonb_array_length(r->'excluded')=1 FROM (SELECT public.admission_publish_merit('Route Course','2026-27',5,100,NULL,'c0000000-0000-0000-0000-000000000005') r) x));
SELECT pg_temp.chk('apply merit: marks route approved, entrance route still blocked for lack of a test', (SELECT (r->>'updated')::int=1 AND r->'skipped'->0->>'reason' LIKE '%entrance test%' FROM (SELECT public.admission_apply_merit('Route Course','2026-27',NULL,'c0000000-0000-0000-0000-000000000005') r) x));
SELECT pg_temp.chk('merit-route applicant is now Approved', (SELECT status='Approved' FROM public.admission_applications WHERE id='c6000000-0000-0000-0000-000000000002'));
SELECT pg_temp.chk('merit flag does not leak to later approvals', COALESCE(current_setting('app.merit_apply', true),'') <> 'on');
-- quota seats from the matrix
INSERT INTO public.admission_seats(course_name,academic_year,quota_code,seats) VALUES ('Route Course','2026-27','GENERAL',1);
SELECT pg_temp.chk('seats default from the seat matrix for a quota', (SELECT (r->>'seats')::int=1 FROM (SELECT public.admission_publish_merit('Route Course','2026-27',NULL,100,'GENERAL','c0000000-0000-0000-0000-000000000005') r) x));
SELECT pg_temp.chk('no seats and no matrix row is refused', (public.admission_publish_merit('Route Course','2026-27',NULL,100,'NRI','c0000000-0000-0000-0000-000000000005')->>'code')='SEATS_REQUIRED');
-- required documents
INSERT INTO public.admission_required_documents(course_name,doc_type) VALUES ('Doc Course','12th Marksheet'),(NULL,'Photo ID');
INSERT INTO public.admission_applications(id,application_number,applicant_name,email,phone,class_name,parent_name,parent_phone,status) VALUES
 ('c7000000-0000-0000-0000-000000000001','DOC-001','Doc Applicant','dc@x.t','1','Doc Course','P','1','Under Review');
SELECT pg_temp.chk('missing required documents block approval and are named', (SELECT r->>'code'='DOCUMENTS_INCOMPLETE' AND r->>'error' LIKE '%12th Marksheet%' AND r->>'error' LIKE '%Photo ID%'
   FROM (SELECT public.admission_set_status('c7000000-0000-0000-0000-000000000001','Approved',NULL,'c0000000-0000-0000-0000-000000000005') r) x));
INSERT INTO public.admission_document_verifications(application_id,student_name,document_type,status) VALUES
 ('c7000000-0000-0000-0000-000000000001','Doc Applicant','12th Marksheet','Verified'),('c7000000-0000-0000-0000-000000000001','Doc Applicant','photo id','Verified');
SELECT pg_temp.chk('verified documents (case-insensitive) allow approval', (public.admission_set_status('c7000000-0000-0000-0000-000000000001','Approved',NULL,'c0000000-0000-0000-0000-000000000005')->>'success')='true');
-- custom form fields
INSERT INTO public.admission_form_fields(field_key,label,field_type,required,options,course_name) VALUES
 ('blood_donor','Blood donor','checkbox',false,NULL,NULL),
 ('hostel_pref','Hostel preference','select',true,ARRAY['Yes','No'],'Doc Course'),
 ('sports_level','Highest sports level','number',false,NULL,'Doc Course'),
 ('hidden_field','Hidden','text',true,NULL,'Other Course');
SELECT pg_temp.chk('required select missing is reported', (SELECT NOT (r->>'valid')::boolean AND r->'errors'->0->>'field'='hostel_pref' FROM (SELECT public.admission_validate_fields('Doc Course','{}'::jsonb) r) x));
SELECT pg_temp.chk('field of another course is not required', (SELECT (r->>'valid')::boolean FROM (SELECT public.admission_validate_fields('Doc Course','{"hostel_pref":"Yes"}'::jsonb) r) x));
SELECT pg_temp.chk('invalid option and non-number rejected', (SELECT jsonb_array_length(r->'errors')=2 FROM (SELECT public.admission_validate_fields('Doc Course','{"hostel_pref":"Maybe","sports_level":"abc"}'::jsonb) r) x));
SELECT pg_temp.chk('values are cleaned: typed, unknown keys dropped', (SELECT r->'cleaned'='{"hostel_pref":"Yes","sports_level":4,"blood_donor":true}'::jsonb
   FROM (SELECT public.admission_validate_fields('Doc Course','{"hostel_pref":"Yes","sports_level":"4","blood_donor":"true","evil":"x"}'::jsonb) r) x));
SELECT pg_temp.chk('admission config functions not callable by authenticated', has_function_privilege('authenticated','public.admission_validate_fields(text,jsonb)','EXECUTE')=false
   AND has_function_privilege('authenticated','public.admission_apply_merit(text,text,text,uuid)','EXECUTE')=false);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);
SELECT pg_temp.chk('student cannot read admission configuration', (SELECT count(*)=0 FROM public.admission_routes) AND (SELECT count(*)=0 FROM public.admission_form_fields));
RESET ROLE;

-- ===================== 043 library renew =====================
INSERT INTO public.library_books(id,book_code,title,author,category,subject,class_level,type,status,total_copies,available_copies)
  VALUES ('c8000000-0000-0000-0000-000000000001','LIB-SMK','Smoke Book','A','c','s','1','Physical','Available',2,2);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000003',true);   -- librarian
SELECT pg_temp.chk('librarian issues a book', (public.issue_library_book('c8000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',CURRENT_DATE+7)->>'success')='true');
SELECT pg_temp.chk('issue decrements copies exactly once', (SELECT available_copies=1 FROM public.library_books WHERE id='c8000000-0000-0000-0000-000000000001'));
SELECT pg_temp.chk('librarian can see issued books (RLS)', (SELECT count(*)>=1 FROM public.book_issues WHERE book_code='LIB-SMK'));
SELECT pg_temp.chk('renew extends the due date by 14 days', (public.renew_library_book((SELECT id FROM public.book_issues WHERE book_code='LIB-SMK' AND status='Issued' LIMIT 1))->>'due_date')::date = CURRENT_DATE+7+14);
SELECT pg_temp.chk('second renewal allowed', (public.renew_library_book((SELECT id FROM public.book_issues WHERE book_code='LIB-SMK' AND status='Issued' LIMIT 1))->>'renew_count')='2');
SELECT pg_temp.chk('third renewal refused (limit 2)', (public.renew_library_book((SELECT id FROM public.book_issues WHERE book_code='LIB-SMK' AND status='Issued' LIMIT 1))->>'error') LIKE '%maximum%');
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);   -- student
SELECT pg_temp.chk('student cannot renew', (public.renew_library_book((SELECT id FROM public.book_issues WHERE book_code='LIB-SMK' LIMIT 1))->>'error') LIKE 'Not authorized%');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT pg_temp.chk('anon cannot read admission documents', (SELECT count(*) FROM information_schema.role_table_grants WHERE grantee='anon' AND table_name IN ('admission_document_verifications','admission_merit_lists'))=0);
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);
SELECT pg_temp.chk('student cannot read admission documents', (SELECT count(*) FROM public.admission_document_verifications)=0);
SELECT pg_temp.chk('student cannot call admission_enroll', has_function_privilege('authenticated','public.admission_enroll(uuid,uuid,text,text)','EXECUTE')=false);
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000005',true);
SELECT pg_temp.chk('receptionist can read admission documents', (SELECT count(*) FROM public.admission_document_verifications)>=1);
RESET ROLE;

SELECT name, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result FROM _r ORDER BY ok, name;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM _r WHERE NOT ok) THEN RAISE EXCEPTION 'SMOKE TEST FAILED'; END IF;
END $$;
ROLLBACK;
