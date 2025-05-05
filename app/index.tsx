import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the feed tab when opening the app
  return <Redirect href="/(tabs)/feed" />;
} 