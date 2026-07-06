import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, StatusBar, Animated, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function OrderSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    orderId: string;
    total: string;
    paymentMethod: string;
    phone: string;
    tableNumber: string;
    dbOrderId?: string;
    cart?: string;
    itemCount?: string;
    orderType?: string;
  }>();

  // Animation values
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence: fade in and spring scale up the tick
    Animated.parallel([
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleReturnHome = () => {
    // Navigate back to the index screen (main menu)
    router.dismissAll();
    router.replace('/');
  };

  const handleTrackOrder = () => {
    router.push({
      pathname: '/track-order',
      params: {
        orderId: params.orderId || 'UDP-868518',
        dbOrderId: params.dbOrderId,
        tableNumber: params.tableNumber ?? 'T-06',
        cart: params.cart,
        orderType: params.orderType,
        phone: params.phone,
      }
    });
  };

  const handleDownloadInvoice = () => {
    router.push({
      pathname: '/invoice',
      params: {
        orderId: params.orderId,
        finalTotal: params.total,
        subtotal: params.total, 
        mobileNumber: params.phone,
        paymentMethod: params.paymentMethod,
        cartData: params.cart,
      }
    });
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

      {/* Main Content Area */}
      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.animationWrapper}>
            {/* Animated Tick Icon */}
            <Animated.View style={[
              styles.outerCircle, 
              { 
                opacity: opacityValue,
                transform: [{ scale: scaleValue }] 
              }
            ]}>
              <View style={styles.innerCircle}>
                <Ionicons name="checkmark" size={32} color="#fff" />
              </View>
            </Animated.View>

            <Text style={styles.successTitle}>Order Placed!</Text>
            <Text style={styles.successSubtitle}>
              Order #{params.orderId || 'UDP-868518'} • {params.orderType === 'Take Away' ? 'Take Away' : `Table ${params.tableNumber?.replace('T-', '') ?? '06'}`}
            </Text>
            <Text style={styles.successDesc}>Thank you! Our chef is preparing your meal with love.</Text>
          </View>

          {/* Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order ID</Text>
              <Text style={styles.detailValueBlack}>{params.orderId || 'UDP-868518'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{params.orderType === 'Take Away' ? 'Order Type' : 'Table'}</Text>
              <Text style={styles.detailValueBlack}>
                {params.orderType === 'Take Away' ? 'Take Away' : `${params.tableNumber?.replace('T-', '') ?? '06'} . Dine in`}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Items</Text>
              <Text style={styles.detailValueBlack}>{params.itemCount || '5'}</Text>
            </View>

            <View style={[styles.detailRow, styles.lastRow]}>
              <Text style={styles.detailLabel}>Paid</Text>
              <Text style={styles.detailValueOrange}>Rs. {params.total || '398'}</Text>
            </View>
          </View>

          {/* Estimated Time Pill */}
          <View style={styles.estimatedTimePill}>
            <Ionicons name="time-outline" size={16} color="#16a34a" style={styles.timeIcon} />
            <Text style={styles.estimatedTimeText}>Estimated Time  •  15 - 20 min</Text>
          </View>

        </ScrollView>

        {/* Bottom Actions */}
        <View style={[styles.bottomActions, { paddingBottom: 24 + insets.bottom }]}>
          <TouchableOpacity style={styles.trackBtn} onPress={handleTrackOrder}>
            <Text style={styles.trackBtnText}>Track Order</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadInvoice}>
            <Ionicons name="download-outline" size={18} color="#00a01d" style={{marginRight: 6}} />
            <Text style={styles.downloadBtnText}>Download E-Invoice</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.backBtn} onPress={handleReturnHome}>
            <Ionicons name="arrow-back" size={16} color="#888" />
            <Text style={styles.backBtnText}>Back to Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    zIndex: 10,
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
    paddingHorizontal: 6,
    height: 24,
    minWidth: 24,
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
  contentContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  animationWrapper: {
    alignItems: 'center',
    marginBottom: 32,
  },
  outerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#f0fdf4', // Very light green
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  innerCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#2a8837', // Solid green
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff', // White inner border look
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
  },
  successDesc: {
    fontSize: 13,
    color: '#777',
    fontWeight: '500',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  lastRow: {
    paddingBottom: 0,
  },
  detailLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  detailValueBlack: {
    fontSize: 13,
    color: '#111',
    fontWeight: 'bold',
  },
  detailValueOrange: {
    fontSize: 13,
    color: '#ff3400',
    fontWeight: 'bold',
  },
  estimatedTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eaf5eb',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  timeIcon: {
    marginRight: 8,
  },
  estimatedTimeText: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: 'bold',
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: '#fff',
  },
  trackBtn: {
    backgroundColor: '#00a01d',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  trackBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eaf5eb',
    borderRadius: 24,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00a01d',
  },
  downloadBtnText: {
    color: '#00a01d',
    fontWeight: 'bold',
    fontSize: 15,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  backBtnText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
});
