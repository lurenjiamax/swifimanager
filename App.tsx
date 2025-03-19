"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import ReactNative, {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  PermissionsAndroid,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import WifiManager from "react-native-wifi-reborn"
import { Wifi, WifiOff, Lock, RefreshCw, Signal, ChevronRight, ChevronLeft } from "lucide-react-native"

interface WifiNetwork {
  SSID: string
  BSSID: string
  level: number
  frequency: number
  capabilities: string
  timestamp: number
  channel?: number
}

function calculateChannel(frequency: number): number {
  // Calculate WiFi channel from frequency
  if (frequency >= 2412 && frequency <= 2484) {
    return Math.floor((frequency - 2412) / 5) + 1
  } else if (frequency >= 5170 && frequency <= 5825) {
    return Math.floor((frequency - 5170) / 5) + 34
  }
  return 0
}

function getSignalStrength(level: number): { icon: React.ReactNode; text: string } {
  if (level >= -50) {
    return {
      icon: <Signal size={20} strokeWidth={2} color="#22c55e" />,
      text: "Excellent",
    }
  } else if (level >= -60) {
    return {
      icon: <Signal size={20} strokeWidth={2} color="#22c55e" />,
      text: "Good",
    }
  } else if (level >= -70) {
    return {
      icon: <Signal size={20} strokeWidth={2} color="#eab308" />,
      text: "Fair",
    }
  } else {
    return {
      icon: <Signal size={20} strokeWidth={2} color="#ef4444" />,
      text: "Poor",
    }
  }
}

function isSecured(capabilities: string): boolean {
  return capabilities.includes("WPA") || capabilities.includes("WEP") || capabilities.includes("PSK")
}

