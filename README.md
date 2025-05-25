# Trivia Feed App

A modern trivia application with a TikTok-style feed interface that helps users learn while having fun.

## Features

- TikTok-style vertical swipe feed for trivia questions
- Multiple-choice questions with instant feedback
- Learning capsules with additional information after answering
- Stats tracking for performance across categories and difficulty levels
- Supabase backend integration for dynamic content

## Setup Instructions

1. Install dependencies

   ```bash
   npm install
   ```

2. Set up Supabase

   - Create a [Supabase](https://supabase.com) account and project
   - Execute the SQL in `scripts/create_table.sql` to create the trivia questions table
   - Import sample questions using the script in `scripts/import-to-supabase.js`
   - Create a `.env` file with your Supabase credentials:

   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

3. Start the app

   ```bash
   npx expo start
   ```

## Importing Trivia Questions

The app includes a script to import trivia questions from a CSV file to your Supabase database:

1. Make sure your Supabase credentials are in the `.env` file
2. Run the import script:

```bash
node scripts/import-to-supabase.js
```

See `scripts/README.md` for more details on the import process and CSV format.

## Technologies Used

- React Native with Expo
- React Navigation
- Redux Toolkit for state management
- Supabase for backend storage
- React Native Reanimated for animations
- React Native Paper for UI components

## Development

The app follows a feature-based structure:

- `src/features/feed` - Main trivia feed components
- `src/features/stats` - Stats and analytics screens
- `src/store` - Redux store configuration
- `src/lib` - Utilities and service functions
- `scripts` - Database utilities and import tools

## Development Features

### Debug Mode
The application includes a debug mode that provides additional development tools and visual aids:

**How to enable Debug Mode:**
- **Web**: Add `?debug=trivia-debug-panel` to the URL or use the keyboard shortcut `Alt + D`
- **iOS**: Use a 3-finger tap gesture on the screen

**Debug Mode Features:**
- **Correct Answer Marks**: When debug mode is enabled, correct answers are marked with a golden star (⭐) icon before the user answers the question
- **Debug Panel**: Access to interaction tracking, feed status, database logs, and weight changes
- **Show All Rings Button**: Additional button to view all topic rings at once
- **Question Selection Logic**: View explanations for why specific questions were selected

**Debug Answer Marks:**
- Only visible when debug mode is ON and the question has NOT been answered yet
- Shows a small golden star icon next to correct answers
- Disappears once the user selects an answer (replaced by normal feedback icons)
- Helps with testing and development by quickly identifying correct answers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
