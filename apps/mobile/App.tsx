import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, Button } from 'react-native';
import CardsScreen from './screens/CardsScreen';

// Bottom tabs match the spec exactly: index, wallet, marketplace, inventory, loans.
// (Cooperative directory and settings are reached from the dashboard header, not
// a bottom tab — five tabs is the limit before the bar gets cramped. Card
// request/status is the same case: it lives inside the Wallet tab's stack,
// pushed from a "Request ATM card" button, not a 6th tab.)

const Tab = createBottomTabNavigator();
const WalletStack = createNativeStackNavigator();

function Placeholder({ label }: { label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b0d' }}>
      <Text style={{ color: '#f5f5f5' }}>{label} — TODO: build from wireframe</Text>
    </View>
  );
}

function WalletHome({ navigation }: any) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b0d', gap: 12 }}>
      <Text style={{ color: '#f5f5f5' }}>Wallet — TODO: build from wireframe</Text>
      <Button title="Request ATM card" onPress={() => navigation.navigate('Cards')} />
    </View>
  );
}

function WalletTab() {
  return (
    <WalletStack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0b0b0d' }, headerTintColor: '#f5f5f5' }}>
      <WalletStack.Screen name="WalletHome" component={WalletHome} options={{ title: 'Wallet' }} />
      <WalletStack.Screen name="Cards" component={CardsScreen} options={{ title: 'ATM Card' }} />
    </WalletStack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#8a1414',
          tabBarInactiveTintColor: '#6b6b70',
          tabBarStyle: { backgroundColor: '#17171a' },
          headerStyle: { backgroundColor: '#0b0b0d' },
          headerTintColor: '#f5f5f5',
        }}
      >
        <Tab.Screen name="Dashboard">{() => <Placeholder label="Dashboard" />}</Tab.Screen>
        <Tab.Screen name="Wallet" component={WalletTab} options={{ headerShown: false }} />
        <Tab.Screen name="Marketplace">{() => <Placeholder label="Marketplace" />}</Tab.Screen>
        <Tab.Screen name="Inventory">{() => <Placeholder label="Inventory" />}</Tab.Screen>
        <Tab.Screen name="Loans">{() => <Placeholder label="Loans" />}</Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
