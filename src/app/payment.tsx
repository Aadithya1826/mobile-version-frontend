import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, StatusBar, Alert, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { API_BASE_URL } from '../constants/api';

WebBrowser.maybeCompleteAuthSession();

type PaymentMethod = 'UPI' | 'Cash';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phone: string;
    cart: string;
    cartItems: string;
    tableNumber: string;
    orderType: string;
    subtotal: string;
    serviceCharge: string;
    gst: string;
    totalAmount: string;
  }>();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI');
  const [loading, setLoading] = useState(false);
  const [isPollingCash, setIsPollingCash] = useState(false);
  const [isPaymentFailedModalVisible, setIsPaymentFailedModalVisible] = useState(false);
  const [paymentFailedReason, setPaymentFailedReason] = useState('');

  const totalVal = parseFloat(params.totalAmount || '0');

  const handleConfirm = async () => {
    setLoading(true);

    const parsedCartItems: any[] = params.cartItems ? JSON.parse(params.cartItems) : [];
    
    const formattedCartItems = parsedCartItems.map(item => ({
      id: parseInt(item.id),
      quantity: item.quantity,
      price: parseFloat(item.price),
      note: ''
    }));

    // If UPI is selected, redirect to Razorpay
    if (selectedMethod === 'UPI') {
      try {
        const redirectUrl = Linking.createURL('/payment-callback');
        const razorpayKey = process.env.EXPO_PUBLIC_RAZORPAY_KEY || '';
        const amountStr = params.totalAmount || '0';
        const phoneStr = params.phone || '';
        
        const paymentUrl = `${API_BASE_URL}/static/razorpay.html?amount=${amountStr}&key=${razorpayKey}&phone=${phoneStr}&redirect_url=${encodeURIComponent(redirectUrl)}`;
        
        console.log("Opening Razorpay Web Session with URL:", paymentUrl);
        const result = await WebBrowser.openAuthSessionAsync(paymentUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          const returnedUrl = result.url;
          const statusMatch = returnedUrl.match(/[?&]status=([^&]+)/);
          const status = statusMatch ? statusMatch[1] : '';
          
          if (status === 'success') {
            const paymentIdMatch = returnedUrl.match(/[?&]payment_id=([^&]+)/);
            const paymentId = paymentIdMatch ? paymentIdMatch[1] : 'rzp_test_success';
            
            // Payment success - proceed to place order in backend
            const orderData = {
              table_number: params.tableNumber || 'T-06',
              payment_method: 'UPI',
              phone: params.phone || '',
              cart: formattedCartItems,
              subtotal: parseFloat(params.subtotal || '0'),
              gst: parseFloat(params.gst || '0'),
              service_charge: parseFloat(params.serviceCharge || '0'),
              total_amount: totalVal
            };

            let generatedOrderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
            let dbOrderId = '';

            try {
              const res = await fetch(`${API_BASE_URL}/api/orders`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
              });
              const resultData = await res.json();
              if (resultData.success && resultData.orderId) {
                generatedOrderId = resultData.orderId;
                if (resultData.dbOrderId) {
                  dbOrderId = resultData.dbOrderId.toString();
                }
              }
            } catch (e) {
              console.error("Failed to post order after UPI success", e);
            }

            setLoading(false);
            
            // Navigate to success screen
            router.push({
              pathname: '/order-success',
              params: {
                orderId: generatedOrderId,
                dbOrderId: dbOrderId,
                total: params.totalAmount,
                paymentMethod: 'UPI',
                phone: params.phone,
                tableNumber: params.tableNumber,
                itemCount: formattedCartItems.reduce((acc, curr) => acc + curr.quantity, 0).toString(),
                cart: params.cartItems,
                orderType: params.orderType,
                paymentId: paymentId
              }
            });
            return;
          } else if (status === 'cancelled') {
            Alert.alert("Payment Cancelled", "The payment was cancelled. Please try again.");
          } else {
            const reasonMatch = returnedUrl.match(/[?&]reason=([^&]+)/);
            const reason = reasonMatch ? decodeURIComponent(reasonMatch[1]) : 'Unknown error';
            setPaymentFailedReason(reason);
            setIsPaymentFailedModalVisible(true);
          }
        } else {
          Alert.alert("Payment Cancelled", "Payment window was closed.");
        }
      } catch (err) {
        console.error("Razorpay error", err);
        setPaymentFailedReason("Could not load the payment screen.");
        setIsPaymentFailedModalVisible(true);
      }
      setLoading(false);
      return;
    }

    // Cash Payment (Pay at counter) Flow
    const orderData = {
      table_number: params.tableNumber || 'T-06',
      payment_method: 'Cash',
      phone: params.phone || '',
      cart: formattedCartItems,
      subtotal: parseFloat(params.subtotal || '0'),
      gst: parseFloat(params.gst || '0'),
      service_charge: parseFloat(params.serviceCharge || '0'),
      total_amount: totalVal
    };

    let generatedOrderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    let dbOrderId = '';

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });
      const result = await res.json();
      if (result.success && result.orderId) {
        generatedOrderId = result.orderId;
        if (result.dbOrderId) {
          dbOrderId = result.dbOrderId.toString();
        }
      }
    } catch (e) {
      console.error("Failed to post order", e);
    }
    
    if (dbOrderId) {
      setIsPollingCash(true);
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${API_BASE_URL}/api/orders/${dbOrderId}`);
          const statusData = await statusRes.json();
          if (statusData?.order?.payment_status?.toLowerCase() === 'paid') {
            clearInterval(pollInterval);
            setIsPollingCash(false);
            setLoading(false);
            router.push({
              pathname: '/order-success',
              params: {
                orderId: generatedOrderId,
                dbOrderId: dbOrderId,
                total: params.totalAmount,
                paymentMethod: 'Cash',
                phone: params.phone,
                tableNumber: params.tableNumber,
                itemCount: formattedCartItems.reduce((acc, curr) => acc + curr.quantity, 0).toString(),
                cart: params.cartItems,
                orderType: params.orderType
              }
            });
          }
        } catch (err) {
          console.error('Polling error', err);
        }
      }, 3000);
      return;
    } else {
      setLoading(false);
      // Navigate to success screen if DB ID not found (fallback)
      router.push({
        pathname: '/order-success',
        params: {
          orderId: generatedOrderId,
          dbOrderId: dbOrderId,
          total: params.totalAmount,
          paymentMethod: 'Cash',
          phone: params.phone,
          tableNumber: params.tableNumber,
          itemCount: formattedCartItems.reduce((acc, curr) => acc + curr.quantity, 0).toString(),
          cart: params.cartItems,
          orderType: params.orderType
        }
      });
    }
  };

  const handleTryAgain = () => {
    setIsPaymentFailedModalVisible(false);
  };

  const handleBackToHome = () => {
    setIsPaymentFailedModalVisible(false);
    router.push('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        {params.orderType !== 'Take Away' && (
          <View style={styles.tableBadge}>
            <Text style={styles.tableText}>Table no : </Text>
            <View style={styles.tableCircle}>
              <Text style={styles.tableCircleText}>{params.tableNumber?.replace('T-', '') ?? '06'}</Text>
            </View>
          </View>
        )}
        
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../public/Dataudupi-Title.png')} 
            style={styles.logoImageFull} 
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity style={styles.globeIcon}>
          <Ionicons name="language" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.paymentSection}>
          <Text style={styles.title}>Payment</Text>
          <Text style={styles.subtitle}>Choose a payment method to complete your order.</Text>

          <View style={styles.methodsContainer}>
            
            {/* UPI Option */}
            <View>
              <TouchableOpacity 
                style={[styles.methodCard, selectedMethod === 'UPI' ? styles.methodSelected : styles.methodUnselected]} 
                onPress={() => setSelectedMethod('UPI')}
                activeOpacity={0.8}
              >
                <View style={[styles.methodIconWrap, selectedMethod === 'UPI' ? styles.iconBgOrange : styles.iconBgWhite]}>
                  <Ionicons name="phone-portrait-outline" size={20} color={selectedMethod === 'UPI' ? '#fff' : '#888'} />
                </View>
                <View style={styles.methodTextContainer}>
                  <Text style={styles.methodName}>UPI / Online Payment</Text>
                  <Text style={styles.methodDesc}>GPay, PhonePe, Paytm, Card & Netbanking</Text>
                </View>
                <View style={[styles.radioCircle, selectedMethod === 'UPI' ? styles.radioSelected : styles.radioUnselected]}>
                  {selectedMethod === 'UPI' && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
              
              {/* Info Box rendered if UPI is selected */}
              {selectedMethod === 'UPI' && (
                <View style={styles.paymentInfoBox}>
                  <Ionicons name="information-circle-outline" size={20} color="#ff3400" />
                  <Text style={styles.paymentInfoText}>
                    You will be redirected securely to Razorpay checkout where you can choose GPay, PhonePe, Paytm, Cards, or Netbanking.
                  </Text>
                </View>
              )}
            </View>

            {/* Pay at Counter Option */}
            <TouchableOpacity 
              style={[styles.methodCard, selectedMethod === 'Cash' ? styles.methodSelected : styles.methodUnselected]} 
              onPress={() => setSelectedMethod('Cash')}
              activeOpacity={0.8}
            >
              <View style={[styles.methodIconWrap, selectedMethod === 'Cash' ? styles.iconBgOrange : styles.iconBgWhite]}>
                <Ionicons name="cash-outline" size={20} color={selectedMethod === 'Cash' ? '#fff' : '#888'} />
              </View>
              <View style={styles.methodTextContainer}>
                <Text style={styles.methodName}>Pay at Counter</Text>
                <Text style={styles.methodDesc}>Cash payment after your meal</Text>
              </View>
              <View style={[styles.radioCircle, selectedMethod === 'Cash' ? styles.radioSelected : styles.radioUnselected]}>
                 {selectedMethod === 'Cash' && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>

      {/* Bottom Fixed Section */}
      <View style={styles.bottomSection}>
        {/* Order Summary Card */}
        <View style={styles.orderSummaryCard}>
          <Text style={styles.summaryGreenText}>
            {params.orderType === 'Dine In'
              ? `Order for Table ${params.tableNumber?.replace('T-', '') ?? '06'}. Dine in`
              : 'Take Away Order'}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total payable </Text>
            <Text style={styles.summaryAmount}>Rs. {params.totalAmount}</Text>
            <Text style={styles.summarySuffix}></Text>
          </View>
        </View>

        {/* Secure Pay Button */}
        <TouchableOpacity 
          style={[styles.payBtn, loading && styles.btnDisabled]} 
          onPress={handleConfirm}
          disabled={loading}
        >
          <View style={styles.payBtnContent}>
            <Ionicons name="lock-closed" size={16} color="#fff" style={styles.payBtnIcon} />
            <Text style={styles.payBtnText}>
              {loading ? 'Processing...' : `Pay Rs. ${params.totalAmount} securely`}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Payment Failed Modal */}
      <Modal
        visible={isPaymentFailedModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPaymentFailedModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
        >
          <View style={styles.paymentFailedModalContent}>
            <View style={styles.failedIconWrap}>
              <Ionicons name="close" size={40} color="#ff4040" />
            </View>
            <Text style={styles.failedTitle}>Oops! Transaction Failed</Text>
            <Text style={styles.failedDesc}>The payment transaction could not be processed.</Text>
            
            <View style={styles.failedDetailsContainer}>
              <View style={styles.failedDetailCol}>
                <Text style={styles.failedDetailLabel}>Payment Method</Text>
                <Text style={styles.failedDetailValue}>{selectedMethod}</Text>
              </View>
              <View style={styles.failedDetailCol}>
                <Text style={styles.failedDetailLabel}>Amount</Text>
                <Text style={styles.failedDetailValue}>Rs. {params.totalAmount}</Text>
              </View>
            </View>

            <Text style={styles.failedInstruction}>
              Please click "Try Again" to retry the payment or select another option.
            </Text>

            <View style={styles.failedButtonsRow}>
              <TouchableOpacity style={styles.backHomeBtn} onPress={handleBackToHome}>
                <Text style={styles.btnEmoji}>🏠</Text>
                <Text style={styles.backHomeText}>Back to Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tryAgainBtn} onPress={handleTryAgain}>
                <Ionicons name="refresh" size={16} color="#fff" style={styles.btnIcon} />
                <Text style={styles.tryAgainText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Cash Polling Modal */}
      <Modal
        visible={isPollingCash}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentFailedModalContent}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>⏳</Text>
            <Text style={styles.failedTitle}>Waiting for Payment...</Text>
            <Text style={styles.failedDesc}>Please pay at the counter. The order will be placed once payment is confirmed.</Text>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImageFull: {
    width: 130,
    height: 32,
  },
  tableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingLeft: 10,
    paddingRight: 2,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#dfdfdf',
  },
  tableText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000',
  },
  tableCircle: {
    backgroundColor: '#ff3400',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  tableCircleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  globeIcon: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
  },
  paymentSection: {
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#555',
    marginBottom: 24,
    lineHeight: 18,
  },
  methodsContainer: {
    gap: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  methodUnselected: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#f2f2f2',
  },
  methodSelected: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff3400',
  },
  methodIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBgWhite: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconBgOrange: {
    backgroundColor: '#ff3400',
  },
  methodTextContainer: {
    flex: 1,
  },
  methodName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  methodDesc: {
    fontSize: 11,
    color: '#777',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  radioUnselected: {
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  radioSelected: {
    borderColor: '#ff3400',
    backgroundColor: '#ff3400',
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  orderSummaryCard: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryGreenText: {
    color: '#00a01d',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 12,
    color: '#ff3400',
    fontWeight: 'bold',
  },
  summarySuffix: {
    fontSize: 10,
    color: '#666',
  },
  payBtn: {
    backgroundColor: '#00a01d',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: '#6bcf80',
  },
  payBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnIcon: {
    marginRight: 6,
  },
  payBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  paymentInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f2',
    borderColor: '#ffd5cc',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  paymentInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentFailedModalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  failedIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderColor: '#ff4040',
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  failedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ff4040',
    marginBottom: 8,
    textAlign: 'center',
  },
  failedDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  failedDetailsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fffdfc',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderColor: '#ffe8e0',
    borderWidth: 1,
  },
  failedDetailCol: {
    flex: 1,
    backgroundColor: '#fff',
    borderColor: '#ffe8e0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 4,
  },
  failedDetailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  failedDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff4040',
  },
  failedInstruction: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  failedButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  backHomeBtn: {
    flex: 1,
    backgroundColor: '#7a7a7a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 25,
    marginRight: 8,
  },
  backHomeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  tryAgainBtn: {
    flex: 1,
    backgroundColor: '#ff3400',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 25,
    marginLeft: 8,
  },
  tryAgainText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnIcon: {
    marginRight: 6,
  },
  btnEmoji: {
    marginRight: 6,
    fontSize: 16,
  },
});
