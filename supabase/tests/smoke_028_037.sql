-- Smoke test for migrations 028-039. Synthetic data only; everything is rolled back.
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
  FROM (SELECT public.admission_publish_merit('Merit Course','2026-27',2,50,'c0000000-0000-0000-0000-000000000005') r) x));
SELECT pg_temp.chk('republishing replaces, does not duplicate', (public.admission_publish_merit('Merit Course','2026-27',2,50,'c0000000-0000-0000-0000-000000000005')->>'ranked')='3'
   AND (SELECT count(*) FROM public.admission_merit_lists WHERE course_name='Merit Course')=3);
SELECT pg_temp.chk('weights outside 0-100 refused', (public.admission_publish_merit('Merit Course','2026-27',2,150,'c0000000-0000-0000-0000-000000000005')->>'code')='VALIDATION_ERROR');
SELECT pg_temp.chk('100% qualifying weight ignores entrance (C now ranks first)', (public.admission_publish_merit('Merit Course','2026-27',2,100,'c0000000-0000-0000-0000-000000000005')->'rows'->0->>'name')='Cand C');
SELECT pg_temp.chk('back to 50/50', (public.admission_publish_merit('Merit Course','2026-27',2,50,'c0000000-0000-0000-0000-000000000005')->>'selected')='2');
SELECT pg_temp.chk('apply merit: A,B approved, D waitlisted', (SELECT (r->>'updated')::int = 3 FROM (SELECT public.admission_apply_merit('Merit Course','2026-27','c0000000-0000-0000-0000-000000000005') r) x));
SELECT pg_temp.chk('statuses after apply', (SELECT string_agg(application_number||':'||status, ',' ORDER BY application_number) FROM public.admission_applications WHERE class_name='Merit Course' AND application_number IN ('MRT-A','MRT-B','MRT-D'))='MRT-A:Approved,MRT-B:Approved,MRT-D:Waitlisted');
SELECT pg_temp.chk('apply merit again changes nothing', (public.admission_apply_merit('Merit Course','2026-27','c0000000-0000-0000-0000-000000000005')->>'updated')='0');
SELECT pg_temp.chk('merit/test functions not callable by authenticated', has_function_privilege('authenticated','public.admission_publish_merit(text,text,integer,integer,uuid)','EXECUTE')=false
   AND has_function_privilege('authenticated','public.admission_schedule_tests(uuid[],date,uuid)','EXECUTE')=false);

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
