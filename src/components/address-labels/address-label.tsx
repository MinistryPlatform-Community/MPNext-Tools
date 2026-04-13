import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { ImbBarcode } from './imb-barcode';
import type { LabelData } from '@/lib/dto';

const styles = StyleSheet.create({
  label: {
    padding: 4,
    justifyContent: 'center',
  },
  name: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  addressLine: {
    fontSize: 8,
    marginBottom: 1,
  },
  cityStateZip: {
    fontSize: 8,
    marginBottom: 2,
  },
  barcodeContainer: {
    marginTop: 2,
  },
});

interface AddressLabelProps {
  data: LabelData;
  width: number;
  height: number;
}

export function AddressLabel({ data, width, height }: AddressLabelProps) {
  const cityStateZip = [
    data.city,
    data.state ? `, ${data.state}` : '',
    data.postalCode ? `  ${data.postalCode}` : '',
  ].join('');

  return (
    <View style={[styles.label, { width, height }]}>
      <Text style={styles.name}>{data.name}</Text>
      <Text style={styles.addressLine}>{data.addressLine1}</Text>
      {data.addressLine2 && (
        <Text style={styles.addressLine}>{data.addressLine2}</Text>
      )}
      <Text style={styles.cityStateZip}>{cityStateZip}</Text>
      {data.barCode && (
        <View style={styles.barcodeContainer}>
          <ImbBarcode data={data.barCode} width={width * 0.7} height={8} />
        </View>
      )}
    </View>
  );
}
