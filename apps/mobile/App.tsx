import { StatusBar } from "expo-status-bar";
import { SafeAreaView, Text, View } from "react-native";
import { mobileTabs, productName } from "./src/navigation/routes";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7faf9" }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, padding: 24, gap: 20 }}>
        <View>
          <Text style={{ color: "#064247", fontSize: 28, fontWeight: "700" }}>{productName}</Text>
          <Text style={{ color: "#5f7478", marginTop: 8 }}>
            Foundation navigation shell. G01 shift discovery is not implemented yet.
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          {mobileTabs.map((tab) => (
            <View
              key={tab.id}
              style={{
                backgroundColor: "white",
                borderColor: "#dce8e8",
                borderRadius: 18,
                borderWidth: 1,
                padding: 18
              }}
            >
              <Text style={{ color: "#083f43", fontSize: 18, fontWeight: "700" }}>{tab.label}</Text>
              <Text style={{ color: "#6b7d80", marginTop: 4 }}>{tab.status}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
