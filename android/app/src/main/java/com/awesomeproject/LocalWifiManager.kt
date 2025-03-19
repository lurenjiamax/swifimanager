package com.awesomeproject

import android.content.Context
import android.net.wifi.WifiManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.net.wifi.WifiNetworkSpecifier
import android.net.MacAddress
import android.net.NetworkRequest
import android.net.NetworkCapabilities
import android.net.ConnectivityManager

class LocalWifiManager(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val wifiManager = reactContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

    override fun getName(): String {
        return "LocalWifiManager"
    }

    @ReactMethod
    fun enableWifi() {
        wifiManager.isWifiEnabled = true
    }

    @ReactMethod
    fun disableWifi() {
        wifiManager.isWifiEnabled = false
    }

    @ReactMethod
    fun connectByBSSID(bssid: String, ssid: String, password: String?) {
        val wifiNetworkSpecifier = if (password == null) {
            WifiNetworkSpecifier.Builder()
                .setSsid(ssid)
                .setBssid(MacAddress.fromString(bssid))
                .build()
        } else {
            WifiNetworkSpecifier.Builder()
                .setSsid(ssid)
                .setBssid(MacAddress.fromString(bssid))
                .setWpa2Passphrase(password)
                .build()
        }
        val networkRequest = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .setNetworkSpecifier(wifiNetworkSpecifier)
            .build();
        val connectivityManager = reactApplicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        connectivityManager.requestNetwork(networkRequest, object : ConnectivityManager.NetworkCallback() {})
    }
}