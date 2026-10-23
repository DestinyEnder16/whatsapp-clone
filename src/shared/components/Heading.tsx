import { useAppTheme } from '@/shared/hooks';
import { TextStyle } from 'react-native';
import { AppText } from './AppText';

interface HeadingProps {
  title: string;
  className?: string;
  style?: TextStyle;
}

export default function Heading({
  title,
  className = '',
  style,
}: HeadingProps) {
  const { colors } = useAppTheme();

  return (
    <AppText
      className={`text-[24px] font-bold ${className}`}
      variant="bold"
      style={[{ color: colors.text }, style]}
    >
      {title}
    </AppText>
  );
}
