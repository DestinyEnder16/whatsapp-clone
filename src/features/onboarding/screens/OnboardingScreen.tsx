import Button from '@/shared/components/Button';
import { useAppTheme } from '@/shared/hooks';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ONBOARDING_SLIDES } from '../data';

export function OnboardingScreen() {
    const { width } = useWindowDimensions();
    const router = useRouter();
    const { colors, isDark } = useAppTheme();
    const [currentIndex, setCurrentIndex] = useState(0);
    const slidesRef = useRef(null);

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems[0]) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            <View style={styles.header}>
                <Image
                    source={require('@/assets/images/icon.png')}
                    style={styles.logoIcon}
                    resizeMode="contain"
                />
                <Text style={[styles.logoText, { color: colors.primary }]}>ChatMe</Text>
            </View>

            <View style={{ flex: 4 }}>
                <FlatList
                    data={ONBOARDING_SLIDES}
                    renderItem={({ item }) => {
                        const imageSource =
                            isDark && item.id === '1'
                                ? require('@/assets/images/illustration-onboarding-dark.png')
                                : item.image;

                        return (
                            <View style={[styles.slide, { width }]}>
                                <Image
                                    source={imageSource}
                                    style={[styles.image, { width: width * 0.9, resizeMode: 'contain' }]}
                                />
                            </View>
                        );
                    }}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item) => item.id}
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                    ref={slidesRef}
                />
            </View>

            <View style={styles.bottomContainer}>
                <View style={styles.indicatorContainer}>
                    {ONBOARDING_SLIDES.map((_, index) => (
                        <View
                            key={index.toString()}
                            style={[
                                styles.indicator,
                                currentIndex === index
                                    ? { width: 24, backgroundColor: colors.primary }
                                    : {
                                          width: 8,
                                          backgroundColor: isDark
                                              ? colors.cardBorder
                                              : colors.divider,
                                      },
                            ]}
                        />
                    ))}
                </View>

                <Text style={[styles.title, { color: colors.text }]}>
                    {ONBOARDING_SLIDES[currentIndex].title}
                </Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {ONBOARDING_SLIDES[currentIndex].description}
                </Text>

                <Button title="Get Started" onPress={() => { router.push('/(auth)/phone'); }} />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        paddingTop: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoIcon: {
        width: 32,
        height: 32,
        marginRight: 8,
    },
    logoText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        flex: 1,
        maxHeight: '100%',
    },
    bottomContainer: {
        flex: 2,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 40,
    },
    indicatorContainer: {
        flexDirection: 'row',
        marginBottom: 40,
    },
    indicator: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 36,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
});

