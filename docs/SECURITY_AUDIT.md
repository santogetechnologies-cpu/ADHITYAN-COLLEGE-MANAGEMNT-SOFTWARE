# Authoritative Security & Authorization Audit

> **Document Version:** 2.2.0 (Phase 0 Complete Source Verification)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment  
> **Core Objective:** Deep-dive verification of authentication, authorization, Row Level Security (RLS) policies, privilege escalation vectors, and data isolation boundaries.

---

## 1. Architectural Security Boundary: Single-Institution Deployment

> **Core Invariant**: Each college operates its own independent software deployment and its own private Supabase PostgreSQL instance.

### Security Guarantees
1. **Zero Cross-Institution Attack Surface**:
   - Because deployments do not share database clusters, tenant-hopping and cross-college data access are physically impossible.
2. **Absence of Platform Super Admin Master Key**:
   - There is no platform-level super admin key or global multi-tenant backdoor. The root authority is the college's own `admin`.
3. **Dedicated Encryption & Secrets**:
   - Database credentials, JWT signing secrets, and Supabase service role keys are unique to the institution's private project.

---

## 2. Authentication & Session Security

### Token Protocol & Session Recovery
1. **Supabase Auth (GoTrue)**:
   - Issues HMAC-SHA256 signed JSON Web Tokens (JWT).
   - Access tokens have a 1-hour expiration; refresh tokens are persisted in browser local storage and exchanged automatically by the Supabase JS client.
2. **Session Persistence**:
   - Handled in [`src/context/AuthContext.tsx`](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/src/context/AuthContext.tsx). Upon application initialization, `supabase.auth.getSession()` validates the token with Supabase and loads user profile metadata.
3. **Password Security**:
   - Salting and hashing are performed using bcrypt inside Supabase Auth. Plaintext passwords are never stored in the database.

### Vulnerability Analysis: AuthContext Metadata Precedence (`BUG-SEC-002`)
- **Audit Finding**: In `src/context/AuthContext.tsx#L60-L75`:
  ```typescript
  const meta = authUser.user_metadata || {};
  const email = (authUser.email || '').toLowerCase();
  let fallbackRole: UserRole = 'student';
  if (email.startsWith('admin') || email.includes('admin@')) fallbackRole = 'admin';
  const resolvedRole = (meta.role || profileData?.preferences?.role || profileData?.role || fallbackRole) as UserRole;
  ```
- **Severity**: **Critical (P0)**.
- **Attack Vector**:
  - `meta.role` (user metadata in auth token, which can be passed on user registration) takes priority over the official `profileData.role` stored in PostgreSQL.
  - `profileData?.preferences?.role` (a JSONB field that users can update via profile preferences!) takes precedence over `profileData.role`.
  - Any email starting with `admin` automatically falls back to administrative roles.
  - In contrast, PostgreSQL's `public.get_current_user_role()` queries `public.profiles.role`. This causes severe client-vs-database desynchronization.
- **Mandatory Remediation in Phase 1**:
  Rewrite `mapAuthToUser` to strictly prioritize the database `profileData.role`:
  ```typescript
  const resolvedRole = (profileData?.role || 'student') as UserRole;
  ```

---

## 3. Privilege Escalation & Role Self-Modification Vulnerability

