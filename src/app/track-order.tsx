import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, StatusBar, ImageBackground } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../constants/api';

export default function TrackOrderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    orderId: string;
    dbOrderId?: string;
    tableNumber: string;
    cart: string;
    orderType?: string;
    phone?: string;
  }>();

  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let intervalId: ReturnType<typeof setTimeout>;

    const fetchOrderDetails = async () => {
      try {
        let fetchId = params.dbOrderId;
        if (!fetchId && params.orderId) {
          // Attempt to extract numeric ID from ORD-xxxxxx
          const match = params.orderId.match(/\d+/);
          if (match) {
            fetchId = parseInt(match[0], 10).toString();
          }
        }
        
        if (fetchId) {
          const res = await fetch(`${API_BASE_URL}/api/orders/${fetchId}?restaurant_id=1`);
          const data = await res.json();
          if (data && data.order) {
            setOrderDetails(data);
            const status = data.order.status.toUpperCase();
            if (status === 'SERVED' || status === 'COMPLETED') {
              router.replace({
                pathname: '/order-completed',
                params: {
                  orderId: params.orderId || `ORD-${data.order.id.toString().padStart(6, '0')}`,
                  tableNumber: data.order.table_number || params.tableNumber || 'Take Away',
                  totalAmount: data.order.total_amount?.toString() || '0.00',
                  paymentMethod: data.order.payment_method || 'UPI',
                  cartItems: JSON.stringify(data.items || []),
                  date: data.order.created_at || new Date().toISOString(),
                  phone: params.phone || '82166432250',
                }
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch order details", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
    
    // Poll the database every 5 seconds to reflect live status updates from admin dashboard
    intervalId = setInterval(fetchOrderDetails, 5000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [params.dbOrderId, params.orderId]);

  const orderItems = orderDetails && orderDetails.items && orderDetails.items.length > 0 
    ? orderDetails.items.map((item: any) => ({
        qty: item.quantity,
        name: item.name,
        price: item.price * item.quantity
      }))
    : [];

  const getStatusLevel = () => {
    if (!orderDetails) return 0;
    const status = orderDetails.order.status.toUpperCase();
    if (status === 'CONFIRMED' || status === 'PENDING') return 1;
    if (status === 'PREPARING') return 2;
    if (status === 'READY') return 3;
    if (status === 'SERVED' || status === 'COMPLETED') return 4;
    if (status === 'CANCELLED') return -1;
    return 1;
  };

  const statusLevel = getStatusLevel();

  const isTakeAway = params.tableNumber?.toLowerCase().replace(/\s|-/g, '') === 'takeaway' || orderDetails?.order?.table_number?.toLowerCase().replace(/\s|-/g, '') === 'takeaway';
  const displayTableNumber = isTakeAway ? '' : (orderDetails?.order?.table_number || params.tableNumber || 'T-06').replace('T-', '');
  
  // Format the DB order ID properly if we fetched it, matching backend's str.zfill(6)
  const displayOrderId = params.orderId || 
    (orderDetails?.order?.id ? `ORD-${orderDetails.order.id.toString().padStart(6, '0')}` : 'Loading...');

  const getStatusTitle = () => {
    switch (statusLevel) {
      case -1: return 'Order Cancelled';
      case 1: return 'Order Received';
      case 2: return 'Preparing';
      case 3: return isTakeAway ? 'Ready for Pickup' : 'Ready to Serve';
      case 4: return isTakeAway ? 'Picked Up' : 'Served';
      default: return 'Order Received';
    }
  };

  const getStatusDesc = () => {
    switch (statusLevel) {
      case -1: return 'This order was cancelled';
      case 1: return "We've got your order";
      case 2: return 'Chef is cooking your meal';
      case 3: return isTakeAway ? 'Your order is ready to collect' : 'Plating up now';
      case 4: return isTakeAway ? 'Thank you for ordering' : 'Enjoy your meal';
      default: return "We've got your order";
    }
  };

  const handleCallStaff = () => {
    if (isTakeAway) {
      alert("Calling staff for support");
    } else {
      alert("Calling staff to Table " + displayTableNumber);
    }
  };

  const handleOrderMore = () => {
    // Go back to menu
    router.dismissAll();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        {!isTakeAway && (
          <View style={styles.tableBadge}>
            <Text style={styles.tableText}>Table no : </Text>
            <View style={styles.tableCircle}>
              <Text style={styles.tableCircleText}>{displayTableNumber}</Text>
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

      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.pageTitle}>Track Order</Text>

          {/* Banner Card */}
          <View style={styles.bannerContainer}>
            <ImageBackground 
              source={require('../../public/sambar_idly_premium.jpg')} 
              style={styles.bannerImage}
              imageStyle={{ borderRadius: 16 }}
            >
              <View style={styles.bannerOverlay}>
                <View style={styles.bannerTopRow}>
                  <View>
                    <Text style={styles.bannerOrderLabel}>Order ID</Text>
                    <Text style={styles.bannerOrderId}>{displayOrderId}</Text>
                  </View>
                  <View style={styles.livePill}>
                    <Ionicons name="notifications-outline" size={12} color="#fff" />
                    <Text style={styles.liveText}>Live</Text>
                  </View>
                </View>

                <View style={styles.bannerBottomRow}>
                  <Text style={styles.bannerStatusTitle}>{getStatusTitle()}</Text>
                  <Text style={styles.bannerStatusDesc}>{getStatusDesc()}</Text>
                  
                  {/* Progress Bar */}
                  <View style={styles.progressBarTrack}>
                    <View style={[
                      styles.progressBarFill, 
                      { 
                        width: `${statusLevel === -1 ? 100 : statusLevel * 25}%`,
                        backgroundColor: statusLevel === -1 ? '#ef4444' : '#ff3400'
                      }
                    ]} />
                  </View>
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* Timeline Section */}
          {statusLevel === -1 ? (
            <View style={styles.cancelledContainer}>
              <View style={styles.cancelledIconWrap}>
                <Ionicons name="close-circle" size={40} color="#ef4444" />
              </View>
              <Text style={styles.cancelledTitle}>Order Cancelled</Text>
              <Text style={styles.cancelledDesc}>This order has been cancelled. Please contact our staff if you have any questions.</Text>
            </View>
          ) : (
            <View style={styles.timelineContainer}>
              
              {/* Step 1 */}
              <View style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={statusLevel >= 1 ? styles.circleGreen : styles.circleGrey}>
                    <Ionicons name="checkmark" size={16} color={statusLevel >= 1 ? "#fff" : "#a0a0a0"} />
                  </View>
                  <View style={statusLevel >= 2 ? styles.lineGreen : styles.lineGrey} />
                </View>
                <View style={styles.timelineRight}>
                  <Text style={styles.stepTitle}>Order Received</Text>
                  <Text style={styles.stepDesc}>{"We've got your order"}</Text>
                </View>
              </View>

              {/* Step 2 */}
              <View style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={statusLevel >= 2 ? styles.circleGreen : styles.circleGrey}>
                    <MaterialCommunityIcons name="chef-hat" size={18} color={statusLevel >= 2 ? "#fff" : "#a0a0a0"} />
                  </View>
                  <View style={statusLevel >= 3 ? styles.lineGreen : styles.lineGrey} />
                </View>
                <View style={styles.timelineRight}>
                  <Text style={styles.stepTitle}>Preparing</Text>
                  <Text style={styles.stepDesc}>Chef is cooking your meal</Text>
                </View>
              </View>

              {/* Step 3 */}
              <View style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={statusLevel >= 3 ? styles.circleGreen : styles.circleGrey}>
                    <MaterialCommunityIcons name="pot-steam" size={18} color={statusLevel >= 3 ? "#fff" : "#a0a0a0"} />
                  </View>
                  <View style={statusLevel >= 4 ? styles.lineGreen : styles.lineGrey} />
                </View>
                <View style={styles.timelineRight}>
                  <Text style={styles.stepTitle}>{isTakeAway ? 'Ready for Pickup' : 'Ready to Serve'}</Text>
                  <Text style={styles.stepDesc}>{isTakeAway ? 'Your order is ready to collect' : 'Plating up now'}</Text>
                </View>
              </View>

              {/* Step 4 */}
              <View style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={statusLevel >= 4 ? styles.circleGreen : styles.circleGrey}>
                    <Ionicons name={isTakeAway ? "bag-handle-outline" : "restaurant-outline"} size={16} color={statusLevel >= 4 ? "#fff" : "#a0a0a0"} />
                  </View>
                  {/* No line for the last step */}
                </View>
                <View style={styles.timelineRight}>
                  <Text style={styles.stepTitle}>{isTakeAway ? 'Picked Up' : 'Served at Table'}</Text>
                  <Text style={styles.stepDesc}>{isTakeAway ? 'Thank you for ordering' : 'Enjoy your meal'}</Text>
                </View>
              </View>

            </View>
          )}

          {/* Your Order Card */}
          <View style={styles.orderSummaryCard}>
            <Text style={styles.orderSummaryTitle}>Your Order</Text>
            
            {loading ? (
              <Text style={{ color: '#888', fontStyle: 'italic' }}>Loading order details...</Text>
            ) : orderItems.length > 0 ? (
              orderItems.map((item: any, index: number) => (
                <View key={index} style={styles.orderItemRow}>
                  <Text style={styles.orderItemName}>{item.qty} x {item.name}</Text>
                  <Text style={styles.orderItemPrice}>Rs. {item.price}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: '#888' }}>No items found for this order.</Text>
            )}
          </View>

        </ScrollView>

        {/* Bottom Actions */}
        <View style={[styles.bottomActionsRow, { paddingBottom: Math.max(insets.bottom, 4), paddingTop: 10 }]}>
          <TouchableOpacity style={styles.callStaffBtn} onPress={handleCallStaff}>
            <Ionicons name="call-outline" size={18} color="#000" style={styles.callIcon} />
            <Text style={styles.callStaffText}>Call Staff</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.orderMoreBtn} onPress={handleOrderMore}>
            <Text style={styles.orderMoreText}>Order More</Text>
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
  contentContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  bannerContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-between',
  },
  bannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerOrderLabel: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
  },
  bannerOrderId: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff3400',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  bannerBottomRow: {
    width: '100%',
  },
  bannerStatusTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerStatusDesc: {
    color: '#ddd',
    fontSize: 12,
    marginBottom: 16,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#555',
    borderRadius: 3,
  },
  progressBarFill: {
    width: '45%',
    height: '100%',
    backgroundColor: '#ff3400',
    borderRadius: 3,
  },
  timelineContainer: {
    paddingHorizontal: 8,
    marginBottom: 32,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 32,
  },
  circleGreen: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2b9136',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  circleGrey: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  lineGreen: {
    width: 2,
    height: 44,
    backgroundColor: '#2b9136',
    marginTop: -4,
    marginBottom: -4,
    zIndex: 1,
  },
  lineGrey: {
    width: 2,
    height: 44,
    backgroundColor: '#e8e8e8',
    marginTop: -4,
    marginBottom: -4,
    zIndex: 1,
  },
  timelineRight: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 28, // Matches the line height
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 12,
    color: '#666',
  },
  orderSummaryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  orderSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderItemName: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  orderItemPrice: {
    fontSize: 14,
    color: '#000',
    fontWeight: 'bold',
  },
  bottomActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  callStaffBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 24,
    paddingVertical: 14,
  },
  callIcon: {
    marginRight: 8,
  },
  callStaffText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  orderMoreBtn: {
    flex: 1,
    backgroundColor: '#00a01d',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00a01d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  orderMoreText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  cancelledContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 32,
  },
  cancelledIconWrap: {
    marginBottom: 12,
  },
  cancelledTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 6,
  },
  cancelledDesc: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
