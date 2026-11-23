-- Check constraints
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: assignment_submissions assignment_score_range; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.assignment_submissions
    ADD CONSTRAINT assignment_score_range CHECK (((score IS NULL) OR ((score >= (0)::numeric) AND (score <= (100)::numeric)))) NOT VALID;

--
-- Name: hostel_out_passes hostel_out_passes_status_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.hostel_out_passes
    ADD CONSTRAINT hostel_out_passes_status_chk CHECK ((warden_status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Rejected'::text, 'Exited'::text, 'Returned'::text]))) NOT VALID;

--
-- Name: hostel_out_passes hostel_out_passes_times_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.hostel_out_passes
    ADD CONSTRAINT hostel_out_passes_times_chk CHECK (((expected_return_time IS NULL) OR (departure_time IS NULL) OR (expected_return_time > departure_time))) NOT VALID;

--
-- Name: inventory_transactions inventory_qty_pos; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.inventory_transactions
    ADD CONSTRAINT inventory_qty_pos CHECK ((quantity > 0)) NOT VALID;

--
-- Name: inventory_items inventory_stock_nonneg; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.inventory_items
    ADD CONSTRAINT inventory_stock_nonneg CHECK ((current_stock >= 0)) NOT VALID;

--
-- Name: staff_payroll_runs payroll_run_status_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.staff_payroll_runs
    ADD CONSTRAINT payroll_run_status_chk CHECK ((status = ANY (ARRAY['Draft'::text, 'Approved'::text, 'Disbursed'::text, 'Cancelled'::text]))) NOT VALID;

--
-- Name: placement_applications placement_app_status_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.placement_applications
    ADD CONSTRAINT placement_app_status_chk CHECK ((status = ANY (ARRAY['Applied'::text, 'Shortlisted'::text, 'Selected'::text, 'Rejected'::text, 'Withdrawn'::text]))) NOT VALID;

--
-- Name: placement_drives placement_drive_status_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.placement_drives
    ADD CONSTRAINT placement_drive_status_chk CHECK ((status = ANY (ARRAY['Open'::text, 'Shortlisting'::text, 'Completed'::text, 'Closed'::text]))) NOT VALID;

--
-- Name: staff_leave_applications staff_leave_dates_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.staff_leave_applications
    ADD CONSTRAINT staff_leave_dates_chk CHECK (((end_date >= start_date) AND (total_days >= 1) AND (total_days <= ((end_date - start_date) + 1)))) NOT VALID;

--
-- Name: staff_service_records staff_pay_nonneg; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.staff_service_records
    ADD CONSTRAINT staff_pay_nonneg CHECK (((basic_pay >= (0)::numeric) AND (da_pct >= (0)::numeric) AND (hra_pct >= (0)::numeric) AND (special_allowance >= (0)::numeric))) NOT VALID;

--
-- Name: store_orders store_orders_status_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.store_orders
    ADD CONSTRAINT store_orders_status_chk CHECK ((status = ANY (ARRAY['Pending'::text, 'Processing'::text, 'Delivered'::text, 'Cancelled'::text]))) NOT VALID;

--
-- Name: store_products store_products_nonneg; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.store_products
    ADD CONSTRAINT store_products_nonneg CHECK (((stock >= 0) AND (price >= (0)::numeric))) NOT VALID;

--
-- PostgreSQL database dump complete
--
