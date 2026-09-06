import { BackButton, Button } from "@/shared/components";
import Screen from "@/shared/components/Screen";
import { Image } from "expo-image";
import { Text, View } from "react-native";

export function UploadPhotoScreen() {
    return (
        <Screen>
            <View className="mb-4">
                <BackButton />
            </View>

            <View className="mt-4 items-center">
                <Text className="text-[24px] font-bold text-neutral-900 tracking-tight">
                    Upload a photo
                </Text>
            </View>

            <View className="flex-1 items-center justify-center">
                <Image
                    source={require("@/assets/images/upload-photo-light.svg")}
                    style={{ width: 170, height: 170 }}
                    contentFit="contain"
                />
            </View>

            <View className="mt-auto pb-4">
                <Button
                    title="Upload Photo"
                    onPress={() => {
                        console.log("Upload photo tapped");
                    }}
                />
            </View>
        </Screen>
    );
}

export default UploadPhotoScreen;
