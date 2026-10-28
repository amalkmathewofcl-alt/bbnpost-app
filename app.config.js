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
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        // 👇 This points to your red lion/tiger image
        foregroundImage: "./assets/android-icon-foreground.png",
        // 👇 This is the background color behind the lion. 
        // I set it to white to match the edges of the lion image.
        backgroundColor: "#ffffff",
        monochromeImage: "./assets/android-icon-monochrome.png"
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