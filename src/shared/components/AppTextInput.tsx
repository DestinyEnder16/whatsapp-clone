import { forwardRef } from 'react';
import { StyleProp, TextInput, TextInputProps, TextStyle } from 'react-native';

export type AppTextInputVariant = 'regular' | 'medium' | 'bold' | 'italic';

interface AppTextInputProps extends TextInputProps {
  className?: string;
  variant?: AppTextInputVariant;
  style?: StyleProp<TextStyle>;
}

const fontFamilies: Record<AppTextInputVariant, string> = {
  regular: 'SFPRODISPLAYREGULAR',
  medium: 'SFPRODISPLAYMEDIUM',
  bold: 'SFPRODISPLAYBOLD',
  italic: 'SFPRODISPLAYSEMIBOLDITALIC',
};

export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(
  ({ className, variant = 'regular', style, ...props }, ref) => (
    <TextInput
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

AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;
