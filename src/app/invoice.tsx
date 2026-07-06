import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function InvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [downloading, setDownloading] = useState(false);
  const [rating, setRating] = useState<string | null>(null);

  const orderId = params.orderId as string || 'DU104-100034372TE';
  const subtotalVal = parseFloat((params.subtotal as string) || '0');
  const finalTotalVal = parseFloat((params.finalTotal as string) || '0');
  const mobileNumber = (params.mobileNumber as string) || 'WALK-IN';
  const paymentMethod = (params.paymentMethod as string) || 'UPI';
  
  let cartData: any[] = [];
  try {
    if (params.cartData) {
      cartData = typeof params.cartData === 'string' ? JSON.parse(params.cartData) : params.cartData;
    }
  } catch (e) {
    console.error("Error parsing cart data", e);
  }

  const totalQty = cartData.reduce((acc, item) => acc + parseInt(item.quantity || item.qty || 1, 10), 0);
  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const netTaxableVal = finalTotalVal / 1.05;
  const cgstVal = (finalTotalVal - netTaxableVal) / 2;
  const sgstVal = cgstVal;
  const totalGstVal = cgstVal + sgstVal;

  const subtotal = subtotalVal.toFixed(2);
  const finalTotal = finalTotalVal.toFixed(2);
  const netTaxable = netTaxableVal.toFixed(2);
  const cgst = cgstVal.toFixed(2);
  const sgst = sgstVal.toFixed(2);
  const totalGst = totalGstVal.toFixed(2);

  const generatePDF = async () => {
    setDownloading(true);
    try {
      let itemsHtml = '';
      cartData.forEach((item, idx) => {
        const itemCode = 70000 + (item.menu_item_id || item.id || idx + 1);
        const name = (item.name || item.itemName || 'ITEM').toUpperCase();
        const price = parseFloat(item.price || 0).toFixed(2);
        const qty = String(item.quantity || item.qty || 1).padStart(3, '0');
        const netAmt = (parseFloat(item.price || 0) * parseInt(qty, 10)).toFixed(2);
        
        itemsHtml += `
          <tr>
            <td>${itemCode} / ${name}</td>
            <td>₹${price}</td>
            <td class="center">${qty}</td>
            <td class="right">₹${netAmt}</td>
          </tr>
        `;
      });

      const htmlContent = `
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; font-size: 11px; }
        .receipt { max-width: 400px; margin: 0 auto; }
        .divider { border-bottom: 1px dashed #ccc; margin: 12px 0; }
        .invoice-title { text-align: center; font-weight: 900; font-size: 14px; margin: 16px 0; }
        .items { width: 100%; border-collapse: collapse; }
        .items th { text-align: left; border-bottom: 1px dashed #ccc; padding: 5px 0; }
        .items td { padding: 5px 0; }
        .right { text-align: right; }
        .center { text-align: center; }
        </style>
        </head>
        <body>
        <div class="receipt">
          <div class="invoice-title">TAX INVOICE</div>
          <div class="divider"></div>
          <table class="items">
            <thead><tr><th>DESCRIPTION</th><th>PRICE</th><th class="center">QTY</th><th class="right">NET</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="divider"></div>
          <div>TOTAL: ₹${finalTotal}</div>
        </div>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        await Print.printAsync({ html: htmlContent });
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        const safeUri = FileSystem.documentDirectory + `DataUdipi_Bill_${orderId}.pdf`;
        await FileSystem.moveAsync({ from: uri, to: safeUri });
        await Sharing.shareAsync(safeUri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error) {
      console.error('Error generating bill PDF', error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const qrUrl = paymentMethod.toUpperCase() === 'UPI' 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=dataudipi@upi%26pn=DataUdipi%26am=${finalTotal}%26cu=INR`
    : `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=CashPaymentConfirmed`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.invoiceCard}>
          <View style={styles.banner}>
            <Image source={require('../../public/restaurant_bg.png')} style={styles.bannerImg} />
            <Text style={styles.bannerText}>40 YEARS OF EXCELLENCE</Text>
          </View>
          
          <View style={styles.logoContainer}>
            <Image source={require('../../public/udupi-banner.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>Data Udipi :</Text>
            <Text style={styles.brandAddress}>MGR Nagar, Nesapakkam, Chennai, Tamil Nadu 600078</Text>
          </View>

          <View style={styles.experience}>
            <Text style={styles.experienceTitle}>Tell us about your overall experience</Text>
            <View style={styles.smileys}>
              <TouchableOpacity onPress={() => setRating('happy')} style={[styles.smiley, rating === 'happy' && styles.smileyActive, { borderColor: '#22c55e' }]}>
                <Text style={{ fontSize: 24 }}>😃</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRating('neutral')} style={[styles.smiley, rating === 'neutral' && styles.smileyActive, { borderColor: '#eab308' }]}>
                <Text style={{ fontSize: 24 }}>😐</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRating('sad')} style={[styles.smiley, rating === 'sad' && styles.smileyActive, { borderColor: '#ef4444' }]}>
                <Text style={{ fontSize: 24 }}>😞</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>Data Udipi Limited</Text>
            <Text style={styles.companyText}>Place Of Supply : Data Udipi - 51, Anna Main Rd, Ponnambalam Colony, MGR Nagar, Nesapakkam, Chennai, Tamil Nadu 600078.</Text>
            <Text style={styles.companyText}>Regd. Office: Chennai.</Text>
            <Text style={styles.companyText}>GSTIN NO: 29AAACT1836J1ZC</Text>
          </View>

          <View style={styles.divider} />
          <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Invoice No : {orderId}</Text>
            <Text style={styles.metaValue}>{formattedDate}</Text>
          </View>
          <Text style={styles.metaLabel}>Counter : 4</Text>
          <Text style={styles.metaLabel}>Customer : {mobileNumber === 'WALK-IN' ? 'WALK-IN' : 'REGISTERED'}</Text>
          <Text style={styles.metaLabel}>Mobile No : {mobileNumber}</Text>

          <View style={styles.divider} />
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, { flex: 2 }]}>Code/Description</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Price</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>QTY</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'right' }]}>Net Amt</Text>
          </View>
          
          {cartData.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tableColData, { flex: 2 }]} numberOfLines={2}>{(item.name || item.itemName || 'ITEM').toUpperCase()}</Text>
              <Text style={[styles.tableColData, { flex: 1, textAlign: 'center' }]}>₹{parseFloat(item.price || 0).toFixed(2)}</Text>
              <Text style={[styles.tableColData, { flex: 1, textAlign: 'center' }]}>{String(item.quantity || item.qty || 1).padStart(3, '0')}</Text>
              <Text style={[styles.tableColData, { flex: 1, textAlign: 'right' }]}>₹{(parseFloat(item.price || 0) * parseInt(item.quantity || item.qty || 1, 10)).toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Gross Total :</Text><Text style={styles.totalValue}>₹{subtotal}</Text></View>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Discount Total :</Text><Text style={styles.totalValue}>₹0.00</Text></View>
            <View style={styles.totalRow}><Text style={styles.totalLabelBold}>Total Invoice Amount :</Text><Text style={styles.totalValueBold}>₹{finalTotal}</Text></View>
          </View>

          <View style={styles.divider} />

          <View style={styles.paymentDelivery}>
            <Text style={styles.paymentTitle}>Payment & Delivery</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{paymentMethod.toUpperCase()}</Text>
              <Text style={styles.totalValueBold}>₹{finalTotal}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabelBold}>Total received amount :</Text>
              <Text style={styles.totalValueBold}>₹{finalTotal}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>No of items : {String(cartData.length).padStart(2, '0')}</Text>
              <Text style={styles.totalLabel}>Total qty : {totalQty.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.qrSection}>
            <Image source={{ uri: qrUrl }} style={styles.qrImage} />
          </View>

          <View style={styles.terms}>
            <Text style={styles.termText}>Terms: * Taxes extra as applicable.</Text>
            <Text style={styles.termText}>No return / exchange on prepared food items.</Text>
            <Text style={styles.termText}>Thank you for dining with us!</Text>
          </View>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.downloadBtn} 
            onPress={generatePDF}
            disabled={downloading}
          >
            {downloading ? <ActivityIndicator size="small" color="#fff" style={{marginRight: 8}} /> : <Ionicons name="download" size={18} color="#fff" style={{marginRight: 8}} />}
            <Text style={styles.downloadBtnText}>{downloading ? 'Generating...' : 'Download bill'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.backBtn} onPress={() => { router.dismissAll(); router.replace('/'); }}>
            <Ionicons name="home" size={18} color="#fff" style={{marginRight: 8}} />
            <Text style={styles.backBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  banner: {
    position: 'relative',
    height: 100,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImg: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: 200,
    height: 40,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  brandAddress: {
    flex: 1,
    fontSize: 11,
    color: '#555',
  },
  experience: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  experienceTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  smileys: {
    flexDirection: 'row',
    gap: 16,
  },
  smiley: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  smileyActive: {
    backgroundColor: '#f0f0f0',
  },
  companyInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  companyName: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  companyText: {
    fontSize: 11,
    color: '#555',
    textAlign: 'center',
    marginBottom: 2,
  },
  divider: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 12,
  },
  invoiceTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    color: '#555',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  tableCol: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  tableColData: {
    fontSize: 11,
    color: '#444',
  },
  totalsContainer: {
    gap: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: '#555',
  },
  totalValue: {
    fontSize: 12,
    color: '#333',
  },
  totalLabelBold: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
  },
  totalValueBold: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
  },
  paymentDelivery: {
    marginBottom: 16,
  },
  paymentTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  qrSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  qrImage: {
    width: 150,
    height: 150,
  },
  terms: {
    alignItems: 'center',
    marginBottom: 16,
  },
  termText: {
    fontSize: 10,
    color: '#555',
    marginBottom: 4,
    textAlign: 'center',
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  downloadBtn: {
    flexDirection: 'row',
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backBtn: {
    flexDirection: 'row',
    backgroundColor: '#ff5a1f',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
