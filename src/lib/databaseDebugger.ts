import { supabase } from './supabaseClient';

/**
 * Checks if a table exists in the database
 * @param tableName Name of the table to check
 * @returns Whether the table exists
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    console.log(`Checking if table ${tableName} exists...`);
    
    // Method 1: Try to use the RPC function if available
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('check_table_exists', { table_name: tableName });
    
    if (!rpcError && rpcData !== null) {
      console.log(`Successfully checked table ${tableName} using RPC function: ${!!rpcData}`);
      return !!rpcData;
    }
    
    console.log(`RPC check failed for ${tableName}, falling back to direct query. Error:`, rpcError?.message);
    
    // Method 2: Fall back to direct query of information_schema (more reliable)
    const { data: directData, error: directError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .maybeSingle();
    
    if (directError) {
      console.error(`Error directly checking if table ${tableName} exists:`, directError);
      
      // Method 3: Last resort attempt with a more basic SQL query
      try {
        const { data: sqlData, error: sqlError } = await supabase.rpc('exec_sql', {
          sql_string: `
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name = '${tableName}'
            );
          `
        });
        
        if (sqlError) {
          console.error(`Final attempt to check table ${tableName} failed:`, sqlError);
          return false;
        }
        
        return sqlData && sqlData[0] && sqlData[0].exists;
      } catch (finalError) {
        console.error(`Exception in final table existence check:`, finalError);
        return false;
      }
    }
    
    return !!directData;
  } catch (error) {
    console.error(`Exception checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Creates a database function to check if a table exists
 */
async function createCheckTableFunction(): Promise<void> {
  try {
    // Create a function to check if a table exists
    const { error } = await supabase.rpc('exec_sql', {
      sql_string: `
        CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
        RETURNS boolean
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          exists boolean;
        BEGIN
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name = $1
          ) INTO exists;
          
          RETURN exists;
        END;
        $$;
      `
    });
    
    if (error) {
      console.error('Error creating check_table_exists function:', error);
      // Try a more direct approach
      const { error: rawError } = await supabase
        .from('_exec_sql')
        .insert({
          query: `
            CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
            RETURNS boolean
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            DECLARE
              exists boolean;
            BEGIN
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_name = $1
              ) INTO exists;
              
              RETURN exists;
            END;
            $$;
          `
        });
        
      if (rawError) {
        console.error('Error creating function using raw approach:', rawError);
      }
    }
  } catch (error) {
    console.error('Exception creating check_table_exists function:', error);
  }
}

/**
 * Gets database schema information for debugging
 * @returns Information about database tables
 */
export async function getDatabaseInfo(): Promise<any> {
  try {
    // A. Check specific tables
    const userProfileTableExists = await checkTableExists('user_profile_data');
    const weightChangesTableExists = await checkTableExists('user_weight_changes');
    const interactionsTableExists = await checkTableExists('user_interactions');
    const feedChangesTableExists = await checkTableExists('user_feed_changes');
    
    // B. Get table column information
    let tableColumns: any = {};
    
    if (userProfileTableExists) {
      const { data: profileColumns, error: profileError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'user_profile_data');
        
      if (!profileError) {
        tableColumns['user_profile_data'] = profileColumns;
      }
    }
    
    if (weightChangesTableExists) {
      const { data: weightColumns, error: weightError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'user_weight_changes');
        
      if (!weightError) {
        tableColumns['user_weight_changes'] = weightColumns;
      }
    }
    
    return {
      tablesExist: {
        user_profile_data: userProfileTableExists,
        user_weight_changes: weightChangesTableExists,
        user_interactions: interactionsTableExists,
        user_feed_changes: feedChangesTableExists
      },
      tableColumns
    };
  } catch (error) {
    console.error('Error getting database info:', error);
    return {
      error: 'Failed to get database information',
      details: error
    };
  }
}

/**
 * Attempts to fix missing database tables
 */
