import { useAppTheme } from "@/shared/hooks";
import { AccentColorKey } from "@/shared/theme/themes";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

interface AppIconOption {
  key: AccentColorKey;
  label: string;
  color: string;
  bgLight: string;
}

const ICON_OPTIONS: AppIconOption[] = [
  {
    key: "green",
    label: "Green",
    color: "#57B77D",
    bgLight: "#E8F5ED",
  },
  {
    key: "blue",
    label: "Blue",
    color: "#007CFF",
    bgLight: "#ECF5FF",
  },
  {
    key: "red",
    label: "Red",
    color: "#E8503A",
    bgLight: "#FFF5F5",
  },
  {
    key: "orange",
    label: "Orange",
    color: "#FFB23F",
    bgLight: "#FFF0D9",
  },
];

/**
 * Pixel-accurate smiley chat bubble icon matching the design
 */
function SmileyBubbleIcon({ color }: { color: string }) {
  return (
    <View className="items-center justify-center relative w-11 h-10">
      {/* Speech bubble outline */}
      <View
        className="w-[40px] h-[34px] rounded-[11px] border-[2.5px] items-center justify-center"
        style={{ borderColor: color }}
      >
        {/* Eyes & Smile Container */}
        <View className="items-center justify-center pt-0.5">
          {/* Eyes */}
          <View className="flex-row items-center gap-[9px] mb-[2px]">
            <View
              className="w-[3.5px] h-[3.5px] rounded-full"
              style={{ backgroundColor: color }}
            />
            <View
              className="w-[3.5px] h-[3.5px] rounded-full"
              style={{ backgroundColor: color }}
            />
          </View>
          {/* Curved Smile */}
          <View
            className="w-[14px] h-[6px] border-b-[2px] rounded-b-full"
            style={{ borderBottomColor: color }}
          />
        </View>
      </View>

      {/* Bubble Tail at Bottom Left */}
      <View
        className="absolute bottom-[2px] left-[5px] w-[7px] h-[7px] border-l-[2.5px] border-b-[2.5px] -rotate-45"
        style={{ borderColor: color }}
      />
    </View>
  );
}

export function AppearanceIconSelector() {
  const { colors, isDark, accentColor } = useAppTheme();
  const [selectedIcon, setSelectedIcon] = useState<AccentColorKey>(accentColor);

  return (
    <View className="px-6 pt-5 pb-8">
      <Text
        className="text-[17px] font-bold tracking-tight mb-4"
        style={{ color: colors.text }}
      >
        App Icon
      </Text>

      <View className="flex-row items-center justify-between gap-3">
        {ICON_OPTIONS.map((item) => {
          const isSelected = selectedIcon === item.key;

          return (
            <Pressable
              key={item.key}
              onPress={() => setSelectedIcon(item.key)}
              className="flex-1 items-center active:opacity-80"
            >
              {/* App Icon Card */}
              <View
                className="w-full aspect-square max-w-[76px] rounded-2xl items-center justify-center border-2 mb-2"
                style={{
                  backgroundColor: isDark
                    ? isSelected
                      ? colors.card
                      : colors.surface
                    : item.bgLight,
                  borderColor: isSelected ? item.color : "transparent",
                }}
              >
                <SmileyBubbleIcon color={item.color} />
              </View>

              {/* Label */}
              <Text
                className="text-[13px] font-medium"
                style={{
                  color: isSelected ? colors.text : colors.textSecondary,
                  fontWeight: isSelected ? "700" : "500",
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default AppearanceIconSelector;
