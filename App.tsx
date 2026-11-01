import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, StatusBar, ScrollView, KeyboardAvoidingView, Platform, FlatList, Switch
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, deleteDoc, addDoc, serverTimestamp, query, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 👇 PASTE YOUR AQ. GEMINI API KEY HERE
const GEMINI_API_KEY = "AQ.Ab8RN6J52LzcFNl7yNip3SlSf5Ay0pQKqyBf9lByGGnO-W4RQQ"; 

const Stack = createNativeStackNavigator();

// --- LOGIN SCREEN (With Biometrics) ---
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');
  const [savedPassword, setSavedPassword] = useState('');

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);
      const e = await AsyncStorage.getItem('admin_email');
      const p = await AsyncStorage.getItem('admin_pass');
      if (e && p) { setSavedEmail(e); setSavedPassword(p); }
    })();
  }, []);

  const handleBiometricLogin = async () => {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Log in to BBN Admin' });
    if (result.success && savedEmail && savedPassword) {
      setLoading(true);
      try { await signInWithEmailAndPassword(auth, savedEmail, savedPassword); } 
      catch (error: any) { Alert.alert("Error", error.message); } 
      finally { setLoading(false); }
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Error", "Please enter email and password.");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await AsyncStorage.setItem('admin_email', email);
      await AsyncStorage.setItem('admin_pass', password);
    } catch (error: any) { Alert.alert("Login Failed", error.message); } 
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.loginBox}>
        <Text style={styles.title}>BBN Admin Portal</Text>
        <Text style={styles.subtitle}>Authorized Personnel Only</Text>
        <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Log In</Text>}
        </TouchableOpacity>
        {isBiometricSupported && savedEmail && (
          <TouchableOpacity style={[styles.button, { backgroundColor: '#2563EB', marginTop: 15 }]} onPress={handleBiometricLogin} disabled={loading}>
            <Text style={styles.buttonText}>👤 Login with Biometrics</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// --- DASHBOARD SCREEN ---
function DashboardScreen({ navigation }: any) {
  const [isAutomationPaused, setIsAutomationPaused] = useState(false);
  const [loadingSwitch, setLoadingSwitch] = useState(true);

  useEffect(() => {
    const fetchSwitch = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'automation'));
      if (docSnap.exists()) setIsAutomationPaused(docSnap.data().isPaused);
      setLoadingSwitch(false);
    };
    fetchSwitch();
  }, []);

  const toggleSwitch = async () => {
    const newState = !isAutomationPaused;
    setIsAutomationPaused(newState);
    await setDoc(doc(db, 'settings', 'automation'), { isPaused: newState });
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('admin_pass'); 
    await signOut(auth); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>{auth.currentUser?.email}</Text>
      </View>
      <ScrollView style={{ padding: 20, gap: 15 }}>
        <View style={[styles.toggleContainer, { borderLeftWidth: 4, borderLeftColor: isAutomationPaused ? '#DC2626' : '#10B981' }]}>
          <View>
            <Text style={[styles.toggleText, { color: isAutomationPaused ? '#DC2626' : '#1E293B' }]}>
              {isAutomationPaused ? "🚨 Automation PAUSED" : "✅ Automation ACTIVE"}
            </Text>
          </View>
          {loadingSwitch ? <ActivityIndicator size="small" /> : 
            <Switch value={!isAutomationPaused} onValueChange={toggleSwitch} trackColor={{ false: "#FCA5A5", true: "#6EE7B7" }} />
          }
        </View>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('SendAlert')}>
          <Text style={styles.actionIcon}>🚨</Text><Text style={styles.actionText}>Send Alert</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('IntelRadar')}>
          <Text style={styles.actionIcon}>📡</Text><Text style={styles.actionText}>Intel Radar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AlertHistory')}>
          <Text style={styles.actionIcon}>📜</Text><Text style={styles.actionText}>Alert History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Analytics')}>
          <Text style={styles.actionIcon}>📊</Text><Text style={styles.actionText}>Device Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Text style={styles.logoutText}>Log Out</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- INTEL RADAR SCREEN ---
