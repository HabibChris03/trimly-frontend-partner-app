import useColors from '@/hooks/usecolor';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AuthDividerProps {
  text?: string;
}

export default function AuthDivider({ text = 'or' }: AuthDividerProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.line, { backgroundColor: colors.surfacevariant }]} />
      <Text style={[styles.text, { color: colors.secondarytext }]}>{text}</Text>
      <View style={[styles.line, { backgroundColor: colors.surfacevariant }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    width: '100%',
  },
  line: {
    flex: 1,
    height: 1,
  },
  text: {
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});