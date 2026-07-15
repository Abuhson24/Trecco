import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import type { CardRequest, CardType } from '@trecco/shared-types';

// Reached from the Wallet tab (not its own bottom tab — see App.tsx comment:
// five tabs is the limit). Mirrors apps/web/app/cards/page.tsx: same
// endpoints, same rule that a physical request must carry its delivery
// address at submission time.

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

async function api(path: string, token: string | null, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
  return res.json();
}

// TODO(auth): pull the real access token from wherever the auth module ends
// up storing it (SecureStore, most likely, for Expo).
const getToken = async () => null as string | null;

export default function CardsScreen() {
  const [requests, setRequests] = useState<CardRequest[]>([]);
  const [cardType, setCardType] = useState<CardType>('VIRTUAL');
  const [address, setAddress] = useState({
    fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', country: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const token = await getToken();
      setRequests(await api('/cards/my-requests', token));
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      await api('/cards/request', token, {
        method: 'POST',
        body: JSON.stringify({
          cardType,
          ...(cardType === 'PHYSICAL' ? { deliveryAddress: address } : {}),
        }),
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>ATM Card</Text>

      <View style={styles.row}>
        <Button title="Virtual" onPress={() => setCardType('VIRTUAL')} color={cardType === 'VIRTUAL' ? '#8a1414' : '#444'} />
        <Button title="Physical" onPress={() => setCardType('PHYSICAL')} color={cardType === 'PHYSICAL' ? '#8a1414' : '#444'} />
      </View>

      {cardType === 'PHYSICAL' && (
        <View>
          {(['fullName', 'phone', 'addressLine1', 'addressLine2', 'city', 'state', 'country'] as const).map((field) => (
            <TextInput
              key={field}
              style={styles.input}
              placeholder={field}
              placeholderTextColor="#888"
              value={(address as any)[field]}
              onChangeText={(v) => setAddress({ ...address, [field]: v })}
            />
          ))}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? <ActivityIndicator /> : <Button title="Submit request" onPress={submit} />}

      <Text style={styles.heading}>Your requests</Text>
      <FlatList
        data={requests}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <View style={styles.requestRow}>
            <Text style={styles.requestText}>{item.cardType} — {item.status}</Text>
            {item.trackingReference && (
              <Text style={styles.requestSub}>{item.courier}: {item.trackingReference}</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0d', padding: 16 },
  heading: { color: '#f5f5f5', fontSize: 18, fontWeight: '600', marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  input: { backgroundColor: '#17171a', color: '#f5f5f5', padding: 10, borderRadius: 6, marginBottom: 8 },
  error: { color: '#e05252', marginBottom: 8 },
  requestRow: { paddingVertical: 8, borderBottomColor: '#222', borderBottomWidth: 1 },
  requestText: { color: '#f5f5f5' },
  requestSub: { color: '#8a8a8f', fontSize: 12 },
});
