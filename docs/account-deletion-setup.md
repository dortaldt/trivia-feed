# Account Deletion Functionality

This document provides instructions on how to set up and enable the account deletion functionality in the Trivia Feed application.

## Overview

The account deletion feature allows users to permanently delete their accounts and all associated data from the database. This implementation leverages PostgreSQL's CASCADE delete rules to ensure complete data removal.

## Implementation Details

1. Client-side implementation:
   - "Delete Account" button in the user profile view
   - Confirmation dialog with warning about permanent data loss
   - Call to server-side delete function via RPC
   - Transition to guest mode after deletion

2. Server-side implementation:
   - RPC function that utilizes CASCADE delete rules to efficiently remove all user data
   - Security checks to ensure users can only delete their own accounts
   - Special handling for tables with NO ACTION delete rules
   - Detailed logging for troubleshooting

## Setup Instructions

### 1. Server-side Setup

1. Log in to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of the `sql/delete_user_function.sql` file
4. Execute the SQL to create the `delete_user` function

The SQL function requires `SECURITY DEFINER` privileges to modify auth schema data. This means it will run with the permissions of the database role that created it, rather than the permissions of the calling user.

### 2. How It Works

The delete function uses a safer approach with additional checks:

1. It verifies the authenticated user is deleting their own account
2. It checks if the user exists before attempting deletion
3. It deletes data from tables with NO ACTION constraints (like `openai_usage` and `storage.objects`)
4. It explicitly deletes from key tables that might have foreign key constraints
5. Finally, it deletes the user from `auth.users`, which automatically cascades to delete all related data in other tables
6. It verifies the deletion was successful

### 3. Testing

After setting up the functionality, test the account deletion process:

1. Create a test user account
2. Populate it with some data
3. Log in as the test user
4. Navigate to the profile page
5. Click "Delete Account" and confirm
6. Verify that:
   - The user is signed out
   - The user is in guest mode
   - All user data is removed from the database
   - The user cannot log back in with the same credentials

## Important Notes

- **Permanent Deletion**: This implementation completely removes the user and all their data from the database. This action is irreversible.

- **CASCADE Requirements**: This approach relies on properly configured CASCADE delete rules in your database. If you add new tables related to users, make sure they have appropriate foreign key constraints.

- **Analytics Data**: The implementation signals to analytics systems (like Mixpanel) that the user should be forgotten, but this depends on the analytics platform's capabilities.

- **Permissions**: The SQL function uses `SECURITY DEFINER` to enable cross-schema access. This requires proper security precautions to prevent misuse.

## Troubleshooting

If users experience issues with account deletion:

### Client-side Troubleshooting

1. Check the browser console or application logs for error messages. Look for logs starting with "AuthContext".
2. Verify you're logged in as the user you're trying to delete (the deleteAccount function only works for the current user).
3. Check network requests to see if the RPC call is being made and what response it returns.
4. Try signing out and signing back in before attempting to delete the account.

### Server-side Troubleshooting

1. Use the `sql/debug_user_deletion.sql` script to test the function directly in SQL Editor.
2. Check if the RPC function exists and is callable from the client:
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' AND routine_name = 'delete_user';
   ```
3. Verify execution permissions:
   ```sql
   SELECT grantee, privilege_type 
   FROM information_schema.routine_privileges 
   WHERE routine_name = 'delete_user' AND routine_schema = 'public';
   ```
4. Check if the `auth.uid()` function is working correctly:
   ```sql
   SELECT auth.uid() AS current_user_id;
   ```
5. For more detailed debugging, use the `sql/manual_user_deletion_test.sql` script that includes step-by-step diagnostics.

### Common Issues

1. **Permission Denied**: The function needs SECURITY DEFINER privileges and proper execution grants.
2. **auth.uid() Returns NULL**: Make sure the user is properly authenticated when making the RPC call.
3. **Foreign Key Constraints**: Some tables might have NO ACTION foreign key constraints preventing deletion.
4. **Missing Tables**: If you've added custom tables, they need to be added to the delete_user function.

### Advanced Diagnostics

For persistent issues, use the debug version of the delete function which:
1. Bypasses the auth.uid() check
2. Provides detailed logging
3. Handles errors more gracefully

```sql
-- Example of using the debug function (run in SQL Editor)
SELECT public.delete_user_debug('your_admin_key', 'user-id-to-delete');
```

## Adding Support for New Tables

If you add new tables that store user data, you need to update the delete_user function to handle them:

1. For tables with CASCADE delete rules:
   - No changes needed if they reference auth.users
   
2. For tables with NO ACTION delete rules:
   - Add explicit DELETE statements before the auth.users deletion:
   ```sql
   BEGIN
       DELETE FROM public.your_new_table WHERE user_id = user_id;
   EXCEPTION WHEN OTHERS THEN
       RAISE WARNING 'Error deleting from your_new_table: %', SQLERRM;
   END;
   ``` 