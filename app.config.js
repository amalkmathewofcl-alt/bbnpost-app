module.exports = {
  expo: {
    name: "The BBN Post",
    slug: "bbnpost-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#051A44" // 👈 Changed to navy blue to match your logo!
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#051A44"
      },
      package: "com.amak_mathew.bbnpostapp",
      permissions: ["NOTIFICATIONS"],
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-notifications"
    ],
    extra: {
      eas: {
        projectId: "877e51fc-1f50-4aa5-a7cb-ee998188f1fd"
      }
    }
  }
};