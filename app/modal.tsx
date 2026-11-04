import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLanguage } from '@/context/LanguageContext';

export default function ModalScreen() {
  const { language } = useLanguage();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">
        {language === "fr" ? "Boîte de dialogue" : "This is a modal"}
      </ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">
          {language === "fr" ? "Aller à l'accueil" : "Go to home screen"}
        </ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
