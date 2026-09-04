import { Text } from "react-native";

interface HeadingProps {
    title: string,

}

export default function Heading({ title, }: HeadingProps) {
    return (

        <Text className="text-neutral-900 text-[24px] font-[700]">{title}</Text>

    )
}