export async function attemptDatabaseFix(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Attempting database fix for user:', userId);
    
    // Check if tables exist
    const userProfileTableExists = await checkTableExists('user_profile_data');
    const weightChangesTableExists = await checkTableExists('user_weight_changes');
    
    // Build a list of issues
    const issues: string[] = [];
    const successes: string[] = [];
    if (!userProfileTableExists) issues.push('user_profile_data table missing');
    if (!weightChangesTableExists) issues.push('user_weight_changes table missing');
    
    if (issues.length === 0) {
      return {
        success: true,
        message: 'Database schema appears to be correct. All required tables exist.'
      };
    }
    
    console.log('Tables missing:', issues);
    
    // Attempt to create the check_table_exists function first
    try {
      const { error: functionError } = await supabase.rpc('exec_sql', {
        sql_string: `
          DROP FUNCTION IF EXISTS public.check_table_exists(text);
          
          CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
          RETURNS boolean
          LANGUAGE plpgsql
          SECURITY DEFINER 
          AS $$
          DECLARE
            exists boolean;
          BEGIN
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public'
              AND table_name = $1
            ) INTO exists;
            
            RETURN exists;
          END;
          $$;
          
          ALTER FUNCTION public.check_table_exists(text) OWNER TO postgres;
          GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO authenticated;
          GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO anon;
          GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO service_role;
        `
      });
      
      if (functionError) {
        console.error('Error creating check_table_exists function:', functionError);
        issues.push('Failed to create check_table_exists function: ' + functionError.message);
      } else {
        successes.push('Successfully created check_table_exists function');
      }
    } catch (functionError) {
      console.error('Exception creating check_table_exists function:', functionError);
    }
    
    // Try to create the user_weight_changes table if it's missing
    if (!weightChangesTableExists) {
      console.log('Attempting to create user_weight_changes table');
      const { error } = await supabase.rpc('exec_sql', {
        sql_string: `
          CREATE TABLE IF NOT EXISTS public.user_weight_changes (
            id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            timestamp BIGINT NOT NULL,
            question_id TEXT NOT NULL,
            interaction_type TEXT NOT NULL CHECK (interaction_type IN ('correct', 'incorrect', 'skipped')),
            question_text TEXT,
            category TEXT NOT NULL,
            subtopic TEXT,
            branch TEXT,
            old_topic_weight FLOAT,
            old_subtopic_weight FLOAT,
            old_branch_weight FLOAT,
            new_topic_weight FLOAT,
            new_subtopic_weight FLOAT,
            new_branch_weight FLOAT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            synced_from_device TEXT
          );
          
          -- Add indexes for better query performance
          CREATE INDEX IF NOT EXISTS idx_user_weight_changes_user_id ON public.user_weight_changes(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_weight_changes_timestamp ON public.user_weight_changes(timestamp);
          
          -- Set up Row Level Security (RLS)
          ALTER TABLE public.user_weight_changes ENABLE ROW LEVEL SECURITY;
          
          -- Create policies for user_weight_changes
          DROP POLICY IF EXISTS "Users can view their own weight changes" ON public.user_weight_changes;
          CREATE POLICY "Users can view their own weight changes" ON public.user_weight_changes
            FOR SELECT USING (auth.uid() = user_id);
          
          DROP POLICY IF EXISTS "Users can insert their own weight changes" ON public.user_weight_changes;
          CREATE POLICY "Users can insert their own weight changes" ON public.user_weight_changes
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
          DROP POLICY IF EXISTS "Service role can do anything weight" ON public.user_weight_changes;
          CREATE POLICY "Service role can do anything weight" ON public.user_weight_changes
            FOR ALL USING (true);
        `
      });
      
      if (error) {
        console.error('Error creating user_weight_changes table:', error);
        issues.push('Failed to create user_weight_changes table: ' + error.message);
      } else {
        successes.push('Successfully created user_weight_changes table');
        
        // Verify the table was created
        const tableExists = await checkTableExists('user_weight_changes');
        if (tableExists) {
          successes.push('Verified user_weight_changes table was created successfully');
        } else {
          issues.push('user_weight_changes table creation appeared to succeed but table not found');
        }
      }
    }
    
    // Try to create the user_profile_data table if it's missing (should be rare)
    if (!userProfileTableExists) {
      console.log('Attempting to create user_profile_data table');
      const { error } = await supabase.rpc('exec_sql', {
        sql_string: `
          CREATE TABLE IF NOT EXISTS public.user_profile_data (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            topics JSONB DEFAULT '{}'::jsonb,
            settings JSONB DEFAULT '{}'::jsonb,
            preferences JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            last_active TIMESTAMP WITH TIME ZONE,
            synced_from_device TEXT,
            cold_start_complete BOOLEAN DEFAULT false,
            total_questions_answered INTEGER DEFAULT 0,
            last_refreshed BIGINT
          );
          
          -- Set up Row Level Security (RLS)
          ALTER TABLE public.user_profile_data ENABLE ROW LEVEL SECURITY;
          
          -- Create policies for user_profile_data
          DROP POLICY IF EXISTS "Users can view their own profile data" ON public.user_profile_data;
          CREATE POLICY "Users can view their own profile data" ON public.user_profile_data
            FOR SELECT USING (auth.uid() = id);
          
          DROP POLICY IF EXISTS "Users can update their own profile data" ON public.user_profile_data;
          CREATE POLICY "Users can update their own profile data" ON public.user_profile_data
            FOR UPDATE USING (auth.uid() = id);
          
          DROP POLICY IF EXISTS "Users can insert their own profile data" ON public.user_profile_data;
          CREATE POLICY "Users can insert their own profile data" ON public.user_profile_data
            FOR INSERT WITH CHECK (auth.uid() = id);
            
          DROP POLICY IF EXISTS "Service role can do anything" ON public.user_profile_data;
          CREATE POLICY "Service role can do anything" ON public.user_profile_data
            FOR ALL USING (true);
        `
      });
      
      if (error) {
        console.error('Error creating user_profile_data table:', error);
        issues.push('Failed to create user_profile_data table: ' + error.message);
      } else {
        successes.push('Successfully created user_profile_data table');
      }
    }
    
    // If user profile table exists but topics column might be empty, try to update it
    if (userProfileTableExists || successes.includes('Successfully created user_profile_data table')) {
      console.log('Checking user profile data for user:', userId);
      // Check if user has a profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profile_data')
        .select('topics')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        if (profileError.code === 'PGRST116') {  // No rows returned
          console.log('No user profile found, creating one');
          // Create a profile for this user
          const defaultTopics = {
            "Technology": {
              "weight": 0.5,
              "subtopics": {
                "General": {
                  "weight": 0.5,
                  "branches": {
                    "General": {
                      "weight": 0.5
                    }
                  }
                }
              }
            },
            "Science": {
              "weight": 0.5,
              "subtopics": {
                "General": {
                  "weight": 0.5,
                  "branches": {
                    "General": {
                      "weight": 0.5
                    }
                  }
                }
              }
            }
          };
          
          const { error: insertError } = await supabase
            .from('user_profile_data')
            .insert({ 
              id: userId,
              topics: defaultTopics,
              last_refreshed: Date.now(),
              cold_start_complete: true
            });
          
          if (insertError) {
            console.error('Error creating user profile:', insertError);
            issues.push('Failed to create user profile: ' + insertError.message);
          } else {
            successes.push('Successfully created user profile with default topics');
          }
        } else {
          console.error('Error checking user profile:', profileError);
          issues.push('Failed to check user profile: ' + profileError.message);
        }
      } else if (!profileData.topics || Object.keys(profileData.topics).length === 0) {
        console.log('Profile found but topics are empty, initializing with defaults');
        // Profile exists but topics are empty
        const defaultTopics = {
          "Technology": {
            "weight": 0.5,
            "subtopics": {
              "General": {
                "weight": 0.5,
                "branches": {
                  "General": {
                    "weight": 0.5
                  }
                }
              }
            }
          },
          "Science": {
            "weight": 0.5,
            "subtopics": {
              "General": {
                "weight": 0.5,
                "branches": {
                  "General": {
                    "weight": 0.5
                  }
                }
              }
            }
          }
        };
        
        const { error: updateError } = await supabase
          .from('user_profile_data')
          .update({ 
            topics: defaultTopics,
            last_refreshed: Date.now()
          })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Error updating empty topics:', updateError);
          issues.push('Failed to initialize topics: ' + updateError.message);
        } else {
          successes.push('Successfully initialized empty topics with default structure');
        }
      } else {
        console.log('User profile has topics data already');
        successes.push('User profile exists and has topics data');
      }
    }
    
    console.log('Database fix results - Successes:', successes, 'Issues:', issues);
    
    return {
      success: successes.length > 0,
      message: `Database fix attempt completed with the following results: ${successes.join(', ')}${issues.length > 0 ? '. Issues: ' + issues.join(', ') : ''}`
    };
  } catch (error) {
    console.error('Error attempting database fix:', error);
    return {
      success: false,
      message: `Error attempting database fix: ${error}`
    };
  }
} 