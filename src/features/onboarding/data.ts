import { ImageSourcePropType } from 'react-native';

export interface OnboardingSlide {
    id: string;
    image: ImageSourcePropType;
    title: string;
    description: string;
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
    {
        id: '1',
        image: require('@/assets/images/illustration-onboarding.png'),
        title: 'Stay connected with your friends and family',
        description: 'ChatMe is messaging app that will help you to connect with everyone.',
    },
    {
        id: '2',
        image: require('@/assets/images/Illustration Onboarding 2.png'),
        title: 'Stay connected with your friends and family',
        description: 'ChatMe is messaging app that will help you to connect with everyone.',
    },
    {
        id: '3',
        image: require('@/assets/images/Illustration Onboarding 3.png'),
        title: 'Stay connected with your friends and family',
        description: 'ChatMe is messaging app that will help you to connect with everyone.',
    },
];
