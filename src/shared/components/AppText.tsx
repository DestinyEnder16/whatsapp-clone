import { forwardRef } from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';

export type AppTextVariant = 'regular' | 'medium' | 'bold' | 'italic';

interface AppTextProps extends TextProps {
  className?: string;
  variant?: AppTextVariant;
  style?: StyleProp<TextStyle>;
}

const fontFamilies: Record<AppTextVariant, string> = {
  regular: 'SFPRODISPLAYREGULAR',
  medium: 'SFPRODISPLAYMEDIUM',
  bold: 'SFPRODISPLAYBOLD',
  italic: 'SFPRODISPLAYSEMIBOLDITALIC',
};

export const AppText = forwardRef<Text, AppTextProps>(
  ({ className, variant = 'regular', style, ...props }, ref) => (
    <Text
      ref={ref}
      {...props}
      className={className}
      style={[
        { fontFamily: fontFamilies[variant], fontWeight: 'normal' },
        style,
      ]}
    />
  )
);

AppText.displayName = 'AppText';

export default AppText;
