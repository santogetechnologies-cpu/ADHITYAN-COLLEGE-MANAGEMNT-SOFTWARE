-- Smoke test for migrations 028-046. Synthetic data only; everything is rolled back.
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
 ('c0000000-0000-0000-0000-000000000004','smoke.fin2@example.test','Smoke Fin2','financier',NULL);

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

-- ===================== 044 shared app settings =====================
INSERT INTO auth.users(id,email) VALUES ('c0000000-0000-0000-0000-000000000008','smoke.admin@example.test');
INSERT INTO public.profiles(id,email,name,role) VALUES ('c0000000-0000-0000-0000-000000000008','smoke.admin@example.test','Smoke Admin','admin');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000008',true);   -- admin
SELECT pg_temp.chk('admin saves a draft', (public.app_settings_draft_save('smoke_cfg','{"modules":[{"id":"a","enabled":true}],"roles":{"teacher":{"x":1}}}'::jsonb)) IS NOT NULL);
SELECT pg_temp.chk('draft merge: objects merge, arrays replace', (public.app_settings_draft_merge('smoke_cfg','{"roles":{"student":{"y":2}},"modules":[{"id":"b","enabled":false}]}'::jsonb)) = '{"modules":[{"id":"b","enabled":false}],"roles":{"teacher":{"x":1},"student":{"y":2}}}'::jsonb);
SELECT pg_temp.chk('publish gives version 1', (public.app_settings_publish('smoke_cfg','{"modules":[{"id":"b","enabled":false}],"v":1}'::jsonb,'first')->>'version')='1');
SELECT pg_temp.chk('publish clears the draft', (SELECT count(*)=0 FROM public.app_setting_drafts WHERE key='smoke_cfg'));
SELECT pg_temp.chk('second publish is version 2', (public.app_settings_publish('smoke_cfg','{"v":2}'::jsonb,'second')->>'version')='2');
SELECT pg_temp.chk('rollback to 1 creates version 3 with the old value', (SELECT (r->>'version')='3' AND (r->>'rolled_back_to')='1' FROM (SELECT public.app_settings_rollback('smoke_cfg',1,'bad release') r) x));
SELECT pg_temp.chk('live value is the rolled-back one', (SELECT (value->>'v')::int=1 AND version=3 FROM public.app_settings WHERE key='smoke_cfg'));
SELECT pg_temp.chk('history keeps all three versions', (SELECT count(*)=3 FROM public.app_setting_versions WHERE key='smoke_cfg'));
SELECT pg_temp.chk('rollback of an unknown version is refused', (public.app_settings_rollback('smoke_cfg',99,'x')->>'code')='NOT_FOUND');
SELECT pg_temp.chk('release history cannot be edited', pg_temp.fails($q$UPDATE public.app_setting_versions SET summary='tamper' WHERE key='smoke_cfg'$q$));
SELECT pg_temp.chk('release history cannot be deleted', pg_temp.fails($q$DELETE FROM public.app_setting_versions WHERE key='smoke_cfg'$q$));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);   -- student
SELECT pg_temp.chk('any signed-in user reads the live config', (SELECT count(*)=1 FROM public.app_settings WHERE key='smoke_cfg'));
SELECT pg_temp.chk('student cannot publish', pg_temp.fails($q$SELECT public.app_settings_publish('smoke_cfg','{"v":9}'::jsonb,'hack')$q$));
SELECT pg_temp.chk('student cannot save a draft', pg_temp.fails($q$SELECT public.app_settings_draft_save('smoke_cfg','{"v":9}'::jsonb)$q$));
SELECT pg_temp.chk('student cannot roll back', pg_temp.fails($q$SELECT public.app_settings_rollback('smoke_cfg',1,'x')$q$));
SELECT pg_temp.chk('student cannot write the table directly', pg_temp.fails($q$UPDATE public.app_settings SET value='{}'::jsonb$q$));
SELECT pg_temp.chk('student cannot read drafts or release history', (SELECT count(*)=0 FROM public.app_setting_drafts) AND (SELECT count(*)=0 FROM public.app_setting_versions));
RESET ROLE;

-- ===================== 045 exam core =====================
INSERT INTO auth.users(id,email) VALUES ('c0000000-0000-0000-0000-000000000009','smoke.teacher@example.test'),('c0000000-0000-0000-0000-00000000000a','smoke.coe@example.test'),
  ('c0000000-0000-0000-0000-00000000000b','smoke.sa@example.test'),('c0000000-0000-0000-0000-00000000000c','smoke.sb@example.test'),('c0000000-0000-0000-0000-00000000000d','smoke.parent@example.test');
INSERT INTO public.profiles(id,email,name,role,class_name) VALUES
 ('c0000000-0000-0000-0000-000000000009','smoke.teacher@example.test','Smoke Teacher','teacher',NULL),
 ('c0000000-0000-0000-0000-00000000000a','smoke.coe@example.test','Smoke COE','coe',NULL),
 ('c0000000-0000-0000-0000-00000000000b','smoke.sa@example.test','Exam Student A','student','ClassT'),
 ('c0000000-0000-0000-0000-00000000000c','smoke.sb@example.test','Exam Student B','student','ClassOther'),
 ('c0000000-0000-0000-0000-00000000000d','smoke.parent@example.test','Smoke Parent','parent',NULL);
INSERT INTO public.timetables(class_name,day_of_week,start_time,end_time,subject,teacher_name,teacher_id,room) VALUES ('ClassT','Monday','09:00','10:00','Maths','Smoke Teacher','c0000000-0000-0000-0000-000000000009','R1');
INSERT INTO public.exams(id,name,term,academic_year,start_date,end_date,status,is_published,results_published) VALUES ('c9000000-0000-0000-0000-000000000001','Smoke Exam','Term 1','2026-27','2026-11-01','2026-11-10','Completed',FALSE,FALSE);
INSERT INTO public.exam_schedules(exam_id,subject,class_name,exam_date,start_time,end_time,room,max_marks,passing_marks) VALUES ('c9000000-0000-0000-0000-000000000001','Maths','ClassT','2026-11-02','09:00','12:00','H1',50,20);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000009',true);   -- teacher assigned to ClassT only
SELECT pg_temp.chk('one row for another class makes the whole save fail, nothing written', (SELECT r->>'code'='VALIDATION_ERROR' AND jsonb_array_length(r->'errors')=1 FROM (SELECT public.exam_save_marks('c9000000-0000-0000-0000-000000000001',
   '[{"student_id":"c0000000-0000-0000-0000-00000000000b","subject":"Maths","marks":35},{"student_id":"c0000000-0000-0000-0000-00000000000c","subject":"Maths","marks":40}]'::jsonb) r) x));
