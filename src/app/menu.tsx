import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, FlatList, Platform, StatusBar, Image, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '../constants/api';

type CartState = Record<number, number>;

export default function App() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderType?: string; tableNumber?: string }>();
  const insets = useSafeAreaInsets();
  const [orderType, setOrderType] = useState<"Dine In" | "Take Away">((params.orderType as "Dine In" | "Take Away") || "Dine In");
  const [tableNumber, setTableNumber] = useState<string>(params.tableNumber || 'T-06');
  const [categories, setCategories] = useState([
    { id: "all", label: "All Menu" }
  ]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartState>({});
  const [isCartModalVisible, setIsCartModalVisible] = useState(false);
  const [isAgentModalVisible, setIsAgentModalVisible] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
        try {
            const catRes = await fetch(`${API_BASE_URL}/api/categories?restaurant_id=1`);
            const catData = await catRes.json();
            // Filter out 'all' from backend if it exists, since we manually prepend it
            const filteredCatData = catData.filter((c: any) => c.name.toLowerCase() !== 'all');
            const formattedCats = [
                { id: "all", label: "All Menu" },
                ...filteredCatData.map((c: any) => ({ id: c.id.toString(), label: c.description || c.name }))
            ];
            setCategories(formattedCats);

            const itemRes = await fetch(`${API_BASE_URL}/api/items?restaurant_id=1`);
            const itemData = await itemRes.json();
            const formattedItems = itemData.map((item: any) => ({
                id: item.id,
                name: item.name,
                desc: item.description,
                price: item.price,
                available: item.is_available,
                image: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${API_BASE_URL}${item.image_url}`) : 'https://via.placeholder.com/150',
                category: item.category_id.toString(),
            }));
            setMenuItems(formattedItems);
        } catch (e) {
            console.error("Error fetching menu data", e);
        }
    };
    fetchMenu();
  }, []);

  const handleIncrement = (id: number) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  };

  const handleDecrement = (id: number) => {
    setCart((prev) => ({
      ...prev,
      [id]: Math.max((prev[id] ?? 0) - 1, 0),
    }));
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {/* Home Button */}
        <TouchableOpacity style={styles.homeBtn} onPress={() => { router.dismissAll(); router.replace('/'); }}>
          <Ionicons name="home" size={18} color="#fff" />
        </TouchableOpacity>

        {/* Table No */}
        {orderType === "Dine In" && (
          <View style={styles.tableBadge}>
            <Text style={styles.tableText}>Table no : </Text>
            <View style={styles.tableCircle}>
              <Text style={styles.tableCircleText}>{tableNumber.replace('T-', '')}</Text>
            </View>
          </View>
        )}
      </View>
      
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../public/Dataudupi-Title.png')} 
          style={styles.logoImageFull} 
          resizeMode="contain"
        />
      </View>

      {/* Language / Globe */}
      <TouchableOpacity style={styles.globeIcon}>
        <Ionicons name="language" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderMenuItem = ({ item }: { item: any }) => {
    const count = cart[item.id] ?? 0;
    
    return (
      <View style={styles.card}>
        <View style={styles.imagePlaceholder}>
          <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.availBadge, !item.available && styles.unavailBadge]}>
              <View style={[styles.availDot, !item.available && styles.unavailDot]} />
              <Text style={[styles.availText, !item.available && styles.unavailText]}>
                {item.available ? 'Available' : 'Not Available'}
              </Text>
            </View>
          </View>
          <Text style={styles.itemDesc} numberOfLines={2}>{item.desc}</Text>
          
          <View style={styles.cardFooter}>
            <Text style={styles.price}>Rs. <Text style={styles.priceVal}>{item.price}</Text></Text>
            <View style={styles.stepper}>
              <TouchableOpacity 
                style={[styles.stepBtnMinus, (!item.available || count === 0) && styles.stepBtnDisabled]}
                onPress={() => handleDecrement(item.id)}
                disabled={!item.available || count === 0}
              >
                <Ionicons name="remove" size={16} color={(!item.available || count === 0) ? "#ccc" : "#f87171"} />
              </TouchableOpacity>
              <Text style={styles.stepVal}>{count}</Text>
              <TouchableOpacity 
                style={[styles.stepBtnPlus, !item.available && styles.stepBtnDisabled]}
                onPress={() => handleIncrement(item.id)}
                disabled={!item.available}
              >
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCat === "all" || item.category === activeCat;
    const matchesSearch = searchQuery === "" || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHeader()}

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search for food..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.catTab, activeCat === cat.id && styles.catTabActive]}
              onPress={() => setActiveCat(cat.id)}
            >
              <Text style={[styles.catText, activeCat === cat.id && styles.catTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filteredItems.length > 0 ? (
        <FlatList 
          data={filteredItems}
          keyExtractor={i => i.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
          renderItem={renderMenuItem}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="fast-food-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No items found</Text>
        </View>
      )}

      {/* Floating Buttons */}
      <View style={[styles.floatingContainer, { bottom: 24 + insets.bottom }]}>
        {cartItemCount > 0 && (
          <TouchableOpacity style={styles.viewCartBtn} onPress={() => setIsCartModalVisible(true)}>
            <Ionicons name="cart-outline" size={18} color="#fff" />
            <Text style={styles.viewCartText}>View Cart</Text>
            <View style={styles.viewCartBadge}>
              <Text style={styles.viewCartBadgeText}>{cartItemCount}</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.talkToChefBtn} onPress={() => setIsAgentModalVisible(true)}>
          <View style={styles.chefIconWrap}>
            <Image 
              source={require('../../public/waiter.png')} 
              style={styles.chefImage} 
            />
          </View>
          <View>
            <Text style={styles.chefTitle}>Talk to Chef</Text>
            <View style={styles.chefSubRow}>
              <Ionicons name="mic" size={10} color="#666" />
              <Text style={styles.chefSub}>Tap to speak</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Cart Modal */}
      <Modal
        visible={isCartModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCartModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsCartModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.bottomSheet}>
            <View style={styles.dragHandle} />
            
             <View style={styles.cartHeaderRow}>
              <Text style={styles.cartTitle}>Cart</Text>
              {orderType === "Dine In" && (
                <View style={styles.tableSelector}>
                  <Text style={styles.tableSelectorText}>Table No : {tableNumber.replace('T-', '')}</Text>
                  <Ionicons name="chevron-down" size={14} color="#00a01d" />
                </View>
              )}
            </View>
            <Text style={styles.orderIdText}># Order Status : Pending</Text>

            <View style={styles.orderTypeContainer}>
              <TouchableOpacity 
                style={[styles.orderTypeBtn, orderType === "Dine In" && styles.orderTypeActive]}
                onPress={() => setOrderType("Dine In")}
              >
                <Ionicons name="restaurant-outline" size={16} color={orderType === "Dine In" ? "#fff" : "#ccc"} />
                <Text style={orderType === "Dine In" ? styles.orderTypeActiveText : styles.orderTypeInactiveText}>Dine In</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.orderTypeBtn, orderType === "Take Away" && styles.orderTypeActive]}
                onPress={() => setOrderType("Take Away")}
              >
                <Ionicons name="bag-handle-outline" size={16} color={orderType === "Take Away" ? "#fff" : "#ccc"} />
                <Text style={orderType === "Take Away" ? styles.orderTypeActiveText : styles.orderTypeInactiveText}>Take Away</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cartItemsScroll} showsVerticalScrollIndicator={false}>
              {Object.entries(cart).filter(([id, count]) => count > 0).map(([id, count]) => {
                const item = menuItems.find(m => m.id.toString() === id);
                if (!item) return null;
                return (
                  <View key={item.id} style={styles.cartItemCard}>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => setCart(prev => ({...prev, [item.id]: 0}))}>
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.cartItemTop}>
                      <Image source={{ uri: item.image }} style={styles.cartItemImg} />
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemServes}>Serves : 1</Text>
                        <Text style={styles.cartItemPrice}>Rs. {item.price}</Text>
                      </View>
                      <View style={styles.cartItemRight}>
                        <Text style={styles.cartItemTotalLabel}>Total</Text>
                        <Text style={styles.cartItemTotalValue}>{(item.price * count).toFixed(2)}</Text>
                        {/* Removed + GST */}
                        <View style={styles.stepper}>
                          <TouchableOpacity style={styles.stepBtnMinus} onPress={() => handleDecrement(item.id)}>
                            <Ionicons name="remove" size={16} color="#f87171" />
                          </TouchableOpacity>
                          <Text style={styles.stepVal}>{count}</Text>
                          <TouchableOpacity style={styles.stepBtnPlus} onPress={() => handleIncrement(item.id)}>
                            <Ionicons name="add" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    <TextInput 
                      style={styles.instructionInput}
                      placeholder="Please, Just a little bit spicy only...."
                      placeholderTextColor="#999"
                    />
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.placeOrderContainer}>
              <TouchableOpacity style={styles.placeOrderBtn} onPress={() => {
                 const cartItemsArr = Object.entries(cart).filter(([_, count]) => count > 0).map(([itemId, count]) => ({ ...menuItems.find(m => m.id.toString() === itemId), quantity: count }));
                 const subtotal = cartItemsArr.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
                 const serviceCharge = 0;
                 const gst = 0;
                 const totalAmount = subtotal + serviceCharge + gst;

                 router.push({
                   pathname: '/payment',
                   params: {
                     cart: JSON.stringify(cart),
                     cartItems: JSON.stringify(cartItemsArr),
                     tableNumber: orderType === 'Dine In' ? tableNumber : 'Take Away',
                     orderType: orderType,
                     phone: '',
                     subtotal: subtotal.toFixed(2),
                     serviceCharge: serviceCharge.toFixed(2),
                     gst: gst.toFixed(2),
                     totalAmount: totalAmount.toFixed(2)
                   }
                 });
              }}>
                <Text style={styles.placeOrderText}>Place Order</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Agent Modal */}
      <Modal
        visible={isAgentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAgentModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsAgentModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.agentBottomSheet}>
            <View style={styles.dragHandle} />
            <Text style={styles.agentModalTitle}>Talk To Your Agent</Text>
            
            <View style={styles.agentAvatarContainer}>
              <View style={styles.waveformContainer}>
                 {[12, 16, 24, 16, 32, 20, 40, 24, 48, 64, 48, 24, 40, 20, 32, 16, 24, 16, 12].map((h, i) => (
                   <View key={i} style={[styles.waveformBar, { height: h }]} />
                 ))}
              </View>
              <Image 
                source={require('../../public/waiter.png')} 
                style={styles.agentAvatarLarge} 
                resizeMode="contain"
              />
            </View>

            <ScrollView style={styles.agentSuggestionsContainer} contentContainerStyle={{ gap: 12, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.agentSuggestionPill}>
                <View style={styles.suggestionIconWrap}>
                  <Ionicons name="person" size={10} color="#fff" style={{ marginLeft: -2 }} />
                  <Ionicons name="wifi" size={6} color="#fff" style={{ position: 'absolute', right: 2, transform: [{ rotate: '90deg' }] }} />
                </View>
                <Text style={styles.agentSuggestionText}>Show me popular items</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.agentSuggestionPill}>
                <View style={styles.suggestionIconWrap}>
                  <Ionicons name="person" size={10} color="#fff" style={{ marginLeft: -2 }} />
                  <Ionicons name="wifi" size={6} color="#fff" style={{ position: 'absolute', right: 2, transform: [{ rotate: '90deg' }] }} />
                </View>
                <Text style={styles.agentSuggestionText}>Add 2 Masala Dosa to my cart</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.agentSuggestionPill}>
                <View style={styles.suggestionIconWrap}>
                  <Ionicons name="person" size={10} color="#fff" style={{ marginLeft: -2 }} />
                  <Ionicons name="wifi" size={6} color="#fff" style={{ position: 'absolute', right: 2, transform: [{ rotate: '90deg' }] }} />
                </View>
                <Text style={styles.agentSuggestionText}>What are today's specials?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.agentSuggestionPill}>
                <View style={styles.suggestionIconWrap}>
                  <Ionicons name="person" size={10} color="#fff" style={{ marginLeft: -2 }} />
                  <Ionicons name="wifi" size={6} color="#fff" style={{ position: 'absolute', right: 2, transform: [{ rotate: '90deg' }] }} />
                </View>
                <Text style={styles.agentSuggestionText}>Talk to waiter</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.agentInputContainer}>
              <TextInput 
                style={styles.agentInput}
                placeholder="Tap To Speak Or Just Hey...."
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={styles.agentMicBtn}>
                <Ionicons name="mic" size={20} color="#ff5a1f" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fcfcfc' },
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
  homeBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderColor: '#dfdfdf'
  },
  tableText: { fontSize: 10, fontWeight: '600', color: '#000' },
  tableCircle: {
    backgroundColor: '#ff3400',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dfdfdf',
    marginLeft: 4,
  },
  tableCircleText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  logoImageFull: { width: 140, height: 36, resizeMode: 'contain' },
  globeIcon: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 12, color: '#333' },
  filterBtn: {
    width: 40, height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  catScroll: { paddingHorizontal: 16, gap: 16, paddingBottom: 8 },
  catTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  catTabActive: { backgroundColor: '#ff5a1f' },
  catText: { fontSize: 12, color: '#777', fontWeight: '500' },
  catTextActive: { color: '#fff', fontWeight: 'bold' },
  gridContainer: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 },
  gridRow: { justifyContent: 'space-between', marginBottom: 12 },
  card: {
    width: '48%',
    backgroundColor: '#fcfcfc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    height: 120,
    width: '100%',
    backgroundColor: '#e0e0e0',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: { padding: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemName: { fontSize: 12, fontWeight: 'bold', color: '#000', flex: 1, marginRight: 4 },
  availBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00a01d', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  unavailBadge: { backgroundColor: '#ff0000' },
  availDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', marginRight: 4 },
  unavailDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', marginRight: 4 },
  availText: { fontSize: 10, fontWeight: '500', color: '#fff' },
  unavailText: { color: '#fff' },
  itemDesc: { fontSize: 10, color: '#777', marginBottom: 12, lineHeight: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 10, color: '#777' },
  priceVal: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 4, borderWidth: 1, borderColor: '#f4f4f4', padding: 2 },
  stepBtnMinus: { backgroundColor: '#f2f2f2', padding: 2, borderRadius: 2 },
  stepBtnPlus: { backgroundColor: '#ff3400', padding: 2, borderRadius: 2 },
  stepBtnDisabled: { opacity: 0.5 },
  stepVal: { fontSize: 12, color: '#000', width: 24, textAlign: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 64 },
  emptyText: { color: '#777', fontSize: 14, marginTop: 12 },
  floatingContainer: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    alignItems: 'flex-end',
    gap: 12,
  },
  viewCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00a01d',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    gap: 8,
  },
  viewCartText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  viewCartBadge: {
    backgroundColor: '#32d366',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  viewCartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  talkToChefBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    gap: 8,
  },
  chefIconWrap: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#f0f0f0', 
    alignItems: 'center', 
    justifyContent: 'center', 
    overflow: 'hidden' 
  },
  chefImage: { width: 32, height: 32 },
  chefTitle: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  chefSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chefSub: { fontSize: 10, color: '#666' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  cartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  tableSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tableSelectorText: {
    color: '#00a01d',
    fontWeight: 'bold',
    fontSize: 14,
  },
  orderIdText: {
    color: '#777',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fcfcfc',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  orderTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  orderTypeActive: {
    backgroundColor: '#ff3400',
  },
  orderTypeActiveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  orderTypeInactiveText: {
    color: '#ccc',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cartItemsScroll: {
    marginBottom: 16,
  },
  cartItemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    padding: 12,
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: '#000',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItemTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cartItemImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  cartItemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  cartItemServes: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff3400',
  },
  cartItemRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cartItemTotalLabel: {
    fontSize: 10,
    color: '#999',
  },
  cartItemTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff3400',
  },
  cartItemTax: {
    fontSize: 8,
    color: '#000',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#333',
  },
  placeOrderContainer: {
    paddingTop: 12,
  },
  placeOrderBtn: {
    backgroundColor: '#00a01d',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  placeOrderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  agentBottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    height: '85%',
  },
  agentModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  agentAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    width: '100%',
    height: 160,
  },
  waveformContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
    height: 80,
    zIndex: 0,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatarLarge: {
    width: 140,
    height: 160,
    borderBottomLeftRadius: 54,
    borderBottomRightRadius: 54,
    zIndex: 1,
  },
  avatarOrangeBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#ff3400',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  vegBadge: {
    marginTop: 16,
    backgroundColor: '#00a01d',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  vegBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  agentSuggestionsContainer: {
    width: '100%',
    flex: 1,
    marginBottom: 16,
  },
  agentSuggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  suggestionIconWrap: {
    backgroundColor: '#ff3400',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentSuggestionText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  agentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#ff5a1f',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
  },
  agentInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  agentMicBtn: {
    padding: 4,
  }
});

