# Isabelle's Meal Tracker — Setup Guide

Total setup time: **~5 minutes**. No coding required.

---

## Step 1: Create a Free Supabase Project (3 min)

1. Go to [supabase.com](https://supabase.com) and click **Start your project**
2. Sign up with your GitHub account (one click)
3. Click **New Project**
   - **Name:** `isabelle-tracker`
   - **Database Password:** anything (save it somewhere)
   - **Region:** East US (closest to you)
4. Wait ~30 seconds for the project to spin up

## Step 2: Create the Database Tables (1 min)

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `sql/schema.sql` from this project
4. Copy the entire contents and paste it into the SQL Editor
5. Click **Run** (the green play button)
6. You should see "Success. No rows returned" — that means it worked!

## Step 3: Get Your API Credentials (30 sec)

1. In Supabase, go to **Project Settings** (gear icon) → **API**
2. Copy the **Project URL** (looks like `https://abcdefg.supabase.co`)
3. Copy the **anon/public** key (the long string under "Project API keys")
4. Open `js/supabase-config.js` and replace:
   ```
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```
   with your actual values.
5. Change `DASHBOARD_PASSWORD` to whatever password you want for the dashboard.

## Step 4: Deploy to GitHub Pages (1 min)

If you're using the GitHub repo:

1. Go to your repository on GitHub
2. Go to **Settings** → **Pages**
3. Under "Source", select **Deploy from a branch**
4. Select the `main` branch and `/ (root)` folder
5. Click **Save**
6. Wait ~1 minute. Your site will be live at:
   - Form: `https://yourusername.github.io/AGA-Test-Track/apps/meal-tracker/`
   - Dashboard: `https://yourusername.github.io/AGA-Test-Track/apps/meal-tracker/dashboard.html`

## Step 5: Share with Family

1. Open iMessage
2. Send the form link to family members
3. That's it! They tap the link, fill in the form, and submit.

---

## How It Works

- **Family members** open the link and see a simple form
- They tap "Food/Drink" or "Symptom", fill it in, and hit Submit
- The data goes to your Supabase database
- **You** open the dashboard link and enter your password
- You see all entries with stats, timeline, and symptom correlations
- You can export to PDF for Isabelle's doctor

## Timezone Handling

- All times are displayed in **Eastern Time**
- If a family member is in Central Time, their phone's time is automatically converted to Eastern
- All data is stored in UTC in the database for accuracy

## Symptom Correlations

- When someone reports a symptom, the dashboard automatically finds all meals logged within the **8 hours** before that symptom
- It shows the time between each meal and the symptom onset
- This helps identify potential trigger foods

## Cost

- **Supabase free tier:** 500MB database, 50K monthly active users
- **GitHub Pages:** Free forever
- **Total monthly cost: $0**
