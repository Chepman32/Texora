import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PixelRatio,
  StatusBar,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { onboardingSlides } from '../constants/onboarding';
import StorageService from '../services/StorageService';
import { useLanguage } from '../context/LanguageContext';
import FeedbackService from '../services/FeedbackService';

// Import animation components
import TextTransformAnimation from '../components/onboarding/TextTransformAnimation';
import AIDesignAnimation from '../components/onboarding/AIDesignAnimation';
import VoiceToSlideAnimation from '../components/onboarding/VoiceToSlideAnimation';
import ProfessionalSlidesAnimation from '../components/onboarding/ProfessionalSlidesAnimation';
import TextToVisualAnimation from '../components/onboarding/TextToVisualAnimation';
import PocketDesignerAnimation from '../components/onboarding/PocketDesignerAnimation';
import DesignTeamAnimation from '../components/onboarding/DesignTeamAnimation';
import UniqueDesignAnimation from '../components/onboarding/UniqueDesignAnimation';

const DotIndicator: React.FC<{ 
  index: number; 
  isActive: boolean; 
  onPress: () => void;
  pageWidth: number;
  scrollX: any;
}> = ({ index, isActive, onPress, pageWidth, scrollX }) => {
  const dotStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value / pageWidth,
      [index - 1, index, index + 1],
      [0.8, 1.2, 0.8]
    );
    
    return {
      width: withTiming(isActive ? 24 : 8, { duration: 300 }),
      backgroundColor: withTiming(isActive ? '#3b82f6' : '#d1d5db', { duration: 300 }),
      transform: [{ scale: withTiming(isActive ? scale : 1, { duration: 300 }) }],
    };
  });

  return (
    <TouchableOpacity
      style={styles.dot}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.dotInner, dotStyle]} />
    </TouchableOpacity>
  );
};

const OnboardingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const titleOpacity = useSharedValue(1);
  const animationOpacity = useSharedValue(1);
  const { t } = useLanguage();
  const fontScale = PixelRatio.getFontScale();
  const isCompactHeight = screenHeight < 780;
  const isCompactWidth = screenWidth < 380;
  const titleFontSize = isCompactHeight || isCompactWidth ? 24 : 28;
  const descriptionFontSize = isCompactHeight ? 15 : 16;
  const titleLineHeight = Math.ceil(titleFontSize * fontScale * 1.3);
  const descriptionLineHeight = Math.ceil(descriptionFontSize * fontScale * 1.45);
  
  const flatListRef = useRef<any>(null);

  const animationComponents = {
    TextTransformAnimation,
    AIDesignAnimation,
    VoiceToSlideAnimation,
    ProfessionalSlidesAnimation,
    TextToVisualAnimation,
    PocketDesignerAnimation,
    DesignTeamAnimation,
    UniqueDesignAnimation,
  };

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      
      // Update opacity based on scroll
      const index = Math.round(event.contentOffset.x / screenWidth);
      titleOpacity.value = withTiming(1 - Math.abs((event.contentOffset.x / screenWidth) - index) * 0.5);
      animationOpacity.value = withTiming(1 - Math.abs((event.contentOffset.x / screenWidth) - index) * 0.3);
    },
  });

  const handleNext = () => {
    FeedbackService.buttonTap();
    if (currentIndex < onboardingSlides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    FeedbackService.buttonTap();
    handleComplete();
  };

  const handleComplete = async () => {
    await StorageService.setOnboardingCompleted();
    navigation.replace('Home');
  };

  const handleDotPress = (index: number) => {
    FeedbackService.buttonTap();
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    const clampedIndex = Math.max(0, Math.min(onboardingSlides.length - 1, nextIndex));

    if (clampedIndex !== currentIndex) {
      setCurrentIndex(clampedIndex);
    }
  };

  const nextButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (Math.abs(event.translationX) > 50) {
        if (event.translationX > 0 && currentIndex > 0) {
          runOnJS(handleDotPress)(currentIndex - 1);
        } else if (event.translationX < 0 && currentIndex < onboardingSlides.length - 1) {
          runOnJS(handleDotPress)(currentIndex + 1);
        }
      }
    });

  const renderSlide = ({ item }: { item: any; index: number }) => {
    const AnimationComponent = animationComponents[item.svgComponent as keyof typeof animationComponents];
    
    return (
      <View style={[styles.slide, { width: screenWidth }]}>
        <Animated.View style={[styles.animationContainer, { opacity: animationOpacity }]}>
          {AnimationComponent && <AnimationComponent />}
        </Animated.View>
        
        <Animated.View
          style={[
            styles.textContainer,
            isCompactHeight && styles.textContainerCompact,
            { opacity: titleOpacity },
          ]}
        >
          <Text
            style={[
              styles.title,
              { fontSize: titleFontSize, lineHeight: titleLineHeight },
            ]}
            maxFontSizeMultiplier={1.15}
          >
            {t(item.titleKey)}
          </Text>
          <Text
            style={[
              styles.description,
              { fontSize: descriptionFontSize, lineHeight: descriptionLineHeight },
            ]}
            maxFontSizeMultiplier={1.15}
          >
            {t(item.descriptionKey)}
          </Text>
        </Animated.View>
      </View>
    );
  };

  const renderDot = (index: number) => {
    return (
      <DotIndicator
        key={index}
        index={index}
        isActive={currentIndex === index}
        onPress={() => handleDotPress(index)}
        pageWidth={screenWidth}
        scrollX={scrollX}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <GestureDetector gesture={panGesture}>
        <View style={styles.content}>
          {/* Skip button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>{t('onboarding_skip')}</Text>
          </TouchableOpacity>

          {/* Slides */}
          <Animated.FlatList
            ref={flatListRef}
            data={onboardingSlides}
            renderItem={renderSlide}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            onScroll={handleScroll}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            scrollEventThrottle={16}
            bounces={false}
          />

          {/* Dots indicator */}
          <View style={styles.dotsContainer}>
            {onboardingSlides.map((_, index) => renderDot(index))}
          </View>

          {/* Next/Get Started button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.nextButton,
                currentIndex === onboardingSlides.length - 1 && styles.getStartedButton,
              ]}
              onPress={handleNext}
              activeOpacity={0.8}
              onPressIn={() => {
                buttonScale.value = withSpring(0.95);
              }}
              onPressOut={() => {
                buttonScale.value = withSpring(1);
              }}
            >
              <Animated.Text style={[styles.nextButtonText, nextButtonStyle]}>
                {currentIndex === onboardingSlides.length - 1
                  ? t('onboarding_get_started')
                  : t('onboarding_next')}
              </Animated.Text>
            </TouchableOpacity>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  animationContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  textContainer: {
    flex: 1.15,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 12,
  },
  textContainerCompact: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
    flexShrink: 1,
  },
  description: {
    color: '#6b7280',
    textAlign: 'center',
    flexShrink: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  dot: {
    marginHorizontal: 4,
    padding: 4,
  },
  dotInner: {
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  getStartedButton: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default OnboardingScreen;
