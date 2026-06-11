import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, font, radius, spacing } from '@/lib/theme';

export interface SelectOption {
  label: string;
  value: string;
  sublabel?: string;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
}

/** Selector cross-platform basado en modal (funciona igual en iOS, Android y web) */
export function Select({
  label,
  placeholder = 'Seleccionar…',
  options,
  value,
  onChange,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={[styles.triggerText, !selected && { color: colors.textMuted }]}>
          {selected?.label ?? placeholder}
        </Text>
        <Text style={{ color: colors.textMuted }}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No hay opciones disponibles</Text>
              }
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionText, active && { color: colors.primary }]}>
                        {item.label}
                      </Text>
                      {item.sublabel ? (
                        <Text style={styles.optionSub}>{item.sublabel}</Text>
                      ) : null}
                    </View>
                    {active ? <Text style={{ color: colors.primary }}>✓</Text> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  trigger: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: { color: colors.text, fontSize: font.body },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 420,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: spacing.md,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: font.h2,
    fontWeight: '700',
    padding: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  optionActive: { backgroundColor: colors.primarySoft },
  optionText: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  optionSub: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
