-- Table and function privileges, part 4 of 4
-- Generated from the verified schema. Run as is; do not edit. Safe to run once on an EMPTY database.
SET check_function_bodies = false;
SET search_path = public, extensions;

SET check_function_bodies = false;

--
-- Name: SEQUENCE fee_receipt_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.fee_receipt_seq TO anon;
GRANT ALL ON SEQUENCE public.fee_receipt_seq TO authenticated;
GRANT ALL ON SEQUENCE public.fee_receipt_seq TO service_role;

--
-- Name: TABLE fee_receipts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fee_receipts TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fee_receipts TO authenticated;
GRANT ALL ON TABLE public.fee_receipts TO service_role;

--
-- Name: TABLE fee_runs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fee_runs TO authenticated;
GRANT ALL ON TABLE public.fee_runs TO service_role;

--
-- Name: TABLE fee_structures; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fee_structures TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fee_structures TO authenticated;
GRANT ALL ON TABLE public.fee_structures TO service_role;

--
-- Name: TABLE feedback_submissions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.feedback_submissions TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.feedback_submissions TO authenticated;
GRANT ALL ON TABLE public.feedback_submissions TO service_role;

--
-- Name: TABLE finance_transactions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.finance_transactions TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.finance_transactions TO authenticated;
GRANT ALL ON TABLE public.finance_transactions TO service_role;

--
-- Name: TABLE grade_scale_bands; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.grade_scale_bands TO anon;
GRANT SELECT ON TABLE public.grade_scale_bands TO authenticated;
GRANT ALL ON TABLE public.grade_scale_bands TO service_role;

--
-- Name: TABLE grade_scales; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.grade_scales TO anon;
GRANT SELECT ON TABLE public.grade_scales TO authenticated;
GRANT ALL ON TABLE public.grade_scales TO service_role;

--
-- Name: TABLE hall_tickets; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.hall_tickets TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.hall_tickets TO authenticated;
GRANT ALL ON TABLE public.hall_tickets TO service_role;

--
-- Name: TABLE health_records; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.health_records TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.health_records TO authenticated;
GRANT ALL ON TABLE public.health_records TO service_role;

--
-- Name: TABLE hostel_allotments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.hostel_allotments TO anon;
GRANT SELECT ON TABLE public.hostel_allotments TO authenticated;
GRANT ALL ON TABLE public.hostel_allotments TO service_role;

--
-- Name: TABLE hostel_out_passes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.hostel_out_passes TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.hostel_out_passes TO authenticated;
GRANT ALL ON TABLE public.hostel_out_passes TO service_role;

--
-- Name: TABLE hostel_rooms; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.hostel_rooms TO anon;
GRANT SELECT ON TABLE public.hostel_rooms TO authenticated;
GRANT ALL ON TABLE public.hostel_rooms TO service_role;

--
-- Name: TABLE infirmary_visits; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.infirmary_visits TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.infirmary_visits TO authenticated;
GRANT ALL ON TABLE public.infirmary_visits TO service_role;

--
-- Name: TABLE institutional_broadcasts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.institutional_broadcasts TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.institutional_broadcasts TO authenticated;
GRANT ALL ON TABLE public.institutional_broadcasts TO service_role;

--
-- Name: TABLE institutional_settings; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.institutional_settings TO authenticated;
GRANT ALL ON TABLE public.institutional_settings TO service_role;

--
-- Name: TABLE integration_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.integration_settings TO service_role;

--
-- Name: TABLE inventory_items; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.inventory_items TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.inventory_items TO authenticated;
GRANT ALL ON TABLE public.inventory_items TO service_role;

--
-- Name: TABLE inventory_transactions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.inventory_transactions TO anon;
GRANT SELECT ON TABLE public.inventory_transactions TO authenticated;
GRANT ALL ON TABLE public.inventory_transactions TO service_role;

--
-- Name: TABLE learning_content; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.learning_content TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.learning_content TO authenticated;
GRANT ALL ON TABLE public.learning_content TO service_role;

--
-- Name: TABLE library_books; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.library_books TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.library_books TO authenticated;
GRANT ALL ON TABLE public.library_books TO service_role;

--
-- Name: TABLE library_circulation; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.library_circulation TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.library_circulation TO authenticated;
GRANT ALL ON TABLE public.library_circulation TO service_role;

--
-- Name: TABLE medical_emergency_contacts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.medical_emergency_contacts TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.medical_emergency_contacts TO authenticated;
GRANT ALL ON TABLE public.medical_emergency_contacts TO service_role;

