import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ImageBackground, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function OrderCompletedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId: string;
    tableNumber: string;
    totalAmount: string;
    paymentMethod: string;
    cartItems?: string;
    date?: string;
    phone?: string;
  }>();

  // Animation values
  const [checkScale] = useState(() => new Animated.Value(0));
  const [cardOpacity] = useState(() => new Animated.Value(0));
  const [cardTranslateY] = useState(() => new Animated.Value(50));

  // Parsed Data
  const rawOrderId = params.orderId || `UDP-${Math.floor(100000 + Math.random() * 900000)}`;
  const totalAmount = params.totalAmount || '0.00';
  const paymentMethod = params.paymentMethod || 'UPI';
  const phone = params.phone || '82166432250';
  
  const totalAmountVal = parseFloat(totalAmount) || 0;
  const subtotal = totalAmountVal.toFixed(2);
  
  const netTaxableVal = totalAmountVal / 1.05;
  const cgstVal = (totalAmountVal - netTaxableVal) / 2;
  const sgstVal = cgstVal;
  const totalGstVal = cgstVal + sgstVal;

  const totalGst = totalGstVal.toFixed(2);
  const cleanId = rawOrderId.replace(/\D/g, '');
  const invoiceNo = `DU104-1000${cleanId || '34372'}TE`;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(cardTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleViewInvoice = () => {
    router.push({
      pathname: '/invoice',
      params: {
        orderId: invoiceNo,
        subtotal: subtotal,
        gst: totalGst,
        finalTotal: subtotal,
        mobileNumber: phone,
        paymentMethod: paymentMethod,
        cartData: params.cartItems,
      }
    });
  };

  const handleReturnHome = () => {
    router.dismissAll();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop' }} 
        style={styles.bgImage}
        blurRadius={10}
      >
        <View style={styles.overlay}>
          <Animated.View style={[
            styles.card, 
            { 
              opacity: cardOpacity, 
              transform: [{ translateY: cardTranslateY }] 
            }
          ]}>
            
            <Animated.View style={[styles.iconContainer, { transform: [{ scale: checkScale }] }]}>
              <Ionicons name="checkmark" size={60} color="#16a34a" />
            </Animated.View>

            <Text style={styles.titleText}>Thank You!</Text>
            <Text style={styles.subText}>Visit again!</Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity activeOpacity={0.8} style={styles.homeBtn} onPress={handleReturnHome}>
                <Ionicons name="home" size={16} color="#fff" />
                <Text style={styles.btnText}>Back to Home</Text>
              </TouchableOpacity>
              
              <TouchableOpacity activeOpacity={0.8} style={styles.downloadBtn} onPress={handleViewInvoice}>
                <Ionicons name="download" size={16} color="#fff" />
                <Text style={styles.btnText}>Download Bill</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    borderColor: '#16a34a',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 32,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 16,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff5a1f',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#ff5a1f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
});
