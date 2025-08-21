import { supabaseAdmin } from '../lib/supabase';

async function applyNotificationsMigration() {
  try {
    console.log('🔄 Applying notifications table migration...');

    const createSql = `
      CREATE TABLE IF NOT EXISTS public.notifications (
        id TEXT PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        type TEXT NOT NULL CHECK (type IN ('chat', 'order', 'service', 'system', 'offer')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        data JSONB
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id_timestamp ON public.notifications(user_id, timestamp DESC);

      ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        CREATE POLICY "Users can select their own notifications"
          ON public.notifications FOR SELECT
          USING (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Users can insert notifications for themselves"
          ON public.notifications FOR INSERT
          WITH CHECK (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Users can update their own notifications"
          ON public.notifications FOR UPDATE
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Users can delete their own notifications"
          ON public.notifications FOR DELETE
          USING (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `;

    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: createSql });
    if (error) {
      console.error('❌ Error applying notifications migration:', error);
      return;
    }

    console.log('🎉 Notifications migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

applyNotificationsMigration();