function App(): React.JSX.Element {
  const [wifiList, setWifiList] = useState<WifiNetwork[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false)
  const {LocalWifiManager} = ReactNative.NativeModules;
  const [connectedWifiBSSID, setConnectedWifiBSSID] = useState<string | null>(null)

  const scanWifi = useCallback(async () => {
    try {
      setLoading(true)
      await WifiManager.setEnabled(true)
      const networks = await WifiManager.loadWifiList()

      // Process the networks to add channel information
      const processedNetworks = networks.map((network: WifiNetwork) => ({
        ...network,
        channel: calculateChannel(network.frequency),
      }))

      // Sort by signal strength (level)
      processedNetworks.sort((a: WifiNetwork, b: WifiNetwork) => b.level - a.level)

      setWifiList(processedNetworks)
    } catch (error) {
      console.error("Error scanning WiFi:", error)
      Alert.alert("Error", "Failed to scan WiFi networks")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const getConnectedWifi = useCallback(async () => {
    try {
      const connectedWifiBSSID = await WifiManager.getBSSID()
      console.log("Connected WiFi BSSID:", connectedWifiBSSID)
      setConnectedWifiBSSID(connectedWifiBSSID)
    } catch (error) {
      console.error("Error getting connected WiFi:", error)
    }
  }, [])

  const requestLocationPermission = useCallback(async () => {
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
        title: "Location Permission Required",
        message: "This app needs access to your location to scan for WiFi networks",
        buttonPositive: "OK",
      })
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        setPermissionGranted(true)
        scanWifi()
      } else {
        Alert.alert("Permission Denied", "WiFi scanning requires location permission", [{ text: "OK" }])
      }
    } catch (err) {
      console.warn(err)
    }
  }, [scanWifi])

  const connectToWifiByBSSID = async (bssid: string) => {
    try {
      const essid = wifiList.find((network) => network.BSSID === bssid)?.SSID
      if (essid) {
        await LocalWifiManager.connectByBSSID(bssid, essid, null)
        Alert.alert("Success", `Connected to ${bssid}`)
        getConnectedWifi()
      } else {
        Alert.alert("Error", `Failed to connect to ${bssid}, ESSID not found`)
      }
    }
    catch (error) {
      console.error("Error connecting to WiFi:", error)
      Alert.alert("Error", `Failed to connect to ${bssid}`)
    }
  } 

  const connectToWifi = async (ssid: string, capabilities: string) => {
    try {
      if (isSecured(capabilities)) {
        // For secured networks, we would need to prompt for password
        // This is a simplified example
        Alert.prompt(
          "Enter WiFi Password",
          `Enter password for ${ssid}`,
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Connect",
              onPress: async (password?: string) => {
                if (password) {
                  try {
                    await WifiManager.connectToProtectedSSID(ssid, password, false, false)
                    Alert.alert("Success", `Connected to ${ssid}`)
                  } catch (error) {
                    Alert.alert("Error", `Failed to connect to ${ssid}`)
                  }
                }
              },
            },
          ],
          "secure-text",
        )
      } else {
        // For open networks
        await WifiManager.connectToProtectedSSID(ssid, "", false, false)
        Alert.alert("Success", `Connected to ${ssid}`)
      }
    } catch (error) {
      console.error("Error connecting to WiFi:", error)
      Alert.alert("Error", `Failed to connect to ${ssid}`)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    scanWifi()
    getConnectedWifi()
  }

  useEffect(() => {
    requestLocationPermission()
  }, [requestLocationPermission])

  useEffect(() => {
    getConnectedWifi()
  }, [getConnectedWifi])

  const renderWifiItem = ({ item }: { item: WifiNetwork }) => {
    const signalInfo = getSignalStrength(item.level)

    return (
      // <TouchableOpacity style={styles.wifiItem} onPress={() => connectToWifi(item.SSID, item.capabilities)}>
      <TouchableOpacity style={styles.wifiItem} onPress={() => connectToWifiByBSSID(item.BSSID)}>
        <View style={styles.wifiItemHeader}>
          <View style={styles.ssidContainer}>
            <Wifi size={24} color="#0284c7" />
            <Text style={styles.ssid}>{item.SSID || "Hidden Network"}</Text>
          </View>
          <View style={styles.signalContainer}>
            {signalInfo.icon}
            <Text style={styles.signalText}>{signalInfo.text}</Text>
            {isSecured(item.capabilities) && <Lock size={16} color="#64748b" style={styles.lockIcon} />}
          </View>
        </View>

        <View style={styles.wifiDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>BSSID:</Text>
            <Text style={styles.detailValue}>{item.BSSID}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Channel:</Text>
            <Text style={styles.detailValue}>{item.channel}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Frequency:</Text>
            <Text style={styles.detailValue}>{item.frequency} MHz</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Signal:</Text>
            <Text style={styles.detailValue}>{item.level} dBm</Text>
          </View>
        </View>

        <View style={styles.connectContainer}>
            {item.BSSID.toUpperCase() === connectedWifiBSSID?.toUpperCase() ? (
                <>
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#22c55e" }} />
                <Text style={styles.connectText}>Connected</Text>
                </>
            ) : (
            <>
              <Text style={styles.connectText}>Tap to connect</Text>
              <ChevronRight size={16} color="#64748b" />
            </>
            )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.header}>
        <Text style={styles.title}>WiFi Scanner</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={scanWifi} disabled={loading}>
          <RefreshCw size={20} color="#0284c7" />
          <Text style={styles.refreshText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Scanning for WiFi networks...</Text>
        </View>
      ) : wifiList.length > 0 ? (
        <FlatList
          data={wifiList}
          renderItem={renderWifiItem}
          keyExtractor={(item) => item.BSSID}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0284c7"]} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <WifiOff size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>No WiFi networks found</Text>
          <TouchableOpacity style={styles.scanButton} onPress={scanWifi}>
            <Text style={styles.scanButtonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshText: {
    marginLeft: 4,
    color: "#0284c7",
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  listContainer: {
    padding: 16,
  },
  wifiItem: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  wifiItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ssidContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  ssid: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginLeft: 8,
  },
  signalContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  signalText: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 4,
  },
  lockIcon: {
    marginLeft: 8,
  },
  wifiDetails: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  detailLabel: {
    width: 90,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
  },
  connectContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  connectText: {
    fontSize: 14,
    color: "#0284c7",
    fontWeight: "500",
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 12,
    marginBottom: 24,
  },
  scanButton: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
})

export default App

