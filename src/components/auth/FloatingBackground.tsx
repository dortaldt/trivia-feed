import React from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { getActiveTopicConfig } from '../../utils/topicTheming';

interface FloatingBackgroundProps {
  children: React.ReactNode;
}

interface StaticAsset {
  id: string;
  source: any;
  size: number;
  position: { x: number; y: number };
  opacity: number;
}

export const FloatingBackground: React.FC<FloatingBackgroundProps> = ({ children }) => {
  const { activeTopic } = getActiveTopicConfig();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // Define topic-specific static background assets
  const getStaticAssets = (): StaticAsset[] => {
    switch (activeTopic) {
      case 'friends-tv':
        return [
          {
            id: 'joey',
            source: require('../../../assets/images/friends_imgs/fri_joey.png'),
            size: 130,
            position: { x: screenWidth * 0.78, y: screenHeight * 0.15 },
            opacity: 0.16,
          },
          {
            id: 'sofa',
            source: require('../../../assets/images/friends_imgs/fri_sofa.png'),
            size: 150,
            position: { x: screenWidth * 0.02, y: screenHeight * 0.72 },
            opacity: 0.13,
          },
          {
            id: 'chicken',
            source: require('../../../assets/images/friends_imgs/fri_chicken.png'),
            size: 110,
            position: { x: screenWidth * 0.06, y: screenHeight * 0.25 },
            opacity: 0.18,
          },
        ];
      
      case 'music':
        // Could add music-themed assets in the future
        return [];
      
      case 'nineties':
        // Could add 90s-themed assets in the future
        return [];
      
      default:
        return [];
    }
  };

  const staticAssets = getStaticAssets();

  // Don't render background elements if none are defined for this topic
  if (staticAssets.length === 0) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {/* Static background elements */}
      <View style={styles.backgroundContainer}>
        {staticAssets.map((asset) => (
          <Image
            key={asset.id}
            source={asset.source}
            style={[
              styles.staticAsset,
              {
                width: asset.size,
                height: asset.size,
                left: asset.position.x,
                top: asset.position.y,
                opacity: asset.opacity,
              },
            ]}
            resizeMode="contain"
          />
        ))}
      </View>
      
      {/* Main content on top */}
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    pointerEvents: 'none', // Allows touches to pass through to content below
  },
  staticAsset: {
    position: 'absolute',
  },
  contentContainer: {
    flex: 1,
    zIndex: 2,
  },
}); 