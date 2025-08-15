import { supabaseAdmin } from '../lib/supabase';

async function applyNotificationFunctionUpdate() {
  try {
    console.log('🔄 Applying notification function update...');

    const updateSql = `
      -- Requires: pgcrypto or gen_random_uuid alternative if preferred
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      -- Secure function to create a notification
      CREATE OR REPLACE FUNCTION public.create_notification(
        p_user_id uuid,
        p_type text,
        p_title text,
        p_message text,
        p_data jsonb default null,
        p_id text default null
      ) returns text
      language plpgsql
      security definer
      set search_path = public
      as $$
      declare
        notification_id text;
      begin
        -- Use provided ID or generate a new one
        notification_id := coalesce(p_id, encode(gen_random_bytes(12), 'hex'));
        
        insert into public.notifications (
          id, user_id, sender_id, type, title, message, created_at, is_read, data
        ) values (
          notification_id,
          p_user_id,
          auth.uid(),
          p_type,
          p_title,
          p_message,
          now(),
          false,
          p_data
        );

        return 'ok';
      end;
      $$;

      REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, text) FROM public;
      GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, text) TO authenticated;
    `;

    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: updateSql });
    if (error) {
      console.error('❌ Error applying notification function update:', error);
      return;
    }

    console.log('🎉 Notification function update completed successfully!');
  } catch (error) {
    console.error('❌ Update failed:', error);
  }
}

applyNotificationFunctionUpdate();