function IntelRadarScreen({ navigation }: any) {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const COMPETITOR_RSS = "https://news.google.com/rss/search?q=Barbil+Odisha&hl=en-IN&gl=IN&ceid=IN:en";

  useEffect(() => {
    const fetchIntel = async () => {
      try {
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(COMPETITOR_RSS)}`);
        const data = await res.json();
        if (data.items) setNews(data.items);
      } catch (error) {} finally { setLoading(false); }
    };
    fetchIntel();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 10 }}><Text style={{ color: '#94A3B8' }}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Intel Radar 📡</Text>
      </View>
      {loading ? <ActivityIndicator size="large" style={{ marginTop: 50 }} /> : (
        <FlatList data={news} keyExtractor={(item, i) => i.toString()} contentContainerStyle={{ padding: 20 }} renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>{item.title}</Text>
            <Text style={styles.historyDate}>{new Date(item.pubDate).toLocaleString()}</Text>
          </View>
        )} />
      )}
    </SafeAreaView>
  );
}

// --- SEND ALERT SCREEN (With Gemini AI Polisher & Rich Image) ---
function SendAlertScreen({ navigation }: any) {
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertImageUrl, setAlertImageUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [testMode, setTestMode] = useState(false); 
  const [scheduleLater, setScheduleLater] = useState(false);
  const [hoursLater, setHoursLater] = useState('1'); 

  // 🪄 GEMINI AI POLISHER
  const polishWithAI = async () => {
    if (!alertMessage) return Alert.alert("Empty", "Type a message first.");
    setPolishing(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GEMINI_API_KEY}` // 👈 Sending AQ. key as Bearer
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Rewrite this into a professional, urgent news alert: "${alertMessage}"` }]
          }]
        })
      });
      const data = await response.json();
      
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        setAlertMessage(data.candidates[0].content.parts[0].text.trim());
      } else {
        console.log("Gemini Error Details:", data);
        Alert.alert("AI Error", data.error?.message || "Could not polish text. Check your API key.");
      }
    } catch (error) { 
      Alert.alert("Network Error", "AI failed. Check your internet connection."); 
    } finally { 
      setPolishing(false); 
    }
  };

  const sendNotification = async () => {
    if (!alertTitle || !alertMessage) return Alert.alert("Error", "Enter title and message.");
    setSending(true);
    try {
      if (scheduleLater) {
        const sendAt = new Date(Date.now() + parseInt(hoursLater) * 60 * 60 * 1000); 
        await addDoc(collection(db, 'scheduled_alerts'), { title: alertTitle, message: alertMessage, imageUrl: alertImageUrl, sendAt: sendAt, status: 'pending' });
        Alert.alert("Scheduled! ⏰", `Alert will be sent in ${hoursLater} hour(s).`);
        navigation.goBack();
        return;
      }

      let targetTokens: string[] = [];
      const querySnapshot = await getDocs(collection(db, 'push_tokens'));
      if (testMode) targetTokens = [querySnapshot.docs[0].data().token]; 
      else targetTokens = querySnapshot.docs.map(doc => doc.data().token);

      if (targetTokens.length === 0) { Alert.alert("No Devices"); setSending(false); return; }

      const messages = targetTokens.map(token => {
        const msg: any = { to: token, title: alertTitle, body: alertMessage, sound: 'default' };
        if (alertImageUrl) msg.image = alertImageUrl; 
        return msg;
      });

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(messages),
      });

      if (response.ok) {
        if (!testMode) await addDoc(collection(db, 'alert_history'), { title: alertTitle, message: alertMessage, imageUrl: alertImageUrl, sentAt: serverTimestamp(), deviceCount: targetTokens.length });
        Alert.alert("Success 🚀", testMode ? "Test sent!" : `Sent to ${targetTokens.length} devices!`);
        navigation.goBack();
      } else { Alert.alert("Error", "Failed to send."); }
    } catch (error: any) { Alert.alert("Error", error.message); } finally { setSending(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 10 }}><Text style={{ color: '#94A3B8' }}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{scheduleLater ? 'Schedule Alert' : 'Send Alert'}</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={{ padding: 20 }}>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>Test Mode</Text>
            <Switch value={testMode} onValueChange={setTestMode} />
          </View>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>Schedule for Later ⏰</Text>
            <Switch value={scheduleLater} onValueChange={setScheduleLater} />
          </View>
          {scheduleLater && (
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.label}>Hours later:</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={hoursLater} onChangeText={setHoursLater} />
            </View>
          )}

          <Text style={styles.label}>Alert Title</Text>
          <TextInput style={styles.input} placeholder="🚨 Breaking News" value={alertTitle} onChangeText={setAlertTitle} />

          <Text style={styles.label}>Image URL (Optional) 📸</Text>
          <TextInput style={styles.input} placeholder="https://..." value={alertImageUrl} onChangeText={setAlertImageUrl} keyboardType="url" autoCapitalize="none" />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.label}>Message</Text>
            <TouchableOpacity onPress={polishWithAI} disabled={polishing} style={{ backgroundColor: '#E0E7FF', padding: 6, borderRadius: 6 }}>
              {polishing ? <ActivityIndicator size="small" /> : <Text style={{ color: '#4338CA', fontWeight: 'bold' }}>✨ Polish</Text>}
            </TouchableOpacity>
          </View>
          <TextInput style={[styles.input, { height: 100 }]} placeholder="Type a rough note..." value={alertMessage} onChangeText={setAlertMessage} multiline />

          <TouchableOpacity style={[styles.button, { backgroundColor: scheduleLater ? '#F59E0B' : (testMode ? '#2563EB' : '#DC2626') }]} onPress={sendNotification} disabled={sending || polishing}>
            {sending ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{scheduleLater ? "Schedule" : (testMode ? "Test" : "Send Now")}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- ALERT HISTORY SCREEN ---
function AlertHistoryScreen({ navigation }: any) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchHistory = async () => {
      const q = query(collection(db, 'alert_history'), orderBy('sentAt', 'desc'));
      const querySnapshot = await getDocs(q);
      setHistory(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchHistory();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 10 }}><Text style={{ color: '#94A3B8' }}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Alert History</Text>
      </View>
      {loading ? <ActivityIndicator size="large" style={{ marginTop: 50 }} /> : (
        <FlatList data={history} keyExtractor={item => item.id} contentContainerStyle={{ padding: 20 }} renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>{item.title}</Text>
            <Text style={styles.historyMsg}>{item.message}</Text>
            <Text style={styles.historyDate}>{item.sentAt ? new Date(item.sentAt.seconds * 1000).toLocaleString() : ''}</Text>
          </View>
        )} />
      )}
    </SafeAreaView>
  );
}

// --- ANALYTICS SCREEN ---
function AnalyticsScreen({ navigation }: any) {
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, 'push_tokens'));
    setDeviceCount(querySnapshot.size);
    setLoading(false);
  };

  const cleanGhostDevices = async () => {
    setCleaning(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'push_tokens'));
      const tokens = querySnapshot.docs.map(doc => doc.data().token);
      if (tokens.length === 0) { Alert.alert("Empty", "No tokens."); setCleaning(false); return; }
      let deletedCount = 0;
      const chunkSize = 100;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        const messages = chunk.map(token => ({ to: token, data: { cleanup: true } }));
        const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(messages) });
        const responseData = await response.json();
        if (responseData.data) {
          for (let j = 0; j < responseData.data.length; j++) {
            if (responseData.data[j].status === 'error' && responseData.data[j].details?.error === 'DeviceNotRegistered') {
              await deleteDoc(doc(db, 'push_tokens', chunk[j])); deletedCount++;
            }
          }
        }
      }
      Alert.alert("Complete 🧹", `Removed ${deletedCount} ghost devices.`); fetchAnalytics();
    } catch (error: any) { Alert.alert("Error", error.message); } finally { setCleaning(false); }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 10 }}><Text style={{ color: '#94A3B8' }}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>
      <View style={{ padding: 20, alignItems: 'center' }}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Devices</Text>
          {loading ? <ActivityIndicator size="large" style={{ marginTop: 20 }} /> : <Text style={styles.statValue}>{deviceCount}</Text>}
        </View>
        <TouchableOpacity style={styles.button} onPress={fetchAnalytics}><Text style={styles.buttonText}>Refresh</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#475569' }]} onPress={cleanGhostDevices} disabled={cleaning}>{cleaning ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>🧹 Clean Ghost Devices</Text>}</TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// --- MAIN APP ROUTER ---
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); setLoading(false); });
    return unsubscribe;
  }, []);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" /></View>;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="SendAlert" component={SendAlertScreen} />
            <Stack.Screen name="IntelRadar" component={IntelRadarScreen} />
            <Stack.Screen name="AlertHistory" component={AlertHistoryScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
          </>
        ) : ( <Stack.Screen name="Login" component={LoginScreen} /> )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginBox: { flex: 1, justifyContent: 'center', padding: 30 },
  title: { fontSize: 28, fontWeight: '900', color: '#051A44', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 40 },
  label: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16 },
  button: { backgroundColor: '#051A44', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  header: { padding: 20, backgroundColor: '#051A44', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 14, color: '#94A3B8', marginTop: 5 },
  actionButton: { backgroundColor: 'white', padding: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 15 },
  actionIcon: { fontSize: 24, marginRight: 15 },
  actionText: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  logoutButton: { padding: 20, alignItems: 'center' },
  logoutText: { color: '#DC2626', fontWeight: 'bold', fontSize: 16 },
  statCard: { backgroundColor: 'white', width: '100%', padding: 30, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  statLabel: { fontSize: 16, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  statValue: { fontSize: 64, fontWeight: '900', color: '#051A44', marginVertical: 10 },
  historyCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  historyTitle: { fontSize: 18, fontWeight: '800', color: '#051A44', marginBottom: 5 },
  historyMsg: { fontSize: 14, color: '#334155', marginBottom: 10 },
  historyDate: { fontSize: 12, color: '#94A3B8' },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  toggleText: { fontSize: 16, fontWeight: '600', color: '#1E293B' }
});