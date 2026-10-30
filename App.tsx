import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, StatusBar, ScrollView, KeyboardAvoidingView, Platform, FlatList, Switch
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, deleteDoc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { auth, db } from './firebase';

// 👇 YOUR GROQ API KEY
const GROQ_API_KEY = "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"; 

const Stack = createNativeStackNavigator();

// --- LOGIN SCREEN ---
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Error", "Please enter email and password.");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    } finally { setLoading(false); }
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
      </View>
    </SafeAreaView>
  );
}

// --- DASHBOARD SCREEN ---
function DashboardScreen({ navigation }: any) {
  const handleLogout = async () => { await signOut(auth); };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>{auth.currentUser?.email}</Text>
      </View>
      <View style={styles.dashboard}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('SendAlert')}>
          <Text style={styles.actionIcon}>🚨</Text>
          <Text style={styles.actionText}>Send Alert</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AlertHistory')}>
          <Text style={styles.actionIcon}>📜</Text>
          <Text style={styles.actionText}>Alert History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Analytics')}>
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionText}>Device Analytics</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Text style={styles.logoutText}>Log Out</Text></TouchableOpacity>
    </SafeAreaView>
  );
}

// --- SEND ALERT SCREEN (AI + Schedule + Test Mode) ---
function SendAlertScreen({ navigation }: any) {
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [polishing, setPolishing] = useState(false);
  
  const [testMode, setTestMode] = useState(false); 
  const [scheduleLater, setScheduleLater] = useState(false);
  const [hoursLater, setHoursLater] = useState('1'); 

  // 🪄 AI POLISHER FUNCTION (GROQ)
  const polishWithAI = async () => {
    if (!alertMessage) return Alert.alert("Empty", "Please type a rough message first.");
    setPolishing(true);
    try {
      const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}` 
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            { role: "system", content: "You are a professional news editor for The BBN Post. Rewrite the user's rough note into a highly professional, urgent, and concise breaking news alert (max 2 sentences). Do not include quotes or extra text." },
            { role: "user", content: alertMessage }
          ]
        })
      });
      const data = await response.json();
      
      if (data.choices && data.choices[0].message.content) {
        setAlertMessage(data.choices[0].message.content.trim());
      } else {
        Alert.alert("AI Error", "Could not polish text. Check your Groq API key.");
        console.log("Groq Error:", data);
      }
    } catch (error) {
      Alert.alert("Network Error", "Could not reach AI servers.");
    } finally {
      setPolishing(false);
    }
  };

  const sendNotification = async () => {
    if (!alertTitle || !alertMessage) return Alert.alert("Error", "Please enter both a title and a message.");
    setSending(true);
    try {
      if (scheduleLater) {
        const sendAt = new Date(Date.now() + parseInt(hoursLater) * 60 * 60 * 1000); 
        await addDoc(collection(db, 'scheduled_alerts'), {
          title: alertTitle,
          message: alertMessage,
          sendAt: sendAt,
          status: 'pending'
        });
        Alert.alert("Scheduled! ⏰", `Alert will be sent in ${hoursLater} hour(s).`);
        navigation.goBack();
        return;
      }

      let targetTokens: string[] = [];
      const querySnapshot = await getDocs(collection(db, 'push_tokens'));
      
      if (testMode) {
        targetTokens = [querySnapshot.docs[0].data().token]; 
      } else {
        targetTokens = querySnapshot.docs.map(doc => doc.data().token);
      }

      if (targetTokens.length === 0) { Alert.alert("No Devices", "No devices registered."); setSending(false); return; }

      const messages = targetTokens.map(token => ({ 
        to: token, 
        title: testMode ? `[TEST] ${alertTitle}` : alertTitle, 
        body: alertMessage, 
        sound: 'default' 
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });

      if (response.ok) {
        if (!testMode) {
          await addDoc(collection(db, 'alert_history'), { title: alertTitle, message: alertMessage, sentAt: serverTimestamp(), deviceCount: targetTokens.length });
        }
        Alert.alert("Success 🚀", testMode ? "Test alert sent!" : `Alert sent to ${targetTokens.length} devices!`);
        navigation.goBack();
      } else { Alert.alert("Error", "Failed to send."); }
    } catch (error: any) { Alert.alert("Error", error.message); } 
    finally { setSending(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 10 }}>
          <Text style={{ color: '#94A3B8', fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{scheduleLater ? 'Schedule Alert' : 'Send Alert'}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={{ padding: 20 }}>
          
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>Test Mode (Send to me only)</Text>
            <Switch value={testMode} onValueChange={setTestMode} trackColor={{ false: "#CBD5E1", true: "#2563EB" }} />
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>Schedule for Later ⏰</Text>
            <Switch value={scheduleLater} onValueChange={setScheduleLater} trackColor={{ false: "#CBD5E1", true: "#F59E0B" }} />
          </View>

          {scheduleLater && (
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.label}>Send after how many hours?</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={hoursLater} onChangeText={setHoursLater} placeholder="e.g., 1" />
            </View>
          )}

          <Text style={styles.label}>Alert Title</Text>
          <TextInput style={styles.input} placeholder="e.g., 🚨 Breaking News" value={alertTitle} onChangeText={setAlertTitle} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.label}>Message</Text>
            <TouchableOpacity onPress={polishWithAI} disabled={polishing} style={{ backgroundColor: '#E0E7FF', padding: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}>
              {polishing ? <ActivityIndicator size="small" color="#4338CA" /> : <Text style={{ color: '#4338CA', fontWeight: 'bold' }}>✨ Polish with AI</Text>}
            </TouchableOpacity>
          </View>
          <TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }]} placeholder="Type a rough note, then tap Polish with AI..." value={alertMessage} onChangeText={setAlertMessage} multiline />

          <TouchableOpacity style={[styles.button, { marginTop: 10, backgroundColor: scheduleLater ? '#F59E0B' : (testMode ? '#2563EB' : '#DC2626') }]} onPress={sendNotification} disabled={sending || polishing}>
            {sending ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{scheduleLater ? "Schedule Alert" : (testMode ? "Send Test Alert" : "Send Alert Now")}</Text>}
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
      try {
        const q = query(collection(db, 'alert_history'), orderBy('sentAt', 'desc'));
        const querySnapshot = await getDocs(q);
        setHistory(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) { Alert.alert("Error", "Could not load history."); } 
      finally { setLoading(false); }
    };
    fetchHistory();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 10 }}>
          <Text style={{ color: '#94A3B8', fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alert History</Text>
      </View>
      {loading ? <ActivityIndicator size="large" color="#051A44" style={{ marginTop: 50 }} /> : history.length === 0 ? <Text style={{ textAlign: 'center', marginTop: 50, color: '#64748B' }}>No alerts sent yet.</Text> : (
        <FlatList data={history} keyExtractor={item => item.id} contentContainerStyle={{ padding: 20 }} renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>{item.title}</Text>
            <Text style={styles.historyMsg}>{item.message}</Text>
            <View style={styles.historyFooter}>
              <Text style={styles.historyDate}>{item.sentAt ? new Date(item.sentAt.seconds * 1000).toLocaleString() : 'Sending...'}</Text>
              <Text style={styles.historyCount}>📱 {item.deviceCount} devices</Text>
            </View>
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
    try {
      const querySnapshot = await getDocs(collection(db, 'push_tokens'));
      setDeviceCount(querySnapshot.size);
    } catch (error) { Alert.alert("Error", "Could not fetch data."); } finally { setLoading(false); }
  };

  const cleanGhostDevices = async () => {
    setCleaning(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'push_tokens'));
      const tokens = querySnapshot.docs.map(doc => doc.data().token);
      if (tokens.length === 0) { Alert.alert("Empty", "No tokens to clean."); setCleaning(false); return; }
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
      Alert.alert("Cleanup Complete 🧹", `Removed ${deletedCount} ghost devices.`); fetchAnalytics();
    } catch (error: any) { Alert.alert("Error", error.message); } finally { setCleaning(false); }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 10 }}><Text style={{ color: '#94A3B8', fontSize: 16 }}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Device Analytics</Text>
      </View>
      <View style={{ padding: 20, alignItems: 'center', marginTop: 20 }}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Active Devices</Text>
          {loading ? <ActivityIndicator size="large" color="#051A44" style={{ marginTop: 20 }} /> : <Text style={styles.statValue}>{deviceCount}</Text>}
        </View>
        <TouchableOpacity style={[styles.button, { width: '100%', marginTop: 30 }]} onPress={fetchAnalytics} disabled={loading || cleaning}><Text style={styles.buttonText}>Refresh Data</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, { width: '100%', marginTop: 15, backgroundColor: '#475569' }]} onPress={cleanGhostDevices} disabled={loading || cleaning}>{cleaning ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>🧹 Clean Ghost Devices</Text>}</TouchableOpacity>
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

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#051A44" /></View>;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="SendAlert" component={SendAlertScreen} />
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
  dashboard: { padding: 20, flex: 1, gap: 15 },
  actionButton: { backgroundColor: 'white', padding: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  actionIcon: { fontSize: 24, marginRight: 15 },
  actionText: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  logoutButton: { padding: 20, alignItems: 'center' },
  logoutText: { color: '#DC2626', fontWeight: 'bold', fontSize: 16 },
  statCard: { backgroundColor: 'white', width: '100%', padding: 30, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', elevation: 3 },
  statLabel: { fontSize: 16, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { fontSize: 64, fontWeight: '900', color: '#051A44', marginVertical: 10 },
  historyCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  historyTitle: { fontSize: 18, fontWeight: '800', color: '#051A44', marginBottom: 5 },
  historyMsg: { fontSize: 14, color: '#334155', marginBottom: 10 },
  historyFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  historyDate: { fontSize: 12, color: '#94A3B8' },
  historyCount: { fontSize: 12, color: '#2563EB', fontWeight: 'bold' },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  toggleText: { fontSize: 16, fontWeight: '600', color: '#1E293B' }
});