import { useAppTheme } from "@/shared/hooks";
import Ionicons from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import Modal from "react-native-modal";

export interface PinCodeModalProps {
  isVisible: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onBackdropPress?: () => void;
}

export function PinCodeModal({
  isVisible,
  onConfirm,
  onCancel,
  onBackdropPress,
}: PinCodeModalProps) {
  const { colors } = useAppTheme();

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onBackdropPress || onCancel}
      backdropOpacity={0.4}
      animationIn="zoomIn"
      animationOut="zoomOut"
      useNativeDriver
      hideModalContentWhileAnimating
    >
      <View className="items-center justify-center px-4">
        {/* Main Card Container */}
        <View
          className="w-full max-w-[340px] rounded-[28px] px-6 pt-10 pb-6 relative items-center shadow-xl border"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          }}
        >
          {/* Top Floating Lock Icon Badge */}
          <View
            className="absolute -top-7 w-16 h-16 rounded-[22px] items-center justify-center shadow-md border"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 5,
            }}
          >
            <Ionicons
              name="lock-closed"
              size={28}
              color={colors.primary}
            />
          </View>

          {/* Title */}
          <Text
            className="text-[20px] font-bold text-center tracking-tight mt-1"
            style={{ color: colors.text }}
          >
            Do you want to add a pin code?
          </Text>

          {/* Subtitle / Description */}
          <Text
            className="text-[14px] text-center mt-2.5 leading-5 px-3 font-normal"
            style={{ color: colors.textSecondary }}
          >
            Add a verification code to make it more secure.
          </Text>

          {/* Action Buttons */}
          <View className="w-full mt-7 gap-y-3">
            {/* Yes Button */}
            <Pressable
              onPress={onConfirm}
              className="w-full h-[52px] rounded-2xl items-center justify-center active:opacity-90"
              style={{ backgroundColor: colors.primary }}
            >
              <Text
                className="text-[16px] font-bold"
                style={{ color: colors.primaryText }}
              >
                Yes
              </Text>
            </Pressable>

            {/* No, thanks Button */}
            <Pressable
              onPress={onCancel}
              className="w-full h-[52px] rounded-2xl items-center justify-center active:opacity-80"
              style={{ backgroundColor: colors.surface }}
            >
              <Text
                className="text-[16px] font-bold"
                style={{ color: colors.primary }}
              >
                No, thanks
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default PinCodeModal;

