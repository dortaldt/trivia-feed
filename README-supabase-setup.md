# Supabase Authentication Setup

This guide will help you set up the authentication system in your Supabase project for the Trivia Universe app.

## 1. Create User Profiles Table

1. Navigate to your Supabase project dashboard
2. Go to the SQL Editor section
3. Create a new query
4. Copy and paste the entire SQL script from `scripts/create_user_profile_table.sql`
5. Run the query to create the user profiles table and triggers

```sql
-- Create user_profiles table in Supabase to store additional user information
-- This extends the default auth.users table that Supabase automatically creates

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Set up Row Level Security (RLS) for the table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for Row Level Security
-- Allow users to view any profile
CREATE POLICY "Allow users to view any profile" ON public.user_profiles
  FOR SELECT USING (true);

-- Allow users to update only their own profile
CREATE POLICY "Allow users to update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow new users to insert their profile
CREATE POLICY "Allow users to insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,  -- Default username to email
    NEW.raw_user_meta_data->>'full_name', -- Extract from metadata if available
    NEW.raw_user_meta_data->>'avatar_url' -- Extract from metadata if available
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 2. Configure OAuth Providers

### Google Authentication

1. In your Supabase dashboard, go to Authentication → Providers
2. Find Google in the list and toggle it to enable
3. You'll need to create OAuth credentials in the Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Navigate to APIs & Services → Credentials
   - Create an OAuth client ID for a Web application
   - Add your Supabase URL to the authorized JavaScript origins: `https://[YOUR-PROJECT-ID].supabase.co`
   - Add your Supabase auth callback URL: `https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback`
   - Copy the Client ID and Client Secret
4. Enter the Client ID and Client Secret in your Supabase Google provider settings

### Apple Authentication

1. In your Supabase dashboard, go to Authentication → Providers
2. Find Apple in the list and toggle it to enable
3. You'll need to register your app in the Apple Developer portal:
   - Go to [Apple Developer Portal](https://developer.apple.com/)
   - Navigate to Certificates, Identifiers & Profiles
   - Register a new App ID with Sign In with Apple capability
   - Create a Services ID for Sign In with Apple
   - Configure the domain and redirect URL in the Sign In with Apple settings:
     - Domain: `[YOUR-PROJECT-ID].supabase.co`
     - Return URL: `https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback`
   - Create a private key for Sign In with Apple
4. Enter the required credentials in your Supabase Apple provider settings

## 3. Test Your Authentication

Once you've completed the setup, test your authentication system:

1. Run your app and navigate to the login page
2. Test email/password sign-up and sign-in
3. Test Google and Apple sign-in options
4. Verify that user profiles are properly created in the `user_profiles` table

## Troubleshooting

- **OAuth Redirect Issues**: Ensure your app's `scheme` in app.json matches the one used in the authentication code
- **Missing User Profiles**: Check that the trigger is properly created and functioning
- **Social Login Errors**: Verify your OAuth credentials and redirect URLs

For more information, refer to the [Supabase Auth documentation](https://supabase.com/docs/guides/auth). 