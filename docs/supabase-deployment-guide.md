# Supabase Deployment Guide for OpenAI Integration

This guide provides step-by-step instructions for setting up the Supabase backend components required for the OpenAI service integration.

## Prerequisites

- Access to your Supabase project dashboard
- OpenAI API key
- Supabase CLI installed for edge function deployment

## 1. Database Setup

1. Navigate to the SQL Editor in your Supabase dashboard
2. Create a new query and paste the contents of `scripts/supabase/openai-tables-setup.sql`
3. Run the query to create the required tables and policies

## 2. Edge Function Deployment

### Option 1: Using Supabase CLI (Recommended)

1. Make sure you have the Supabase CLI installed and logged in:
   ```bash
   # Install Supabase CLI if not already installed
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   ```

2. Link your local project to your Supabase project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REFERENCE
   ```

3. Deploy the OpenAI proxy function:
   ```bash
   supabase functions deploy openai-proxy
   ```

4. Set the required secrets:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-your-openai-key-here
   ```

### Option 2: Manual Deployment via Dashboard

1. Navigate to the Edge Functions section in your Supabase dashboard
2. Create a new function named `openai-proxy`
3. Copy the contents of `supabase/functions/openai-proxy/index.ts` into the editor
4. Save and deploy the function
5. In the function settings, add the following secret:
   - Key: `OPENAI_API_KEY`
   - Value: Your OpenAI API key

## 3. Testing

Once deployed, you can test the edge function using cURL or Postman:

```bash
curl -X POST 'https://YOUR_PROJECT_REFERENCE.functions.supabase.co/openai-proxy' \
  -H 'Authorization: Bearer YOUR_SUPABASE_AUTH_TOKEN' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "action": "generateText",
    "params": {
      "prompt": "Hello, world!",
      "model": "gpt-4-turbo",
      "temperature": 0.7,
      "max_tokens": 100
    }
  }'
```

## 4. Troubleshooting

- **Authentication Issues**: Make sure your authorization token is valid and properly formatted.
- **Database Errors**: Check the Supabase logs for any SQL errors during table creation.
- **Function Deployment Failures**: Ensure all required dependencies are properly imported.
- **Rate Limiting Issues**: Verify the `openai_config` table contains the expected values.

## 5. Security Considerations

- The edge function validates authentication for all requests
- Row Level Security (RLS) policies restrict access to data
- API keys are stored as secrets, not in the function code
- Rate limiting is implemented to prevent abuse

## Next Steps

After completing the Supabase setup, proceed to Phase 2: Client Service Layer Development. 