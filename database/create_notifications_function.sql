-- Requires: pgcrypto or gen_random_uuid alternative if preferred
create extension if not exists pgcrypto;

-- Secure function to create a notification
create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_data jsonb default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    id, user_id, sender_id, type, title, message, created_at, is_read, data
  ) values (
    encode(gen_random_bytes(12), 'hex'),
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

revoke all on function public.create_notification(uuid, text, text, text, jsonb) from public;
grant execute on function public.create_notification(uuid, text, text, text, jsonb) to authenticated;