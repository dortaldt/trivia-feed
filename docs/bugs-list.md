# Trivia Feed - Known Bugs List

## Authentication / User Creation

### Bug: Users not being created in Supabase after signup
- **Status**: OPEN
- **Severity**: HIGH
- **Reported**: [Current Date]
- **Fix Script**: [scripts/fix_user_creation_trigger.sql](../scripts/fix_user_creation_trigger.sql)

#### Description
When users attempt to sign up for a new account, the signup fails completely with the error message: "sign up failed, database error saving new user". Users are not being created in the Supabase `auth.users` table at all, which means they cannot access the application.

#### Root Cause
The issue appears to be with the Supabase authentication process. Unlike what was initially thought, the problem is not just with the trigger that creates user profiles. The actual user creation in the `auth.users` table is failing.

This could be due to:
1. Permissions issues in the Supabase instance
2. Configuration problems with the authentication service
3. Database connectivity issues
4. A previous database modification that affected the user creation process

A custom username generation script was found that modified the `handle_new_user()` function but did not properly recreate the trigger:

```sql
-- Update the handle_new_user function to use random username generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    public.generate_random_username(),  -- Generate random username instead of using email
    NEW.raw_user_meta_data->>'full_name', -- Extract from metadata if available
    NEW.raw_user_meta_data->>'avatar_url' -- Extract from metadata if available
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger is already in place, we only needed to update the function
```

This comment "The trigger is already in place, we only needed to update the function" may have been incorrect.

#### How to Reproduce
1. Create a new user account through the sign-up process
2. Observe the error message "sign up failed, database error saving new user"
3. Check Supabase database - the user does not exist in `auth.users` table

#### Solution
Since the issue is with the Supabase authentication service not creating users in the `auth.users` table, the solution requires checking:

1. **Supabase Authentication Configuration:**
   - Verify that the authentication service is properly enabled in the Supabase dashboard
   - Check for any recent changes to authentication settings
   - Ensure the service has proper permissions to create records in the auth schema

2. **API Credentials:**
   - Verify that the application is using the correct and current Supabase URL and API key
   - Check if the API keys have proper permissions for user management
   - Ensure the anon key has not been restricted from creating users

3. **Rate Limiting:**
   - Check if the project has hit rate limits for authentication operations
   - Verify in Supabase logs if there are any throttling issues

The SQL script [scripts/fix_user_creation_trigger.sql](../scripts/fix_user_creation_trigger.sql) will still be needed after fixing the primary authentication issue, to ensure that once users are successfully created, they also get proper profiles.

Additionally, we've updated the `signUp` function in `src/context/AuthContext.tsx` to include better error handling and debugging:

```typescript
const { data, error } = await supabase.auth.signUp({ 
  email, 
  password,
  options: {
    data: {
      full_name: email.split('@')[0], // Set a default name from email
      avatar_url: null
    },
    emailRedirectTo: Platform.OS === 'web' ? window.location.origin : undefined
  }
});

if (error) {
  console.error('Sign up error details:', {
    message: error.message,
    status: error.status,
    name: error.name,
    details: error.details
  });
  throw error;
}
```

#### Prevention
To prevent this issue from happening again:

1. **Authentication Service Monitoring:**
   - Implement periodic checks to verify the Supabase authentication service is functioning correctly
   - Add logging around authentication operations to capture specific error details
   - Consider setting up alerts for authentication failures

2. **Configuration Management:**
   - Document all changes to Supabase configuration settings
   - Use version control for database schema and function changes
   - Implement a testing procedure for authentication flows after any configuration changes

3. **Application Resilience:**
   - Add more comprehensive error handling in the authentication process
   - Implement better error messages that provide more context to users
   - Consider adding a fallback authentication method for critical scenarios

4. **Regular Database Maintenance:**
   - Schedule regular checks of database triggers and functions
   - Verify permissions settings on a periodic basis
   - Keep Supabase project updated to the latest version 