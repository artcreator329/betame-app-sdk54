# Job Proposals System Setup

## 🚨 **Error Fix: Database Migration Required**

The error you encountered indicates that the database tables for the job proposals system haven't been created yet. Here's how to fix it:

## 📋 **Step 1: Apply Database Migration**

### **Option A: Supabase Dashboard (Recommended)**

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Copy the entire contents of `scripts/create-job-proposals-tables-simple.sql`
4. Paste into the SQL Editor
5. Click **Run** to execute the migration

### **Option B: Manual SQL Execution**

Run this SQL in your Supabase dashboard:

```sql
-- Job proposals table
CREATE TABLE IF NOT EXISTS job_proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_listing_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    proposed_price DECIMAL(10,2),
    proposal_description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'expired')),
    is_read_by_buyer BOOLEAN DEFAULT FALSE,
    is_read_by_seller BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Job listing stats table
CREATE TABLE IF NOT EXISTS job_listing_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_listing_id UUID NOT NULL UNIQUE,
    total_proposals INTEGER DEFAULT 0,
    pending_proposals INTEGER DEFAULT 0,
    accepted_proposals INTEGER DEFAULT 0,
    rejected_proposals INTEGER DEFAULT 0,
    unique_sellers INTEGER DEFAULT 0,
    last_proposal_date TIMESTAMPTZ,
    last_activity_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Job proposal activities table
CREATE TABLE IF NOT EXISTS job_proposal_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_proposal_id UUID NOT NULL,
    job_listing_id UUID NOT NULL,
    activity_type TEXT NOT NULL,
    actor_id UUID NOT NULL,
    target_user_id UUID NOT NULL,
    activity_description TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE job_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_listing_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_proposal_activities ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can view proposals they're involved in" ON job_proposals
    FOR SELECT USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

CREATE POLICY "Users can view activities for their proposals" ON job_proposal_activities
    FOR SELECT USING (auth.uid() = target_user_id OR auth.uid() = actor_id);

CREATE POLICY "Job owners can view stats" ON job_listing_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM job_listings jl 
            WHERE jl.id = job_listing_stats.job_listing_id 
            AND jl.user_id = auth.uid()
        )
    );
```

## ✅ **Step 2: Verify Setup**

After running the migration:

1. **Restart your app** (stop and start the development server)
2. **Check the console** - you should no longer see the relationship error
3. **Test job posting** - create a test job and verify it shows up in "I'm Hiring"

## 🎉 **Features After Setup**

Once the migration is applied, buyers will see:

- **Real-time proposal notifications** with badge indicators
- **Proposal counts** on each job listing 
- **"New" badges** for pending proposals
- **Activity feed** showing recent proposal submissions
- **Live updates** without page refresh

## 🔧 **Troubleshooting**

### **Still getting errors?**

1. **Check table creation**: Go to Supabase Dashboard → Database → Tables
   - Verify `job_proposals`, `job_listing_stats`, and `job_proposal_activities` exist

2. **Check RLS policies**: Go to Authentication → Policies
   - Ensure policies exist for the new tables

3. **Clear cache**: 
   ```bash
   # Clear Expo cache
   npx expo start --clear
   ```

### **Tables already exist?**

If you get "table already exists" errors, that's normal - the `IF NOT EXISTS` clause prevents conflicts.

## 🚀 **Next Steps**

After setup is complete:

1. **Test proposal submission**: Have a seller submit a proposal for a job
2. **Check buyer notifications**: Verify the buyer sees the notification badge
3. **Test real-time updates**: Proposals should appear immediately

## 📧 **Need Help?**

If you continue to experience issues:

1. Check the browser console for any additional error messages
2. Verify your Supabase connection and permissions
3. Ensure you're using the latest version of the codebase

---

**Note**: The app will work without these tables, but job proposal features will be limited until the migration is applied.
