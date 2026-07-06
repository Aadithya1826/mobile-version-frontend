import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ImageBackground, Image, Platform, StatusBar, Modal, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLanguage } from '../context/LanguageContext';

export default function Home() {
  const router = useRouter();
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [manualTable, setManualTable] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const handleDineInPress = async () => {
    if (permission?.granted) {
      setIsScannerVisible(true);
      setScanned(false);
    } else {
      const status = await requestPermission();
      if (status.granted) {
        setIsScannerVisible(true);
        setScanned(false);
      } else {
        // Even if permission is denied, open the modal so they can enter manually
        setIsScannerVisible(true);
        setScanned(false);
      }
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    const tableNumber = parseTableFromQR(data);
    setIsScannerVisible(false);
    router.push({ pathname: '/menu', params: { orderType: 'Dine In', tableNumber } });
  };

  const handleManualSubmit = () => {
    if (!manualTable.trim()) {
      Alert.alert("Invalid Input", "Please enter a valid table number (e.g. 05 or T-05).");
      return;
    }
    const tableNumber = formatTableNumber(manualTable);
    setIsScannerVisible(false);
    router.push({ pathname: '/menu', params: { orderType: 'Dine In', tableNumber } });
  };

  const handleCloseScanner = () => {
    setIsScannerVisible(false);
    setScanned(false);
    setManualTable('');
  };

  const parseTableFromQR = (data: string): string => {
    try {
      if (data.includes('?')) {
        const queryString = data.split('?')[1];
        const match = queryString.match(/[?&]table=([^&]+)/);
        if (match && match[1]) {
          return formatTableNumber(match[1]);
        }
      }
    } catch (e) {
      console.error("Error parsing QR URL:", e);
    }
    return formatTableNumber(data);
  };

  const formatTableNumber = (val: string): string => {
    const clean = val.trim().toUpperCase();
    if (/^T-\d+$/.test(clean)) {
      return clean;
    }
    if (/^T\d+$/.test(clean)) {
      const num = clean.replace('T', '');
      const padded = num.padStart(2, '0');
      return `T-${padded}`;
    }
    const digits = clean.replace(/\D/g, '');
    if (digits) {
      const padded = digits.padStart(2, '0');
      return `T-${padded}`;
    }
    return 'T-06';
  };

  return (
    <ImageBackground
      source={require('../../public/restaurant_bg.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>

          {/* Header */}
          <View style={[styles.header, { zIndex: 100 }]}>
            <View style={{ width: 36 }} />
            <Image
              source={require('../../public/udupi-banner.png')}
              style={styles.hangingSign}
              resizeMode="contain"
            />
            <View style={{ position: 'relative', zIndex: 100 }}>
              <TouchableOpacity style={styles.globeIcon} onPress={() => setShowLangDropdown(!showLangDropdown)}>
                <MaterialCommunityIcons name="translate" size={20} color="#fff" />
              </TouchableOpacity>
              {showLangDropdown && (
                <View style={styles.langDropdown}>
                  <TouchableOpacity style={styles.langOption} onPress={() => { setLanguage('English'); setShowLangDropdown(false); }}>
                    <Text style={[styles.langText, language === 'English' && styles.langTextActive]}>English</Text>
                  </TouchableOpacity>
                  <View style={styles.langDivider} />
                  <TouchableOpacity style={styles.langOption} onPress={() => { setLanguage('Tamil'); setShowLangDropdown(false); }}>
                    <Text style={[styles.langText, language === 'Tamil' && styles.langTextActive]}>Tamil</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <Text style={styles.welcomeText}>{t('welcome')}</Text>
            <Image
              source={require('../../public/Dataudupi-Title.png')}
              style={styles.logoImageFull}
              resizeMode="contain"
            />
            <Text style={styles.taglineText}>
              {t('excellence')}
            </Text>

            <Text style={styles.orderHereText}>{t('orderHere')}</Text>

            {/* Buttons Row */}
            <View style={styles.buttonsRow}>

              {/* Dine In */}
              <TouchableOpacity style={styles.actionBtn} onPress={handleDineInPress}>
                <Image
                  source={require('../../public/dinein-logo.png')}
                  style={styles.customBtnIcon}
                  resizeMode="contain"
                />
                <Text style={styles.btnText}>{t('dineIn')}</Text>
              </TouchableOpacity>

              {/* Take Away */}
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/menu', params: { orderType: 'Take Away' } })}>
                <Image
                  source={require('../../public/takeaway-logo.png')}
                  style={styles.customBtnIcon}
                  resizeMode="contain"
                />
                <Text style={styles.btnText}>{t('takeAway')}</Text>
              </TouchableOpacity>

            </View>
          </View>

          {/* Footer — Chef Mascot */}
          <View style={styles.footer}>
            <Image
              source={require('../../public/chef_mascot.png')}
              style={styles.chefMascot}
              resizeMode="contain"
            />
          </View>

        </SafeAreaView>
      </View>

      {/* Scanner Modal */}
      <Modal visible={isScannerVisible} animationType="slide" transparent={true} onRequestClose={handleCloseScanner}>
        {isScannerVisible && (
          <View style={styles.scannerContainer}>
            <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }}>
              <View>
                <View style={[styles.scannerHeader, { justifyContent: 'center', position: 'relative' }]}>
                  <Text style={styles.scannerHeaderTitle}>Scan Table QR Code</Text>
                  <TouchableOpacity style={[styles.scannerCloseBtn, { position: 'absolute', right: 16 }]} onPress={handleCloseScanner}>
                    <MaterialCommunityIcons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.scanInstructions, { backgroundColor: 'transparent', fontSize: 14 }]}>
                  Align the QR code on your table to start ordering
                </Text>
              </View>
  
              <View style={styles.cameraOuterContainer}>
                <View style={[styles.cameraWrapper, { borderWidth: 0, backgroundColor: '#000' }]}>
                  {permission?.granted ? (
                    <CameraView
                      style={StyleSheet.absoluteFill}
                      facing="back"
                      onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                      barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                      }}
                    >
                      <View style={styles.viewfinderContainer}>
                        <View style={styles.viewfinderFrame}>
                          <View style={[styles.corner, styles.topLeft]} />
                          <View style={[styles.corner, styles.topRight]} />
                          <View style={[styles.corner, styles.bottomLeft]} />
                          <View style={[styles.corner, styles.bottomRight]} />
                          <View style={styles.laserLine} />
                        </View>
                      </View>
                    </CameraView>
                  ) : (
                    <TouchableOpacity 
                      style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}
                      activeOpacity={0.8}
                      onPress={() => handleBarCodeScanned({ data: 'T-05' })}
                    >
                      <View style={styles.viewfinderContainer}>
                        <View style={styles.viewfinderFrame}>
                          <View style={[styles.corner, styles.topLeft]} />
                          <View style={[styles.corner, styles.topRight]} />
                          <View style={[styles.corner, styles.bottomLeft]} />
                          <View style={[styles.corner, styles.bottomRight]} />
                          <View style={styles.laserLine} />
                        </View>
                        <Text style={{ color: '#ff3400', marginTop: 20, fontWeight: 'bold' }}>
                          Tap here to simulate scan
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
  
              <View>
                {!permission?.granted && (
                  <View style={{ marginHorizontal: 24, marginBottom: 16, padding: 12, borderWidth: 1, borderColor: '#5a2222', backgroundColor: '#331515', borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#ff4444', fontSize: 12, textAlign: 'center' }}>
                      Could not access camera. Please enter table number manually.
                    </Text>
                  </View>
                )}
  
                <View style={styles.manualEntryCard}>
                  <Text style={styles.manualEntryTitle}>Unable to scan?</Text>
                  <Text style={styles.manualEntrySubtitle}>Enter the table number manually from your table card</Text>
                  <View style={styles.manualInputRow}>
                    <TextInput
                      style={styles.manualInput}
                      placeholder="Table No. (e.g. 05)"
                      placeholderTextColor="#999"
                      value={manualTable}
                      onChangeText={setManualTable}
                      keyboardType="default"
                    />
                    <TouchableOpacity style={styles.manualSubmitBtn} onPress={handleManualSubmit}>
                      <Text style={styles.manualSubmitBtnText}>Submit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </SafeAreaView>
          </View>
        )}
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    justifyContent: 'space-between',
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  tableCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ff3400',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
    marginTop: 20,
  },
  tableCircleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hangingSign: {
    width: 180,
    height: 100,
    marginTop: -20,
  },
  globeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#fff',
  },
  langDropdown: {
    position: 'absolute',
    top: 60,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 100,
  },
  langOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  langText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  langTextActive: {
    color: '#ff3400',
    fontWeight: 'bold',
  },
  langDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 8,
  },

  /* ── Main Content ── */
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: -80,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  logoImageFull: {
    width: 280,
    height: 60,
    marginBottom: 16,
  },
  taglineText: {
    color: '#ddd',
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 1.5,
    lineHeight: 18,
    marginBottom: 50,
  },
  orderHereText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  /* ── Buttons ── */
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 80,
    backgroundColor: '#ff3400',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  customBtnIcon: {
    width: 48,
    height: 48,
    marginBottom: 4,
    tintColor: '#fff',
  },
  btnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: -6,
  },

  /* ── Footer ── */
  footer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 60,
  },
  chefMascot: {
    width: 250,
    height: 120,
  },

  /* ── QR Scanner Styles ── */
  scannerContainer: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'space-between',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  scannerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraOuterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  cameraWrapper: {
    width: '85%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ff3400',
    backgroundColor: '#000',
    position: 'relative',
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  viewfinderFrame: {
    width: 180,
    height: 180,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#ff3400',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#ff3400',
    shadowColor: '#ff3400',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  scanInstructions: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  permissionFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  fallbackText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionBtn: {
    backgroundColor: '#ff3400',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  permissionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  manualEntryCard: {
    backgroundColor: '#222',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  manualEntryTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  manualEntrySubtitle: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 16,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
  },
  manualSubmitBtn: {
    backgroundColor: '#ff3400',
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualSubmitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
