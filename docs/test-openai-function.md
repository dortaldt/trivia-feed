# Testing the OpenAI Edge Function

This guide provides instructions on how to test the OpenAI service edge function that we've deployed to Supabase.

## Prerequisites

- You need an access token from Supabase Auth
- You should have the OpenAI API key set as a secret in your Supabase project

## Getting an Access Token

You can get a valid access token in one of these ways:

1. **Using the Supabase JS client in your application:**
   ```javascript
   const { data: authData } = await supabase.auth.signInWithPassword({
     email: 'your-email@example.com',
     password: 'your-password'
   });

   const accessToken = authData.session.access_token;
   console.log('Your access token:', accessToken);
   ```

2. **Using the Supabase Dashboard:**
   - Go to Authentication > Users
   - Click on a user
   - Under "User Details" find "Generate a link to log in as this user"
   - Open the link in an incognito window
   - Open browser developer tools, go to Application > Local Storage
   - Look for the `sb-[project-ref]-auth-token` key
   - The token is in JSON under the "access_token" field

## Testing with cURL

Once you have your access token, you can test the edge function using cURL:

```bash
curl -X POST 'https://vdrmtsifivvpioonpqqc.functions.supabase.co/openai-proxy' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
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

Replace `YOUR_ACCESS_TOKEN` with the actual token you obtained.

## Testing the "More Questions" Feature

To test the "generateQuestions" action specifically:

```bash
curl -X POST 'https://vdrmtsifivvpioonpqqc.functions.supabase.co/openai-proxy' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "action": "generateQuestions",
    "params": {
      "currentQuestion": "What is the capital of France?",
      "topic": "Geography",
      "difficulty": "medium"
    }
  }'
```

## Expected Response

If successful, you should receive a response like:

```json
{
  "data": [
    {
      "question": "What are the five most populous metropolitan areas in the European Union?",
      "difficulty": "harder",
      "explanation": "This question requires knowledge of population statistics across multiple EU countries, making it more challenging than identifying a single capital city."
    },
    {
      "question": "Is Paris located in the northern or southern half of France?",
      "difficulty": "easier",
      "explanation": "This is a simpler question that requires only basic geographical knowledge of France's layout."
    },
    {
      "question": "What river flows through Paris?",
      "difficulty": "similar",
      "explanation": "This question tests knowledge about a major geographical feature of Paris, similar in difficulty to knowing the capital."
    }
  ]
}
```

## Troubleshooting

- **Authentication error:** Make sure your access token is valid and not expired
- **Rate limit error:** Check your usage in the Supabase dashboard
- **Invalid action:** Verify that your action is either "generateText" or "generateQuestions" 