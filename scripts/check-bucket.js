/**
 * This script checks if your Supabase bucket is correctly configured for avatar uploads.
 * 
 * Usage:
 * 1. Set SUPABASE_URL and SUPABASE_KEY environment variables
 * 2. Run: node scripts/check-bucket.js
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://vdrmtsifivvpioonpqqc.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;  // Should be your anon key for testing client permissions

if (!supabaseKey) {
  console.error('⚠️  Error: SUPABASE_KEY environment variable must be set');
  console.log('\nRun with:');
  console.log('  SUPABASE_KEY=your_anon_key node scripts/check-bucket.js');
  process.exit(1);
}

// Path to a test image (create a sample if it doesn't exist)
const TEST_IMAGE_PATH = path.join(__dirname, 'test-avatar.jpg');
if (!fs.existsSync(TEST_IMAGE_PATH)) {
  // Create a simple 1x1 pixel JPEG
  const PIXEL = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01,
    0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x37, 0xff, 0xd9
  ]);
  fs.writeFileSync(TEST_IMAGE_PATH, PIXEL);
  console.log('📸 Created test image at:', TEST_IMAGE_PATH);
}

console.log('🔍 Checking Supabase bucket configuration...');
console.log(`URL: ${supabaseUrl}`);
console.log('Key: ****' + supabaseKey.slice(-6));
console.log('\n1. Testing bucket existence and listing permissions:');

async function checkBucket() {
  try {
    // 1. Check if we can list buckets
    console.log('Sending request to list buckets...');
    const bucketListResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    // Log response details
    console.log('Response status:', bucketListResponse.status, bucketListResponse.statusText);
    console.log('Response headers:', Object.fromEntries([...bucketListResponse.headers.entries()]));

    if (!bucketListResponse.ok) {
      const errorText = await bucketListResponse.text();
      console.error('❌ Cannot list buckets:', bucketListResponse.status, bucketListResponse.statusText);
      console.error('Error response:', errorText);
      return false;
    }

    const buckets = await bucketListResponse.json();
    console.log('✅ Successfully listed buckets:', buckets.map(b => b.name).join(', '));
    
    // Check if userimages bucket exists
    const userimagesBucket = buckets.find(b => b.name === 'userimages');
    if (!userimagesBucket) {
      console.error('❌ userimages bucket does not exist!');
      console.log('\n📝 To create a bucket, run:');
      console.log('  scripts/setup-storage-bucket.js');
      return false;
    }

    console.log('✅ userimages bucket found');
    console.log(`   - Public: ${userimagesBucket.public ? 'Yes' : 'No'}`);
    console.log(`   - Created at: ${new Date(userimagesBucket.created_at).toLocaleString()}`);
    console.log(`   - ID: ${userimagesBucket.id}`);
    
    // 2. Try to upload a test file to the bucket
    console.log('\n2. Testing file upload permission:');
    const testFile = fs.readFileSync(TEST_IMAGE_PATH);
    const testFileName = `test-${Date.now()}.jpg`;
    
    console.log(`Uploading test file: ${testFileName}`);
    console.log(`File size: ${testFile.length} bytes`);
    
    const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/userimages/${testFileName}`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true'
      },
      body: testFile
    });

    // Log response details
    console.log('Upload response status:', uploadResponse.status, uploadResponse.statusText);
    console.log('Upload response headers:', Object.fromEntries([...uploadResponse.headers.entries()]));

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Cannot upload to userimages bucket:', uploadResponse.status);
      console.error('   Error:', errorText);
      
      if (uploadResponse.status === 403) {
        console.error('\n🔒 Permission denied. This usually means:');
        console.error('   1. Your storage policies may not allow uploads from this key');
        console.error('   2. The bucket might not be configured correctly');
        
        console.log('\n📝 Checking bucket CORS settings...');
        await checkCorsSettings();
      }
      
      return false;
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Successfully uploaded test file:', testFileName);
    console.log('   Uploaded file key:', uploadResult.Key);
    
    // 3. Try to get the uploaded file (public access)
    console.log('\n3. Testing file public access:');
    const fileUrl = `${supabaseUrl}/storage/v1/object/public/userimages/${testFileName}`;
    console.log('   Checking URL:', fileUrl);
    
    const getResponse = await fetch(fileUrl, {
      method: 'HEAD'
    });

    // Log response details
    console.log('Access response status:', getResponse.status, getResponse.statusText);
    console.log('Access response headers:', Object.fromEntries([...getResponse.headers.entries()]));

    if (!getResponse.ok) {
      console.error('❌ Cannot publicly access uploaded file:', getResponse.status, getResponse.statusText);
      console.error('\n⚠️ Public access is not working. Possible issues:');
      console.error('   1. Bucket is not set to public');
      console.error('   2. Storage policies do not allow public SELECT');
      console.error('   3. CORS settings may be restrictive');
      
      return false;
    }

    console.log('✅ Successfully accessed file publicly');
    
    // 4. Try to delete the test file
    console.log('\n4. Testing file deletion permission:');
    const deleteResponse = await fetch(`${supabaseUrl}/storage/v1/object/userimages/${testFileName}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    // Log response details
    console.log('Delete response status:', deleteResponse.status, deleteResponse.statusText);
    console.log('Delete response headers:', Object.fromEntries([...deleteResponse.headers.entries()]));

    if (!deleteResponse.ok) {
      console.error('❌ Cannot delete from userimages bucket:', deleteResponse.status, deleteResponse.statusText);
      const errorText = await deleteResponse.text();
      console.error('   Error:', errorText);
      return false;
    }

    console.log('✅ Successfully deleted test file');
    
    // 5. Check CORS settings
    console.log('\n5. Testing CORS configuration:');
    await checkCorsSettings();
    
    return true;
  } catch (error) {
    console.error('❌ Error during bucket check:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

async function checkCorsSettings() {
  try {
    const corsResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/userimages/cors`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (!corsResponse.ok) {
      console.error('❌ Could not fetch CORS settings:', corsResponse.status, corsResponse.statusText);
      return false;
    }
    
    const corsSettings = await corsResponse.json();
    console.log('✅ CORS settings retrieved:');
    
    if (!corsSettings || corsSettings.length === 0) {
      console.warn('⚠️ No CORS rules defined! This may cause issues with uploads from browsers.');
      return false;
    }
    
    // Display CORS rules
    corsSettings.forEach((rule, index) => {
      console.log(`   Rule #${index + 1}:`);
      console.log(`   - Allowed Origins: ${rule.allowed_origins.join(', ') || '*'}`);
      console.log(`   - Allowed Methods: ${rule.allowed_methods.join(', ') || '*'}`);
      console.log(`   - Allowed Headers: ${rule.allowed_headers.join(', ') || '*'}`);
      console.log(`   - Max Age Seconds: ${rule.max_age_seconds || 'not set'}`);
    });
    
    // Check for potential issues
    const hasWildcardOrigin = corsSettings.some(rule => 
      rule.allowed_origins.includes('*') || rule.allowed_origins.length === 0);
      
    const allowsPost = corsSettings.some(rule =>
      rule.allowed_methods.includes('POST') || rule.allowed_methods.includes('*'));
      
    if (!hasWildcardOrigin) {
      console.warn('⚠️ No wildcard origin (*) found in CORS rules.');
      console.warn('   This may block uploads from certain origins.');
      console.warn('   Make sure your app\'s origin is in the allowed list.');
    }
    
    if (!allowsPost) {
      console.error('❌ No CORS rule allows POST method!');
      console.error('   This will prevent uploads from browsers.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking CORS settings:', error.message);
    return false;
  }
}

// Test network connectivity
async function testNetworkConnectivity() {
  console.log('\nTesting network connectivity:');
  try {
    console.log('Checking connection to Supabase host...');
    const response = await fetch(supabaseUrl, { method: 'HEAD' });
    console.log(`✅ Connection to ${supabaseUrl} successful (status: ${response.status})`);
    return true;
  } catch (error) {
    console.error(`❌ Cannot connect to ${supabaseUrl}: ${error.message}`);
    console.error('   Possible network issues or firewall restrictions');
    return false;
  }
}

async function runAllChecks() {
  console.log('=== NETWORK CONNECTIVITY CHECK ===');
  await testNetworkConnectivity();
  
  console.log('\n=== BUCKET CONFIGURATION CHECK ===');
  const success = await checkBucket();
  
  if (success) {
    console.log('\n✅ All checks passed! Your Supabase storage is correctly configured for avatar uploads.');
  } else {
    console.log('\n❌ Some checks failed. Please review the errors above and fix your Supabase storage configuration.');
    console.log('\nTips:');
    console.log('1. Ensure your bucket is set to public');
    console.log('2. Check that your storage policies allow:');
    console.log('   - INSERT for authenticated users');
    console.log('   - SELECT for public users');
    console.log('   - DELETE for authenticated users (owner)');
    console.log('3. Verify that your anon key has the correct permissions');
    console.log('4. Make sure CORS is properly configured with:');
    console.log('   - Allowed Origins: * (or your app\'s origin)');
    console.log('   - Allowed Methods: POST, GET, DELETE');
    console.log('   - Allowed Headers: authorization, x-client-info, apikey, content-type');
    console.log('\nTo fix these issues, run:');
    console.log('  scripts/setup-storage-bucket.js');
  }
}

runAllChecks(); 