--
-- Name: TABLE naac_criterion_progress; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.naac_criterion_progress TO anon;
GRANT SELECT ON TABLE public.naac_criterion_progress TO authenticated;
GRANT ALL ON TABLE public.naac_criterion_progress TO service_role;

--
-- Name: TABLE naac_documents; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.naac_documents TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.naac_documents TO authenticated;
GRANT ALL ON TABLE public.naac_documents TO service_role;

--
-- Name: TABLE naac_metrics; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.naac_metrics TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.naac_metrics TO authenticated;
GRANT ALL ON TABLE public.naac_metrics TO service_role;

--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notifications TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

--
-- Name: TABLE parent_student_links; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.parent_student_links TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.parent_student_links TO authenticated;
GRANT ALL ON TABLE public.parent_student_links TO service_role;

--
-- Name: TABLE payment_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payment_events TO service_role;

--
-- Name: TABLE payment_order_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payment_order_items TO service_role;
GRANT SELECT ON TABLE public.payment_order_items TO authenticated;

--
-- Name: TABLE payment_orders; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payment_orders TO service_role;
GRANT SELECT ON TABLE public.payment_orders TO authenticated;

--
-- Name: TABLE payment_refunds; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payment_refunds TO service_role;
GRANT SELECT ON TABLE public.payment_refunds TO authenticated;

--
-- Name: TABLE payment_settlements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payment_settlements TO service_role;
GRANT SELECT ON TABLE public.payment_settlements TO authenticated;

--
-- Name: TABLE payroll_settings; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.payroll_settings TO anon;
GRANT SELECT ON TABLE public.payroll_settings TO authenticated;
GRANT ALL ON TABLE public.payroll_settings TO service_role;

--
-- Name: SEQUENCE payslip_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.payslip_seq TO anon;
GRANT ALL ON SEQUENCE public.payslip_seq TO authenticated;
GRANT ALL ON SEQUENCE public.payslip_seq TO service_role;

--
-- Name: TABLE placement_applications; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.placement_applications TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.placement_applications TO authenticated;
GRANT ALL ON TABLE public.placement_applications TO service_role;

--
-- Name: TABLE placement_drives; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.placement_drives TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.placement_drives TO authenticated;
GRANT ALL ON TABLE public.placement_drives TO service_role;

--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.profiles TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

--
-- Name: TABLE reception_appointments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reception_appointments TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reception_appointments TO authenticated;
GRANT ALL ON TABLE public.reception_appointments TO service_role;

--
-- Name: TABLE reception_enquiries; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reception_enquiries TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reception_enquiries TO authenticated;
GRANT ALL ON TABLE public.reception_enquiries TO service_role;

--
-- Name: TABLE reception_visitors; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reception_visitors TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reception_visitors TO authenticated;
GRANT ALL ON TABLE public.reception_visitors TO service_role;

--
-- Name: TABLE scholarship_applications; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.scholarship_applications TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.scholarship_applications TO authenticated;
GRANT ALL ON TABLE public.scholarship_applications TO service_role;

--
-- Name: TABLE scholarships_master; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.scholarships_master TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.scholarships_master TO authenticated;
GRANT ALL ON TABLE public.scholarships_master TO service_role;

--
-- Name: TABLE sections; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sections TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sections TO authenticated;
GRANT ALL ON TABLE public.sections TO service_role;

--
-- Name: TABLE sports_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sports_events TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sports_events TO authenticated;
GRANT ALL ON TABLE public.sports_events TO service_role;

--
-- Name: TABLE sports_teams; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sports_teams TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sports_teams TO authenticated;
GRANT ALL ON TABLE public.sports_teams TO service_role;

--
-- Name: TABLE staff_leave_applications; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.staff_leave_applications TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.staff_leave_applications TO authenticated;
GRANT ALL ON TABLE public.staff_leave_applications TO service_role;

--
-- Name: TABLE staff_leave_balances; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.staff_leave_balances TO anon;
GRANT SELECT ON TABLE public.staff_leave_balances TO authenticated;
GRANT ALL ON TABLE public.staff_leave_balances TO service_role;

--
-- Name: TABLE staff_payroll_items; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.staff_payroll_items TO anon;
GRANT SELECT ON TABLE public.staff_payroll_items TO authenticated;
GRANT ALL ON TABLE public.staff_payroll_items TO service_role;

--
-- Name: TABLE staff_payroll_runs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.staff_payroll_runs TO anon;
GRANT SELECT ON TABLE public.staff_payroll_runs TO authenticated;
GRANT ALL ON TABLE public.staff_payroll_runs TO service_role;

--
-- Name: TABLE staff_service_records; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.staff_service_records TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.staff_service_records TO authenticated;
GRANT ALL ON TABLE public.staff_service_records TO service_role;