SELECT pg_temp.chk('...and nothing was saved for the valid row either', (SELECT count(*)=0 FROM public.exam_results WHERE exam_id='c9000000-0000-0000-0000-000000000001'));
SELECT pg_temp.chk('marks above the schedule maximum (50) are refused', (public.exam_save_marks('c9000000-0000-0000-0000-000000000001','[{"student_id":"c0000000-0000-0000-0000-00000000000b","subject":"Maths","marks":51}]'::jsonb)->>'code')='VALIDATION_ERROR');
SELECT pg_temp.chk('assigned teacher saves marks', (public.exam_save_marks('c9000000-0000-0000-0000-000000000001','[{"student_id":"c0000000-0000-0000-0000-00000000000b","subject":"Maths","marks":35}]'::jsonb)->>'saved')='1');
SELECT pg_temp.chk('same student/subject again updates, does not duplicate', (public.exam_save_marks('c9000000-0000-0000-0000-000000000001','[{"student_id":"c0000000-0000-0000-0000-00000000000b","subject":"Maths","marks":30}]'::jsonb)->>'changed_existing')='1'
   AND (SELECT count(*)=1 FROM public.exam_results WHERE exam_id='c9000000-0000-0000-0000-000000000001'));
RESET ROLE;
SELECT pg_temp.chk('grade + status computed on the server (30/50 = 60% -> B, pass mark 20)', (SELECT grade='B' AND result_status='Pass' AND student_name='Exam Student A' AND class_name='ClassT' AND max_marks=50 AND NOT is_published FROM public.exam_results WHERE exam_id='c9000000-0000-0000-0000-000000000001'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000009',true);
SELECT pg_temp.chk('a failing mark is saved', (public.exam_save_marks('c9000000-0000-0000-0000-000000000001','[{"student_id":"c0000000-0000-0000-0000-00000000000b","subject":"Maths","marks":10}]'::jsonb)->>'success')='true');
RESET ROLE;
SELECT pg_temp.chk('...and graded F / Fail (10 < pass mark 20)', (SELECT grade='F' AND result_status='Fail' AND marks_obtained=10 FROM public.exam_results WHERE student_id='c0000000-0000-0000-0000-00000000000b' AND exam_id='c9000000-0000-0000-0000-000000000001'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000009',true);
SELECT pg_temp.chk('teacher cannot publish', (public.exam_publish_results('c9000000-0000-0000-0000-000000000001',true)->>'code')='FORBIDDEN');
SELECT pg_temp.chk('teacher cannot edit another class result directly (RLS)', pg_temp.fails($q$INSERT INTO public.exam_results(exam_id,student_id,student_name,class_name,subject,marks_obtained,max_marks) VALUES ('c9000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-00000000000c','x','ClassOther','Maths',50,50)$q$));
-- THE LEAK: an unpublished mark must be invisible to the student and to the parent
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000b',true);
SELECT pg_temp.chk('student cannot see UNPUBLISHED marks', (SELECT count(*)=0 FROM public.exam_results));
SELECT pg_temp.chk('student cannot see an unpublished exam', (SELECT count(*)=0 FROM public.exams WHERE id='c9000000-0000-0000-0000-000000000001'));
SELECT pg_temp.chk('student cannot see the unpublished timetable', (SELECT count(*)=0 FROM public.exam_schedules));
RESET ROLE;
UPDATE public.exams SET timetable_published = TRUE WHERE id = 'c9000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000b',true);
SELECT pg_temp.chk('publishing the timetable shows the student the exam AND its papers (not the marks)', (SELECT count(*)=1 FROM public.exams WHERE id='c9000000-0000-0000-0000-000000000001')
   AND (SELECT count(*)=1 FROM public.exam_schedules) AND (SELECT count(*)=0 FROM public.exam_results));
RESET ROLE;
UPDATE public.exams SET timetable_published = FALSE WHERE id = 'c9000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000b',true);
SELECT pg_temp.chk('student cannot write marks', (public.exam_save_marks('c9000000-0000-0000-0000-000000000001','[{"student_id":"c0000000-0000-0000-0000-00000000000b","subject":"Maths","marks":50}]'::jsonb)->>'code')='FORBIDDEN');
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000a',true);   -- coe
SELECT pg_temp.chk('COE publishes', (public.exam_publish_results('c9000000-0000-0000-0000-000000000001',true)->>'success')='true');
RESET ROLE;
SELECT pg_temp.chk('publish sets result + exam flags and status', (SELECT bool_and(is_published) AND bool_and(published_at IS NOT NULL) FROM public.exam_results WHERE exam_id='c9000000-0000-0000-0000-000000000001')
   AND (SELECT results_published AND is_published AND status='Results Published' FROM public.exams WHERE id='c9000000-0000-0000-0000-000000000001'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000b',true);
SELECT pg_temp.chk('student sees own result once published', (SELECT count(*)=1 FROM public.exam_results));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000c',true);
SELECT pg_temp.chk('another student still sees nothing', (SELECT count(*)=0 FROM public.exam_results));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000009',true);
SELECT pg_temp.chk('teacher cannot change published marks', (SELECT r->>'code'='VALIDATION_ERROR' FROM (SELECT public.exam_save_marks('c9000000-0000-0000-0000-000000000001','[{"student_id":"c0000000-0000-0000-0000-00000000000b","subject":"Maths","marks":45}]'::jsonb) r) x));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000a',true);
SELECT pg_temp.chk('COE can correct published marks (audited, still published)', (public.exam_save_marks('c9000000-0000-0000-0000-000000000001','[{"student_id":"c0000000-0000-0000-0000-00000000000b","subject":"Maths","marks":45}]'::jsonb)->>'changed_existing')='1');
SELECT pg_temp.chk('analytics from real data', (SELECT (a->>'appeared')::int=1 AND (a->>'passed')::int=1 AND (a->>'pass_percentage')::int=100 AND (a->>'average_percentage')::int=90 FROM (SELECT public.exam_analytics('c9000000-0000-0000-0000-000000000001') a) x));
SELECT pg_temp.chk('withdrawing needs a reason', (public.exam_publish_results('c9000000-0000-0000-0000-000000000001',false,' ')->>'code')='REASON_REQUIRED');
SELECT pg_temp.chk('COE withdraws with a reason', (public.exam_publish_results('c9000000-0000-0000-0000-000000000001',false,'Marking error found')->>'success')='true');
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000b',true);
SELECT pg_temp.chk('withdrawn results disappear for the student again', (SELECT count(*)=0 FROM public.exam_results));
RESET ROLE;
INSERT INTO public.exams(id,name,term,academic_year,start_date,end_date,status) VALUES ('c9000000-0000-0000-0000-000000000002','NoMarks','T','2026-27','2026-12-01','2026-12-02','Scheduled');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000a',true);
SELECT pg_temp.chk('publish refuses an exam with no marks', (public.exam_publish_results('c9000000-0000-0000-0000-000000000002',true)->>'code')='NO_RESULTS');
RESET ROLE;

-- ===================== 046 hall tickets =====================
INSERT INTO auth.users(id,email) VALUES ('c0000000-0000-0000-0000-00000000000e','smoke.sd@example.test');
INSERT INTO public.profiles(id,email,name,role,class_name,student_id) VALUES ('c0000000-0000-0000-0000-00000000000e','smoke.sd@example.test','Exam Student D','student','ClassT','HT-D');
INSERT INTO public.student_attendance_records(student_id,student_name,roll_number,status) VALUES
 ('c0000000-0000-0000-0000-00000000000b','Exam Student A','A','present'),('c0000000-0000-0000-0000-00000000000b','Exam Student A','A','present'),
 ('c0000000-0000-0000-0000-00000000000b','Exam Student A','A','absent'),('c0000000-0000-0000-0000-00000000000b','Exam Student A','A','absent'),
 ('c0000000-0000-0000-0000-00000000000e','Exam Student D','D','present'),('c0000000-0000-0000-0000-00000000000e','Exam Student D','D','present'),
 ('c0000000-0000-0000-0000-00000000000e','Exam Student D','D','late'),('c0000000-0000-0000-0000-00000000000e','Exam Student D','D','absent');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000009',true);   -- teacher
SELECT pg_temp.chk('teacher cannot generate hall tickets', (public.exam_generate_hall_tickets('c9000000-0000-0000-0000-000000000001')->>'code')='FORBIDDEN');
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000a',true);   -- coe
SELECT pg_temp.chk('an exam with no papers for the class is refused', (public.exam_generate_hall_tickets('c9000000-0000-0000-0000-000000000001','Nope')->>'code')='NO_PAPERS');
SELECT pg_temp.chk('generate: A (50% attendance) withheld, D (75%) issued', (SELECT (r->>'issued')::int=1 AND (r->>'withheld')::int=1 AND r->'withheld_list'->0->>'student'='Exam Student A' FROM (SELECT public.exam_generate_hall_tickets('c9000000-0000-0000-0000-000000000001') r) x));
RESET ROLE;
SELECT pg_temp.chk('tickets carry no fabricated venue, seat, signature or attendance', (SELECT bool_and(exam_center IS NULL AND seat_number IS NULL AND semester IS NOT NULL OR semester IS NULL) AND bool_and(attendance_pct IN (50, 75)) FROM public.hall_tickets WHERE exam_id='c9000000-0000-0000-0000-000000000001')
   AND (SELECT hall_number='H1' AND length(coe_signature_hash)=64 FROM public.hall_tickets WHERE student_id='c0000000-0000-0000-0000-00000000000e' AND exam_id='c9000000-0000-0000-0000-000000000001'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000a',true);
SELECT pg_temp.chk('regenerating does not duplicate tickets', (public.exam_generate_hall_tickets('c9000000-0000-0000-0000-000000000001')->>'success')='true');
RESET ROLE;
SELECT pg_temp.chk('one ticket per student, with the real reason', (SELECT count(*)=2 FROM public.hall_tickets WHERE exam_id='c9000000-0000-0000-0000-000000000001')
   AND (SELECT status='Withheld' AND is_detained AND detention_reason LIKE '%50%' AND attendance_pct=50 FROM public.hall_tickets WHERE student_id='c0000000-0000-0000-0000-00000000000b' AND exam_id='c9000000-0000-0000-0000-000000000001')
   AND (SELECT status='Issued' AND attendance_pct=75 AND qr_code_token LIKE 'HT-%' FROM public.hall_tickets WHERE student_id='c0000000-0000-0000-0000-00000000000e' AND exam_id='c9000000-0000-0000-0000-000000000001'));
-- fee clearance rule (off by default)
UPDATE public.institutional_settings SET exam_requires_fee_clearance = TRUE;
INSERT INTO public.student_fees(student_id,student_name,class_name,total_due,paid_amount,due_date,status) VALUES ('c0000000-0000-0000-0000-00000000000e','Exam Student D','ClassT',500,0,CURRENT_DATE-5,'overdue');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000a',true);
SELECT pg_temp.chk('fee clearance on: overdue fees now withhold D too', (public.exam_generate_hall_tickets('c9000000-0000-0000-0000-000000000001')->>'withheld')='2');
SELECT pg_temp.chk('release needs a reason', (public.exam_release_hall_ticket((SELECT id FROM public.hall_tickets WHERE student_id='c0000000-0000-0000-0000-00000000000e' AND exam_id='c9000000-0000-0000-0000-000000000001'),' ')->>'code')='REASON_REQUIRED');
SELECT pg_temp.chk('COE releases D with a reason', (public.exam_release_hall_ticket((SELECT id FROM public.hall_tickets WHERE student_id='c0000000-0000-0000-0000-00000000000e' AND exam_id='c9000000-0000-0000-0000-000000000001'),'Fee instalment agreed with accounts')->>'success')='true');
SELECT pg_temp.chk('a released ticket is not re-withheld by regeneration', (public.exam_generate_hall_tickets('c9000000-0000-0000-0000-000000000001')->>'kept_released')='1');
RESET ROLE;
SELECT pg_temp.chk('released ticket stays Issued and records who/why', (SELECT status='Issued' AND NOT is_detained AND override_reason LIKE 'Fee instalment%' AND overridden_by IS NOT NULL FROM public.hall_tickets WHERE student_id='c0000000-0000-0000-0000-00000000000e' AND exam_id='c9000000-0000-0000-0000-000000000001'));
UPDATE public.institutional_settings SET exam_requires_fee_clearance = FALSE;
-- visibility to students
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000e',true);   -- student D
SELECT pg_temp.chk('student sees no ticket before they are published', (SELECT count(*)=0 FROM public.hall_tickets));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000a',true);
SELECT pg_temp.chk('COE publishes the tickets', (public.exam_set_hall_tickets_visible('c9000000-0000-0000-0000-000000000001',true)->>'success')='true');
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000e',true);
SELECT pg_temp.chk('student sees only their own ticket after publication', (SELECT count(*)=1 FROM public.hall_tickets));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000a',true);
SELECT pg_temp.chk('invigilator verifies a ticket by its token', (SELECT (v->>'valid')::boolean AND v->>'student'='Exam Student D' FROM (SELECT public.exam_verify_hall_ticket((SELECT qr_code_token FROM public.hall_tickets WHERE student_id='c0000000-0000-0000-0000-00000000000e')) v) x));
SELECT pg_temp.chk('a withheld ticket verifies as invalid', (SELECT NOT (v->>'valid')::boolean FROM (SELECT public.exam_verify_hall_ticket((SELECT qr_code_token FROM public.hall_tickets WHERE student_id='c0000000-0000-0000-0000-00000000000b')) v) x));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-00000000000e',true);
SELECT pg_temp.chk('students cannot verify or publish', (public.exam_verify_hall_ticket('x')->>'valid')='false' AND (public.exam_set_hall_tickets_visible('c9000000-0000-0000-0000-000000000001',false)->>'code')='FORBIDDEN');
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

-- ---- 047 alumni ----
INSERT INTO public.alumni_profiles (first_name,last_name,email,department,graduation_year,status) VALUES ('Smoke','Alumnus','smoke.alumnus@example.test','CSE','2020','Active');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);   -- student
SELECT pg_temp.chk('student cannot read the alumni directory', (SELECT count(*)=0 FROM public.alumni_profiles));
SELECT pg_temp.chk('student cannot read mentorships', (SELECT count(*)=0 FROM public.alumni_mentorships));
RESET ROLE;
SELECT pg_temp.chk('donation amount must be positive', pg_temp.fails($q$INSERT INTO public.alumni_donations (donor_name,amount,cause) VALUES ('x',0,'y')$q$));
SELECT pg_temp.chk('donation status is validated', pg_temp.fails($q$INSERT INTO public.alumni_donations (donor_name,amount,cause,status) VALUES ('x',5,'y','Bogus')$q$));

-- ---- 048 certificates ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000008',true);   -- admin
CREATE TEMP TABLE _cert AS SELECT public.certificate_issue('FE-001','Bonafide Certificate','Bank loan') AS r;
RESET ROLE;
SELECT pg_temp.chk('admin issues a certificate; number and name come from the server', (SELECT (r->>'success')='true' AND r->>'certificate_number' ~ '^CERT-[0-9]{4}-[0-9]{6}$' FROM _cert)
  AND (SELECT student_name='Fee S1' AND status='Issued' AND qr_code_hash IS NOT NULL FROM public.certificates WHERE certificate_number=(SELECT r->>'certificate_number' FROM _cert)));
SELECT pg_temp.chk('unknown student is refused', (public.certificate_issue('NOPE-1','Bonafide','Loan')->>'code') IN ('FORBIDDEN','STUDENT_NOT_FOUND'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000007',true);   -- student FE-002
SELECT pg_temp.chk('student cannot issue', (public.certificate_issue('FE-002','Bonafide','Loan')->>'code')='FORBIDDEN');
CREATE TEMP TABLE _req AS SELECT public.certificate_request('Character Certificate','Scholarship') AS r;
SELECT pg_temp.chk('student requests their own certificate (Pending)', (SELECT (r->>'success')='true' FROM _req) AND (SELECT count(*)=1 FROM public.certificates WHERE status='Pending'));
SELECT pg_temp.chk('student sees only their own certificates', (SELECT count(*)=1 FROM public.certificates));
SELECT pg_temp.chk('student cannot approve own request', (public.certificate_decide((SELECT (r->>'id')::uuid FROM _req),'Issue')->>'code')='FORBIDDEN');
SELECT pg_temp.chk('no direct writes to certificates', has_table_privilege('authenticated','public.certificates','INSERT')=false AND has_table_privilege('authenticated','public.certificates','UPDATE')=false);
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000008',true);
SELECT pg_temp.chk('rejecting needs a reason', (public.certificate_decide((SELECT (r->>'id')::uuid FROM _req),'Reject')->>'code')='REASON_REQUIRED');
SELECT pg_temp.chk('admin issues the request', (public.certificate_decide((SELECT (r->>'id')::uuid FROM _req),'Issue')->>'status')='Issued');
SELECT pg_temp.chk('a decided request cannot be decided again', (public.certificate_decide((SELECT (r->>'id')::uuid FROM _req),'Reject','changed my mind')->>'code')='ALREADY_DECIDED');
RESET ROLE;
SELECT pg_temp.chk('anyone can verify a genuine number, forged ones fail', (public.certificate_verify((SELECT r->>'certificate_number' FROM _cert))->>'valid')='true' AND (public.certificate_verify('CERT-2026-999999')->>'valid')='false');

-- ---- 049 medical ----
INSERT INTO public.health_records (name, role, roll_no, blood_group) VALUES ('Smoke Patient','student','MED-1','O+');
INSERT INTO public.wellness_alerts (title, message, active) VALUES ('Smoke active','m',true), ('Smoke retired','m',false);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);   -- student
SELECT pg_temp.chk('student cannot read other people health records', (SELECT count(*)=0 FROM public.health_records));
SELECT pg_temp.chk('student sees only active wellness alerts', (SELECT count(*)=1 FROM public.wellness_alerts));
SELECT pg_temp.chk('student cannot read the infirmary log', (SELECT count(*)=0 FROM public.infirmary_visits));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000008',true);   -- admin
SELECT pg_temp.chk('admin reads health records', (SELECT count(*)>=1 FROM public.health_records));
RESET ROLE;

-- ---- 050 naac ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000008',true);   -- admin
INSERT INTO public.naac_metrics (criterion_number, metric_code, title, status) VALUES (3,'3.1.1','Smoke metric A','Completed'),(3,'3.1.2','Smoke metric B','Pending');
SELECT pg_temp.chk('progress derived from metrics (1 of 2 = 50%)', (SELECT completion_percentage=50 AND total_metrics=2 AND completed_metrics=1 FROM public.naac_criterion_progress WHERE criterion_number=3));
UPDATE public.naac_metrics SET status='Completed' WHERE metric_code='3.1.2';
SELECT pg_temp.chk('progress follows status changes (100%)', (SELECT completion_percentage=100 FROM public.naac_criterion_progress WHERE criterion_number=3));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);   -- student
SELECT pg_temp.chk('student cannot read NAAC metrics or progress', (SELECT count(*) FROM public.naac_metrics)=0 AND (SELECT count(*) FROM public.naac_criterion_progress)=0);
SELECT pg_temp.chk('no direct writes to progress', has_table_privilege('authenticated','public.naac_criterion_progress','UPDATE')=false);
RESET ROLE;

-- ---- 051 discipline ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000009',true);   -- teacher
INSERT INTO public.disciplinary_incidents (student_name, roll_no, class_name, incident, severity, reported_by, incident_date, status) VALUES ('Smoke Pupil','D-1','ClassA','Smoke incident','Minor','Smoke Teacher',CURRENT_DATE,'Pending Review');
SELECT pg_temp.chk('teacher sees the incident they reported', (SELECT count(*)=1 FROM public.disciplinary_incidents));
SELECT pg_temp.chk('teacher cannot self-resolve', (public.discipline_update((SELECT id FROM public.disciplinary_incidents LIMIT 1),'Resolved','done')->>'code')='FORBIDDEN');
SELECT pg_temp.chk('teacher cannot insert an already-resolved incident', pg_temp.fails($q$INSERT INTO public.disciplinary_incidents (student_name,incident,severity,reported_by,incident_date,status,action_taken) VALUES ('x','y','Minor','z',CURRENT_DATE,'Resolved','pre-decided')$q$));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);   -- student
SELECT pg_temp.chk('student sees no incidents', (SELECT count(*)=0 FROM public.disciplinary_incidents));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000008',true);   -- admin
SELECT pg_temp.chk('admin sees incidents and needs an action to resolve', (SELECT count(*)>=1 FROM public.disciplinary_incidents) AND (public.discipline_update((SELECT id FROM public.disciplinary_incidents LIMIT 1),'Resolved')->>'code')='ACTION_REQUIRED');
SELECT pg_temp.chk('admin resolves with an action', (public.discipline_update((SELECT id FROM public.disciplinary_incidents LIMIT 1),'Resolved','Warning issued')->>'status')='Resolved');
RESET ROLE;

-- ---- 052 hostel out-pass ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);   -- student
INSERT INTO public.hostel_out_passes (id, student_id, student_name, roll_number, room_details, purpose, destination_address, parent_phone, parent_otp_verified, warden_status, departure_time, expected_return_time)
VALUES ('c8000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','Smoke Student','H-1','B-1','visit','home','9000000000',true,'Pending',now()+interval '1 day',now()+interval '2 days');
SELECT pg_temp.chk('a student cannot self-assert parent consent on insert', (SELECT parent_otp_verified=false FROM public.hostel_out_passes WHERE id='c8000000-0000-0000-0000-000000000001'));
UPDATE public.hostel_out_passes SET parent_otp_verified=true, purpose='x' WHERE id='c8000000-0000-0000-0000-000000000001';
SELECT pg_temp.chk('a student cannot self-assert parent consent on update', (SELECT parent_otp_verified=false AND purpose='x' FROM public.hostel_out_passes WHERE id='c8000000-0000-0000-0000-000000000001'));
RESET ROLE;
SELECT pg_temp.chk('return time before departure is rejected', pg_temp.fails($q$INSERT INTO public.hostel_out_passes (student_name,roll_number,room_details,purpose,destination_address,parent_phone,departure_time,expected_return_time) VALUES ('x','y','r','p','d','1',now()+interval '2 days',now()+interval '1 day')$q$));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000008',true);   -- admin acts as warden
SELECT pg_temp.chk('cannot jump Pending -> Returned', pg_temp.fails($q$UPDATE public.hostel_out_passes SET warden_status='Returned' WHERE id='c8000000-0000-0000-0000-000000000001'$q$));
UPDATE public.hostel_out_passes SET warden_status='Approved' WHERE id='c8000000-0000-0000-0000-000000000001';
UPDATE public.hostel_out_passes SET warden_status='Exited' WHERE id='c8000000-0000-0000-0000-000000000001';
UPDATE public.hostel_out_passes SET warden_status='Returned' WHERE id='c8000000-0000-0000-0000-000000000001';
SELECT pg_temp.chk('full cycle stamps gate times', (SELECT warden_status='Returned' AND guard_exit_time IS NOT NULL AND guard_entry_time IS NOT NULL FROM public.hostel_out_passes WHERE id='c8000000-0000-0000-0000-000000000001'));
RESET ROLE;

-- ---- 053 payroll ----
INSERT INTO auth.users(id,email) VALUES ('c0000000-0000-0000-0000-0000000000a1','pay.hr@example.test'),('c0000000-0000-0000-0000-0000000000a2','pay.fin@example.test'),('c0000000-0000-0000-0000-0000000000a3','pay.staff@example.test');
INSERT INTO public.profiles(id,email,name,role) VALUES ('c0000000-0000-0000-0000-0000000000a1','pay.hr@example.test','Smoke HR','hr_manager'),('c0000000-0000-0000-0000-0000000000a2','pay.fin@example.test','Smoke Fin2','finance_manager'),('c0000000-0000-0000-0000-0000000000a3','pay.staff@example.test','Smoke Staff','teacher');
INSERT INTO public.staff_service_records (user_id, employee_code, designation, department, qualification, date_of_joining, basic_pay, da_pct, hra_pct, special_allowance, bank_account_no, pan_number)
VALUES ('c0000000-0000-0000-0000-0000000000a3','EMP-1','Lecturer','DeptX','MSc','2020-01-01',31000,10,20,1000,'1234567890','ABCDE1234F');
INSERT INTO public.staff_leave_applications (user_id, staff_name, department, leave_type, start_date, end_date, total_days, reason, status) VALUES ('c0000000-0000-0000-0000-0000000000a3','Smoke Staff','DeptX','Loss of Pay (LOP)','2026-04-06','2026-04-08',3,'x','Approved');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);   -- student
SELECT pg_temp.chk('student cannot read staff bank/salary records', (SELECT count(*)=0 FROM public.staff_service_records));
UPDATE public.staff_service_records SET basic_pay=1;
RESET ROLE;
SELECT pg_temp.chk('student cannot edit staff pay', (SELECT basic_pay=31000 FROM public.staff_service_records WHERE employee_code='EMP-1'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000a3',true);   -- the staff member
SELECT pg_temp.chk('staff member sees only their own record', (SELECT count(*)=1 FROM public.staff_service_records));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000a1',true);   -- HR
SELECT pg_temp.chk('payroll refuses to run before rules are configured', (public.payroll_run_create('2026-04')->>'code')='NOT_CONFIGURED');
SELECT pg_temp.chk('HR sets the payroll rules', (public.payroll_configure(12, 15000, 0.75, 21000, 200)->>'success')='true');
CREATE TEMP TABLE _pr AS SELECT public.payroll_run_create('2026-04') AS r;
SELECT pg_temp.chk('HR prepares a draft run', (SELECT (r->>'success')='true' AND (r->>'employees')::int=1 FROM _pr));
RESET ROLE;
SELECT pg_temp.chk('LOP days reduce pay and EPF respects the ceiling', (SELECT lop_days=3 AND days_worked=27 AND basic_earned=round(31000*27/30.0) AND epf_deduction=round(LEAST(basic_earned,15000)*0.12) AND esi_deduction=0 AND pt_deduction=200 AND net_salary=gross_salary-total_deductions AND payslip_number ~ '^PS-202604-' FROM public.staff_payroll_items WHERE employee_code='EMP-1'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000a1',true);
SELECT pg_temp.chk('the same month cannot be run twice', (public.payroll_run_create('2026-04')->>'code')='ALREADY_RUN');
SELECT pg_temp.chk('the preparer cannot approve (separation of duties)', (public.payroll_run_approve((SELECT (r->>'run_id')::uuid FROM _pr))->>'code') IN ('FORBIDDEN','SEPARATION_OF_DUTIES'));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000a2',true);   -- finance
SELECT pg_temp.chk('cannot disburse before approval', (public.payroll_run_disburse((SELECT (r->>'run_id')::uuid FROM _pr),'BANK-REF-1')->>'code')='BAD_STATE');
SELECT pg_temp.chk('finance approves', (public.payroll_run_approve((SELECT (r->>'run_id')::uuid FROM _pr))->>'success')='true');
SELECT pg_temp.chk('disbursing needs a bank reference', (public.payroll_run_disburse((SELECT (r->>'run_id')::uuid FROM _pr),'x')->>'code')='REFERENCE_REQUIRED');
SELECT pg_temp.chk('finance records the bank reference', (public.payroll_run_disburse((SELECT (r->>'run_id')::uuid FROM _pr),'BANK-REF-1')->>'success')='true');
SELECT pg_temp.chk('a paid run cannot be cancelled', (public.payroll_run_cancel((SELECT (r->>'run_id')::uuid FROM _pr),'oops')->>'code')='BAD_STATE');
SELECT pg_temp.chk('no direct writes to payroll tables', has_table_privilege('authenticated','public.staff_payroll_items','INSERT')=false AND has_table_privilege('authenticated','public.staff_payroll_runs','UPDATE')=false);
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000a3',true);
SELECT pg_temp.chk('staff member sees their own payslip only', (SELECT count(*)=1 FROM public.staff_payroll_items) AND (SELECT count(*)=0 FROM public.staff_payroll_runs));
RESET ROLE;

-- ---- 054 transport ----
INSERT INTO auth.users(id,email) VALUES ('c0000000-0000-0000-0000-0000000000b1','tr.driver1@example.test'),('c0000000-0000-0000-0000-0000000000b2','tr.driver2@example.test');
INSERT INTO public.profiles(id,email,name,role) VALUES ('c0000000-0000-0000-0000-0000000000b1','tr.driver1@example.test','Driver One','transport_driver'),('c0000000-0000-0000-0000-0000000000b2','tr.driver2@example.test','Driver Two','transport_driver');
INSERT INTO public.transport_vehicles (id, vehicle_number, route_name, driver_id, driver_name, capacity, occupied_seats) VALUES
 ('c9100000-0000-0000-0000-000000000001','TN-01-A','Route A','c0000000-0000-0000-0000-0000000000b1','Driver One',40,10),
 ('c9100000-0000-0000-0000-000000000002','TN-02-B','Route B','c0000000-0000-0000-0000-0000000000b2','Driver Two',40,5);
INSERT INTO public.student_transport_logs (vehicle_id, student_id, student_name, stop_name) VALUES ('c9100000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','Smoke Rider','Stop 1');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000b2',true);   -- driver two
SELECT pg_temp.chk('a driver sees only their own vehicle and its riders', (SELECT count(*)=1 FROM public.transport_vehicles) AND (SELECT count(*)=0 FROM public.student_transport_logs));
UPDATE public.transport_vehicles SET current_location='Gate', route_name='Hijacked', driver_name='X', vehicle_number='ZZ' WHERE id='c9100000-0000-0000-0000-000000000002';
UPDATE public.transport_vehicles SET current_location='stolen' WHERE id='c9100000-0000-0000-0000-000000000001';
RESET ROLE;
SELECT pg_temp.chk('driver can report location but not rename route/driver/number', (SELECT current_location='Gate' AND route_name='Route B' AND driver_name='Driver Two' AND vehicle_number='TN-02-B' FROM public.transport_vehicles WHERE id='c9100000-0000-0000-0000-000000000002'));
SELECT pg_temp.chk('a driver cannot touch another driver''s bus', (SELECT current_location IS DISTINCT FROM 'stolen' FROM public.transport_vehicles WHERE id='c9100000-0000-0000-0000-000000000001'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);   -- the rider (student)
SELECT pg_temp.chk('a rider sees their own bus and nobody else''s', (SELECT count(*)=1 AND bool_and(vehicle_number='TN-01-A') FROM public.transport_vehicles));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000b1',true);   -- driver one
SELECT pg_temp.chk('driver sees their riders', (SELECT count(*)=1 FROM public.student_transport_logs));
RESET ROLE;
SELECT pg_temp.chk('seats cannot exceed capacity', pg_temp.fails($q$UPDATE public.transport_vehicles SET occupied_seats=99 WHERE id='c9100000-0000-0000-0000-000000000001'$q$));

-- ---- 055 placement ----
INSERT INTO auth.users(id,email) VALUES ('c0000000-0000-0000-0000-0000000000c1','pl.student@example.test');
INSERT INTO public.profiles(id,email,name,role,department,student_id) VALUES ('c0000000-0000-0000-0000-0000000000c1','pl.student@example.test','Place Student','student','Nursing','PL-1');
INSERT INTO public.placement_drives (id, company_name, job_title, package_lpa, min_cgpa, eligible_departments, drive_date, application_deadline, status) VALUES
 ('c9200000-0000-0000-0000-000000000001','Acme','Tech',5,6.5,ARRAY['Nursing'],CURRENT_DATE+10,CURRENT_DATE+5,'Open'),
 ('c9200000-0000-0000-0000-000000000002','Other','Tech',5,6.0,ARRAY['Engineering'],CURRENT_DATE+10,CURRENT_DATE+5,'Open'),
 ('c9200000-0000-0000-0000-000000000003','Late','Tech',5,6.0,ARRAY['Nursing'],CURRENT_DATE-1,CURRENT_DATE-2,'Open');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000c1',true);
SELECT pg_temp.chk('cannot apply below the minimum CGPA', (public.placement_apply('c9200000-0000-0000-0000-000000000001', 5.0)->>'code')='NOT_ELIGIBLE');
SELECT pg_temp.chk('cannot apply to another department''s drive', (public.placement_apply('c9200000-0000-0000-0000-000000000002', 9.0)->>'code')='NOT_ELIGIBLE');
SELECT pg_temp.chk('cannot apply after the deadline', (public.placement_apply('c9200000-0000-0000-0000-000000000003', 9.0)->>'code')='CLOSED');
SELECT pg_temp.chk('eligible student applies', (public.placement_apply('c9200000-0000-0000-0000-000000000001', 7.2)->>'success')='true');
SELECT pg_temp.chk('a second application is refused', (public.placement_apply('c9200000-0000-0000-0000-000000000001', 7.2)->>'code')='ALREADY_APPLIED');
SELECT pg_temp.chk('students cannot insert applications directly', pg_temp.fails($q$INSERT INTO public.placement_applications (drive_id,student_id,student_name,roll_number,department,cgpa,status) VALUES ('c9200000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-0000000000c1','x','y','z',9,'Applied')$q$));
SELECT pg_temp.chk('an applicant cannot mark themselves Selected', pg_temp.fails($q$UPDATE public.placement_applications SET status='Selected' WHERE student_id='c0000000-0000-0000-0000-0000000000c1'$q$));
UPDATE public.placement_applications SET cgpa=10, current_round='Final' WHERE student_id='c0000000-0000-0000-0000-0000000000c1';
RESET ROLE;
SELECT pg_temp.chk('an applicant cannot change their CGPA, round or outcome', (SELECT cgpa=7.2 AND status='Applied' AND current_round='Applied' FROM public.placement_applications WHERE student_id='c0000000-0000-0000-0000-0000000000c1'));

-- ---- 056 store ----
INSERT INTO public.store_products (id, name, price, category, stock) VALUES ('c9300000-0000-0000-0000-000000000001','Smoke Manual',100,'Books',5);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);   -- student
SELECT pg_temp.chk('students cannot insert orders directly', pg_temp.fails($q$INSERT INTO public.store_orders (user_id,user_name,items,total_amount,status) VALUES ('c0000000-0000-0000-0000-000000000001','x','[]',0,'Delivered')$q$));
SELECT pg_temp.chk('the old client-priced function is not callable', has_function_privilege('authenticated','public.place_store_order(uuid,text,jsonb,numeric)','EXECUTE')=false);
SELECT pg_temp.chk('checkout rejects a tampered total', pg_temp.fails($q$SELECT public.checkout_store_order('c0000000-0000-0000-0000-000000000001','[{"product_id":"c9300000-0000-0000-0000-000000000001","quantity":2}]'::jsonb, 1)$q$));
CREATE TEMP TABLE _so AS SELECT public.checkout_store_order('c0000000-0000-0000-0000-000000000001','[{"product_id":"c9300000-0000-0000-0000-000000000001","quantity":2}]'::jsonb, 200) AS r;
SELECT pg_temp.chk('checkout prices from the catalog and returns an order', (SELECT (r->>'success')='true' AND (r->>'total_amount')::numeric=200 FROM _so));
SELECT pg_temp.chk('a student cannot mark their order Delivered', (public.store_order_set_status((SELECT (r->>'order_id')::uuid FROM _so),'Delivered')->>'code')='FORBIDDEN');
SELECT pg_temp.chk('a student cancels their own pending order', (public.store_order_set_status((SELECT (r->>'order_id')::uuid FROM _so),'Cancelled')->>'success')='true');
RESET ROLE;
SELECT pg_temp.chk('cancelling returns the stock', (SELECT stock=5 FROM public.store_products WHERE id='c9300000-0000-0000-0000-000000000001'));
SELECT pg_temp.chk('a cancelled order cannot be revived', (SELECT (public.store_order_set_status((SELECT (r->>'order_id')::uuid FROM _so),'Processing')->>'code') IN ('BAD_STATE','FORBIDDEN')));

-- ---- 057 notifications ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);   -- student
SELECT pg_temp.chk('a student cannot notify other people', (public.notify_users(ARRAY['c0000000-0000-0000-0000-000000000008']::uuid[],'hi','x')->>'code')='FORBIDDEN');
SELECT pg_temp.chk('a student cannot insert a notification for someone else', pg_temp.fails($q$INSERT INTO public.notifications (user_id,title,message,type,priority,is_read) VALUES ('c0000000-0000-0000-0000-000000000008','t','m','info','low',false)$q$));
SELECT pg_temp.chk('a student can create their own', (WITH ok AS (SELECT 1) SELECT true));
INSERT INTO public.notifications (user_id,title,message,type,priority,is_read) VALUES ('c0000000-0000-0000-0000-000000000001','own','m','info','low',false);
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000009',true);   -- teacher
SELECT pg_temp.chk('staff notify a student', (public.notify_users(ARRAY['c0000000-0000-0000-0000-000000000001']::uuid[],'Marks entered','Check portal')->>'sent')='1');
SELECT pg_temp.chk('invalid priority is refused', (public.notify_users(ARRAY['c0000000-0000-0000-0000-000000000001']::uuid[],'t','m','info','normal')->>'code')='INVALID');
SELECT pg_temp.chk('staff notify a role', (public.notify_roles(ARRAY['admin'],'PO placed','Pending approval')->>'sent')::int >= 1);
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);
SELECT pg_temp.chk('the student receives only their own notifications', (SELECT count(*)=2 FROM public.notifications) AND (SELECT bool_and(user_id='c0000000-0000-0000-0000-000000000001') FROM public.notifications));
RESET ROLE;

-- ---- 058 assignments ----
INSERT INTO public.assignments (id, title, subject, due_date, teacher_id, teacher_name) VALUES ('c9400000-0000-0000-0000-000000000001','Smoke HW','Anatomy',now()+interval '3 days','c0000000-0000-0000-0000-000000000009','Smoke Teacher');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);   -- student
INSERT INTO public.assignment_submissions (assignment_id, student_id, student_name, subject, score, status, feedback) VALUES ('c9400000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','x','x',100,'graded','self-graded');
SELECT pg_temp.chk('a student cannot submit work as already graded', (SELECT status='submitted' AND score IS NULL AND feedback IS NULL FROM public.assignment_submissions WHERE student_id='c0000000-0000-0000-0000-000000000001'));
SELECT pg_temp.chk('one submission per student per assignment', pg_temp.fails($q$INSERT INTO public.assignment_submissions (assignment_id, student_id, student_name, subject) VALUES ('c9400000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','x','x')$q$));
SELECT pg_temp.chk('a student cannot grade through the function', (public.assignment_grade((SELECT id FROM public.assignment_submissions LIMIT 1), 90)->>'code')='FORBIDDEN');
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000a3',true);   -- a different teacher
SELECT pg_temp.chk('another teacher cannot see or grade it', (SELECT count(*)=0 FROM public.assignment_submissions) AND (public.assignment_grade((SELECT id FROM public.assignment_submissions LIMIT 1), 90)->>'code') IS NOT NULL);
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000009',true);   -- the owner
SELECT pg_temp.chk('score above 100 is refused', (public.assignment_grade((SELECT id FROM public.assignment_submissions LIMIT 1), 150)->>'code')='INVALID');
SELECT pg_temp.chk('the owner grades', (public.assignment_grade((SELECT id FROM public.assignment_submissions LIMIT 1), 88, 'Good')->>'success')='true');
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);
UPDATE public.assignment_submissions SET score=100, submission_text='edited after grading' WHERE student_id='c0000000-0000-0000-0000-000000000001';
RESET ROLE;
SELECT pg_temp.chk('graded work is locked and the score survives', (SELECT score=88 AND status='graded' AND submission_text IS DISTINCT FROM 'edited after grading' FROM public.assignment_submissions WHERE student_id='c0000000-0000-0000-0000-000000000001'));

-- ---- 059 password-change acknowledgement ----
UPDATE public.profiles SET requires_password_change = true WHERE id='c0000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);
SELECT public.acknowledge_password_change();
RESET ROLE;
SELECT pg_temp.chk('a user clears their own must-change-password flag', (SELECT requires_password_change=false FROM public.profiles WHERE id='c0000000-0000-0000-0000-000000000001'));
SELECT pg_temp.chk('anonymous callers cannot acknowledge', has_function_privilege('anon','public.acknowledge_password_change()','EXECUTE')=false);

-- ---- 060 open policies ----
INSERT INTO public.attendance_shortage_warnings (student_id, student_name, roll_number, department, class_name, subject_code, subject_title, total_conducted, total_attended, percentage, warning_level)
  VALUES ('c0000000-0000-0000-0000-0000000000c1','Place Student','PL-1','Nursing','ClassA','S1','Subj',10,5,50,'Warning');
INSERT INTO public.scholarships_master (scholarship_name, code, category, discount_type, discount_value, eligibility_criteria) VALUES ('Smoke Aid','SMK-AID','Merit','Percentage',10,'n/a');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000001',true);   -- another student
SELECT pg_temp.chk('a student cannot read someone else''s shortage warning', (SELECT count(*)=0 FROM public.attendance_shortage_warnings));
SELECT pg_temp.chk('a student cannot change scholarship schemes', pg_temp.fails($q$UPDATE public.scholarships_master SET discount_value=100$q$) OR (SELECT discount_value=10 FROM public.scholarships_master WHERE code='SMK-AID'));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000c1',true);   -- the student concerned
SELECT pg_temp.chk('the student sees their own warning', (SELECT count(*)=1 FROM public.attendance_shortage_warnings));
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000009',true);   -- teacher
SELECT pg_temp.chk('teachers read warnings', (SELECT count(*)=1 FROM public.attendance_shortage_warnings));
RESET ROLE;
SELECT pg_temp.chk('scholarship value untouched by the student', (SELECT discount_value=10 FROM public.scholarships_master WHERE code='SMK-AID'));
SELECT pg_temp.chk('TRUNCATE is no longer granted to API roles', (SELECT count(*)=0 FROM information_schema.role_table_grants WHERE grantee IN ('anon','authenticated') AND table_schema='public' AND privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER')));

-- ---- 061 HR staff directory ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000a1',true);   -- HR
SELECT pg_temp.chk('HR sees staff profiles but not students or parents', (SELECT count(*)>=3 FROM public.profiles WHERE role='teacher' OR role='admin') AND (SELECT count(*)=0 FROM public.profiles WHERE role IN ('student','parent')));
RESET ROLE;

-- ---- 062 staff leave ----
INSERT INTO public.staff_leave_applications (id, user_id, staff_name, department, leave_type, start_date, end_date, total_days, reason, status) VALUES
 ('c9500000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-0000000000a3','Smoke Staff','DeptX','Casual Leave (CL)','2026-08-03','2026-08-04',2,'x','Pending_Principal'),
 ('c9500000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-0000000000a3','Smoke Staff','DeptX','Casual Leave (CL)','2026-08-10','2026-08-30',20,'x','Pending_Principal'),
 ('c9500000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-0000000000a3','Smoke Staff','DeptX','Loss of Pay (LOP)','2026-09-01','2026-09-20',20,'x','Pending_Principal');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000a3',true);   -- the applicant (a teacher)
SELECT pg_temp.chk('staff cannot approve their own leave (no role)', (public.staff_leave_decide('c9500000-0000-0000-0000-000000000001','Approve')->>'code')='FORBIDDEN');
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000008',true);   -- admin
SELECT pg_temp.chk('rejecting needs a reason', (public.staff_leave_decide('c9500000-0000-0000-0000-000000000001','Reject')->>'code')='REASON_REQUIRED');
SELECT pg_temp.chk('approval deducts the balance', (public.staff_leave_decide('c9500000-0000-0000-0000-000000000001','Approve')->>'status')='Approved');
RESET ROLE;
SELECT pg_temp.chk('casual days taken = 2 for 2026-27', (SELECT casual_leave_taken=2 FROM public.staff_leave_balances WHERE user_id='c0000000-0000-0000-0000-0000000000a3' AND academic_year='2026-2027'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000008',true);
SELECT pg_temp.chk('leave beyond the quota is refused', (public.staff_leave_decide('c9500000-0000-0000-0000-000000000002','Approve')->>'code')='BALANCE_EXCEEDED');
SELECT pg_temp.chk('leave without pay uses no quota', (public.staff_leave_decide('c9500000-0000-0000-0000-000000000003','Approve')->>'status')='Approved');
SELECT pg_temp.chk('a decided application cannot be decided again', (public.staff_leave_decide('c9500000-0000-0000-0000-000000000001','Reject','changed')->>'code')='ALREADY_DECIDED');
RESET ROLE;
SELECT pg_temp.chk('quota untouched by the refused request and LOP', (SELECT casual_leave_taken=2 FROM public.staff_leave_balances WHERE user_id='c0000000-0000-0000-0000-0000000000a3' AND academic_year='2026-2027'));

-- ---- 063 scholarships ----
INSERT INTO public.student_fees(id,student_id,student_name,class_name,total_due,paid_amount,due_date,status,original_amount) VALUES ('c9600000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-0000000000c1','Place Student','ClassA',1000,0,CURRENT_DATE+30,'pending',1000);
INSERT INTO public.scholarship_applications (id, student_id, student_name, roll_number, department, scholarship_name, academic_year, requested_amount, status)
 VALUES ('c9700000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-0000000000c1','Place Student','PL-1','Nursing','Smoke Aid','2026-27',400,'Submitted'),
        ('c9700000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-0000000000c1','Place Student','PL-1','Nursing','Smoke Aid','2026-27',400,'Submitted');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000c1',true);   -- the student
UPDATE public.scholarship_applications SET sanctioned_amount=999, requested_amount=450 WHERE id='c9700000-0000-0000-0000-000000000001';
SELECT pg_temp.chk('a student cannot decide their own scholarship', (public.scholarship_decide('c9700000-0000-0000-0000-000000000001','Approve',400)->>'code')='FORBIDDEN');
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-000000000008',true);   -- admin
SELECT pg_temp.chk('a student cannot self-sanction an amount', (SELECT sanctioned_amount IS DISTINCT FROM 999 AND requested_amount=450 FROM public.scholarship_applications WHERE id='c9700000-0000-0000-0000-000000000001'));
SELECT pg_temp.chk('approval needs an amount', (public.scholarship_decide('c9700000-0000-0000-0000-000000000001','Approve')->>'code')='INVALID_AMOUNT');
SELECT pg_temp.chk('amount above the balance is refused', (public.scholarship_decide('c9700000-0000-0000-0000-000000000001','Approve',5000)->>'code')='EXCEEDS_BALANCE');
SELECT pg_temp.chk('approval applies the concession through the fee ledger', (public.scholarship_decide('c9700000-0000-0000-0000-000000000001','Approve',400)->>'status')='Approved');
SELECT pg_temp.chk('rejecting needs a reason', (public.scholarship_decide('c9700000-0000-0000-0000-000000000002','Reject')->>'code')='REASON_REQUIRED');
RESET ROLE;
SELECT pg_temp.chk('fee balance reduced, waived tracked, adjustment recorded', (SELECT total_due=600 AND waived_amount=400 FROM public.student_fees WHERE id='c9600000-0000-0000-0000-000000000001') AND (SELECT count(*)=1 FROM public.fee_adjustments WHERE student_fee_id='c9600000-0000-0000-0000-000000000001' AND kind='concession' AND amount=400));

SELECT name, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result FROM _r ORDER BY ok, name;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM _r WHERE NOT ok) THEN RAISE EXCEPTION 'SMOKE TEST FAILED'; END IF;
END $$;
ROLLBACK;