### Vulnerability Analysis: `public.profiles` UPDATE Policy
- **Audit Finding**: In [`supabase/migrations/002_row_level_security.sql#L77-L81`](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/002_row_level_security.sql#L77-L81):
  ```sql
  CREATE POLICY "Allow users to update own profile"
      ON public.profiles FOR UPDATE
      TO authenticated
      USING (id = auth.uid() OR public.get_current_user_role() = 'admin')
      WITH CHECK (id = auth.uid() OR public.get_current_user_role() = 'admin');
  ```
- **Severity**: **Critical** (Flagged as `BUG-SEC-001`).
- **Attack Vector**:
  - While the React UI in `AuthContext.tsx#L187-L215` only sends `{ avatar_url, preferences }`, an authenticated student can issue a direct REST request to Supabase PostgREST:
    ```bash
    PATCH /rest/v1/profiles?id=eq.<student_uuid>
    Headers: Authorization: Bearer <student_jwt>
    Body: { "role": "admin" }
    ```
  - Because `id = auth.uid()` evaluates to `TRUE`, PostgreSQL permits the row update. The student has successfully elevated privileges to `admin`.
- **Mandatory Remediation in Phase 1**:
  Deploy a PostgreSQL `BEFORE UPDATE` trigger on `public.profiles`:
  ```sql
  CREATE OR REPLACE FUNCTION public.protect_profile_role_update()
  RETURNS TRIGGER AS $$
  BEGIN
      IF NEW.role IS DISTINCT FROM OLD.role AND public.get_current_user_role() NOT IN ('admin') THEN
          RAISE EXCEPTION 'Access Denied: You cannot modify your own institutional role.';
      END IF;
      IF NEW.student_id IS DISTINCT FROM OLD.student_id AND public.get_current_user_role() NOT IN ('admin') THEN
          RAISE EXCEPTION 'Access Denied: You cannot modify your institutional student ID.';
      END IF;
      IF NEW.roll_number IS DISTINCT FROM OLD.roll_number AND public.get_current_user_role() NOT IN ('admin') THEN
          RAISE EXCEPTION 'Access Denied: You cannot modify your official roll number.';
      END IF;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
  CREATE TRIGGER trg_protect_profile_role
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role_update();
  ```

---

## 4. Row Level Security (RLS) Policy Vulnerabilities

### Overly Permissive Policies Identified in Migration 011
- **Audit Finding**: In [`supabase/migrations/011_institutional_complete_erp.sql#L419-L420`](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/011_institutional_complete_erp.sql#L419-L420):
  ```sql
  CREATE POLICY "att_sessions_all" ON public.class_attendance_sessions FOR ALL TO authenticated USING (true);
  CREATE POLICY "att_records_all" ON public.student_attendance_records FOR ALL TO authenticated USING (true);
  ```
- **Severity**: **High** (Flagged as `BUG-RLS-001`).
- **Attack Vector**: Any authenticated student or guest can write, modify, or delete class attendance sessions and attendance records directly through PostgREST.
- **Mandatory Remediation in Phase 1**:
  ```sql
  DROP POLICY IF EXISTS "att_sessions_all" ON public.class_attendance_sessions;
  CREATE POLICY "Teachers and Admins can manage attendance sessions"
      ON public.class_attendance_sessions FOR ALL TO authenticated
      USING (public.get_current_user_role() IN ('teacher', 'hod', 'admin', 'principal'))
      WITH CHECK (public.get_current_user_role() IN ('teacher', 'hod', 'admin', 'principal'));

  CREATE POLICY "Students and Parents can view class sessions"
      ON public.class_attendance_sessions FOR SELECT TO authenticated
      USING (true);
  ```

---

## 5. Parent-Child Data Isolation Audit

### Policy Verification
- **Audit Finding**: In [`supabase/migrations/024_student_parent_portal_complete_workflow.sql#L149-L180`](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/024_student_parent_portal_complete_workflow.sql#L149-L180):
  ```sql
  CREATE POLICY "Parents can view linked children attendance"
      ON public.student_attendance FOR SELECT TO authenticated
      USING (
          student_id = auth.uid()
          OR student_id IN (
              SELECT psl.student_id FROM public.parent_student_links psl
              WHERE psl.parent_id = auth.uid() AND psl.verified = true
          )
          OR public.get_current_user_role() IN ('admin', 'principal', 'teacher', 'receptionist')
      );
  ```
- **Status**: **Verified Secure**.
- **Assessment**: Parents cannot see attendance, grades, or fee records of students who are not explicitly mapped to them in `parent_student_links` with `verified = true`.

---

## 6. Service Role Key Isolation & Edge Functions

1. **Client-Side Build Isolation**:
   - `SUPABASE_SERVICE_ROLE_KEY` is strictly absent from the client-side bundle. Only `VITE_SUPABASE_ANON_KEY` is packaged by Vite.
2. **Edge Functions Authorization**:
   - Edge Functions (`admin-create-user`, `admin-users`) require an Authorization Bearer header.
   - The functions call `supabase.auth.getUser(token)` and verify caller's profile role is `'admin'`.
   - Execution is rejected with HTTP 403 Forbidden for non-admin tokens.

---

## 7. Security Action Plan Summary

| Security Task | File / Migration Target | Action Required | Priority |
| :--- | :--- | :--- | :---: |
| **Fix Profile Role Self-Modification** | `public.profiles` | Add `BEFORE UPDATE` trigger raising exception on unauthorized role change | **Critical (P0)** |
| **Tighten Attendance Sessions RLS** | `public.class_attendance_sessions` | Replace `USING (true)` with role-restricted policy | **High (P0)** |
| **Add Unique Session Constraint** | `public.class_attendance_sessions` | Prevent duplicate session conduct increments | **High (P1)** |
| **Update Profiles Role Constraint** | `public.profiles` | Add `'coe'` and `'hod'` to `profiles_role_check` | **High (P1)** |
