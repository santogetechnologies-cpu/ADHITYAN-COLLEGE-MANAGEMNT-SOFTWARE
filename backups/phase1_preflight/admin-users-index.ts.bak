import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ROLES = [
  "admin",
  "principal",
  "student",
  "parent",
  "teacher",
  "receptionist",
  "store_manager",
  "finance_manager",
  "transport_driver",
  "hr_manager",
  "librarian",
  "hostel_warden",
  "placement_officer"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization token", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // 1. Verify caller user identity
    const { data: { user: callerUser }, error: callerError } = await userClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(
        JSON.stringify({ error: callerError?.message || "Invalid or expired session", code: "SESSION_EXPIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Role check: Only admin can perform user management
    const callerRole = callerUser.user_metadata?.role;
    if (callerRole !== "admin") {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Administrator privileges required", code: "FORBIDDEN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "list_users": {
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        const users = listData.users.map((u) => {
          const isBanned = u.banned_until && new Date(u.banned_until).getTime() > Date.now();
          return {
            id: u.id,
            email: u.email || "",
            name: u.user_metadata?.name || u.email?.split("@")[0] || "User",
            role: u.user_metadata?.role || "student",
            department: u.user_metadata?.department || "",
            class_name: u.user_metadata?.class_name || "",
            phone: u.user_metadata?.phone || "",
            status: isBanned ? "inactive" : (u.user_metadata?.status || "active"),
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
          };
        });

        return new Response(JSON.stringify({ success: true, users }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_user": {
        const { user: newUser } = body;
        if (!newUser?.email || !newUser?.password || !newUser?.role) {
          return new Response(
            JSON.stringify({ error: "Email, password, and role are required.", code: "VALIDATION_ERROR" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const cleanEmail = newUser.email.trim().toLowerCase();

        if (!ALLOWED_ROLES.includes(newUser.role)) {
          return new Response(
            JSON.stringify({ error: `Invalid role: ${newUser.role}`, code: "INVALID_ROLE" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (newUser.password.length < 6) {
          return new Response(
            JSON.stringify({ error: "Password must be at least 6 characters long.", code: "WEAK_PASSWORD" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Duplicate email check
        const { data: allUsersData, error: listCheckError } = await supabaseAdmin.auth.admin.listUsers();
        if (listCheckError) throw listCheckError;

        const duplicate = allUsersData.users.find((u) => u.email?.toLowerCase() === cleanEmail);
        if (duplicate) {
          return new Response(
            JSON.stringify({
              error: `A user with email "${cleanEmail}" already exists (Role: ${duplicate.user_metadata?.role || 'user'}).`,
              code: "DUPLICATE_EMAIL"
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create Auth user
        const { data: createdData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: newUser.password,
          email_confirm: true,
          user_metadata: {
            name: newUser.name?.trim() || cleanEmail.split("@")[0],
            role: newUser.role,
            department: newUser.department || "",
            class_name: newUser.class_name || "",
            phone: newUser.phone || "",
            status: "active",
          },
        });

        if (createError) {
          return new Response(
            JSON.stringify({ error: createError.message, code: createError.code || "AUTH_CREATION_FAILED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const authUser = createdData.user;

        // Create matching public.profiles record
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: authUser.id,
            email: cleanEmail,
            name: newUser.name?.trim() || cleanEmail.split("@")[0],
            role: newUser.role,
            department: newUser.department || null,
            class_name: newUser.class_name || null,
            phone: newUser.phone || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: "id" });

        if (profileError && profileError.code !== "PGRST205") {
          // Roll back: Delete auth user if profile insert failed with a real schema/constraint error
          await supabaseAdmin.auth.admin.deleteUser(authUser.id);
          return new Response(
            JSON.stringify({
              error: `Profile creation failed: ${profileError.message}. Auth user was rolled back.`,
              code: profileError.code
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, user: authUser }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_user": {
        const { userId, updates } = body;
        if (!userId || !updates) {
          return new Response(
            JSON.stringify({ error: "User ID and updates are required.", code: "VALIDATION_ERROR" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: targetUser, error: getError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (getError || !targetUser?.user) {
          return new Response(
            JSON.stringify({ error: "User not found", code: "USER_NOT_FOUND" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (targetUser.user.user_metadata?.role === "admin" && updates.role && updates.role !== "admin") {
          const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
          const adminCount = allUsers.users.filter((u) => u.user_metadata?.role === "admin").length;
          if (adminCount <= 1) {
            return new Response(
              JSON.stringify({ error: "Cannot change role of last remaining Administrator.", code: "LAST_ADMIN_PROTECTED" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        const mergedMetadata = {
          ...targetUser.user.user_metadata,
          ...updates,
        };

        const { data: updatedData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: mergedMetadata,
          email: updates.email ? updates.email.trim().toLowerCase() : undefined,
        });

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message, code: updateError.code || "UPDATE_FAILED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update profiles
        await supabaseAdmin
          .from("profiles")
          .update({
            name: updates.name,
            role: updates.role,
            department: updates.department,
            class_name: updates.class_name,
            phone: updates.phone,
            updated_at: new Date().toISOString()
          })
          .eq("id", userId);

        return new Response(
          JSON.stringify({ success: true, user: updatedData.user }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "set_active_status": {
        const { userId, active } = body;
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "User ID is required.", code: "VALIDATION_ERROR" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (userId === callerUser.id && !active) {
          return new Response(
            JSON.stringify({ error: "You cannot deactivate your own Administrator account.", code: "SELF_DEACTIVATION_BLOCKED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const banDuration = active ? "none" : "876000h";
        const { data: banData, error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: banDuration,
          user_metadata: { status: active ? "active" : "inactive" },
        });

        if (banError) {
          return new Response(
            JSON.stringify({ error: banError.message, code: banError.code || "STATUS_UPDATE_FAILED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, user: banData.user }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset_password": {
        const { userId, newPassword } = body;
        if (!userId || !newPassword || newPassword.length < 6) {
          return new Response(
            JSON.stringify({ error: "Valid User ID and minimum 6-character password required.", code: "WEAK_PASSWORD" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword,
        });

        if (pwdError) {
          return new Response(
            JSON.stringify({ error: pwdError.message, code: pwdError.code || "PASSWORD_RESET_FAILED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: "Password updated successfully." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_user": {
        const { userId } = body;
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "User ID is required.", code: "VALIDATION_ERROR" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (userId === callerUser.id) {
          return new Response(
            JSON.stringify({ error: "You cannot delete your own Administrator account.", code: "SELF_DELETION_BLOCKED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
        const target = allUsers.users.find((u) => u.id === userId);
        if (target?.user_metadata?.role === "admin") {
          const adminCount = allUsers.users.filter((u) => u.user_metadata?.role === "admin").length;
          if (adminCount <= 1) {
            return new Response(
              JSON.stringify({ error: "Cannot delete last remaining Administrator.", code: "LAST_ADMIN_PROTECTED" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) {
          return new Response(
            JSON.stringify({ error: deleteError.message, code: deleteError.code || "DELETE_FAILED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabaseAdmin.from("profiles").delete().eq("id", userId);

        return new Response(
          JSON.stringify({ success: true, message: "User login access deleted successfully." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "link_parent_student": {
        const { parentId, studentId, relationship } = body;
        if (!parentId || !studentId) {
          return new Response(
            JSON.stringify({ error: "Parent ID and Student ID are required.", code: "VALIDATION_ERROR" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { data, error } = await supabaseAdmin
          .from("parent_student_links")
          .upsert({
            parent_id: parentId,
            student_id: studentId,
            relationship: relationship || "Parent",
            verified: true,
            updated_at: new Date().toISOString()
          }, { onConflict: "parent_id,student_id" })
          .select()
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message, code: error.code || "LINK_FAILED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ success: true, link: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "unlink_parent_student": {
        const { linkId, parentId, studentId } = body;
        let query = supabaseAdmin.from("parent_student_links").delete();
        if (linkId) {
          query = query.eq("id", linkId);
        } else if (parentId && studentId) {
          query = query.eq("parent_id", parentId).eq("student_id", studentId);
        } else {
          return new Response(
            JSON.stringify({ error: "Either linkId or both parentId and studentId must be provided.", code: "VALIDATION_ERROR" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await query;
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message, code: error.code || "UNLINK_FAILED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list_parent_links": {
        const { parentId } = body;
        let query = supabaseAdmin.from("parent_student_links").select("*");
        if (parentId) query = query.eq("parent_id", parentId);
        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message, code: error.code || "FETCH_FAILED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ success: true, links: data || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}`, code: "UNKNOWN_ACTION" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error", code: err.code || "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
