/**
 * This script sets up the Supabase storage bucket for user avatars.
 * Run this script after setting up your Supabase project to configure the storage permissions.
 * 
 * Usage:
 * 1. Make sure you have the Supabase client libraries installed
 * 2. Set your SUPABASE_URL and SUPABASE_KEY environment variables
 * 3. Run the script with: node setup-storage-bucket.js
 */

const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorageBucket() {
  try {
    console.log('Setting up Supabase storage bucket for user avatars...');

    // Check if bucket already exists, if not, create it
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      throw bucketsError;
    }

    const bucketName = 'userimages';
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);

    if (!bucketExists) {
      console.log(`Creating bucket: ${bucketName}`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true, // Make the bucket public
        fileSizeLimit: 1024 * 1024 * 2, // 2MB file size limit
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      });

      if (createError) {
        throw createError;
      }
      console.log(`Bucket "${bucketName}" created successfully.`);
    } else {
      console.log(`Bucket "${bucketName}" already exists.`);
      
      // Update bucket settings to ensure it's public
      const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: 1024 * 1024 * 2, // 2MB file size limit
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      });
      
      if (updateError) {
        throw updateError;
      }
      console.log(`Bucket "${bucketName}" settings updated.`);
    }

    // Set up storage policies to allow authenticated users to upload their avatars
    console.log('Setting up storage policies...');
    
    // Get existing policies
    const { data: policies, error: policiesError } = await supabase.rpc('get_policies');
    if (policiesError) {
      console.log('Error fetching policies:', policiesError.message);
    }
    
    // Policy to allow all users to upload files (simplified)
    console.log('Setting up insert policy...');
    try {
      await supabase.from(`storage.objects`)
        .select('*')
        .limit(1)
        .then(async () => {
          await supabase.query(`
            CREATE POLICY "Allow all authenticated users to upload" 
            ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (bucket_id = 'userimages')
          `);
        });
      console.log('Insert policy created successfully');
    } catch (error) {
      console.log('Note for insert policy:', error.message);
    }
    
    // Policy to allow anyone to read files (public access)
    console.log('Setting up select policy...');
    try {
      await supabase.query(`
        CREATE POLICY "Allow public read access" 
        ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'userimages')
      `);
      console.log('Select policy created successfully');
    } catch (error) {
      console.log('Note for select policy:', error.message);
    }
    
    // Policy to allow users to update their own files
    console.log('Setting up update policy...');
    try {
      await supabase.query(`
        CREATE POLICY "Allow users to update their own files" 
        ON storage.objects
        FOR UPDATE TO authenticated
        USING (bucket_id = 'userimages' AND owner = auth.uid())
        WITH CHECK (bucket_id = 'userimages' AND owner = auth.uid())
      `);
      console.log('Update policy created successfully');
    } catch (error) {
      console.log('Note for update policy:', error.message);
    }
    
    // Policy to allow users to delete their own files
    console.log('Setting up delete policy...');
    try {
      await supabase.query(`
        CREATE POLICY "Allow users to delete their own files" 
        ON storage.objects
        FOR DELETE TO authenticated
        USING (bucket_id = 'userimages' AND owner = auth.uid())
      `);
      console.log('Delete policy created successfully');
    } catch (error) {
      console.log('Note for delete policy:', error.message);
    }

    console.log('Storage setup completed successfully!');
  } catch (error) {
    console.error('Error setting up storage:', error.message);
    process.exit(1);
  }
}

setupStorageBucket();