--
-- Name: TABLE store_orders; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.store_orders TO anon;
GRANT SELECT ON TABLE public.store_orders TO authenticated;
GRANT ALL ON TABLE public.store_orders TO service_role;

--
-- Name: TABLE store_products; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.store_products TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.store_products TO authenticated;
GRANT ALL ON TABLE public.store_products TO service_role;

--
-- Name: TABLE student_achievements; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_achievements TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_achievements TO authenticated;
GRANT ALL ON TABLE public.student_achievements TO service_role;

--
-- Name: TABLE student_attendance; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_attendance TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_attendance TO authenticated;
GRANT ALL ON TABLE public.student_attendance TO service_role;

--
-- Name: TABLE student_attendance_records; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_attendance_records TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_attendance_records TO authenticated;
GRANT ALL ON TABLE public.student_attendance_records TO service_role;

--
-- Name: TABLE student_fees; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_fees TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_fees TO authenticated;
GRANT ALL ON TABLE public.student_fees TO service_role;

--
-- Name: TABLE student_goals; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_goals TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_goals TO authenticated;
GRANT ALL ON TABLE public.student_goals TO service_role;

--
-- Name: SEQUENCE student_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.student_id_seq TO anon;
GRANT ALL ON SEQUENCE public.student_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.student_id_seq TO service_role;

--
-- Name: TABLE student_learning_progress; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_learning_progress TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_learning_progress TO authenticated;
GRANT ALL ON TABLE public.student_learning_progress TO service_role;

--
-- Name: TABLE student_leave_requests; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.student_leave_requests TO anon;
GRANT SELECT ON TABLE public.student_leave_requests TO authenticated;
GRANT ALL ON TABLE public.student_leave_requests TO service_role;

--
-- Name: TABLE student_lifecycle_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.student_lifecycle_events TO anon;
GRANT SELECT ON TABLE public.student_lifecycle_events TO authenticated;
GRANT ALL ON TABLE public.student_lifecycle_events TO service_role;

--
-- Name: TABLE student_mood_checkins; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_mood_checkins TO authenticated;
GRANT ALL ON TABLE public.student_mood_checkins TO service_role;

--
-- Name: TABLE student_promotions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.student_promotions TO anon;
GRANT SELECT ON TABLE public.student_promotions TO authenticated;
GRANT ALL ON TABLE public.student_promotions TO service_role;

--
-- Name: TABLE student_transport_logs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_transport_logs TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_transport_logs TO authenticated;
GRANT ALL ON TABLE public.student_transport_logs TO service_role;

--
-- Name: TABLE super_admin_audit_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.super_admin_audit_logs TO service_role;
GRANT SELECT,INSERT ON TABLE public.super_admin_audit_logs TO authenticated;

--
-- Name: TABLE super_admin_configs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.super_admin_configs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.super_admin_configs TO authenticated;

--
-- Name: TABLE super_admin_releases; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.super_admin_releases TO service_role;
GRANT SELECT,INSERT ON TABLE public.super_admin_releases TO authenticated;

--
-- Name: TABLE teacher_messages; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.teacher_messages TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.teacher_messages TO authenticated;
GRANT ALL ON TABLE public.teacher_messages TO service_role;

--
-- Name: TABLE timetables; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.timetables TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.timetables TO authenticated;
GRANT ALL ON TABLE public.timetables TO service_role;

--
-- Name: TABLE transport_assignments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.transport_assignments TO anon;
GRANT SELECT ON TABLE public.transport_assignments TO authenticated;
GRANT ALL ON TABLE public.transport_assignments TO service_role;

--
-- Name: TABLE transport_stops; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transport_stops TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transport_stops TO authenticated;
GRANT ALL ON TABLE public.transport_stops TO service_role;

--
-- Name: TABLE transport_vehicles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transport_vehicles TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transport_vehicles TO authenticated;
GRANT ALL ON TABLE public.transport_vehicles TO service_role;

--
-- Name: TABLE vehicle_maintenance; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.vehicle_maintenance TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.vehicle_maintenance TO authenticated;
GRANT ALL ON TABLE public.vehicle_maintenance TO service_role;

--
-- Name: TABLE wellness_alerts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.wellness_alerts TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.wellness_alerts TO authenticated;
GRANT ALL ON TABLE public.wellness_alerts TO service_role;

--
-- Name: TABLE wellness_checkins; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.wellness_checkins TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.wellness_checkins TO authenticated;
GRANT ALL ON TABLE public.wellness_checkins TO service_role;

--
-- PostgreSQL database dump complete
--
