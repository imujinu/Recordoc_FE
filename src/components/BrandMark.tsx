import { Image, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/styles/theme';

const logoSource = require('../../assets/logo.png');

type BrandMarkProps = {
  size?: 'regular' | 'compact';
};

export function BrandMark({ size = 'regular' }: BrandMarkProps) {
  const compact = size === 'compact';

  return (
    <View style={styles.container}>
      <Image
        source={logoSource}
        style={compact ? styles.logoCompact : styles.logo}
        resizeMode="contain"
      />
      <Text style={compact ? styles.textCompact : styles.text}>와브</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 42,
    height: 42,
  },
  logoCompact: {
    width: 34,
    height: 34,
  },
  text: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.mint,
  },
  textCompact: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.mint,
  },
});
