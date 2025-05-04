# Supabase Integration for Trivia Feed

This directory contains scripts for importing trivia questions from a CSV file into a Supabase database.

## Prerequisites

1. A Supabase account and project (sign up at https://supabase.com)
2. Node.js installed on your machine
3. Required packages installed: `@supabase/supabase-js`, `csv-parser`, and `dotenv`

## Setting Up Supabase

1. Create a new Supabase project from your dashboard
2. Go to Project Settings > API to find your project URL and anon key
3. In the SQL Editor, execute the SQL script in `scripts/create_table.sql` to create the required table

## Configuring the Import Script

There are two ways to provide your Supabase credentials:

### Method 1: Using a .env file

1. Create a `.env` file in the root directory of this project with:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   ```

### Method 2: Directly in the script

Open `scripts/import-to-supabase.js` and update these lines with your credentials:
```js
// const supabaseUrl = 'your_supabase_url';
// const supabaseKey = 'your_supabase_anon_key';
```

## Running the Import Script

Execute the script from the project root directory:

```bash
node scripts/import-to-supabase.js
```

The script will:
1. Read the trivia questions from `docs/Combined_Trivia_Question_Dataset.csv`
2. Parse the data, including array fields like `answer_choices` and `tags`
3. Insert all questions into your Supabase `trivia_questions` table
4. Log the results

## Troubleshooting

If you encounter errors:

1. **Database connection error**: Verify your Supabase URL and anon key are correct
2. **Table not found**: Make sure you've executed the SQL in `create_table.sql`
3. **CSV parsing errors**: Ensure the CSV file is properly formatted
4. **Permission errors**: Check that your Supabase permissions allow inserting data

## Accessing Your Data

After successful import, you can access your data through:

1. The Supabase dashboard under Table Editor
2. API calls using the Supabase JavaScript client
3. SQL queries in the Supabase SQL Editor 