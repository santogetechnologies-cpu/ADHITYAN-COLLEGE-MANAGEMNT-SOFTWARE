-- Smoke test for migrations 028-036. Synthetic data only; everything is rolled back.
-- Run against a SCRATCH/STAGING database that has 001-015 + 028-036 applied (never production):
--   psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/smoke_028_036.sql
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

SELECT name, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result FROM _r ORDER BY ok, name;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM _r WHERE NOT ok) THEN RAISE EXCEPTION 'SMOKE TEST FAILED'; END IF;
END $$;
ROLLBACK;
