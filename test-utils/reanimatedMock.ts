// Stand-in for react-native-reanimated, whose native worklets are unavailable in
// Jest. Only what the app's components use: Animated.View and the entering
// animations (chainable builders). Use with:
//   jest.mock('react-native-reanimated', () => require('../test-utils/reanimatedMock'));
const { View } = require('react-native');

const builder: any = { duration: () => builder };

export default { View };
export const FadeInLeft = builder;
export const ZoomIn = builder;
