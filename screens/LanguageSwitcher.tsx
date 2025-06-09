// components/LanguageSwitcher.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLocalization } from './LocalizationContext';
import { Languages } from '../services/translations';

const { width } = Dimensions.get('window');

interface LanguageSwitcherProps {
  theme: any;
  isDayTime?: boolean;
  style?: any;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  theme, 
  isDayTime = true, 
  style 
}) => {
  const { language: currentLanguage, setLanguage, availableLanguages, t } = useLocalization();
  const [showModal, setShowModal] = useState(false);

  const getCurrentLanguageFlag = () => {
    switch (currentLanguage) {
      case 'ru': return '🇷🇺';
      case 'kk': return '🇰🇿';
      case 'en': return '🇺🇸';
      default: return '🌐';
    }
  };

  const getCurrentLanguageName = () => {
    switch (currentLanguage) {
      case 'ru': return 'РУС';
      case 'kk': return 'ҚАЗ';
      case 'en': return 'ENG';
      default: return 'LANG';
    }
  };

  const getLanguageFlag = (lang: Languages) => {
    switch (lang) {
      case 'ru': return '🇷🇺';
      case 'kk': return '🇰🇿';
      case 'en': return '🇺🇸';
      default: return '🌐';
    }
  };

  const getLanguageShortName = (lang: Languages) => {
    switch (lang) {
      case 'ru': return 'РУС';
      case 'kk': return 'ҚАЗ';
      case 'en': return 'ENG';
      default: return 'LANG';
    }
  };

  const handleLanguageSelect = async (lang: Languages) => {
    await setLanguage(lang);
    setShowModal(false);
  };

  const styles = createStyles(theme, isDayTime);

  return (
    <>
      <TouchableOpacity
        style={[styles.languageButton, style]}
        onPress={() => setShowModal(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <LinearGradient
          colors={theme.isDark ? 
            ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'] : 
            ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']
          }
          style={styles.languageButtonGradient}
        >
          <Text style={styles.languageFlag}>{getCurrentLanguageFlag()}</Text>
          <Text style={styles.languageText}>{getCurrentLanguageName()}</Text>
          <Ionicons 
            name="chevron-down" 
            size={14} 
            color={theme.isDark ? theme.colors.text : "#FFF"} 
          />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={theme.isDark ? 
                [theme.colors.surface, theme.colors.card] : 
                ['#FFFFFF', '#F8F9FA']
              }
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('profile.selectLanguage')}</Text>
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.languagesList}>
                {availableLanguages.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageOption,
                      currentLanguage === lang.code && styles.selectedLanguageOption
                    ]}
                    onPress={() => handleLanguageSelect(lang.code)}
                  >
                    <LinearGradient
                      colors={currentLanguage === lang.code ? 
                        (theme.isDark ? 
                          [theme.colors.primary + '20', theme.colors.primary + '10'] : 
                          ['rgba(139, 195, 74, 0.1)', 'rgba(107, 111, 69, 0.1)']
                        ) : 
                        ['transparent', 'transparent']
                      }
                      style={styles.languageOptionGradient}
                    >
                      <Text style={styles.languageOptionFlag}>
                        {getLanguageFlag(lang.code)}
                      </Text>
                      <View style={styles.languageOptionInfo}>
                        <Text style={[
                          styles.languageOptionName,
                          currentLanguage === lang.code && styles.selectedLanguageText
                        ]}>
                          {lang.nativeName}
                        </Text>
                        <Text style={[
                          styles.languageOptionCode,
                          currentLanguage === lang.code && styles.selectedLanguageSubtext
                        ]}>
                          {getLanguageShortName(lang.code)} • {lang.name}
                        </Text>
                      </View>
                      {currentLanguage === lang.code && (
                        <Ionicons 
                          name="checkmark-circle" 
                          size={24} 
                          color={theme.colors.primary} 
                        />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const createStyles = (theme: any, isDayTime: boolean) => StyleSheet.create({
  languageButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  languageButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.isDark ? 
      'rgba(255, 255, 255, 0.1)' : 
      'rgba(255, 255, 255, 0.3)',
  },
  languageFlag: {
    fontSize: 16,
  },
  languageText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.isDark ? theme.colors.text : '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalContent: {
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  languagesList: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  languageOption: {
    marginVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectedLanguageOption: {
    // Additional styling handled by gradient
  },
  languageOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  languageOptionFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageOptionInfo: {
    flex: 1,
  },
  languageOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  languageOptionCode: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  selectedLanguageText: {
    color: theme.colors.primary,
  },
  selectedLanguageSubtext: {
    color: theme.colors.primary + '80',
  },
});

export default LanguageSwitcher;