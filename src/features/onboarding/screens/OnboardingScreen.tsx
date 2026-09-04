import { colors } from '@/shared/theme/colors';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ONBOARDING_SLIDES } from '../data';


export function OnboardingScreen() {
    const { width } = useWindowDimensions();
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const slidesRef = useRef(null);

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems[0]) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={require('@/assets/images/icon.png')}
                    style={styles.logoIcon}
                    resizeMode="contain"
                />
                <Text style={styles.logoText}>ChatMe</Text>
            </View>

            <View style={{ flex: 4 }}>
                <FlatList
                    data={ONBOARDING_SLIDES}
                    renderItem={({ item }) => (
                        <View style={[styles.slide, { width }]}>
                            <Image
                                source={item.image}
                                style={[styles.image, { width: width * 0.9, resizeMode: 'contain' }]}
                            />
                        </View>
                    )}
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
                                currentIndex === index ? styles.indicatorActive : styles.indicatorInactive,
                            ]}
                        />
                    ))}
                </View>

                <Text style={styles.title}>{ONBOARDING_SLIDES[currentIndex].title}</Text>
                <Text style={styles.description}>{ONBOARDING_SLIDES[currentIndex].description}</Text>

                <Pressable
                    style={styles.button}
                    onPress={() => {
                        // For now, let's just alert or go somewhere.
                        console.log('Get Started pressed');
                    }}
                >
                    <Text style={styles.buttonText}>Get Started</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
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
        color: colors.primary[400],
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
    indicatorActive: {
        width: 24,
        backgroundColor: colors.primary[400],
    },
    indicatorInactive: {
        width: 8,
        backgroundColor: colors.neutral[100],
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.neutral[900],
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 36,
    },
    description: {
        fontSize: 16,
        color: colors.neutral[300],
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    button: {
        backgroundColor: colors.primary[400],
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
