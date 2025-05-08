# Database and UI Fixes

## Fixed Issues

1. **Database Error: "aggregate functions are not allowed in RETURNING"**
   - Fixed in `src/lib/syncService.ts` by removing `.select('count')` from the `cleanupFeedChanges` function
   - This was causing errors during the old record deletion process

2. **SQL Script Optimization**
   - Created updated versions of the SQL scripts that work properly in Supabase
   - Split VACUUM operations into a separate file since they cannot run inside transaction blocks
   - Fixed JSONB type handling in the text field truncation code

## Remaining Issues

1. **React Native UI Error: "Unexpected text node: . A text node cannot be a child of a <View>"**
   - This error occurs when text is placed directly inside a View component without being wrapped in a Text component
   - Common causes:
     - Curly braces containing text: `<View>{someText}</View>` instead of `<View><Text>{someText}</Text></View>`
     - Dot (.) characters in JSX that aren't properly contained in a Text component
     - String literals directly inside View components

## Recommendations

1. **For the UI error:**
   - Check your React Native components for places where text might be directly inside a View
   - Look for any component that renders dynamic content where a text node might be inserted
   - Ensure all text is wrapped in Text components: `<Text>...</Text>`
   - Pay special attention to any code that generates JSX dynamically

2. **For database performance:**
   - Monitor the user_feed_changes table to ensure cleanup is working properly
   - Consider implementing a server-side scheduled task to regularly clean the database 